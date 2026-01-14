import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.DIRECTUS_URL;

async function fetchAll(endpoint: string, params: string = "") {
  try {
    const url = `${DIRECTUS_URL}/items/${endpoint}?limit=-1${params}`;
    const res = await fetch(url, { cache: "no-store" });
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

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { success: false, error: "Missing date parameters" },
        { status: 400 }
      );
    }

    const [
      salesmen,
      invoices,
      invoiceDetails,
      returns,
      customers,
      products,
      rtsData,
      storeTypes,
    ] = await Promise.all([
      fetchAll("salesman", "&fields=id,salesman_name,isActive"),
      fetchAll(
        "sales_invoice",
        `&fields=invoice_id,total_amount,discount_amount,net_amount,salesman_id,customer_code&filter[invoice_date][_between]=[${fromDate},${toDate}]`
      ),
      fetchAll(
        "sales_invoice_details",
        "&fields=invoice_no,product_id,quantity,total_amount"
      ),
      fetchAll(
        "sales_return",
        `&fields=total_amount,return_date&filter[return_date][_between]=[${fromDate},${toDate}]`
      ),
      fetchAll("customer", "&fields=id,customer_code,store_type"),
      fetchAll("products", "&fields=product_id,product_name,isActive"),
      fetchAll(
        "return_to_supplier",
        `&fields=supplier_id&filter[transaction_date][_between]=[${fromDate},${toDate}]`
      ),
      fetchAll("store_type", "&fields=id,store_type"),
    ]);

    const activeSalesmenSet = new Set();
    const activeProductsSet = new Set();
    const invoicedCustomerCodes = new Set();
    const activeSuppliersSet = new Set();

    const salesmanSalesMap = new Map();
    const productVolumeMap = new Map();

    let totalNetSales = 0;
    let totalDiscounts = 0;

    // 1. Process Invoices & Salesmen
    invoices.forEach((inv: any) => {
      totalNetSales += Number(inv.net_amount) || 0;
      totalDiscounts += Number(inv.discount_amount) || 0;

      if (inv.customer_code) invoicedCustomerCodes.add(inv.customer_code);

      if (inv.salesman_id) {
        // LIVE READY: Check if salesman_id is an object or a simple ID
        const sId =
          typeof inv.salesman_id === "object"
            ? String(inv.salesman_id.id)
            : String(inv.salesman_id);
        activeSalesmenSet.add(sId);
        salesmanSalesMap.set(
          sId,
          (salesmanSalesMap.get(sId) || 0) + (Number(inv.net_amount) || 0)
        );
      }
    });

    // 2. Process Suppliers (Returns-based)
    rtsData.forEach((rts: any) => {
      if (rts.supplier_id) {
        // LIVE READY: Directus often returns objects for foreign keys
        const suppId =
          typeof rts.supplier_id === "object"
            ? String(rts.supplier_id.id)
            : String(rts.supplier_id);
        activeSuppliersSet.add(suppId);
      }
    });

    // 3. Process Product Volumes
    const detailsMap = new Map();
    invoiceDetails.forEach((det: any) => {
      const invNo = String(det.invoice_no);
      if (!detailsMap.has(invNo)) detailsMap.set(invNo, []);
      detailsMap.get(invNo).push(det);
    });

    invoices.forEach((inv: any) => {
      const relatedDetails = detailsMap.get(String(inv.invoice_id)) || [];
      relatedDetails.forEach((det: any) => {
        if (det.product_id) {
          const pId = String(det.product_id);
          activeProductsSet.add(pId);
          productVolumeMap.set(
            pId,
            (productVolumeMap.get(pId) || 0) + (Number(det.quantity) || 0)
          );
        }
      });
    });

    // 4. Coverage Metrics
    const sariSariIds = storeTypes
      .filter((st: any) => st.store_type?.toLowerCase().includes("sari"))
      .map((st: any) => st.id);
    const restoIds = storeTypes
      .filter(
        (st: any) =>
          st.store_type?.toLowerCase().includes("resto") ||
          st.store_type?.toLowerCase().includes("restaurant")
      )
      .map((st: any) => st.id);

    const sariSariCustomers = customers.filter((c: any) =>
      sariSariIds.includes(c.store_type)
    );
    const restoCustomers = customers.filter((c: any) =>
      restoIds.includes(c.store_type)
    );

    const sariInvoiced = sariSariCustomers.filter((c: any) =>
      invoicedCustomerCodes.has(c.customer_code)
    ).length;
    const restoInvoiced = restoCustomers.filter((c: any) =>
      invoicedCustomerCodes.has(c.customer_code)
    ).length;

    const totalReturnAmt = returns.reduce(
      (acc: number, curr: any) => acc + (Number(curr.total_amount) || 0),
      0
    );
    const returnRate =
      totalNetSales > 0
        ? (((totalReturnAmt + totalDiscounts) / totalNetSales) * 100).toFixed(2)
        : "0.00";

    return NextResponse.json({
      success: true,
      data: {
        activeSalesmen: activeSalesmenSet.size,
        topProductsCount: activeProductsSet.size,
        suppliersCount: activeSuppliersSet.size,
        returnRate,
        strikeRate:
          customers.length > 0
            ? ((invoicedCustomerCodes.size / customers.length) * 100).toFixed(1)
            : "0.0",
        coverage: {
          sariPercent:
            sariSariCustomers.length > 0
              ? Math.round((sariInvoiced / sariSariCustomers.length) * 100)
              : 0,
          restoPercent:
            restoCustomers.length > 0
              ? Math.round((restoInvoiced / restoCustomers.length) * 100)
              : 0,
        },
        salesmanRanking: salesmen
          .filter((s: any) => s.isActive === 1)
          .map((s: any) => ({
            name: s.salesman_name,
            amount: salesmanSalesMap.get(String(s.id)) || 0,
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5),
        topProducts: products
          .filter((p: any) => p.isActive === 1)
          .map((p: any) => ({
            name: p.product_name,
            cases: productVolumeMap.get(String(p.product_id)) || 0,
          }))
          .sort((a, b) => b.cases - a.cases)
          .slice(0, 5),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
