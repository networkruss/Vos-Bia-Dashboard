import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://100.110.197.61:8056";

// --- 1. DIVISION MAPPING RULES ---
const DIVISION_RULES: any = {
  "Dry Goods": {
    brands: [
      "Lucky Me",
      "Nescafe",
      "Kopiko",
      "Bear Brand",
      "Maggi",
      "Surf",
      "Downy",
      "Richeese",
      "Richoco",
      "Keratin",
      "KeratinPlus",
      "Dove",
      "Palmolive",
      "Safeguard",
      "Sunsilk",
      "Cream Silk",
      "Head & Shoulders",
      "Colgate",
      "Close Up",
      "Bioderm",
      "Casino",
      "Efficascent",
      "Great Taste",
      "Presto",
      "Tide",
      "Ariel",
      "Champion",
      "Callee",
      "Systemack",
      "Wings",
      "Pride",
      "Smart",
    ],
    sections: [
      "Grocery",
      "Canned",
      "Noodles",
      "Beverages",
      "Non-Food",
      "Personal Care",
      "Snacks",
      "Biscuits",
      "Candy",
      "Coffee",
      "Milk",
      "Powder",
    ],
  },
  "Frozen Goods": {
    brands: [
      "CDO",
      "Tender Juicy",
      "Mekeni",
      "Virginia",
      "Purefoods",
      "Aviko",
      "Swift",
      "Argentina",
      "Star",
      "Holiday",
      "Highland",
      "Bibbo",
      "Home Made",
      "Young Pork",
    ],
    sections: [
      "Frozen",
      "Meat",
      "Processed Meat",
      "Cold Cuts",
      "Ice Cream",
      "Hotdog",
      "Chicken",
      "Pork",
    ],
  },
  Industrial: {
    brands: [
      "Mama Sita",
      "Datu Puti",
      "Silver Swan",
      "Golden Fiesta",
      "LPG",
      "Solane",
      "Gasul",
      "Fiesta",
      "UFC",
      "Super Q",
      "Biguerlai",
      "Equal",
      "Jufran",
    ],
    sections: [
      "Condiments",
      "Oil",
      "Sacks",
      "Sugar",
      "Flour",
      "Industrial",
      "Gas",
      "Rice",
      "Salt",
    ],
  },
  "Mama Pina's": {
    brands: ["Mama Pina", "Mama Pinas", "Mama Pina's"],
    sections: ["Franchise", "Ready to Eat", "Kiosk", "Mama Pina", "MP"],
  },
};

// DIRECT SUPPLIER MAPPING (Expanded based on your screenshots)
const SUPPLIER_TO_DIVISION: any = {
  MEN2: "Dry Goods",
  "MEN2 MARKETING": "Dry Goods",
  PUREFOODS: "Frozen Goods",
  CDO: "Frozen Goods",
  INDUSTRIAL: "Industrial",
  "MAMA PINA": "Mama Pina's",
  VIRGINIA: "Frozen Goods",
  AVIKO: "Frozen Goods",
  MEKENI: "Frozen Goods",
  // Fallbacks for unknown customer/suppliers in screenshots (Usually Dry Goods distributors)
  TIONGSAN: "Dry Goods",
  CSI: "Dry Goods",
  TSH: "Dry Goods",
  JUMAPAS: "Dry Goods",
  COSTSAVER: "Dry Goods",
  "RISING SUN": "Dry Goods",
  MUNICIPAL: "Dry Goods",
};

const ALL_DIVISIONS = [
  "Dry Goods",
  "Frozen Goods",
  "Industrial",
  "Mama Pina's",
];

// --- HELPERS ---
async function fetchAll<T = any>(url: string): Promise<T[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);
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
    return [];
  }
}

function normalizeDate(d: string | null) {
  if (!d) return null;
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return d;
  return dateObj.toISOString().split("T")[0];
}

const toFixed = (num: number) => Math.round(num * 100) / 100;

// *** CRITICAL FIX: Robust Boolean Checker for MySQL BIT fields ***
// This handles 1, "1", true, and Buffer objects commonly returned by MySQL for BIT types
function isTrue(field: any) {
  if (field === true) return true;
  if (field === 1) return true;
  if (field === "1") return true;
  // Handle Buffer/Bit objects
  if (typeof field === "object" && field !== null) {
    if (field.data && field.data[0] === 1) return true;
    if (field.type === "Buffer" && field.data && field.data[0] === 1)
      return true;
  }
  return false;
}

function getDatesInRange(startDate: string, endDate: string) {
  const date = new Date(startDate);
  const end = new Date(endDate);
  const dates = [];
  while (date <= end) {
    dates.push(new Date(date).toISOString().split("T")[0]);
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawFrom = searchParams.get("fromDate");
    const rawTo = searchParams.get("toDate");
    const rawDiv = searchParams.get("division");

    const fromDate = normalizeDate(rawFrom);
    const toDate = normalizeDate(rawTo);
    const divisionFilter = rawDiv === "all" ? null : rawDiv;

    // --- FETCH DATA (Parallel) ---
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
      brands,
      sections,
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
      fetchAll(`${DIRECTUS_URL}/items/brand?limit=-1`),
      fetchAll(`${DIRECTUS_URL}/items/sections?limit=-1`),
    ]);

    // --- 1. BUILD MAPS ---
    const brandMap = new Map();
    brands.forEach((b: any) =>
      brandMap.set(b.brand_id, b.brand_name.toUpperCase())
    );

    const sectionMap = new Map();
    sections.forEach((s: any) =>
      sectionMap.set(s.section_id, s.section_name.toUpperCase())
    );

    const productMap = new Map();
    const productPriceMap = new Map();
    products.forEach((p: any) => {
      productMap.set(String(p.product_id), {
        ...p,
        brand_name: brandMap.get(p.product_brand) || "",
        section_name: sectionMap.get(p.product_section) || "",
      });
      // Use priceA or price_per_unit for return value estimation
      productPriceMap.set(
        String(p.product_id),
        Number(p.priceA) || Number(p.price_per_unit) || 0
      );
    });

    const supplierNameMap = new Map<string, string>(
      suppliers.map((s: any) => [String(s.id), String(s.supplier_name)])
    );

    const primarySupplierMap = new Map<string | number, string | number>();
    pps.forEach((r: any) => {
      if (!primarySupplierMap.has(r.product_id)) {
        primarySupplierMap.set(r.product_id, r.supplier_id);
      }
    });

    const salesmanDivisionMap = new Map<string, string>(
      salesmen.map((s: any) => [String(s.id), String(s.division_id)])
    );
    const divisionNameMap = new Map<string, string>(
      divisions.map((d: any) => [
        String(d.division_id),
        String(d.division_name),
      ])
    );

    // --- 2. DIVISION MATCHING LOGIC ---
    const getDivisionForProduct = (pId: string) => {
      const prod = productMap.get(String(pId));
      if (!prod) return "Dry Goods"; // Default fallback

      const pBrand = (prod.brand_name || "").toUpperCase();
      const pSection = (prod.section_name || "").toUpperCase();
      const pName = (prod.product_name || "").toUpperCase();

      // 1. Check Config Rules
      for (const [divName, rules] of Object.entries(DIVISION_RULES)) {
        const r = rules as any;
        if (
          r.brands.some(
            (b: string) =>
              pBrand.includes(b.toUpperCase()) ||
              pName.includes(b.toUpperCase())
          )
        )
          return divName;
        if (r.sections.some((s: string) => pSection.includes(s.toUpperCase())))
          return divName;
      }

      // 2. Check Supplier Name Mapping
      const suppId = primarySupplierMap.get(Number(pId));
      if (suppId) {
        const suppName =
          supplierNameMap.get(String(suppId))?.toUpperCase() || "";
        for (const [key, val] of Object.entries(SUPPLIER_TO_DIVISION)) {
          if (suppName.includes(key)) return val as string;
        }
      }

      // 3. Last Resort Fallback (Instead of Unassigned)
      if (pSection.includes("FROZEN") || pName.includes("HOTDOG"))
        return "Frozen Goods";
      return "Dry Goods"; // Default to biggest division
    };

    // --- 3. AGGREGATION SETUP ---
    const divisionTotals = new Map<string, number>();
    const trendMap = new Map<string, number>();
    const divisionStats = new Map<
      string,
      { sales: number; returns: number; cogs: number; collections: number }
    >();
    const heatmapMap = new Map<string, Map<string, any>>();
    const supplierChartMap = new Map<string, Map<string, number>>();

    ALL_DIVISIONS.forEach((div) => {
      divisionStats.set(div, { sales: 0, returns: 0, cogs: 0, collections: 0 });
      divisionTotals.set(div, 0);
    });

    let grandTotalSales = 0;
    let grandTotalReturns = 0;
    let grandTotalCOGS = 0;
    let grandTotalCollected = 0;

    const invoiceLookup = new Map();
    const filteredInvoiceIds = new Set<string>();
    const sortedFilteredMonths = new Set<string>();

    // --- 4. PROCESS INVOICES (Sales Header) ---
    invoices.forEach((inv: any) => {
      if (!inv.invoice_date) return;
      const d = inv.invoice_date.substring(0, 10);

      if (fromDate && d < fromDate) return;
      if (toDate && d > toDate) return;

      // Note: We use details for accurate division split, so we don't sum grandTotal here if splitting
      invoiceLookup.set(inv.invoice_id, inv);
      filteredInvoiceIds.add(inv.invoice_id);
    });

    // --- 5. PROCESS DETAILS (Division Logic) ---
    details.forEach((det: any) => {
      const invId =
        typeof det.invoice_no === "object"
          ? det.invoice_no?.id
          : det.invoice_no;
      if (!filteredInvoiceIds.has(invId)) return;

      const inv = invoiceLookup.get(invId);
      const d = inv.invoice_date.substring(0, 10);
      const month = inv.invoice_date.substring(0, 7);
      sortedFilteredMonths.add(month);

      const pId = String(det.product_id);
      const division = getDivisionForProduct(pId);

      // GLOBAL FILTER
      if (divisionFilter && division !== divisionFilter) return;

      const netDetail = (+det.total_amount || 0) - (+det.discount_amount || 0);
      const unitCost = Number(productMap.get(pId)?.estimated_unit_cost || 0);
      const qty = Number(det.quantity) || 0;
      const cogs = unitCost * qty;

      // Sum
      grandTotalSales += netDetail;
      grandTotalCOGS += cogs;
      divisionTotals.set(
        division,
        (divisionTotals.get(division) || 0) + netDetail
      );
      trendMap.set(d, (trendMap.get(d) || 0) + netDetail);

      if (divisionStats.has(division)) {
        const stats = divisionStats.get(division)!;
        stats.sales += netDetail;
        stats.cogs += cogs;
      }

      // Supplier Charts
      const supplierId = String(primarySupplierMap.get(Number(pId)));
      const supplier = supplierNameMap.get(supplierId) || "Internal / Others";

      if (netDetail > 0) {
        if (!heatmapMap.has(division)) heatmapMap.set(division, new Map());
        const divMap = heatmapMap.get(division)!;
        if (!divMap.has(supplier)) divMap.set(supplier, { supplier, total: 0 });
        divMap.get(supplier)![month] =
          (divMap.get(supplier)![month] || 0) + netDetail;
        divMap.get(supplier)!.total += netDetail;

        if (!supplierChartMap.has(division))
          supplierChartMap.set(division, new Map());
        const chMap = supplierChartMap.get(division)!;
        chMap.set(supplier, (chMap.get(supplier) || 0) + netDetail);
      }
    });

    // --- 6. PROCESS RETURNS (Time-Based) ---
    // Returns logic is often disconnected from invoice ID in DBs, so we use Date Range on the Return itself.
    const validReturnIds = new Set();
    returns.forEach((ret: any) => {
      if (!ret.return_date) return;
      const d = ret.return_date.substring(0, 10);
      if (fromDate && d < fromDate) return;
      if (toDate && d > toDate) return;
      validReturnIds.add(ret.return_number);
    });

    returnDetails.forEach((rd: any) => {
      if (!validReturnIds.has(rd.return_no)) return;

      const pId = String(rd.product_id);
      const qty = Number(rd.quantity) || 0;

      // Use price from product mapping to estimate value if not in return detail
      const price = productPriceMap.get(pId) || 0;
      const returnVal = qty * price;

      const div = getDivisionForProduct(pId);
      if (divisionFilter && div !== divisionFilter) return;

      grandTotalReturns += returnVal;

      if (divisionStats.has(div)) {
        divisionStats.get(div)!.returns += returnVal;
      }
    });

    // --- 7. PROCESS COLLECTIONS (Fixed Boolean Logic) ---
    collections.forEach((col: any) => {
      // Skip only if strictly Cancelled
      if (isTrue(col.isCancelled)) return;

      if (!col.collection_date) return;
      const d = col.collection_date.substring(0, 10);

      // Date Filter (Collections use their own date, not invoice date)
      if (fromDate && d < fromDate) return;
      if (toDate && d > toDate) return;

      const amount = Number(col.totalAmount) || 0;

      // Division Logic for Collections
      // Since collections are per Salesman, we map Salesman -> Division
      const sId = String(col.salesman_id);
      const divId = salesmanDivisionMap.get(sId);
      let colDiv = divId
        ? divisionNameMap.get(divId) || "Dry Goods"
        : "Dry Goods";

      // Name Normalization
      if (colDiv === "Frozen") colDiv = "Frozen Goods";
      if (colDiv === "Dry") colDiv = "Dry Goods";
      if (!ALL_DIVISIONS.includes(colDiv)) colDiv = "Dry Goods"; // Default fallback

      if (divisionFilter && colDiv !== divisionFilter) return;

      grandTotalCollected += amount;

      if (divisionStats.has(colDiv)) {
        divisionStats.get(colDiv)!.collections += amount;
      }
    });

    // --- 8. RESULTS ---
    const netSales = grandTotalSales - grandTotalReturns;
    const grossMargin =
      netSales > 0 ? ((netSales - grandTotalCOGS) / netSales) * 100 : 0;
    const collectionRate =
      netSales > 0 ? (grandTotalCollected / netSales) * 100 : 0;

    const divisionSalesFormatted = Array.from(divisionTotals.entries())
      .map(([division, netSales]) => ({
        division,
        netSales: toFixed(netSales),
      }))
      .sort((a, b) => b.netSales - a.netSales);

    // Trend Data
    let salesTrendFormatted: any[] = [];
    if (fromDate && toDate) {
      salesTrendFormatted = getDatesInRange(fromDate, toDate).map((date) => ({
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        netSales: toFixed(trendMap.get(date) || 0),
      }));
    } else {
      salesTrendFormatted = Array.from(trendMap.entries())
        .sort()
        .map(([d, val]) => ({
          date: new Date(d).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          netSales: toFixed(val),
        }));
    }

    // Chart Data
    const chartFinal: any = {};
    for (const [divName, sMap] of supplierChartMap.entries()) {
      chartFinal[divName] = Array.from(sMap.entries())
        .map(([name, netSales]) => ({ name, netSales: toFixed(netSales) }))
        .sort((a, b) => b.netSales - a.netSales)
        .slice(0, 10);
    }

    const heatmapFinal: any = {};
    const monthList = Array.from(sortedFilteredMonths).sort();
    for (const [divName, sMap] of heatmapMap.entries()) {
      heatmapFinal[divName] = Array.from(sMap.values())
        .map((row) => {
          const newRow: any = {
            supplier: row.supplier,
            total: toFixed(row.total),
          };
          monthList.forEach((m) => (newRow[m] = toFixed(row[m] || 0)));
          return newRow;
        })
        .sort((a: any, b: any) => b.total - a.total);
    }

    const kpiByDivision: any = {};
    divisionStats.forEach((val, key) => {
      const divGM =
        val.sales > 0 ? ((val.sales - val.cogs) / val.sales) * 100 : 0;
      const divCR = val.sales > 0 ? (val.collections / val.sales) * 100 : 0;
      kpiByDivision[key] = {
        totalNetSales: toFixed(val.sales),
        totalReturns: toFixed(val.returns),
        grossMargin: toFixed(divGM),
        collectionRate: toFixed(divCR),
      };
    });

    return NextResponse.json({
      kpi: {
        totalNetSales: toFixed(netSales),
        totalReturns: toFixed(grandTotalReturns),
        grossMargin: toFixed(grossMargin),
        collectionRate: toFixed(collectionRate),
      },
      kpiByDivision,
      divisionSales: divisionSalesFormatted,
      salesTrend: salesTrendFormatted,
      supplierSalesByDivision: chartFinal,
      heatmapDataByDivision: heatmapFinal,
    });
  } catch (err: any) {
    console.error("API Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
