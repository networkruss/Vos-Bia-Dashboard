import { NextResponse } from "next/server";
const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://100.110.197.61:8091";

/* -------------------------------------------------------------------------- */
/* FETCH HELPERS                                                              */
/* -------------------------------------------------------------------------- */

async function fetchAll<T = any>(url: string): Promise<T[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 mins

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as T[]) || [];
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeDate(d: string | null) {
  if (!d) return null;

  // Handle DD/MM/YYYY format (Common in PH)
  if (d.includes("/")) {
    const parts = d.split("/");
    if (parts.length === 3) {
      // Assuming DD/MM/YYYY based on your usage (01/12/2025)
      // We convert to ISO YYYY-MM-DD for string comparison
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  return d; // Assume already YYYY-MM-DD
}

const toFixed = (num: number) => Math.round(num * 100) / 100;

function isTruthy(field: any) {
  if (field === true || field === 1 || field === "1") return true;
  if (field && typeof field === "object" && field.data && field.data[0] === 1)
    return true;
  return false;
}

/* -------------------------------------------------------------------------- */
/* MAIN ROUTE                                                                 */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = normalizeDate(searchParams.get("fromDate"));
    const toDate = normalizeDate(searchParams.get("toDate"));
    const rawDiv = searchParams.get("division");
    const divisionFilter = rawDiv === "all" ? null : rawDiv;

    /* ---------------------------------------------------------------------- */
    /* LOAD DATA                                                              */
    /* ---------------------------------------------------------------------- */

    const [
      invoices,
      details,
      products,
      pps,
      suppliers,
      salesmen,
      divisions,
      returns,
      returnDetails,
      collections,
    ] = await Promise.all([
      fetchAll(`${DIRECTUS_URL}/items/sales_invoice?limit=-1`),
      fetchAll(`${DIRECTUS_URL}/items/sales_invoice_details?limit=-1`),
      fetchAll(`${DIRECTUS_URL}/items/products?limit=-1`),
      fetchAll(`${DIRECTUS_URL}/items/product_per_supplier?limit=-1`),
      fetchAll(`${DIRECTUS_URL}/items/suppliers?limit=-1`),
      fetchAll(`${DIRECTUS_URL}/items/salesman?limit=-1`),
      fetchAll(`${DIRECTUS_URL}/items/division?limit=-1`),
      fetchAll(`${DIRECTUS_URL}/items/sales_return?limit=-1`),
      fetchAll(`${DIRECTUS_URL}/items/sales_return_details?limit=-1`),
      fetchAll(`${DIRECTUS_URL}/items/collection?limit=-1`),
    ]);

    /* ---------------------------------------------------------------------- */
    /* BUILD MAPS                                                             */
    /* ---------------------------------------------------------------------- */

    const monthSet = new Set<string>();
    const invoiceMap = new Map<string, any>();

    invoices.forEach((i: any) => {
      if (!i.invoice_date) return;
      const d = i.invoice_date.substring(0, 10);

      // Strict Date Filtering
      if (fromDate && d < fromDate) return;
      if (toDate && d > toDate) return;

      invoiceMap.set(i.invoice_id, i);
      monthSet.add(i.invoice_date.substring(0, 7));
    });

    const sortedMonths = Array.from(monthSet).sort();

    const productParentMap = new Map<string | number, string | number>(
      products.map((p: any) => {
        const parentId =
          p.parent_id === 0 || p.parent_id === null
            ? p.product_id
            : p.parent_id;
        return [p.product_id, parentId];
      })
    );

    const productCostMap = new Map<string | number, number>(
      products.map((p: any) => [
        p.product_id,
        Number(p.cost_per_unit) || Number(p.estimated_unit_cost) || 0,
      ])
    );

    const primarySupplierMap = new Map<string | number, string | number>();
    pps
      .sort((a: any, b: any) => (a.id || 0) - (b.id || 0))
      .forEach((r: any) => {
        if (!primarySupplierMap.has(r.product_id)) {
          primarySupplierMap.set(r.product_id, r.supplier_id);
        }
      });

    const supplierNameMap = new Map<string, string>(
      suppliers.map((s: any) => [String(s.id), String(s.supplier_name)])
    );

    const salesmanDivisionMap = new Map<string, string>(
      salesmen.map((s: any) => [String(s.id), String(s.division_id)])
    );

    const divisionNameMap = new Map<string, string>(
      divisions.map((d: any) => [
        String(d.division_id),
        String(d.division_name),
      ])
    );

    const returnItemMap = new Map<string, { total: number; disc: number }>();
    returnDetails.forEach((rd: any) => {
      const parent = returns.find((r: any) => r.return_number === rd.return_no);
      if (!parent) return;
      const masterProduct =
        productParentMap.get(rd.product_id) || rd.product_id;
      const key = `${parent.order_id}_${parent.invoice_no}_${masterProduct}`;
      const cur = returnItemMap.get(key) || { total: 0, disc: 0 };
      returnItemMap.set(key, {
        total: cur.total + (+rd.total_amount || 0),
        disc: cur.disc + (+rd.discount_amount || 0),
      });
    });

    /* ---------------------------------------------------------------------- */
    /* AGGREGATION CONTAINERS                                                 */
    /* ---------------------------------------------------------------------- */

    const heatmapMap = new Map<string, Map<string, any>>();
    const supplierChartMap = new Map<string, Map<string, number>>();
    const divisionTotals = new Map<string, number>();

    const monthlyStats = new Map<
      string,
      { sales: number; returns: number; cogs: number; collections: number }
    >();
    sortedMonths.forEach((m) => {
      monthlyStats.set(m, { sales: 0, returns: 0, cogs: 0, collections: 0 });
    });

    const divisionStats = new Map<
      string,
      { sales: number; returns: number; cogs: number; collections: number }
    >();
    divisions.forEach((d: any) => {
      const name = String(d.division_name || d.division);
      if (name) {
        divisionTotals.set(name, 0);
        divisionStats.set(name, {
          sales: 0,
          returns: 0,
          cogs: 0,
          collections: 0,
        });
      }
    });
    // Ensure standard divisions exist in stats even if DB list is partial
    [
      "Dry Goods",
      "Industrial",
      "Mama Pina's",
      "Frozen Goods",
      "Unassigned",
    ].forEach((name) => {
      if (!divisionStats.has(name))
        divisionStats.set(name, {
          sales: 0,
          returns: 0,
          cogs: 0,
          collections: 0,
        });
    });

    let grandTotalSales = 0;
    let grandTotalReturns = 0;
    let grandTotalCOGS = 0;

    /* ---------------------------------------------------------------------- */
    /* PROCESS SALES DETAILS                                                  */
    /* ---------------------------------------------------------------------- */

    details.forEach((det: any) => {
      const invId =
        typeof det.invoice_no === "object"
          ? det.invoice_no?.id
          : det.invoice_no;
      const inv = invoiceMap.get(invId);
      if (!inv) return;

      const masterProduct =
        productParentMap.get(det.product_id) || det.product_id;
      const supplierId = String(primarySupplierMap.get(masterProduct));
      const supplierRaw = supplierNameMap.get(supplierId);
      const supplier =
        typeof supplierRaw === "string" ? supplierRaw : "No Supplier";

      const divisionId = salesmanDivisionMap.get(String(inv.salesman_id));
      let division = divisionId ? divisionNameMap.get(divisionId) : undefined;

      // --- IMPROVED FALLBACK LOGIC ---
      if (!division || division === "Unassigned") {
        if (supplier === "VOS" || supplier === "VOS BIA")
          division = "Dry Goods";
        else if (supplier === "Mama Pina's") division = "Mama Pina's";
        else if (
          supplier === "Industrial Corp" ||
          (typeof supplier === "string" && supplier.includes("Industrial"))
        )
          division = "Industrial";
        // CRITICAL FIX: Only default to "Frozen Goods" if we have a valid supplier that is NOT matched above.
        // If supplier is "No Supplier", put it in "Unassigned" so it doesn't inflate Frozen Goods.
        else if (supplier && supplier !== "No Supplier")
          division = "Frozen Goods";
        else division = "Unassigned";
      }

      if (divisionFilter && division !== divisionFilter) return;

      const month = inv.invoice_date.substring(0, 7);
      const retKey = `${inv.order_id}_${inv.invoice_no}_${masterProduct}`;
      const ret = returnItemMap.get(retKey) || { total: 0, disc: 0 };
      const returnAmount = ret.total - ret.disc;
      const net =
        (+det.total_amount || 0) - (+det.discount_amount || 0) - returnAmount;

      const unitCost = Number(productCostMap.get(det.product_id) || 0);
      const unitPrice = +det.unit_price || 0;
      const returnedQtyApprox = unitPrice > 0 ? returnAmount / unitPrice : 0;
      const netQty = (+det.quantity || 0) - returnedQtyApprox;
      const cogs = unitCost * netQty;

      // Accumulate
      grandTotalSales += net;
      grandTotalReturns += returnAmount;
      grandTotalCOGS += cogs;

      // Division Stats
      if (!divisionStats.has(division))
        divisionStats.set(division, {
          sales: 0,
          returns: 0,
          cogs: 0,
          collections: 0,
        });
      const dStat = divisionStats.get(division)!;
      dStat.sales += net;
      dStat.returns += returnAmount;
      dStat.cogs += cogs;

      // Division Totals for Bar Chart
      divisionTotals.set(division, (divisionTotals.get(division) || 0) + net);

      // Monthly Stats
      const mStat = monthlyStats.get(month);
      if (mStat) {
        mStat.sales += net;
        mStat.returns += returnAmount;
        mStat.cogs += cogs;
      }

      if (net === 0) return;

      // Heatmap
      if (!heatmapMap.has(division)) heatmapMap.set(division, new Map());
      const divMap = heatmapMap.get(division)!;
      if (!divMap.has(supplier)) {
        const row: any = { supplier, total: 0 };
        sortedMonths.forEach((m) => (row[m] = 0));
        divMap.set(supplier, row);
      }
      const hRow = divMap.get(supplier)!;
      if (hRow[month] !== undefined) hRow[month] += net;
      hRow.total += net;

      // Chart
      if (!supplierChartMap.has(division))
        supplierChartMap.set(division, new Map());
      const chartMap = supplierChartMap.get(division)!;
      chartMap.set(supplier, (chartMap.get(supplier) || 0) + net);
    });

    /* ---------------------------------------------------------------------- */
    /* PROCESS COLLECTIONS                                                    */
    /* ---------------------------------------------------------------------- */

    let grandTotalCollected = 0;
    collections.forEach((col: any) => {
      if (!col.collection_date) return;
      const d = col.collection_date.substring(0, 10);
      if (fromDate && d < fromDate) return;
      if (toDate && d > toDate) return;
      if (isTruthy(col.isCancelled)) return;

      const divId = salesmanDivisionMap.get(String(col.salesman_id));
      const colDivision = divId
        ? divisionNameMap.get(divId) || "Unassigned"
        : "Unassigned";

      if (divisionFilter && colDivision !== divisionFilter) return;

      const amount = Number(col.totalAmount) || 0;
      const month = col.collection_date.substring(0, 7);

      grandTotalCollected += amount;

      if (!divisionStats.has(colDivision))
        divisionStats.set(colDivision, {
          sales: 0,
          returns: 0,
          cogs: 0,
          collections: 0,
        });
      divisionStats.get(colDivision)!.collections += amount;

      const mStat = monthlyStats.get(month);
      if (mStat) mStat.collections += amount;
    });

    /* ---------------------------------------------------------------------- */
    /* KPI CALCULATIONS                                                       */
    /* ---------------------------------------------------------------------- */

    let grossMargin = 0;
    if (grandTotalSales > 0)
      grossMargin =
        ((grandTotalSales - grandTotalCOGS) / grandTotalSales) * 100;

    let collectionRate = 0;
    if (grandTotalSales > 0)
      collectionRate = (grandTotalCollected / grandTotalSales) * 100;

    const kpiByDivision: any = {};
    divisionStats.forEach((val, key) => {
      let divGM = 0;
      if (val.sales > 0) divGM = ((val.sales - val.cogs) / val.sales) * 100;
      let divCR = 0;
      if (val.sales > 0) divCR = (val.collections / val.sales) * 100;

      kpiByDivision[key] = {
        totalNetSales: toFixed(val.sales),
        totalReturns: toFixed(val.returns),
        grossMargin: toFixed(divGM),
        collectionRate: toFixed(divCR),
      };
    });

    /* ---------------------------------------------------------------------- */
    /* FORMAT RESPONSE                                                        */
    /* ---------------------------------------------------------------------- */

    const heatmapFinal: any = {};
    for (const [divName, sMap] of heatmapMap.entries()) {
      heatmapFinal[divName] = Array.from(sMap.values())
        .map((row) => {
          row.total = toFixed(row.total);
          sortedMonths.forEach((m) => (row[m] = toFixed(row[m] || 0)));
          return row;
        })
        .sort((a, b) => b.total - a.total);
    }

    const chartFinal: any = {};
    for (const [divName, sMap] of supplierChartMap.entries()) {
      chartFinal[divName] = Array.from(sMap, ([name, netSales]) => ({
        name,
        netSales: toFixed(netSales),
      })).sort((a, b) => b.netSales - a.netSales);
    }

    // UPDATED: Show all divisions in the bar chart, even if 0, to confirm they are tracked.
    const divisionSalesFormatted = Array.from(
      divisionTotals,
      ([division, netSales]) => ({
        division,
        netSales: toFixed(netSales),
      })
    )
      .filter((d) => d.division !== "Unassigned" || d.netSales > 0) // Hide Unassigned if empty
      .sort((a, b) => b.netSales - a.netSales);

    // Formatted Trend Data
    const salesTrendFormatted = sortedMonths.map((month) => {
      const s = monthlyStats.get(month) || { sales: 0 };
      return {
        date: month,
        netSales: toFixed(s.sales),
      };
    });

    return NextResponse.json({
      kpi: {
        totalNetSales: toFixed(grandTotalSales),
        totalReturns: toFixed(grandTotalReturns),
        grossMargin: toFixed(grossMargin),
        collectionRate: toFixed(collectionRate),
      },
      kpiByDivision,
      divisionSales: divisionSalesFormatted,
      supplierSalesByDivision: chartFinal,
      heatmapDataByDivision: heatmapFinal,
      salesTrend: salesTrendFormatted,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Dashboard Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
