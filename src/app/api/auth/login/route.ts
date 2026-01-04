import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://100.110.197.61:8091";

// --- HELPERS ---

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

function normalizeDate(d: string | null) {
  if (!d) return null;
  if (d.includes("/")) {
    const [m, day, y] = d.split("/");
    return `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return d;
}

const toFixed = (num: number) => Math.round(num * 100) / 100;

// --- MAIN ROUTE ---

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = normalizeDate(searchParams.get("fromDate"));
    const toDate = normalizeDate(searchParams.get("toDate"));
    const divisionFilter = searchParams.get("division");

    // 1. FETCH DATA
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

    // 2. PREPARE LOOKUPS
    const invoiceMap = new Map();
    const monthSet = new Set<string>();

    invoices.forEach((i: any) => {
      if (!i.invoice_date) return;
      const d = i.invoice_date.substring(0, 10);
      if (fromDate && d < fromDate) return;
      if (toDate && d > toDate) return;

      invoiceMap.set(i.invoice_id, i);
      monthSet.add(i.invoice_date.substring(0, 7)); // YYYY-MM
    });

    const sortedMonths = Array.from(monthSet).sort();

    const productParentMap = new Map(
      products.map((p: any) => [p.product_id, p.parent_id || p.product_id])
    );

    // Optimized Supplier Lookup
    const primarySupplierMap = new Map();
    pps
      .sort((a: any, b: any) => (a.id || 0) - (b.id || 0))
      .forEach((r: any) => {
        if (!primarySupplierMap.has(r.product_id))
          primarySupplierMap.set(r.product_id, r.supplier_id);
      });

    const supplierNameMap = new Map(
      suppliers.map((s: any) => [String(s.id), s.supplier_name])
    );
    const salesmanDivisionMap = new Map(
      salesmen.map((s: any) => [String(s.id), String(s.division_id)])
    );
    const divisionNameMap = new Map(
      divisions.map((d: any) => [String(d.division_id), d.division_name])
    );

    // Returns Lookup
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

    // 3. AGGREGATION (FAST MAP APPROACH)
    // Structure: Map<Division, Map<Supplier, RowObject>>
    const heatmapMap = new Map<string, Map<string, any>>();
    const supplierChartMap = new Map<string, Map<string, number>>();
    const divisionTotals = new Map<string, number>();
    const monthlyTotals = new Map<string, number>();

    sortedMonths.forEach((m) => monthlyTotals.set(m, 0));
    let grandTotal = 0;

    details.forEach((det: any) => {
      const invId =
        typeof det.invoice_no === "object"
          ? det.invoice_no?.id
          : det.invoice_no;
      const inv = invoiceMap.get(invId);
      if (!inv) return;

      const divId = salesmanDivisionMap.get(String(inv.salesman_id));
      const division = String(divisionNameMap.get(divId) || "Unassigned");

      if (
        divisionFilter &&
        divisionFilter !== "all" &&
        division !== divisionFilter
      )
        return;

      const masterProduct =
        productParentMap.get(det.product_id) || det.product_id;
      const supplierId = String(primarySupplierMap.get(masterProduct));
      const supplier = String(supplierNameMap.get(supplierId) || "No Supplier");

      const retKey = `${inv.order_id}_${inv.invoice_no}_${masterProduct}`;
      const ret = returnItemMap.get(retKey) || { total: 0, disc: 0 };

      const net =
        (+det.total_amount || 0) -
        (+det.discount_amount || 0) -
        (ret.total - ret.disc);
      if (net === 0) return;

      // Aggregates
      grandTotal += net;
      const month = inv.invoice_date.substring(0, 7);

      monthlyTotals.set(month, (monthlyTotals.get(month) || 0) + net);
      divisionTotals.set(division, (divisionTotals.get(division) || 0) + net);

      // --- HEATMAP BUILDER ---
      if (!heatmapMap.has(division)) heatmapMap.set(division, new Map());
      const divMap = heatmapMap.get(division)!;

      if (!divMap.has(supplier)) {
        const row: any = { supplier, total: 0 }; // Consistent key "supplier"
        sortedMonths.forEach((m) => (row[m] = 0));
        divMap.set(supplier, row);
      }
      const hRow = divMap.get(supplier)!;
      hRow[month] += net;
      hRow.total += net;

      // --- CHART BUILDER ---
      if (!supplierChartMap.has(division))
        supplierChartMap.set(division, new Map());
      const cMap = supplierChartMap.get(division)!;
      cMap.set(supplier, (cMap.get(supplier) || 0) + net);
    });

    // 4. FORMAT RESPONSE
    const heatmapFinal: any = {};
    for (const [div, sMap] of heatmapMap.entries()) {
      heatmapFinal[div] = Array.from(sMap.values())
        .map((row) => {
          row.total = toFixed(row.total);
          sortedMonths.forEach((m) => (row[m] = toFixed(row[m])));
          return row;
        })
        .sort((a, b) => b.total - a.total); // Sort: Highest sales first
    }

    const chartFinal: any = {};
    for (const [div, sMap] of supplierChartMap.entries()) {
      chartFinal[div] = Array.from(sMap, ([name, netSales]) => ({
        name,
        netSales: toFixed(netSales),
      })).sort((a, b) => b.netSales - a.netSales);
    }

    return NextResponse.json({
      kpi: { totalNetSales: toFixed(grandTotal) },
      divisionSales: Array.from(divisionTotals, ([division, netSales]) => ({
        division,
        netSales: toFixed(netSales),
      })).sort((a, b) => b.netSales - a.netSales),
      supplierSalesByDivision: chartFinal,
      heatmapDataByDivision: heatmapFinal,
      salesTrend: sortedMonths.map((m) => ({
        date: m,
        netSales: toFixed(monthlyTotals.get(m) || 0),
      })),
    });
  } catch (err: any) {
    console.error("Exec Dashboard Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
