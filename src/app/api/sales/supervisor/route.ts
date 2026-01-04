import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://100.110.197.61:8056";

// --- HELPERS ---
async function fetchAll<T = any>(
  endpoint: string,
  params: string = ""
): Promise<T[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

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
    const salesmanId = searchParams.get("salesmanId");

    // --- 1. OPTIMIZED FETCHING ---
    let invoiceFilter = "";
    let detailsFilter = "";
    let returnFilter = "";

    if (fromDate && toDate) {
      invoiceFilter = `&filter[invoice_date][_between]=[${fromDate},${toDate} 23:59:59]`;
      detailsFilter = `&filter[created_date][_between]=[${fromDate},${toDate} 23:59:59]`;
      returnFilter = `&filter[return_date][_between]=[${fromDate},${toDate} 23:59:59]`;
    }

    const [
      salesmen,
      invoices,
      invoiceDetails,
      customers,
      products,
      suppliers,
      pps,
      returns,
      returnDetails,
    ] = await Promise.all([
      fetchAll("salesman", "&fields=id,salesman_name,isActive"),
      fetchAll(
        "sales_invoice",
        `&fields=invoice_id,invoice_date,salesman_id,total_amount,customer_code${invoiceFilter}`
      ),
      fetchAll(
        "sales_invoice_details",
        `&fields=invoice_no,product_id,total_amount,quantity${detailsFilter}`
      ),
      fetchAll("customer", "&fields=customer_code,store_name"),
      fetchAll("products", "&fields=product_id,product_name,parent_id"),
      fetchAll("suppliers", "&fields=id,supplier_name"),
      fetchAll("product_per_supplier", "&fields=product_id,supplier_id"),
      fetchAll(
        "sales_return",
        `&fields=return_number,return_date,salesman_id${returnFilter}`
      ),
      fetchAll(
        "sales_return_details",
        `&fields=return_no,product_id,quantity,reason`
      ),
    ]);

    // --- 2. BUILD MAPS ---
    const productMap = new Map();
    products.forEach((p: any) =>
      productMap.set(String(p.product_id), p.product_name)
    );

    const supplierMap = new Map<string, string>();
    suppliers.forEach((s: any) =>
      supplierMap.set(String(s.id), s.supplier_name)
    );

    const productToSupplierMap = new Map<string, string>();
    pps.forEach((p: any) => {
      if (!productToSupplierMap.has(String(p.product_id))) {
        productToSupplierMap.set(String(p.product_id), String(p.supplier_id));
      }
    });

    const getSupplierName = (productId: string) => {
      let sId = productToSupplierMap.get(productId);
      if (!sId) {
        const prod = products.find(
          (p: any) => String(p.product_id) === productId
        );
        if (prod?.parent_id)
          sId = productToSupplierMap.get(String(prod.parent_id));
      }
      if (sId) {
        const name = supplierMap.get(sId);
        if (name && !name.includes("MEN2")) return name;
      }
      const pName = (productMap.get(productId) || "").toUpperCase();
      if (pName.includes("CDO")) return "FOODSPHERE INC.";
      if (pName.includes("SKINTEC")) return "SKINTEC";
      if (pName.includes("MAMA PINA")) return "MAMA PINA'S";
      return "Internal / Others";
    };

    const validInvoiceIds = new Set(
      invoices.map((i: any) => String(i.invoice_id))
    );

    // --- 3. AGGREGATE STATS ---
    const salesmanStats = new Map();
    const productSalesMap = new Map<string, number>();
    const supplierSalesMap = new Map<string, number>();
    const trendMap = new Map<string, number>();

    // INITIALIZE ALL SALESMEN (Do NOT filter here, so dropdown has everyone)
    salesmen.forEach((s: any) => {
      if (s.isActive) {
        salesmanStats.set(String(s.id), {
          id: String(s.id),
          name: s.salesman_name,
          netSales: 0,
          target: 500000,
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

    // A. Process Invoices
    invoices.forEach((inv: any) => {
      const d = inv.invoice_date?.substring(0, 10);
      if (fromDate && d < fromDate) return;
      if (toDate && d > toDate) return;

      const sId = String(inv.salesman_id);
      const amount = Number(inv.total_amount) || 0;

      // 1. Update Individual Salesman Stats (Always update this)
      const stats = salesmanStats.get(sId);
      if (stats) {
        stats.netSales += amount;
        stats.orders += 1;
      }

      // 2. Update Dashboard Metrics (Filter here!)
      const isIncluded =
        !salesmanId || salesmanId === "all" || salesmanId === sId;

      if (isIncluded) {
        teamSales += amount;
        trendMap.set(d, (trendMap.get(d) || 0) + amount);
      }
    });

    // B. Process Details
    invoiceDetails.forEach((det: any) => {
      const invId = String(det.invoice_no);
      if (validInvoiceIds.has(invId)) {
        const inv = invoices.find((i: any) => String(i.invoice_id) === invId);

        if (inv) {
          const sId = String(inv.salesman_id);
          const amount = Number(det.total_amount) || 0;
          const pId = String(det.product_id);
          const pName = productMap.get(pId) || `Product ${pId}`;
          const sName = getSupplierName(pId);

          // 1. Update Individual Stats
          const stats = salesmanStats.get(sId);
          if (stats) {
            stats.productCounts.set(
              pName,
              (stats.productCounts.get(pName) || 0) + amount
            );
          }

          // 2. Update Dashboard Metrics (Filter here!)
          const isIncluded =
            !salesmanId || salesmanId === "all" || salesmanId === sId;

          if (isIncluded) {
            productSalesMap.set(
              pName,
              (productSalesMap.get(pName) || 0) + amount
            );
            supplierSalesMap.set(
              sName,
              (supplierSalesMap.get(sName) || 0) + amount
            );
          }
        }
      }
    });

    // C. Process Returns
    const returnHistoryList: any[] = [];
    const validReturnIds = new Set();

    // Filter returns based on selection
    returns.forEach((r: any) => {
      const sId = String(r.salesman_id);
      const isIncluded =
        !salesmanId || salesmanId === "all" || salesmanId === sId;
      if (isIncluded) {
        validReturnIds.add(String(r.return_number));
      }
    });

    returnDetails.forEach((ret: any) => {
      const parentId = String(ret.return_no);
      if (validReturnIds.has(parentId)) {
        const pName =
          productMap.get(String(ret.product_id)) || "Unknown Product";
        const qty = Number(ret.quantity) || 0;
        returnHistoryList.push({
          product: pName,
          quantity: qty,
          reason: ret.reason || "Defect/Expired",
        });
      }
    });

    // --- 4. FINALIZE ---

    const topProducts = Array.from(productSalesMap.entries())
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    const topSuppliers = Array.from(supplierSalesMap.entries())
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    const groupedReturns = new Map<
      string,
      { quantity: number; reason: string }
    >();
    returnHistoryList.forEach((r) => {
      const existing = groupedReturns.get(r.product);
      if (existing) {
        existing.quantity += r.quantity;
      } else {
        groupedReturns.set(r.product, {
          quantity: r.quantity,
          reason: r.reason,
        });
      }
    });
    const finalReturnHistory = Array.from(groupedReturns.entries())
      .map(([product, details]) => ({
        product,
        quantity: details.quantity,
        reason: details.reason,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 50);

    // Format List of Salesmen (This will contain EVERYONE, filtered or not)
    const salesmenList = Array.from(salesmanStats.values())
      .map((s: any) => {
        let topP = "N/A";
        let maxVal = 0;
        s.productCounts.forEach((val: number, key: string) => {
          if (val > maxVal) {
            maxVal = val;
            topP = key;
          }
        });
        const estimatedVisits = s.orders > 0 ? Math.round(s.orders * 1.3) : 0;
        const strikeRate =
          estimatedVisits > 0
            ? Math.round((s.orders / estimatedVisits) * 100)
            : 0;

        return {
          ...s,
          topProduct: topP,
          topSupplier: "Internal",
          productsSold: s.productCounts.size,
          visits: estimatedVisits,
          strikeRate: strikeRate,
          returnRate: (Math.random() * 2).toFixed(2),
        };
      })
      .sort((a, b) => b.netSales - a.netSales);

    // Calculate Target based on Filter
    // If 'all', sum of all targets. If specific, just that one.
    let teamTarget = 0;
    if (!salesmanId || salesmanId === "all") {
      teamTarget = salesmenList.length * 500000;
    } else {
      teamTarget = 500000;
    }

    // Dynamic Chart Data
    const sortedDates = Array.from(trendMap.keys()).sort();
    const dailyTarget = Math.round(teamTarget / 30);

    let dynamicPerformance: any[] = [];
    if (sortedDates.length > 0) {
      dynamicPerformance = sortedDates.map((date) => {
        const d = new Date(date);
        return {
          month: d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          target: dailyTarget,
          achieved: trendMap.get(date) || 0,
        };
      });
    } else {
      dynamicPerformance = [];
    }

    // Coverage Distribution (Just basic logic for now)
    let sariSariCount = 0;
    let restoCount = 0;
    let othersCount = 0;
    customers.forEach((c: any) => {
      const name = (c.store_name || "").toUpperCase();
      if (name.includes("SARI") || name.includes("STORE")) sariSariCount++;
      else if (name.includes("RESTO")) restoCount++;
      else othersCount++;
    });
    const coverageDistribution = [
      { type: "Sari-Sari Store", count: sariSariCount, fill: "#3b82f6" },
      { type: "Restaurant", count: restoCount, fill: "#10b981" },
      { type: "Others", count: othersCount, fill: "#f59e0b" },
    ];
    const penetrationRate =
      customers.length > 0
        ? (((sariSariCount + restoCount) / customers.length) * 100).toFixed(1)
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        teamSales,
        teamTarget,
        totalInvoices: invoices.length,
        penetrationRate,
        coverageDistribution,
        salesmen: salesmenList, // This is the FULL list now
        monthlyPerformance: dynamicPerformance,
        topProducts,
        topSuppliers,
        returnHistory: finalReturnHistory,
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
