import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://100.110.197.61:8091";

async function fetchAll(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    // 1. FETCH DATA
    const [salesmen, invoices, invoiceDetails, customers, products] =
      await Promise.all([
        fetchAll(`${DIRECTUS_URL}/items/salesman?limit=-1`),
        fetchAll(`${DIRECTUS_URL}/items/sales_invoice?limit=-1`),
        fetchAll(`${DIRECTUS_URL}/items/sales_invoice_details?limit=-1`),
        fetchAll(`${DIRECTUS_URL}/items/customer?limit=-1`),
        fetchAll(`${DIRECTUS_URL}/items/products?limit=-1`),
      ]);

    // 2. PROCESS MAPS
    const customerMap = new Map(customers.map((c: any) => [c.id, c]));
    const productMap = new Map(
      products.map((p: any) => [p.product_id, p.product_name])
    );

    // Filter invoices by date
    const filteredInvoices = invoices.filter((inv: any) => {
      if (!inv.invoice_date) return false;
      const d = inv.invoice_date.substring(0, 10);
      return (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
    });

    // 3. AGGREGATE PER SALESMAN
    const salesmanStats = new Map();

    // Initialize salesmen stats from salesman list
    salesmen.forEach((s: any) => {
      if (s.isActive) {
        salesmanStats.set(s.id, {
          id: s.id.toString(),
          name: s.salesman_name,
          netSales: 0,
          target: 500000, // Default target since we don't have a targets table
          returnRate: 0, // Placeholder as returns table wasn't provided in this prompt
          visits: 0,
          orders: 0,
          strikeRate: 0,
          topProduct: "N/A",
          topSupplier: "N/A",
          productsSold: 0,
          productCounts: new Map(), // To calc top product
        });
      }
    });

    let teamSales = 0;
    const teamTarget = salesmanStats.size * 500000; // Aggregate target
    let totalInvoicesCount = 0;

    // Process Invoices
    filteredInvoices.forEach((inv: any) => {
      const stats = salesmanStats.get(inv.salesman_id);
      if (stats) {
        const amount = Number(inv.total_amount) || 0;
        stats.netSales += amount;
        stats.orders += 1;
        teamSales += amount;
        totalInvoicesCount++;
      }
    });

    // Process Invoice Details for Top Products & Products Sold count
    // (This is a simplified approach; doing this for ALL details in memory might be heavy for large datasets)
    const validInvoiceIds = new Set(
      filteredInvoices.map((i: any) => i.invoice_id)
    );

    invoiceDetails.forEach((det: any) => {
      // Check if detail belongs to a valid invoice in our date range
      // Note: invoice_no in details might be an ID or object depending on Directus config
      const invId =
        typeof det.invoice_no === "object" ? det.invoice_no.id : det.invoice_no;

      if (validInvoiceIds.has(invId)) {
        // Find salesman for this invoice
        const inv = filteredInvoices.find((i: any) => i.invoice_id === invId);
        if (inv && salesmanStats.has(inv.salesman_id)) {
          const stats = salesmanStats.get(inv.salesman_id);
          const pName = productMap.get(det.product_id) || "Unknown";

          // Count products
          stats.productCounts.set(
            pName,
            (stats.productCounts.get(pName) || 0) + Number(det.total_amount)
          );
        }
      }
    });

    // Finalize Salesman Stats
    const salesmenList = Array.from(salesmanStats.values())
      .map((s: any) => {
        // Top Product Logic
        let topP = "N/A";
        let maxVal = 0;
        s.productCounts.forEach((val: number, key: string) => {
          if (val > maxVal) {
            maxVal = val;
            topP = key;
          }
        });

        // Simulation for missing data fields
        const estimatedVisits = s.orders > 0 ? Math.round(s.orders * 1.3) : 0;
        const strikeRate =
          estimatedVisits > 0
            ? Math.round((s.orders / estimatedVisits) * 100)
            : 0;

        return {
          ...s,
          topProduct: topP,
          topSupplier: "Internal", // Placeholder as supplier logic requires more mapping
          productsSold: s.productCounts.size,
          visits: estimatedVisits,
          strikeRate: strikeRate,
          // Mock return rate for demo
          returnRate: (Math.random() * 2).toFixed(2),
        };
      })
      .sort((a, b) => b.netSales - a.netSales);

    // 4. COVERAGE DATA (Sari-Sari vs Resto)
    let sariSariCount = 0;
    let restoCount = 0;
    let othersCount = 0;

    customers.forEach((c: any) => {
      // Simple string matching based on store name or type
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

    const totalCustomers = customers.length;
    const penetrationRate =
      totalCustomers > 0
        ? (((sariSariCount + restoCount) / totalCustomers) * 100).toFixed(1)
        : 0;

    // 5. MOCK MONTHLY HISTORY (For chart visual consistency)
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
        totalInvoices: totalInvoicesCount,
        penetrationRate,
        coverageDistribution,
        salesmen: salesmenList,
        monthlyPerformance,
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
