import { NextResponse } from "next/server";
const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://100.110.197.61:8091";

/* -------------------------------------------------------------------------- */
/* FETCH HELPERS                                                              */
/* -------------------------------------------------------------------------- */

async function fetchAll<T = any>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url, { cache: "no-store" });
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
  if (d.includes("/")) {
    const [m, day, y] = d.split("/");
    return `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return d;
}

const toFixed = (num: number) => Math.round(num * 100) / 100;

// Helper to check buffer/bit fields like isCancelled: { type: 'Buffer', data: [1] }
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
    const divisionFilter = searchParams.get("division");

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
      collections, // <--- NEW: Loaded Collections
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
      fetchAll(`${DIRECTUS_URL}/items/collection?limit=-1`), // <--- Fetching Collections
    ]);

    /* ---------------------------------------------------------------------- */
    /* BUILD MAPS                                                             */
    /* ---------------------------------------------------------------------- */

    const monthSet = new Set<string>();
    const invoiceMap = new Map<string, any>();

    invoices.forEach((i: any) => {
      if (!i.invoice_date) return;
      const d = i.invoice_date.substring(0, 10);
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

    /* ---------------------------------------------------------------------- */
    /* RETURNS MAPPING                                                        */
    /* ---------------------------------------------------------------------- */

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
    /* SALES AGGREGATION                                                      */
    /* ---------------------------------------------------------------------- */

    const heatmapMap = new Map<string, Map<string, any>>();
    const supplierChartMap = new Map<string, Map<string, number>>();
    const divisionTotals = new Map<string, number>();
    const monthlyTotals = new Map<string, number>();

    sortedMonths.forEach((m) => monthlyTotals.set(m, 0));

    // Initialize Divisions
    divisions.forEach((d: any) => {
      const name = String(d.division_name || d.division);
      if (name) {
        divisionTotals.set(name, 0);
      }
    });

    let grandTotal = 0;
    let grandTotalReturns = 0;
    let grandTotalCOGS = 0;

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

      // --- DIVISION LOGIC ---
      const divisionId = salesmanDivisionMap.get(String(inv.salesman_id));
      let division = divisionId ? divisionNameMap.get(divisionId) : undefined;

      // Fallback Logic
      if (!division || division === "Unassigned") {
        if (supplier === "VOS" || supplier === "VOS BIA") {
          division = "Dry Goods";
        } else if (supplier === "Mama Pina's") {
          division = "Mama Pina's";
        } else if (
          supplier === "Industrial Corp" ||
          (typeof supplier === "string" && supplier.includes("Industrial"))
        ) {
          division = "Industrial";
        } else {
          division = "Frozen Goods";
        }
      }

      if (
        divisionFilter &&
        divisionFilter !== "all" &&
        division !== divisionFilter
      )
        return;

      // Net Sales Calc
      const retKey = `${inv.order_id}_${inv.invoice_no}_${masterProduct}`;
      const ret = returnItemMap.get(retKey) || { total: 0, disc: 0 };
      const returnAmount = ret.total - ret.disc;

      grandTotalReturns += returnAmount;

      const net =
        (+det.total_amount || 0) - (+det.discount_amount || 0) - returnAmount;

      // COGS Calc
      const unitCost = Number(productCostMap.get(det.product_id) || 0);
      const unitPrice = +det.unit_price || 0;
      const returnedQtyApprox = unitPrice > 0 ? returnAmount / unitPrice : 0;
      const netQty = (+det.quantity || 0) - returnedQtyApprox;
      const cogs = unitCost * netQty;
      grandTotalCOGS += cogs;

      grandTotal += net;
      const month = inv.invoice_date.substring(0, 7);

      monthlyTotals.set(month, (monthlyTotals.get(month) || 0) + net);
      divisionTotals.set(division, (divisionTotals.get(division) || 0) + net);

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
      hRow[month] += net;
      hRow.total += net;

      // Chart
      if (!supplierChartMap.has(division))
        supplierChartMap.set(division, new Map<string, number>());
      const chartMap = supplierChartMap.get(division)!;
      chartMap.set(supplier, (chartMap.get(supplier) || 0) + net);
    });

    /* ---------------------------------------------------------------------- */
    /* COLLECTION AGGREGATION (NEW)                                           */
    /* ---------------------------------------------------------------------- */

    let totalCollected = 0;

    collections.forEach((col: any) => {
      // 1. Date Filter
      if (!col.collection_date) return;
      const d = col.collection_date.substring(0, 10);
      if (fromDate && d < fromDate) return;
      if (toDate && d > toDate) return;

      // 2. Ignore Cancelled Transactions
      if (isTruthy(col.isCancelled)) return;

      // 3. Division Filter
      // Note: Collections rely on Salesman mapping. Fallbacks based on Supplier
      // (like for sales) are not possible here as collections don't have supplier info.
      const divId = salesmanDivisionMap.get(String(col.salesman_id));
      const colDivision = divId
        ? divisionNameMap.get(divId) || "Unassigned"
        : "Unassigned";

      // If Global Filter is active, exclude collections not from that division
      if (
        divisionFilter &&
        divisionFilter !== "all" &&
        colDivision !== divisionFilter
      ) {
        return;
      }

      totalCollected += Number(col.totalAmount) || 0;
    });

    /* ---------------------------------------------------------------------- */
    /* FINAL KPI CALCULATIONS                                                 */
    /* ---------------------------------------------------------------------- */

    // Gross Margin
    let grossMargin = 0;
    if (grandTotal > 0) {
      grossMargin = ((grandTotal - grandTotalCOGS) / grandTotal) * 100;
    }

    // Collection Rate
    let collectionRate = 0;
    if (grandTotal > 0) {
      collectionRate = (totalCollected / grandTotal) * 100;
    }

    /* ---------------------------------------------------------------------- */
    /* FORMATTING RESPONSE                                                    */
    /* ---------------------------------------------------------------------- */

    const heatmapFinal: any = {};
    for (const [divName, sMap] of heatmapMap.entries()) {
      heatmapFinal[divName] = Array.from(sMap.values())
        .map((row) => {
          row.total = toFixed(row.total);
          sortedMonths.forEach((m) => (row[m] = toFixed(row[m])));
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

    const divisionSalesFormatted = Array.from(
      divisionTotals,
      ([division, netSales]) => ({
        division,
        netSales: toFixed(netSales),
      })
    )
      .filter((d) => d.netSales !== 0 || d.division === "Frozen Goods")
      .sort((a, b) => b.netSales - a.netSales);

    return NextResponse.json({
      kpi: {
        totalNetSales: toFixed(grandTotal),
        totalReturns: toFixed(grandTotalReturns),
        grossMargin: toFixed(grossMargin),
        collectionRate: toFixed(collectionRate), // Calculated!
      },
      divisionSales: divisionSalesFormatted,
      supplierSalesByDivision: chartFinal,
      heatmapDataByDivision: heatmapFinal,
      salesTrend: sortedMonths.map((month) => ({
        date: month,
        netSales: toFixed(monthlyTotals.get(month) || 0),
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Dashboard Error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
