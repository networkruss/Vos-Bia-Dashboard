import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.DIRECTUS_URL;
const AUTH_HEADER = {
  Authorization: "Bearer " + process.env.DIRECTUS_TOKEN,
  "Content-Type": "application/json",
};

async function fetchSafe(endpoint: string, params: string = "") {
  try {
    const url = `${DIRECTUS_URL}/items/${endpoint}?limit=-1${params}`;
    const res = await fetch(url, { cache: "no-store", headers: AUTH_HEADER });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error(`Fetch error for ${endpoint}:`, error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const salesmanId = searchParams.get("salesmanId");

    const salesmanFilter =
      salesmanId && salesmanId !== "all"
        ? `&filter[salesman_id][_eq]=${salesmanId}`
        : "";

    // 1. STAGE ONE: FETCH ALL DATA
    const [
      salesmen,
      invoices,
      orders, // Added Sales Orders
      returns,
      products,
      brands,
      suppliers,
      targets,
    ] = await Promise.all([
      fetchSafe("salesman", "&fields=id,salesman_name,level,points_growth"),
      fetchSafe(
        "sales_invoice",
        `&fields=invoice_no,total_amount,invoice_date,salesman_id&filter[invoice_date][_between]=[${fromDate},${toDate}]${salesmanFilter}`
      ),
      fetchSafe(
        "sales_order",
        `&fields=order_id,order_status,total_amount,order_date&filter[order_date][_between]=[${fromDate},${toDate}]${salesmanFilter}`
      ),
      fetchSafe(
        "sales_return",
        `&fields=return_number,total_amount,return_date&filter[return_date][_between]=[${fromDate},${toDate}]${salesmanFilter}`
      ),
      fetchSafe("products", "&fields=product_id,product_name,product_brand"),
      fetchSafe("brand", "&fields=brand_id,brand_name,supplier_id"),
      fetchSafe("suppliers", "&fields=id,supplier_name,supplier_shortcut"),
      salesmanId && salesmanId !== "all"
        ? fetchSafe(
            "salesman_target_setting",
            `&filter[salesman_id][_eq]=${salesmanId}&filter[date_range_from][_lte]=${toDate}&filter[date_range_to][_gte]=${fromDate}`
          )
        : Promise.resolve([]),
    ]);

    // Secondary Fetch for Details
    const invoiceNos = invoices
      .map((inv: any) => inv.invoice_no)
      .filter(Boolean);
    const returnNos = returns
      .map((ret: any) => ret.return_number)
      .filter(Boolean);

    const [invoiceDetails, returnDetails] = await Promise.all([
      invoiceNos.length > 0
        ? fetchSafe(
            "sales_invoice_details",
            `&filter[invoice_no][_in]=${invoiceNos.join(
              ","
            )}&fields=product_id,total_amount`
          )
        : Promise.resolve([]),
      returnNos.length > 0
        ? fetchSafe(
            "sales_return_details",
            `&filter[return_no][_in]=${returnNos.join(
              ","
            )}&fields=product_id,total_amount,reason`
          )
        : Promise.resolve([]),
    ]);

    // 2. STAGE TWO: COMPUTE LOGIC

    // KPI: Revenue comes from Invoices, Orders count from Sales Orders
    const totalRevenue = invoices.reduce(
      (acc: number, inv: any) => acc + (Number(inv.total_amount) || 0),
      0
    );
    const totalReturns = returns.reduce(
      (acc: number, ret: any) => acc + (Number(ret.total_amount) || 0),
      0
    );
    const totalQuota = targets.reduce(
      (acc: number, t: any) => acc + (Number(t.volume) || 0),
      0
    );

    // --- SALES ORDER STATUS MONITORING (Using ENUM from DB) ---
    const deliveredCount = orders.filter(
      (o: any) => o.order_status === "Delivered"
    ).length;
    const cancelledCount = orders.filter(
      (o: any) =>
        o.order_status === "Cancelled" || o.order_status === "Not Fulfilled"
    ).length;

    // "Pending" is everything else (En Route, For Picking, For Invoicing, etc.)
    const pendingCount = orders.length - (deliveredCount + cancelledCount);

    // Bad Storage (Returns)
    const badStorageDetails = returnDetails
      .map((rd: any) => {
        const product = products.find(
          (p: any) => String(p.product_id) === String(rd.product_id)
        );
        return {
          product: product ? product.product_name : "Unknown",
          reason: rd.reason || "No Reason",
          amount: Number(rd.total_amount) || 0,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Charts: Product Performance
    const productPerformance = products
      .map((p: any) => {
        const val = invoiceDetails
          .filter((d: any) => String(d.product_id) === String(p.product_id))
          .reduce((sum, d) => sum + (Number(d.total_amount) || 0), 0);
        return { name: p.product_name, value: val };
      })
      .filter((p) => p.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Charts: Supplier Contribution
    const supplierPerformance = suppliers
      .map((sup: any) => {
        const bIds = brands
          .filter((b: any) => String(b.supplier_id) === String(sup.id))
          .map((b) => String(b.brand_id));
        const pIds = products
          .filter((p: any) => bIds.includes(String(p.product_brand)))
          .map((p) => String(p.product_id));
        const val = invoiceDetails
          .filter((d) => pIds.includes(String(d.product_id)))
          .reduce((s, d) => s + (Number(d.total_amount) || 0), 0);
        return { name: sup.supplier_shortcut || sup.supplier_name, value: val };
      })
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);

    const currentSalesman = salesmen.find(
      (s: any) => String(s.id) === salesmanId
    );

    // 3. STAGE THREE: RETURN
    return NextResponse.json({
      success: true,
      data: {
        salesman: {
          name: currentSalesman
            ? currentSalesman.salesman_name
            : "Team Overview",
          level: currentSalesman?.level ?? 0,
          levelUp: currentSalesman?.points_growth ?? 0,
        },
        kpi: {
          orders: orders.length, // Based on Sales Orders
          revenue: totalRevenue, // Actual billed revenue
          returns: totalReturns,
        },
        target: {
          quota: totalQuota,
          achieved: totalRevenue,
          gap: Math.max(0, totalQuota - totalRevenue),
          percent:
            totalQuota > 0
              ? Math.min(100, Math.round((totalRevenue / totalQuota) * 100))
              : 0,
        },
        statusMonitoring: {
          delivered: deliveredCount,
          pending: pendingCount,
          cancelled: cancelledCount,
        },
        badStorage: badStorageDetails,
        charts: {
          products:
            productPerformance.length > 0
              ? productPerformance
              : [{ name: "No Sales", value: 0 }],
          suppliers:
            supplierPerformance.length > 0
              ? supplierPerformance
              : [{ name: "No Sales", value: 0 }],
        },
      },
    });
  } catch (error) {
    console.error("Dashboard computation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Error" },
      { status: 500 }
    );
  }
}
