import { NextResponse } from "next/server";

/**
 * Fixes:
 * - trailing slash causing //items/... (Directus ROUTE_NOT_FOUND)
 * - missing env causing undefined/items/...
 * - limit=-1 large payload instability (uses paging)
 * - adds _debug to quickly identify wrong collection names/permissions
 * - FIX: return totals not matching due to return_no referencing id vs return_number
 * - FIX: return totals incorrect/negative due to stored negative totals
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL || "";
const DIRECTUS_BASE = DIRECTUS_URL.replace(/\/+$/, "");

// Optional token support (only if your Directus needs it)
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

// DIRECT SUPPLIER MAPPING
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

function toKey(v: any) {
  return String(v ?? "").trim();
}

/**
 * Return FK in Directus can be:
 * - number/string
 * - object (expanded) containing id and/or return_number
 * We'll extract all plausible keys so linking never misses.
 */
function extractReturnKeys(returnNoField: any): string[] {
  const keys: string[] = [];
  if (returnNoField == null) return keys;

  if (typeof returnNoField === "object") {
    // common shapes: { id }, { id, return_number }, { data: ... } etc
    if ("id" in returnNoField && returnNoField.id != null)
      keys.push(toKey(returnNoField.id));
    if ("return_number" in returnNoField && returnNoField.return_number != null)
      keys.push(toKey(returnNoField.return_number));
    if ("returnNo" in returnNoField && (returnNoField as any).returnNo != null)
      keys.push(toKey((returnNoField as any).returnNo));
    if (
      "return_no" in returnNoField &&
      (returnNoField as any).return_no != null
    )
      keys.push(toKey((returnNoField as any).return_no));
  } else {
    keys.push(toKey(returnNoField));
  }

  // unique + non-empty
  return Array.from(new Set(keys.filter(Boolean)));
}

async function directusFetch<T>(
  url: string,
  errors: DirectusErrorItem[],
  collection: string
): Promise<T[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min

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
  pageSize = 500
): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;

  // Safety cap to avoid infinite loops
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

    // --- FETCH DATA (Paged + Field-Limited) ---
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

    // If everything failed, return debug immediately
    if (
      invoices.length === 0 &&
      details.length === 0 &&
      products.length === 0 &&
      returns.length === 0 &&
      collections.length === 0
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
        _debug: {
          directusUrl: DIRECTUS_BASE + "/",
          hasToken: Boolean(DIRECTUS_TOKEN),
          fromDate,
          toDate,
          division: divisionFilter || "all",
          counts: {
            invoices: invoices.length,
            details: details.length,
            products: products.length,
            pps: pps.length,
            suppliers: suppliers.length,
            returns: returns.length,
            returnDetails: returnDetails.length,
            collections: collections.length,
            brands: brands.length,
            sections: sections.length,
          },
          errors,
        },
      });
    }

    // --- 1. BUILD MAPS ---
    const brandMap = new Map<number | string, string>();
    brands.forEach((b: any) => {
      if (b?.brand_id == null) return;
      brandMap.set(b.brand_id, String(b.brand_name || "").toUpperCase());
    });

    const sectionMap = new Map<number | string, string>();
    sections.forEach((s: any) => {
      if (s?.section_id == null) return;
      sectionMap.set(s.section_id, String(s.section_name || "").toUpperCase());
    });

    const productMap = new Map<string, any>();
    const productPriceMap = new Map<string, number>();

    products.forEach((p: any) => {
      const pid = String(p.product_id);
      productMap.set(pid, {
        ...p,
        brand_name: brandMap.get(p.product_brand) || "",
        section_name: sectionMap.get(p.product_section) || "",
      });

      productPriceMap.set(
        pid,
        Number(p.priceA) || Number(p.price_per_unit) || 0
      );
    });

    const supplierNameMap = new Map<string, string>(
      suppliers.map((s: any) => [String(s.id), String(s.supplier_name || "")])
    );

    // Primary supplier map (first seen wins)
    const primarySupplierMap = new Map<string, string>();
    pps.forEach((r: any) => {
      const pid = String(r.product_id);
      if (!primarySupplierMap.has(pid)) {
        primarySupplierMap.set(pid, String(r.supplier_id));
      }
    });

    // Salesman -> division_id
    const salesmanDivisionMap = new Map<string, string>();
    salesmen.forEach((s: any) => {
      salesmanDivisionMap.set(String(s.id), String(s.division_id ?? ""));
    });

    // division_id -> division_name
    const divisionNameMap = new Map<string, string>();
    divisions.forEach((d: any) => {
      divisionNameMap.set(String(d.division_id), String(d.division_name || ""));
    });

    // --- 2. DIVISION MATCHING LOGIC ---
    const getDivisionForProduct = (pId: string) => {
      const prod = productMap.get(String(pId));
      if (!prod) return "Dry Goods";

      const pBrand = String(prod.brand_name || "").toUpperCase();
      const pSection = String(prod.section_name || "").toUpperCase();
      const pName = String(prod.product_name || "").toUpperCase();

      for (const [divName, rules] of Object.entries(DIVISION_RULES)) {
        if (
          rules.brands.some((b) => {
            const key = b.toUpperCase();
            return pBrand.includes(key) || pName.includes(key);
          })
        ) {
          return divName;
        }

        if (rules.sections.some((s) => pSection.includes(s.toUpperCase()))) {
          return divName;
        }
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

    const isInternalSupplierName = (name: string) => {
      const s = (name || "").toUpperCase();
      return (
        s.includes("INTERNAL") ||
        s.includes("CLE ACE") ||
        s.includes("OTHERS") ||
        s === "VOS"
      );
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

    const invoiceLookup = new Map<string, any>();
    const filteredInvoiceIds = new Set<string>();
    const sortedFilteredMonths = new Set<string>();

    // --- 4. PROCESS INVOICES (Sales Header) ---
    invoices.forEach((inv: any) => {
      if (!inv?.invoice_date) return;
      const d = String(inv.invoice_date).substring(0, 10);

      if (fromDate && d < fromDate) return;
      if (toDate && d > toDate) return;

      const id = String(inv.invoice_id);
      invoiceLookup.set(id, inv);
      filteredInvoiceIds.add(id);
    });

    // --- 5. PROCESS DETAILS (Division Logic) ---
    details.forEach((det: any) => {
      const invId =
        typeof det.invoice_no === "object"
          ? String(det.invoice_no?.id ?? "")
          : String(det.invoice_no ?? "");

      if (!invId || !filteredInvoiceIds.has(invId)) return;

      const inv = invoiceLookup.get(invId);
      if (!inv?.invoice_date) return;

      const d = String(inv.invoice_date).substring(0, 10);
      const month = String(inv.invoice_date).substring(0, 7);
      sortedFilteredMonths.add(month);

      const pId = String(det.product_id);
      const division = getDivisionForProduct(pId);

      if (divisionFilter && division !== divisionFilter) return;

      // NET DETAIL = Total Amount - Discount Amount
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

      // Supplier charts / heatmap
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

    // --- 6. PROCESS RETURNS (FIXED: matching + value) ---
    // Build a set of ALL valid keys for returns within date range
    // --- 6. PROCESS RETURNS (MATCH BY return_number + correct fields) ---

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

    // Map: return_number -> return_date (or fallback date)
    const returnNoToDate = new Map<string, string>();
    const validReturnNos = new Set<string>();

    returns.forEach((ret: any) => {
      const rn = String(ret?.return_number ?? "").trim();
      if (!rn) return;

      const d = pickReturnDate(ret);
      if (!d) return; // if no date at all, skip filtering-based matching (rare)

      // apply date filter at header level
      if (fromDate && d < fromDate) return;
      if (toDate && d > toDate) return;

      validReturnNos.add(rn);
      returnNoToDate.set(rn, d);
    });

    // Debug counters (optional but recommended)
    let matchedReturnDetails = 0;
    let unmatchedReturnDetails = 0;
    const unmatchedSamples: string[] = [];

    // Sum returns from details
    returnDetails.forEach((rd: any) => {
      const rn = String(rd?.return_no ?? "").trim();
      if (!rn) return;

      if (!validReturnNos.has(rn)) {
        unmatchedReturnDetails += 1;
        if (unmatchedSamples.length < 10) unmatchedSamples.push(rn);
        return;
      }

      matchedReturnDetails += 1;

      const qty = Math.abs(Number(rd.quantity) || 0);

      // Prefer total_amount from details (this is correct in your sample)
      const totalAmt = Number(rd.total_amount);
      const grossAmt = Number(rd.gross_amount);
      const discAmt = Number(rd.discount_amount);

      let returnVal = 0;

      if (Number.isFinite(totalAmt) && totalAmt !== 0) {
        returnVal = Math.abs(totalAmt);
      } else if (Number.isFinite(grossAmt) && Number.isFinite(discAmt)) {
        // fallback: gross - discount
        returnVal = Math.abs((grossAmt || 0) - (discAmt || 0));
      } else {
        // last fallback: unit_price * qty
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

    // OPTIONAL: include this in _debug so you can confirm matching immediately
    const returnsDebug = {
      headersInRange: validReturnNos.size,
      matchedReturnDetails,
      unmatchedReturnDetails,
      unmatchedSamples,
    };

    // --- 7. PROCESS COLLECTIONS ---
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

      // Normalizations
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

    // --- 8. RESULTS ---
    const netSales = grandTotalSales - grandTotalReturns;

    const grossMargin =
      netSales > 0 ? ((netSales - grandTotalCOGS) / netSales) * 100 : 0;

    const collectionRate =
      netSales > 0 ? (grandTotalCollected / netSales) * 100 : 0;

    // Division breakdown reflects net sales (minus returns)
    const divisionSalesFormatted = Array.from(divisionTotals.entries())
      .map(([division, grossSales]) => {
        const divReturns = divisionStats.get(division)?.returns || 0;
        return {
          division,
          netSales: toFixed(grossSales - divReturns),
        };
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

      _debug: {
        directusUrl: DIRECTUS_BASE + "/",
        hasToken: Boolean(DIRECTUS_TOKEN),
        fromDate,
        toDate,
        division: divisionFilter || "all",
        returnsDebug,
        counts: {
          invoices: invoices.length,
          details: details.length,
          products: products.length,
          pps: pps.length,
          suppliers: suppliers.length,
          salesmen: salesmen.length,
          divisions: divisions.length,
          returns: returns.length,
          returnDetails: returnDetails.length,
          collections: collections.length,
          brands: brands.length,
          sections: sections.length,
        },
        errors,
      },
    });
  } catch (err: any) {
    console.error("API Error", err);
    return NextResponse.json(
      {
        error: err?.message || "Unknown error",
        _debug: {
          directusUrl: DIRECTUS_BASE + "/",
          hasToken: Boolean(DIRECTUS_TOKEN),
        },
      },
      { status: 500 }
    );
  }
}
