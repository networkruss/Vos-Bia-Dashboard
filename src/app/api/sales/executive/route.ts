import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://100.110.197.61:8091";

/* -------------------------------------------------------------------------- */
/* FETCH HELPERS                                                              */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* DATE NORMALIZER & FORMATTER                                                */
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

    // NOTE: 'limit=-1' works if Directus is configured to allow it.
    // If data is missing, check Directus env LIMIT settings.
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
    ]);

    /* ---------------------------------------------------------------------- */
    /* BUILD MONTH LIST & INVOICE MAP                                         */
    /* ---------------------------------------------------------------------- */

    const monthSet = new Set<string>();
    const invoiceMap = new Map();

    invoices.forEach((i: any) => {
      // Basic validation
      if (!i.invoice_date) return;

      // Optional: Add "Status/Posted" check here if your system uses it
      // if (i.status !== 'posted' && i.isPosted !== true) return;

      const d = i.invoice_date.substring(0, 10);
      if (fromDate && d < fromDate) return;
      if (toDate && d > toDate) return;

      invoiceMap.set(i.invoice_id, i);
      monthSet.add(i.invoice_date.substring(0, 7)); // YYYY-MM
    });

    const sortedMonths = Array.from(monthSet).sort();

    /* ---------------------------------------------------------------------- */
    /* LOOKUP MAPS (Optimized for safe strings)                               */
    /* ---------------------------------------------------------------------- */

    const productParentMap = new Map(
      products.map((p: any) => [p.product_id, p.parent_id || p.product_id])
    );

    const primarySupplierMap = new Map();
    pps
      .sort((a: any, b: any) => (a.id || 0) - (b.id || 0)) // Prioritize first entry
      .forEach((r: any) => {
        if (!primarySupplierMap.has(r.product_id)) {
          primarySupplierMap.set(r.product_id, r.supplier_id);
        }
      });

    // Use String keys for safe lookups
    const supplierNameMap = new Map(
      suppliers.map((s: any) => [String(s.id), s.supplier_name])
    );

    const salesmanDivisionMap = new Map(
      salesmen.map((s: any) => [String(s.id), String(s.division_id)])
    );

    const divisionNameMap = new Map(
      divisions.map((d: any) => [String(d.division_id), d.division_name])
    );

    /* ---------------------------------------------------------------------- */
    /* RETURNS (Parent-Aware)                                                 */
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
    /* AGGREGATION LOOP (Optimized with Maps)                                 */
    /* ---------------------------------------------------------------------- */

    // Structure: Map<DivisionName, Map<SupplierName, RowObject>>
    const heatmapMap = new Map<string, Map<string, any>>();
    const supplierChartMap = new Map<string, Map<string, number>>();

    const divisionTotals = new Map<string, number>();
    const monthlyTotals = new Map<string, number>();

    sortedMonths.forEach((m) => monthlyTotals.set(m, 0));
    let grandTotal = 0;

    details.forEach((det: any) => {
      // Handle invoice linking (Directus sometimes returns object, sometimes ID)
      const invId =
        typeof det.invoice_no === "object"
          ? det.invoice_no?.id
          : det.invoice_no;

      const inv = invoiceMap.get(invId);
      if (!inv) return; // Invoice filtered out by date or invalid

      const divisionId = salesmanDivisionMap.get(String(inv.salesman_id));
      const division = divisionNameMap.get(divisionId) || "Unassigned";

      if (
        divisionFilter &&
        divisionFilter !== "all" &&
        division !== divisionFilter
      )
        return;

      const masterProduct =
        productParentMap.get(det.product_id) || det.product_id;
      const supplierId = String(primarySupplierMap.get(masterProduct));
      const supplier = supplierNameMap.get(supplierId) || "No Supplier";

      // Net Calc
      const retKey = `${inv.order_id}_${inv.invoice_no}_${masterProduct}`;
      const ret = returnItemMap.get(retKey) || { total: 0, disc: 0 };

      const net =
        (+det.total_amount || 0) -
        (+det.discount_amount || 0) -
        (ret.total - ret.disc);

      if (net === 0) return;

      // --- Aggregates ---
      grandTotal += net;
      const month = inv.invoice_date.substring(0, 7);

      monthlyTotals.set(month, (monthlyTotals.get(month) || 0) + net);
      divisionTotals.set(division, (divisionTotals.get(division) || 0) + net);

      // 1. Heatmap Aggregation (via Map)
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

      // 2. Chart Aggregation
      if (!supplierChartMap.has(division))
        supplierChartMap.set(division, new Map());
      const chartMap = supplierChartMap.get(division)!;
      chartMap.set(supplier, (chartMap.get(supplier) || 0) + net);
    });

    /* ---------------------------------------------------------------------- */
    /* FINAL FORMATTING & SORTING                                             */
    /* ---------------------------------------------------------------------- */

    // Transform Heatmap Map -> Sorted Array
    const heatmapFinal: any = {};
    for (const [divName, sMap] of heatmapMap.entries()) {
      heatmapFinal[divName] = Array.from(sMap.values())
        .map((row) => {
          row.total = toFixed(row.total);
          sortedMonths.forEach((m) => (row[m] = toFixed(row[m])));
          return row;
        })
        .sort((a, b) => b.total - a.total); // Sort High to Low
    }

    // Transform Chart Map -> Sorted Array
    const chartFinal: any = {};
    for (const [divName, sMap] of supplierChartMap.entries()) {
      chartFinal[divName] = Array.from(sMap, ([name, netSales]) => ({
        name,
        netSales: toFixed(netSales),
      })).sort((a, b) => b.netSales - a.netSales);
    }

    /* ---------------------------------------------------------------------- */
    /* RESPONSE                                                               */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json({
      kpi: {
        totalNetSales: toFixed(grandTotal),
        // Add placeholders if needed by frontend
        growthVsPrevious: 0,
        grossMargin: 0,
        collectionRate: 0,
      },
      divisionSales: Array.from(divisionTotals, ([division, netSales]) => ({
        division,
        netSales: toFixed(netSales),
      })).sort((a, b) => b.netSales - a.netSales),

      supplierSalesByDivision: chartFinal,
      heatmapDataByDivision: heatmapFinal,

      salesTrend: sortedMonths.map((month) => ({
        date: month,
        netSales: toFixed(monthlyTotals.get(month) || 0),
      })),
    });
  } catch (err: any) {
    console.error("Dashboard Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
