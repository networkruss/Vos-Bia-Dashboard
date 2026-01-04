import { NextResponse } from "next/server";

// Using port 8056 (Manager/Supervisor Data)
const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://100.110.197.61:8056";

// --- HELPERS ---
async function fetchAll<T = any>(
  endpoint: string,
  params: string = ""
): Promise<T[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 mins timeout

  try {
    const url = `${DIRECTUS_URL}/items/${endpoint}?limit=-1${params}`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      console.error(`Directus Error ${res.status} on ${url}`);
      return [];
    }
    const json = await res.json();
    return (json.data as T[]) || [];
  } catch (error) {
    console.error(`Fetch error for ${endpoint}:`, error);
    return [];
  }
}

function normalizeDate(d: string | null) {
  if (!d) return null;
  if (d.includes("/")) {
    const parts = d.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  return d;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = normalizeDate(searchParams.get("fromDate"));
    const toDate = normalizeDate(searchParams.get("toDate"));

    // --- 1. OPTIMIZED FETCHING ---
    // Filter at the database level
    let invoiceFilter = "";
    let detailsFilter = "";

    if (fromDate && toDate) {
      invoiceFilter = `&filter[invoice_date][_between]=[${fromDate},${toDate} 23:59:59]`;
      // Optimization: Filter details by created_date to reduce payload
      detailsFilter = `&filter[created_date][_between]=[${fromDate},${toDate} 23:59:59]`;
    }

    const [salesmen, invoices, invoiceDetails, customers, products] =
      await Promise.all([
        fetchAll("salesman", "&fields=id,salesman_name,isActive"),
        fetchAll(
          "sales_invoice",
          `&fields=invoice_id,invoice_date,salesman_id,total_amount,customer_code${invoiceFilter}`
        ),
        fetchAll(
          "sales_invoice_details",
          `&fields=invoice_no,product_id,total_amount${detailsFilter}`
        ),
        fetchAll("customer", "&fields=customer_code,store_name"),
        fetchAll("products", "&fields=product_id,product_name"),
      ]);

    // --- 2. MAPS ---
    const productMap = new Map();
    products.forEach((p: any) =>
      productMap.set(String(p.product_id), p.product_name)
    );

    // Map Customer Code -> Name (Fix for "Unknown Customer")
    const customerMap = new Map();
    customers.forEach((c: any) =>
      customerMap.set(String(c.customer_code), c.store_name)
    );

    // Valid Invoice IDs (for linking details)
    const validInvoiceIds = new Set(
      invoices.map((i: any) => String(i.invoice_id))
    );

    // --- 3. AGGREGATE PER SALESMAN ---
    const salesmanStats = new Map();

    // Initialize Active Salesmen
    salesmen.forEach((s: any) => {
      if (s.isActive) {
        salesmanStats.set(String(s.id), {
          id: String(s.id),
          name: s.salesman_name,
          netSales: 0,
          target: 500000, // Placeholder target
          returnRate: 0,
          visits: 0,
          orders: 0,
          strikeRate: 0,
          topProduct: "N/A",
          topSupplier: "N/A",
          productsSold: 0,
          productCounts: new Map<string, number>(),
        });
      }
    });

    let teamSales = 0;

    // Process Invoices
    invoices.forEach((inv: any) => {
      const d = inv.invoice_date?.substring(0, 10);
      // Double check date filter
      if (fromDate && d < fromDate) return;
      if (toDate && d > toDate) return;

      const sId = String(inv.salesman_id);
      const stats = salesmanStats.get(sId);

      if (stats) {
        const amount = Number(inv.total_amount) || 0;
        stats.netSales += amount;
        stats.orders += 1;
        teamSales += amount;
      }
    });

    // Process Details (Top Products)
    invoiceDetails.forEach((det: any) => {
      const invId = String(det.invoice_no);
      if (validInvoiceIds.has(invId)) {
        // Find owner of invoice
        const inv = invoices.find((i: any) => String(i.invoice_id) === invId);
        if (inv) {
          const sId = String(inv.salesman_id);
          const stats = salesmanStats.get(sId);
          if (stats) {
            const pName =
              productMap.get(String(det.product_id)) || "Unknown Product";
            const amount = Number(det.total_amount) || 0;
            stats.productCounts.set(
              pName,
              (stats.productCounts.get(pName) || 0) + amount
            );
          }
        }
      }
    });

    // Finalize Stats
    const salesmenList = Array.from(salesmanStats.values())
      .map((s: any) => {
        // Find Top Product
        let topP = "N/A";
        let maxVal = 0;
        s.productCounts.forEach((val: number, key: string) => {
          if (val > maxVal) {
            maxVal = val;
            topP = key;
          }
        });

        // Calc Metrics
        const estimatedVisits = s.orders > 0 ? Math.round(s.orders * 1.3) : 0;
        const strikeRate =
          estimatedVisits > 0
            ? Math.round((s.orders / estimatedVisits) * 100)
            : 0;

        return {
          ...s,
          topProduct: topP,
          productsSold: s.productCounts.size,
          visits: estimatedVisits,
          strikeRate: strikeRate,
          returnRate: (Math.random() * 2).toFixed(2), // Mock return rate for now
        };
      })
      .sort((a, b) => b.netSales - a.netSales);

    // 4. COVERAGE DATA
    let sariSariCount = 0;
    let restoCount = 0;
    let othersCount = 0;

    customers.forEach((c: any) => {
      const name = (c.store_name || "").toUpperCase();
      if (name.includes("SARI") || name.includes("STORE")) sariSariCount++;
      else if (
        name.includes("RESTO") ||
        name.includes("CAFE") ||
        name.includes("KITCHEN")
      )
        restoCount++;
      else othersCount++;
    });

    const coverageDistribution = [
      { type: "Sari-Sari Store", count: sariSariCount, fill: "#3b82f6" },
      { type: "Restaurant", count: restoCount, fill: "#10b981" },
      { type: "Others", count: othersCount, fill: "#f59e0b" },
    ];

    const teamTarget = salesmanStats.size * 500000;
    const penetrationRate =
      customers.length > 0
        ? (((sariSariCount + restoCount) / customers.length) * 100).toFixed(1)
        : 0;

    // 5. MOCK HISTORY (Visual Consistency)
    const monthlyPerformance = [
      { month: "Jan", target: 500000, achieved: teamSales * 0.1 },
      { month: "Feb", target: 500000, achieved: teamSales * 0.15 },
      { month: "Mar", target: 500000, achieved: teamSales * 0.12 },
      { month: "Apr", target: 500000, achieved: teamSales * 0.2 },
      { month: "May", target: 500000, achieved: teamSales * 0.18 },
      { month: "Jun", target: 500000, achieved: teamSales * 0.25 },
    ];

    return NextResponse.json({
      success: true,
      data: {
        teamSales,
        teamTarget,
        totalInvoices: invoices.length,
        penetrationRate,
        coverageDistribution,
        salesmen: salesmenList,
        monthlyPerformance,
        topProducts: [], // Placeholder for team view
        topSuppliers: [], // Placeholder for team view
        returnHistory: [], // Placeholder for team view
      },
    });
  } catch (error: any) {
    console.error("Supervisor API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
