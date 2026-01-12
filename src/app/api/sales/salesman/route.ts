import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.DIRECTUS_URL;

async function fetchAll(endpoint: string, params: string = "") {
  try {
    const url = `${DIRECTUS_URL}/items/${endpoint}?limit=-1${params}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const [
      salesmen,
      invoices,
      returns,
      customers,
      storeTypes,
      products,
      suppliers,
    ] = await Promise.all([
      fetchAll("salesman", "&fields=id,salesman_name"),
      fetchAll(
        "sales_invoice",
        `&fields=total_amount,invoice_date,salesman_id,product_id,quantity&filter[invoice_date][_between]=[${fromDate},${toDate}]`
      ),
      fetchAll(
        "sales_return",
        `&fields=total_amount,return_date,salesman_id&filter[return_date][_between]=[${fromDate},${toDate}]`
      ),
      fetchAll("customer", "&fields=id,store_type"),
      fetchAll("store_type", "&fields=id,store_type"),
      fetchAll("products", "&fields=product_id,product_name"),
      fetchAll("suppliers", "&fields=id,supplier_name"),
    ]);

    // 1. Calculate Total Returns per Salesman
    const salesmanReturnsMap = new Map();
    let globalTotalReturns = 0;

    returns.forEach((ret: any) => {
      const returnAmt = Number(ret.total_amount) || 0;
      globalTotalReturns += returnAmt;

      const current = salesmanReturnsMap.get(ret.salesman_id) || 0;
      salesmanReturnsMap.set(ret.salesman_id, current + returnAmt);
    });

    // 2. Calculate Gross Sales and Net Ranking
    const salesmanSalesMap = new Map();
    let globalTotalGrossSales = 0;

    invoices.forEach((inv: any) => {
      const saleAmt = Number(inv.total_amount) || 0;
      globalTotalGrossSales += saleAmt;

      const current = salesmanSalesMap.get(inv.salesman_id) || 0;
      salesmanSalesMap.set(inv.salesman_id, current + saleAmt);
    });

    // Ranking Logic: (Gross Sales - Returns)
    const salesmanRanking = salesmen
      .map((s: any) => {
        const gross = salesmanSalesMap.get(s.id) || 0;
        const totalRet = salesmanReturnsMap.get(s.id) || 0;
        return {
          name: s.salesman_name,
          amount: gross - totalRet, // Ito ang Net Sales
          target: "92%",
        };
      })
      .sort((a: any, b: any) => b.amount - a.amount)
      .slice(0, 5);

    // 3. Dynamic Return Rate Calculation
    // Formula: (Total Return Amount / Total Gross Sales) * 100
    const returnRate =
      globalTotalGrossSales > 0
        ? ((globalTotalReturns / globalTotalGrossSales) * 100).toFixed(2)
        : "0.00";

    // 4. Product Volume Tracking
    const productVolumeMap = new Map();
    invoices.forEach((inv: any) => {
      const qty = Number(inv.quantity) || 0;
      const current = productVolumeMap.get(inv.product_id) || 0;
      productVolumeMap.set(inv.product_id, current + qty);
    });

    const topProducts = products
      .map((p: any) => ({
        name: p.product_name,
        cases: productVolumeMap.get(p.product_id) || 0,
      }))
      .sort((a: any, b: any) => b.cases - a.cases)
      .slice(0, 5);

    // 5. Coverage breakdown
    const storeTypeMap = new Map(
      storeTypes.map((st: any) => [String(st.id), st.store_type])
    );
    let sariSari = 0,
      restaurants = 0;
    customers.forEach((c: any) => {
      const typeId =
        typeof c.store_type === "object" ? c.store_type?.id : c.store_type;
      const name = storeTypeMap.get(String(typeId))?.toLowerCase() || "";
      if (name.includes("sari")) sariSari++;
      else if (name.includes("restau")) restaurants++;
    });

    return NextResponse.json({
      success: true,
      data: {
        activeSalesmen: salesmen.length,
        topProductsCount: products.length,
        suppliersCount: suppliers.length,
        returnRate: Number(returnRate),
        strikeRate: invoices.length > 0 ? 68.5 : 0,
        coverage: {
          sariSari,
          restaurants,
          total: customers.length,
          sariPercent: customers.length
            ? Math.round((sariSari / customers.length) * 100)
            : 0,
          restoPercent: customers.length
            ? Math.round((restaurants / customers.length) * 100)
            : 0,
        },
        salesmanRanking,
        topProducts,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
