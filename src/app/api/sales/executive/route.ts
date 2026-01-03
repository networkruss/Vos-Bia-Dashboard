import { NextResponse } from "next/server";
const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://100.110.197.61:8056";

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

function normalizeDate(d: string | null) {
  if (!d) return null;
  // Handle DD/MM/YYYY format
  if (d.includes("/")) {
    const parts = d.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  return d;
}

const toFixed = (num: number) => Math.round(num * 100) / 100;

function isTruthy(field: any) {
  if (field === true || field === 1 || field === "1") return true;
  if (field && typeof field === "object" && field.data && field.data[0] === 1)
    return true;
  return false;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = normalizeDate(searchParams.get("fromDate"));
    const toDate = normalizeDate(searchParams.get("toDate"));
    const rawDiv = searchParams.get("division");
    const divisionFilter = rawDiv === "all" ? null : rawDiv;

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

    // --- 1. BUILD MAPS & DATE FILTERING ---
    const invoiceMap = new Map<string, any>();
    const filteredInvoiceIds = new Set<string>(); // IDs inside the selected date range

    // Sets to track months for different views
    const filteredMonthSet = new Set<string>(); // For Heatmap columns (matches date range)
    const trendMonthSet = new Set<string>(); // For Trend Chart (matches all history)

    invoices.forEach((i: any) => {
      if (!i.invoice_date) return;
      const d = i.invoice_date.substring(0, 10);
      const month = i.invoice_date.substring(0, 7);

      invoiceMap.set(i.invoice_id, i);

      // Always add to trend set (Historical)
      trendMonthSet.add(month);

      // Check strict date filter for KPIs/Heatmaps
      const isWithinDate =
        (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
      if (isWithinDate) {
        filteredInvoiceIds.add(i.invoice_id);
        filteredMonthSet.add(month);
      }
    });

    const sortedFilteredMonths = Array.from(filteredMonthSet).sort();
    const sortedTrendMonths = Array.from(trendMonthSet).sort();

    // Mappings
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

    // --- Aggregation Containers ---
    const heatmapMap = new Map<string, Map<string, any>>();
    const supplierChartMap = new Map<string, Map<string, number>>();
    const divisionTotals = new Map<string, number>();

    // Trend Map (Unfiltered Dates)
    const trendMap = new Map<string, number>();
    sortedTrendMonths.forEach((m) => trendMap.set(m, 0));

    // KPI Division Stats (Filtered Dates)
    const divisionStats = new Map<
      string,
      { sales: number; returns: number; cogs: number; collections: number }
    >();

    // Initialize Divisions
    const standardDivisions = [
      "Dry Goods",
      "Industrial",
      "Mama Pina's",
      "Frozen Goods",
      "Unassigned",
    ];
    standardDivisions.forEach((name) => {
      divisionStats.set(name, {
        sales: 0,
        returns: 0,
        cogs: 0,
        collections: 0,
      });
      divisionTotals.set(name, 0);
    });
    divisions.forEach((d: any) => {
      const name = String(d.division_name || d.division);
      if (name && !divisionStats.has(name)) {
        divisionStats.set(name, {
          sales: 0,
          returns: 0,
          cogs: 0,
          collections: 0,
        });
        divisionTotals.set(name, 0);
      }
    });

    let grandTotalSales = 0;
    let grandTotalReturns = 0;
    let grandTotalCOGS = 0;

    // --- Process Sales ---
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

      // Division Fallback Logic
      if (!division || division === "Unassigned") {
        if (supplier === "VOS" || supplier === "VOS BIA")
          division = "Dry Goods";
        else if (supplier === "Mama Pina's") division = "Mama Pina's";
        else if (
          supplier === "Industrial Corp" ||
          (typeof supplier === "string" && supplier.includes("Industrial"))
        )
          division = "Industrial";
        else if (supplier && supplier !== "No Supplier")
          division = "Frozen Goods";
        else division = "Unassigned";
      }

      // 1. GLOBAL DIVISION FILTER: Applies to everything (Trend AND KPIs)
      if (divisionFilter && division !== divisionFilter) return;

      // Calculations
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
      const month = inv.invoice_date.substring(0, 7);

      // --- A. TREND AGGREGATION (Unfiltered by Date) ---
      // We add to the trend map regardless of the date selection
      trendMap.set(month, (trendMap.get(month) || 0) + net);

      // --- B. KPI & TABLE AGGREGATION (Filtered by Date) ---
      // Only proceed if this invoice passed the date filter
      if (filteredInvoiceIds.has(inv.invoice_id)) {
        // Accumulate Global Totals
        grandTotalSales += net;
        grandTotalReturns += returnAmount;
        grandTotalCOGS += cogs;

        // Division Stats & Bar Chart
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

        divisionTotals.set(division, (divisionTotals.get(division) || 0) + net);

        if (net !== 0) {
          // Heatmap
          if (!heatmapMap.has(division)) heatmapMap.set(division, new Map());
          const divMap = heatmapMap.get(division)!;
          if (!divMap.has(supplier)) {
            const row: any = { supplier, total: 0 };
            sortedFilteredMonths.forEach((m) => (row[m] = 0));
            divMap.set(supplier, row);
          }
          const hRow = divMap.get(supplier)!;
          if (hRow[month] !== undefined) hRow[month] += net;
          hRow.total += net;

          // Supplier Chart
          if (!supplierChartMap.has(division))
            supplierChartMap.set(division, new Map());
          const chartMap = supplierChartMap.get(division)!;
          chartMap.set(supplier, (chartMap.get(supplier) || 0) + net);
        }
      }
    });

    // --- Process Collections (Filtered by Date for KPIs) ---
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
      grandTotalCollected += amount;

      if (!divisionStats.has(colDivision))
        divisionStats.set(colDivision, {
          sales: 0,
          returns: 0,
          cogs: 0,
          collections: 0,
        });
      divisionStats.get(colDivision)!.collections += amount;
    });

    // --- KPI Calculations ---
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

    // --- Format Response ---
    const heatmapFinal: any = {};
    for (const [divName, sMap] of heatmapMap.entries()) {
      heatmapFinal[divName] = Array.from(sMap.values())
        .map((row) => {
          row.total = toFixed(row.total);
          // Ensure null/undefined months are 0
          sortedFilteredMonths.forEach((m) => {
            if (row[m] === undefined) row[m] = 0;
            row[m] = toFixed(row[m]);
          });
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
      .filter((d) => d.division !== "Unassigned" || d.netSales > 0)
      .sort((a, b) => b.netSales - a.netSales);

    // Format Trend (Using Unfiltered Data)
    // We map over sortedTrendMonths (All History) instead of sortedFilteredMonths
    const salesTrendFormatted = sortedTrendMonths.map((month) => ({
      date: month,
      netSales: toFixed(trendMap.get(month) || 0),
    }));

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
