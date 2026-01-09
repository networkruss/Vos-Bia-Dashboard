import { NextResponse } from "next/server";

const RAW_DIRECTUS_URL =
  process.env.DIRECTUS_URL || "http://100.110.197.61:8091";
const DIRECTUS_BASE = RAW_DIRECTUS_URL.replace(/\/+$/, "");

const DIRECTUS_TOKEN =
  process.env.DIRECTUS_TOKEN ||
  process.env.DIRECTUS_ACCESS_TOKEN ||
  process.env.DIRECTUS_STATIC_TOKEN ||
  "";

type DirectusErrorItem = {
  collection: string;
  status?: number;
  message: string;
  url: string;
};

// --- 1. DIVISION MAPPING RULES ---
const DIVISION_RULES: Record<string, { brands: string[]; sections: string[] }> =
  {
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
    Internal: {
      brands: ["Internal", "Office Supplies", "House Account", "VOS"],
      sections: ["Internal", "Office", "Supplies", "Use"],
    },
  };

const SUPPLIER_TO_DIVISION: Record<string, string> = {
  MEN2: "Dry Goods",
  "MEN2 MARKETING": "Dry Goods",
  PUREFOODS: "Frozen Goods",
  CDO: "Frozen Goods",
  INDUSTRIAL: "Industrial",
  "MAMA PINA": "Mama Pina's",
  VIRGINIA: "Frozen Goods",
  AVIKO: "Frozen Goods",
  MEKENI: "Frozen Goods",
  TIONGSAN: "Dry Goods",
  CSI: "Dry Goods",
  TSH: "Dry Goods",
  JUMAPAS: "Dry Goods",
  COSTSAVER: "Dry Goods",
  "RISING SUN": "Dry Goods",
  MUNICIPAL: "Dry Goods",
  INTERNAL: "Internal",
  VOS: "Internal",
};

const ALL_DIVISIONS = [
  "Dry Goods",
  "Frozen Goods",
  "Industrial",
  "Mama Pina's",
  "Internal",
] as const;

// --- HELPERS ---
function normalizeDate(d: string | null) {
  if (!d) return null;
  const dateObj = new Date(d);
  if (Number.isNaN(dateObj.getTime())) return d;
  return dateObj.toISOString().split("T")[0];
}

const toFixed = (num: number) => Math.round(num * 100) / 100;

function isTrue(field: any) {
  if (field === true) return true;
  if (field === 1) return true;
  if (field === "1") return true;
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
  const dates: string[] = [];
  while (date <= end) {
    dates.push(new Date(date).toISOString().split("T")[0]);
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

async function directusFetch<T>(
  url: string,
  errors: DirectusErrorItem[],
  collection: string
): Promise<T[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (DIRECTUS_TOKEN) headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;

    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      errors.push({
        collection,
        status: res.status,
        message: `Directus request failed. ${text}`,
        url,
      });
      return [];
    }

    const json = await res.json();
    return (json?.data as T[]) || [];
  } catch (e: any) {
    clearTimeout(timeoutId);
    errors.push({
      collection,
      status: undefined,
      message: e?.message || "Unknown fetch error",
      url,
    });
    return [];
  }
}

async function fetchAllPaged<T>(
  collection: string,
  fields: string,
  errors: DirectusErrorItem[],
  pageSize = 1000
): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;
  const MAX_PAGES = 300;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url =
      `${DIRECTUS_BASE}/items/${collection}` +
      `?fields=${encodeURIComponent(fields)}` +
      `&limit=${pageSize}&offset=${offset}`;

    const chunk = await directusFetch<T>(url, errors, collection);
    out.push(...chunk);

    if (chunk.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

// --- MAIN API HANDLER ---

export async function GET(request: Request) {
  const errors: DirectusErrorItem[] = [];

  try {
    const { searchParams } = new URL(request.url);
    const rawFrom = searchParams.get("fromDate");
    const rawTo = searchParams.get("toDate");
    const rawDiv = searchParams.get("division");

    const fromDate = normalizeDate(rawFrom);
    const toDate = normalizeDate(rawTo);
    const divisionFilter = rawDiv === "all" ? null : rawDiv;

    // --- FETCH DATA ---
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
      fetchAllPaged<any>("sales_invoice", "invoice_id,invoice_date", errors),
      fetchAllPaged<any>(
        "sales_invoice_details",
        "invoice_no,product_id,quantity,total_amount,discount_amount",
        errors
      ),
      fetchAllPaged<any>(
        "products",
        "product_id,product_name,product_brand,product_section,estimated_unit_cost,priceA,price_per_unit",
        errors
      ),
      fetchAllPaged<any>(
        "product_per_supplier",
        "product_id,supplier_id",
        errors
      ),
      fetchAllPaged<any>("suppliers", "id,supplier_name", errors),
      fetchAllPaged<any>("salesman", "id,division_id", errors),
      fetchAllPaged<any>("division", "division_id,division_name", errors),
      fetchAllPaged<any>(
        "sales_return",
        "return_id,return_number,return_date,received_at,created_at,updated_at,total_amount",
        errors
      ),
      fetchAllPaged<any>(
        "sales_return_details",
        "return_no,product_id,quantity,total_amount,gross_amount,discount_amount,unit_price",
        errors
      ),
      fetchAllPaged<any>(
        "collection",
        "collection_date,isCancelled,totalAmount,salesman_id",
        errors
      ),
      fetchAllPaged<any>("brand", "brand_id,brand_name", errors),
      fetchAllPaged<any>("sections", "section_id,section_name", errors),
    ]);

    if (
      invoices.length === 0 &&
      details.length === 0 &&
      products.length === 0
    ) {
      return NextResponse.json({
        kpi: {
          totalNetSales: 0,
          totalReturns: 0,
          grossMargin: 0,
          collectionRate: 0,
        },
        kpiByDivision: {},
        divisionSales: [],
        salesTrend: [],
        supplierSalesByDivision: {},
        heatmapDataByDivision: {},
        topProducts: [],
        topSuppliers: [],
        _debug: {
          error: "No data fetched",
          directusUrl: DIRECTUS_BASE,
          errors,
        },
      });
    }

    // --- 1. LOOKUP MAPS ---
    const brandMap = new Map<number | string, string>();
    brands.forEach((b: any) => {
      if (b?.brand_id)
        brandMap.set(b.brand_id, String(b.brand_name || "").toUpperCase());
    });

    const sectionMap = new Map<number | string, string>();
    sections.forEach((s: any) => {
      if (s?.section_id)
        sectionMap.set(
          s.section_id,
          String(s.section_name || "").toUpperCase()
        );
    });

    const productMap = new Map<string, any>();
    products.forEach((p: any) => {
      const pid = String(p.product_id);
      productMap.set(pid, {
        ...p,
        brand_name: brandMap.get(p.product_brand) || "",
        section_name: sectionMap.get(p.product_section) || "",
      });
    });

    const supplierNameMap = new Map<string, string>(
      suppliers.map((s: any) => [String(s.id), String(s.supplier_name || "")])
    );

    const primarySupplierMap = new Map<string, string>();
    pps.forEach((r: any) => {
      const pid = String(r.product_id);
      if (!primarySupplierMap.has(pid))
        primarySupplierMap.set(pid, String(r.supplier_id));
    });

    const salesmanDivisionMap = new Map<string, string>();
    salesmen.forEach((s: any) =>
      salesmanDivisionMap.set(String(s.id), String(s.division_id ?? ""))
    );

    const divisionNameMap = new Map<string, string>();
    divisions.forEach((d: any) =>
      divisionNameMap.set(String(d.division_id), String(d.division_name || ""))
    );

    // --- 2. DIVISION LOGIC ---
    const getDivisionForProduct = (pId: string) => {
      const prod = productMap.get(String(pId));
      if (!prod) return "Dry Goods";
      const pBrand = String(prod.brand_name || "").toUpperCase();
      const pSection = String(prod.section_name || "").toUpperCase();
      const pName = String(prod.product_name || "").toUpperCase();

      for (const [divName, rules] of Object.entries(DIVISION_RULES)) {
        if (
          rules.brands.some(
            (b) =>
              pBrand.includes(b.toUpperCase()) ||
              pName.includes(b.toUpperCase())
          )
        )
          return divName;
        if (rules.sections.some((s) => pSection.includes(s.toUpperCase())))
          return divName;
      }
      const suppId = primarySupplierMap.get(String(pId));
      if (suppId) {
        const suppName = (
          supplierNameMap.get(String(suppId)) || ""
        ).toUpperCase();
        for (const [key, val] of Object.entries(SUPPLIER_TO_DIVISION)) {
          if (suppName.includes(key)) return val;
        }
      }
      if (pSection.includes("FROZEN") || pName.includes("HOTDOG"))
        return "Frozen Goods";
      return "Dry Goods";
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

    // NEW: Product Stats for Top 10 list
    const productStatsMap = new Map<
      string,
      { name: string; quantity: number; value: number }
    >();

    ALL_DIVISIONS.forEach((div) => {
      divisionStats.set(div, { sales: 0, returns: 0, cogs: 0, collections: 0 });
      divisionTotals.set(div, 0);
    });

    let grandTotalSales = 0;
    let grandTotalReturns = 0;
    let grandTotalCOGS = 0;
    let grandTotalCollected = 0;

    const invoiceLookup = new Map<string, any>();
    const filteredInvoiceIds = new Set<string>();
    const sortedFilteredMonths = new Set<string>();

    invoices.forEach((inv: any) => {
      if (!inv?.invoice_date) return;
      const d = String(inv.invoice_date).substring(0, 10);
      if (fromDate && d < fromDate) return;
      if (toDate && d > toDate) return;
      const id = String(inv.invoice_id);
      invoiceLookup.set(id, inv);
      filteredInvoiceIds.add(id);
    });

    // --- 4. DETAILS LOOP (Aggregation) ---
    details.forEach((det: any) => {
      const invId =
        typeof det.invoice_no === "object"
          ? String(det.invoice_no?.id ?? "")
          : String(det.invoice_no ?? "");
      if (!invId || !filteredInvoiceIds.has(invId)) return;

      const inv = invoiceLookup.get(invId);
      const d = String(inv.invoice_date).substring(0, 10);
      const month = String(inv.invoice_date).substring(0, 7);
      sortedFilteredMonths.add(month);

      const pId = String(det.product_id);
      const division = getDivisionForProduct(pId);
      if (divisionFilter && division !== divisionFilter) return;

      const netDetail =
        (Number(det.total_amount) || 0) - (Number(det.discount_amount) || 0);
      const unitCost = Number(productMap.get(pId)?.estimated_unit_cost || 0);
      const qty = Number(det.quantity) || 0;
      const cogs = unitCost * qty;

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

      // Populate Product Stats (for Top 10)
      if (!productStatsMap.has(pId)) {
        productStatsMap.set(pId, {
          name: productMap.get(pId)?.product_name || "Unknown Product",
          quantity: 0,
          value: 0,
        });
      }
      const pStat = productStatsMap.get(pId)!;
      pStat.quantity += qty;
      pStat.value += netDetail;

      // Populate Supplier Stats (for Charts)
      const supplierId = String(primarySupplierMap.get(String(pId)) || "");
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

    // --- 5. RETURNS ---
    function pickReturnDate(ret: any): string | null {
      const raw =
        ret?.return_date ??
        ret?.received_at ??
        ret?.created_at ??
        ret?.updated_at ??
        null;
      if (!raw) return null;
      return String(raw).substring(0, 10);
    }
    const validReturnNos = new Set<string>();
    returns.forEach((ret: any) => {
      const rn = String(ret?.return_number ?? "").trim();
      if (!rn) return;
      const d = pickReturnDate(ret);
      if (!d) return;
      if (fromDate && d < fromDate) return;
      if (toDate && d > toDate) return;
      validReturnNos.add(rn);
    });

    returnDetails.forEach((rd: any) => {
      const rn = String(rd?.return_no ?? "").trim();
      if (!rn || !validReturnNos.has(rn)) return;

      const qty = Math.abs(Number(rd.quantity) || 0);
      const totalAmt = Number(rd.total_amount);
      const grossAmt = Number(rd.gross_amount);
      const discAmt = Number(rd.discount_amount);
      let returnVal = 0;
      if (Number.isFinite(totalAmt) && totalAmt !== 0)
        returnVal = Math.abs(totalAmt);
      else if (Number.isFinite(grossAmt) && Number.isFinite(discAmt))
        returnVal = Math.abs((grossAmt || 0) - (discAmt || 0));
      else {
        const unitPrice = Number(rd.unit_price) || 0;
        returnVal = Math.abs(unitPrice * qty);
      }

      const pId = String(rd.product_id ?? "");
      const div = getDivisionForProduct(pId);
      if (divisionFilter && div !== divisionFilter) return;

      grandTotalReturns += returnVal;
      if (divisionStats.has(div)) {
        divisionStats.get(div)!.returns += returnVal;
      }
    });

    // --- 6. COLLECTIONS ---
    collections.forEach((col: any) => {
      if (isTrue(col.isCancelled)) return;
      if (!col?.collection_date) return;
      const d = String(col.collection_date).substring(0, 10);
      if (fromDate && d < fromDate) return;
      if (toDate && d > toDate) return;

      const amount = Number(col.totalAmount) || 0;
      const sId = String(col.salesman_id ?? "");
      const divId = salesmanDivisionMap.get(sId) || "";
      let colDiv = divId
        ? divisionNameMap.get(divId) || "Dry Goods"
        : "Dry Goods";
      if (colDiv === "Frozen") colDiv = "Frozen Goods";
      if (colDiv === "Dry") colDiv = "Dry Goods";
      if (colDiv === "Internal Goods") colDiv = "Internal";
      if (!ALL_DIVISIONS.includes(colDiv as any)) colDiv = "Dry Goods";
      if (divisionFilter && colDiv !== divisionFilter) return;

      grandTotalCollected += amount;
      if (divisionStats.has(colDiv)) {
        divisionStats.get(colDiv)!.collections += amount;
      }
    });

    // --- 7. FINAL FORMATTING ---
    const netSales = grandTotalSales - grandTotalReturns;
    const grossMargin =
      netSales > 0 ? ((netSales - grandTotalCOGS) / netSales) * 100 : 0;
    const collectionRate =
      netSales > 0 ? (grandTotalCollected / netSales) * 100 : 0;

    const divisionSalesFormatted = Array.from(divisionTotals.entries())
      .map(([division, grossSales]) => {
        const divReturns = divisionStats.get(division)?.returns || 0;
        return { division, netSales: toFixed(grossSales - divReturns) };
      })
      .sort((a, b) => b.netSales - a.netSales);

    let salesTrendFormatted: Array<{ date: string; netSales: number }> = [];
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
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([d, val]) => ({
          date: new Date(d).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          netSales: toFixed(val),
        }));
    }

    const chartFinal: Record<
      string,
      Array<{ name: string; netSales: number }>
    > = {};
    for (const [divName, sMap] of supplierChartMap.entries()) {
      chartFinal[divName] = Array.from(sMap.entries())
        .map(([name, ns]) => ({ name, netSales: toFixed(ns) }))
        .sort((a, b) => b.netSales - a.netSales)
        .slice(0, 10);
    }

    const heatmapFinal: Record<string, any[]> = {};
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

    const kpiByDivision: Record<string, any> = {};
    divisionStats.forEach((val, key) => {
      const divNetSales = val.sales - val.returns;
      const divGM =
        divNetSales > 0 ? ((divNetSales - val.cogs) / divNetSales) * 100 : 0;
      const divCR = divNetSales > 0 ? (val.collections / divNetSales) * 100 : 0;
      kpiByDivision[key] = {
        totalNetSales: toFixed(divNetSales),
        totalReturns: toFixed(val.returns),
        grossMargin: toFixed(divGM),
        collectionRate: toFixed(divCR),
      };
    });

    // Final Top 10 Products (Overall or Filtered)
    const topProducts = Array.from(productStatsMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map((p) => ({
        name: p.name,
        quantity: p.quantity,
        value: toFixed(p.value),
      }));

    // Select the Top Suppliers for the specific dashboard view
    let topSuppliersForView = [];
    if (divisionFilter && chartFinal[divisionFilter]) {
      topSuppliersForView = chartFinal[divisionFilter].map((s) => ({
        name: s.name,
        value: s.netSales,
      }));
    } else {
      // If "All", aggregates from chartFinal logic if needed, but for now return empty or simple agg
      topSuppliersForView = [];
    }

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
      topProducts,
      topSuppliers: topSuppliersForView, // Frontend expects this array
      _debug: {
        directusUrl: DIRECTUS_BASE + "/",
        hasToken: Boolean(DIRECTUS_TOKEN),
        fromDate,
        toDate,
        division: divisionFilter || "all",
      },
    });
  } catch (err: any) {
    console.error("API Error", err);
    return NextResponse.json(
      {
        error: err?.message || "Unknown error",
        _debug: { directusUrl: DIRECTUS_BASE, errors },
      },
      { status: 500 }
    );
  }
}
