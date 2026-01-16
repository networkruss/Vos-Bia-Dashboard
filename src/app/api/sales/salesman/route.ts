import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.DIRECTUS_URL;
const AUTH_HEADER = {
  Authorization: "Bearer " + process.env.DIRECTUS_TOKEN,
  "Content-Type": "application/json",
};

/**
 * Helper function to fetch all data from Directus without limits
 */
async function fetchAll(endpoint: string, params: string = "") {
  try {
    const url = `${DIRECTUS_URL}/items/${endpoint}?limit=-1${params}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: AUTH_HEADER,
    });
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error(`Error fetching ${endpoint}:`, err);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const salesmanId = searchParams.get("salesmanId");

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { success: false, error: "Missing date parameters" },
        { status: 400 }
      );
    }

    // --- 1. FILTERS & FETCHING ---
    // Same date range logic as Supervisor Dashboard
    const dateFilter = `&filter[invoice_date][_between]=[${fromDate},${toDate}]`;
    const returnFilter = `&filter[return_date][_between]=[${fromDate},${toDate}]`;
    const orderFilter = `&filter[order_date][_between]=[${fromDate},${toDate}]`;

    const [
      salesmen,
      invoices,
      invoiceDetails,
      returns,
      returnDetails,
      suppliers,
      productSupplierMap,
      allProducts,
      orders,
    ] = await Promise.all([
      fetchAll("salesman", "&fields=id,salesman_name,level,points_growth"),
      fetchAll(
        "sales_invoice",
        `&fields=invoice_id,invoice_no,total_amount,net_amount,salesman_id${dateFilter}`
      ),
      fetchAll(
        "sales_invoice_details",
        "&fields=invoice_no,product_id,total_amount,quantity"
      ),
      fetchAll(
        "sales_return",
        `&fields=return_number,total_amount${returnFilter}`
      ),
      fetchAll(
        "sales_return_details",
        "&fields=return_no,product_id,total_amount,reason"
      ),
      fetchAll("suppliers", "&fields=id,supplier_name,supplier_shortcut"),
      fetchAll("product_per_supplier", "&fields=supplier_id,product_id"),
      fetchAll("products", "&fields=product_id,product_name"),
      fetchAll("sales_order", `&fields=order_id,order_status${orderFilter}`),
    ]);

    // --- 2. SALESMAN FILTERING (Live-Ready Logic) ---
    // Ino-normalize natin ang salesman_id dahil minsan Directus returns an object {id: 1} or just the ID string/number
    const filteredInvoices = invoices.filter((inv: any) => {
      if (!salesmanId || salesmanId === "all") return true;
      const sId =
        typeof inv.salesman_id === "object"
          ? String(inv.salesman_id.id)
          : String(inv.salesman_id);
      return sId === salesmanId;
    });

    // Create a Set for faster lookup of allowed invoice numbers
    const filteredInvoiceNos = new Set(
      filteredInvoices.map((inv: any) => String(inv.invoice_no))
    );

    // --- 3. MAPPING & COMPUTATION ---
    const productNameMap = new Map(
      allProducts.map((p: any) => [String(p.product_id), p.product_name])
    );
    const prodToSupMap = new Map(
      productSupplierMap.map((m: any) => [
        String(m.product_id),
        String(m.supplier_id),
      ])
    );
    const supplierMap = new Map();
    suppliers.forEach((s: any) =>
      supplierMap.set(String(s.id), s.supplier_shortcut || s.supplier_name)
    );

    const productSalesMap = new Map();
    const supplierSalesMap = new Map();

    // Link Details to Invoices using invoice_no (just like Supervisor logic)
    invoiceDetails.forEach((det: any) => {
      if (filteredInvoiceNos.has(String(det.invoice_no))) {
        const pId = String(det.product_id);
        const amount = Number(det.total_amount) || 0;

        // Add to Product Totals
        productSalesMap.set(pId, (productSalesMap.get(pId) || 0) + amount);

        // Add to Supplier Totals
        const sId = prodToSupMap.get(pId);
        if (sId) {
          supplierSalesMap.set(sId, (supplierSalesMap.get(sId) || 0) + amount);
        }
      }
    });

    // --- 4. FORMATTING FOR UI ---
    const chartColors = [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#ec4899",
    ];

    const supplierPerformance = Array.from(supplierSalesMap.entries())
      .map(([id, value], index) => ({
        name: supplierMap.get(id) || `Supplier ${id}`,
        value,
        fill: chartColors[index % chartColors.length],
      }))
      .sort((a, b) => b.value - a.value);

    const productPerformance = Array.from(productSalesMap.entries())
      .map(([id, value]) => ({
        name: productNameMap.get(id) || `Product ${id}`,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Process Bad Storage / Returns
    const badStorage = returnDetails
      .map((rd: any) => ({
        product:
          productNameMap.get(String(rd.product_id)) || `ID: ${rd.product_id}`,
        reason: rd.reason || "NO REASON",
        amount: Number(rd.total_amount) || 0,
      }))
      .sort((a: any, b: any) => b.amount - a.amount)
      .slice(0, 10);

    const currentSalesman = salesmen.find(
      (s: any) => String(s.id) === salesmanId
    );

    // --- 5. FINAL JSON RESPONSE ---
    return NextResponse.json({
      success: true,
      data: {
        salesman: {
          name:
            currentSalesman?.salesman_name ||
            (salesmanId === "all" ? "Whole Team" : "Unknown"),
          level: currentSalesman?.level ?? 0,
          levelUp: currentSalesman?.points_growth ?? 0,
        },
        kpi: {
          orders: filteredInvoices.length,
          revenue: filteredInvoices.reduce(
            (acc, inv) =>
              acc + (Number(inv.net_amount) || Number(inv.total_amount) || 0),
            0
          ),
          returns: returns.reduce(
            (acc, ret) => acc + (Number(ret.total_amount) || 0),
            0
          ),
        },
        target: { quota: 100000, achieved: 0, gap: 0, percent: 45 },
        statusMonitoring: {
          delivered: orders.filter((o: any) => o.order_status === "Delivered")
            .length,
          pending: orders.filter((o: any) => o.order_status === "Pending")
            .length,
          cancelled: orders.filter((o: any) =>
            ["Cancelled", "Not Fulfilled"].includes(o.order_status)
          ).length,
        },
        badStorage,
        charts: {
          products: productPerformance.length > 0 ? productPerformance : [],
          suppliers: supplierPerformance.length > 0 ? supplierPerformance : [],
        },
      },
    });
  } catch (error: any) {
    console.error("Salesman API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
