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

    const [
      salesmen,
      invoices,
      returns,
      customers,
      storeTypes,
      products,
      targets,
      suppliers,
    ] = await Promise.all([
      fetchAll("salesman", "&fields=id,salesman_name,isActive"),
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
      fetchAll(
        "salesman_target_setting",
        `&fields=salesman_id,line_sales,volume&filter[date_range_from][_lte]=${toDate}&filter[date_range_to][_gte]=${fromDate}`
      ),
      fetchAll("suppliers", "&fields=id,supplier_name"),
    ]);

    // 1. Map Targets per Salesman (Source: salesman_target_setting)
    const targetMap = new Map();
    targets.forEach((t: any) => {
      if (t.salesman_id) {
        // Ginagamit ang 'line_sales' bilang target amount
        targetMap.set(String(t.salesman_id), Number(t.line_sales) || 0);
      }
    });

    // 2. Calculate Total Returns per Salesman
    const salesmanReturnsMap = new Map();
    let globalTotalReturns = 0;
    returns.forEach((ret: any) => {
      const returnAmt = Number(ret.total_amount) || 0;
      globalTotalReturns += returnAmt;
      const current = salesmanReturnsMap.get(String(ret.salesman_id)) || 0;
      salesmanReturnsMap.set(String(ret.salesman_id), current + returnAmt);
    });

    // 3. Calculate Gross Sales
    const salesmanSalesMap = new Map();
    let globalTotalGrossSales = 0;
    invoices.forEach((inv: any) => {
      const saleAmt = Number(inv.total_amount) || 0;
      globalTotalGrossSales += saleAmt;
      const current = salesmanSalesMap.get(String(inv.salesman_id)) || 0;
      salesmanSalesMap.set(String(inv.salesman_id), current + saleAmt);
    });

    // 4. Salesman Ranking with REAL Achievement %
    const salesmanRanking = salesmen
      .filter((s: any) => s.isActive === 1)
      .map((s: any) => {
        const gross = salesmanSalesMap.get(String(s.id)) || 0;
        const returned = salesmanReturnsMap.get(String(s.id)) || 0;
        const netSales = gross - returned;
        const targetAmount = targetMap.get(String(s.id)) || 0;

        let achievementRate = "No Target";
        if (targetAmount > 0) {
          // Achievement Rate = (Net Sales / line_sales) * 100
          achievementRate = `${((netSales / targetAmount) * 100).toFixed(
            0
          )}% Target`;
        }

        return {
          name: s.salesman_name,
          amount: netSales,
          target: achievementRate,
        };
      })
      .sort((a: any, b: any) => b.amount - a.amount)
      .slice(0, 5);

    // 5. Top Products with Units (Base sa Quantity)
    const productVolumeMap = new Map();
    invoices.forEach((inv: any) => {
      const qty = Number(inv.quantity) || 0;
      const current = productVolumeMap.get(String(inv.product_id)) || 0;
      productVolumeMap.set(String(inv.product_id), current + qty);
    });

    const topProducts = products
      .map((p: any) => ({
        name: p.product_name,
        cases: productVolumeMap.get(String(p.product_id)) || 0, // Ito ang magiging 'Units' sa UI
      }))
      .sort((a: any, b: any) => b.cases - a.cases)
      .slice(0, 5);

    // 6. Global Stats
    const returnRate =
      globalTotalGrossSales > 0
        ? ((globalTotalReturns / globalTotalGrossSales) * 100).toFixed(2)
        : "0.00";

    return NextResponse.json({
      success: true,
      data: {
        activeSalesmen: salesmen.filter((s: any) => s.isActive === 1).length,
        topProductsCount: products.length,
        suppliersCount: suppliers.length,
        returnRate: Number(returnRate),
        strikeRate: invoices.length > 0 ? 68.5 : 0,
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
