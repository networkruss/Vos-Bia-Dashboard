import { NextResponse } from "next/server";

// --- CHANGE: Fetch from Environment Variable ---
const DIRECTUS_URL = process.env.DIRECTUS_URL;

if (!DIRECTUS_URL) {
  throw new Error("Missing DIRECTUS_URL in .env.local");
}

// --- 1. CONFIGURATION RULES ---
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

const ALL_DIVISIONS = [
  "Dry Goods",
  "Frozen Goods",
  "Industrial",
  "Mama Pina's",
];

// --- HELPERS ---
async function fetchAll<T = any>(
  endpoint: string,
  params: string = ""
): Promise<T[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  try {
    const url = `${DIRECTUS_URL}/items/${endpoint}?limit=-1${params}`;
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
  return d ? d : null;
}

function getSafeId(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object" && val !== null) {
    return val.id ? String(val.id) : "";
  }
  return String(val);
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
    const activeTab = searchParams.get("activeTab") || "Overview";

    const fromDate = normalizeDate(rawFrom);
    const toDate = normalizeDate(rawTo);

    let invoiceFilter = "";
    let detailsFilter = "";
    let returnFilter = "";
    let returnDetailsFilter = "";

    if (fromDate && toDate) {
      invoiceFilter = `&filter[invoice_date][_between]=[${fromDate},${toDate} 23:59:59]`;
      detailsFilter = `&filter[invoice_no][invoice_date][_between]=[${fromDate},${toDate} 23:59:59]`;
      returnFilter = `&filter[return_date][_between]=[${fromDate},${toDate} 23:59:59]`;
      returnDetailsFilter = `&filter[return_no][return_date][_between]=[${fromDate},${toDate} 23:59:59]`;
    }

    // --- FETCH DATA ---
    const [
      invoices,
      invoiceDetails,
      returns,
      returnDetails,
      products,
      salesmen,
      customers,
      suppliers,
      pps,
      brands,
      sections,
    ] = await Promise.all([
      fetchAll(
        "sales_invoice",
        `&fields=invoice_id,invoice_date,total_amount,salesman_id,customer_code${invoiceFilter}`
      ),
      fetchAll(
        "sales_invoice_details",
        `&fields=invoice_no,product_id,total_amount,quantity${detailsFilter}`
      ),
      fetchAll(
        "sales_return",
        `&fields=return_number,return_date${returnFilter}`
      ),
      fetchAll(
        "sales_return_details",
        `&fields=return_no,product_id,quantity${returnDetailsFilter}`
      ),
      fetchAll("products"),
      fetchAll("salesman", "&fields=id,salesman_name"),
      fetchAll("customer", "&fields=customer_code,store_name"),
      fetchAll("suppliers", "&fields=id,supplier_name"),
      fetchAll("product_per_supplier", "&fields=product_id,supplier_id"),
      fetchAll("brand", "&fields=brand_id,brand_name"),
      fetchAll("sections", "&fields=section_id,section_name"),
    ]);

    // --- MAPS ---
    const supplierNameMap = new Map<string, string>();
    suppliers.forEach((s: any) => {
      const id = getSafeId(s.id);
      if (id) supplierNameMap.set(id, String(s.supplier_name).toUpperCase());
    });

    const productToSupplierMap = new Map<string, string>();
    pps.forEach((p: any) => {
      const pId = getSafeId(p.product_id);
      const sId = getSafeId(p.supplier_id);
      if (pId && sId) {
        productToSupplierMap.set(pId, sId);
      }
    });

    const productMap = new Map();
    products.forEach((p: any) => {
      const pId = getSafeId(p.product_id);
      const stockCount =
        Number(p.stock) || Number(p.inventory) || Number(p.quantity) || 0;

      productMap.set(pId, {
        ...p,
        brand_name:
          brands
            .find(
              (b: any) => getSafeId(b.brand_id) === getSafeId(p.product_brand)
            )
            ?.brand_name?.toUpperCase() || "",
        section_name:
          sections
            .find(
              (s: any) =>
                getSafeId(s.section_id) === getSafeId(p.product_section)
            )
            ?.section_name?.toUpperCase() || "",
        stock: stockCount,
      });
    });

    const salesmanMap = new Map();
    salesmen.forEach((s: any) =>
      salesmanMap.set(getSafeId(s.id), s.salesman_name)
    );
    const customerMap = new Map();
    customers.forEach((c: any) =>
      customerMap.set(String(c.customer_code), c.store_name)
    );

    const validInvoiceIds = new Set(
      invoices.map((i: any) => getSafeId(i.invoice_id))
    );
    const validReturnIds = new Set(
      returns.map((r: any) => String(r.return_number))
    );

    // --- AGGREGATION ---
    const trendMap = new Map<string, { good: number; bad: number }>();
    const supplierSales = new Map<string, number>();
    const salesmanSales = new Map<string, number>();
    const productSales = new Map<string, number>();
    const customerSales = new Map<string, number>();
    const divisionStats = new Map<string, { good: number; bad: number }>();
    ALL_DIVISIONS.forEach((div) => divisionStats.set(div, { good: 0, bad: 0 }));

    let totalGoodStockOutflow = 0;
    let totalBadStockInflow = 0;

    // --- IDENTIFICATION LOGIC ---
    const getSupplierName = (pId: string) => {
      const sId = productToSupplierMap.get(pId);
      if (sId && supplierNameMap.has(sId)) return supplierNameMap.get(sId)!;

      const pName = (productMap.get(pId)?.product_name || "").toUpperCase();
      if (pName.includes("MEN2")) return "MEN2 MARKETING";
      if (pName.includes("PUREFOODS") || pName.includes("PF"))
        return "FOODSPHERE INC";
      if (pName.includes("CDO")) return "FOODSPHERE INC";
      if (pName.includes("VIRGINIA")) return "VIRGINIA FOOD INC";
      if (pName.includes("MEKENI")) return "MEKENI FOOD CORP";
      if (pName.includes("MAMA PINA")) return "MAMA PINA'S";

      return "Internal / Others";
    };

    const checkDivision = (pId: string, divisionName: string) => {
      const prod = productMap.get(pId);
      if (!prod) return false;

      const pBrand = (prod.brand_name || "").toUpperCase();
      const pSection = (prod.section_name || "").toUpperCase();
      const pName = (prod.product_name || "").toUpperCase();
      const tab = divisionName.toUpperCase().trim();

      const rules = DIVISION_RULES[divisionName];
      if (rules) {
        if (
          rules.brands.some(
            (b: string) =>
              pBrand.includes(b.toUpperCase()) ||
              pName.includes(b.toUpperCase())
          )
        )
          return true;
        if (
          rules.sections.some((s: string) => pSection.includes(s.toUpperCase()))
        )
          return true;
      }

      const cleanTab = tab.replace(" GOODS", "").replace(" OVERVIEW", "");
      if (
        cleanTab &&
        (pSection.includes(cleanTab) || pBrand.includes(cleanTab))
      )
        return true;
      return false;
    };

    const isDivisionMatch = (pId: string) => {
      if (!activeTab || activeTab === "Overview") return true;
      return checkDivision(pId, activeTab);
    };

    // Init Trend
    if (fromDate && toDate) {
      const dates = getDatesInRange(fromDate, toDate);
      dates.forEach((d) => {
        if (!trendMap.has(d)) trendMap.set(d, { good: 0, bad: 0 });
      });
    }

    // --- PROCESS INVOICES ---
    invoiceDetails.forEach((det: any) => {
      const invId = getSafeId(det.invoice_no);
      if (!validInvoiceIds.has(invId)) return;

      const pId = getSafeId(det.product_id);
      const qty = Number(det.quantity) || 0;
      const amt = Number(det.total_amount) || 0;

      ALL_DIVISIONS.forEach((divName) => {
        if (checkDivision(pId, divName)) {
          divisionStats.get(divName)!.good += qty;
        }
      });

      if (isDivisionMatch(pId)) {
        totalGoodStockOutflow += qty;
        const pName = productMap.get(pId)?.product_name || `Product ${pId}`;
        productSales.set(pName, (productSales.get(pName) || 0) + amt);

        const sName = getSupplierName(pId);
        supplierSales.set(sName, (supplierSales.get(sName) || 0) + amt);

        const parent = invoices.find(
          (i: any) => getSafeId(i.invoice_id) === invId
        );
        if (parent) {
          const d = parent.invoice_date.substring(0, 10);
          const curr = trendMap.get(d) || { good: 0, bad: 0 };
          curr.good += qty;
          trendMap.set(d, curr);

          const smName =
            salesmanMap.get(getSafeId(parent.salesman_id)) ||
            "Unknown Salesman";
          salesmanSales.set(smName, (salesmanSales.get(smName) || 0) + amt);

          const cName =
            customerMap.get(String(parent.customer_code)) ||
            `Customer ${parent.customer_code}`;
          customerSales.set(cName, (customerSales.get(cName) || 0) + amt);
        }
      }
    });

    // --- PROCESS RETURNS ---
    returnDetails.forEach((ret: any) => {
      const retId = String(ret.return_no);
      if (!validReturnIds.has(retId)) return;

      const pId = getSafeId(ret.product_id);
      const qty = Number(ret.quantity) || 0;

      ALL_DIVISIONS.forEach((divName) => {
        if (checkDivision(pId, divName)) {
          divisionStats.get(divName)!.bad += qty;
        }
      });

      if (isDivisionMatch(pId)) {
        totalBadStockInflow += qty;
        const parent = returns.find(
          (r: any) => String(r.return_number) === retId
        );
        if (parent) {
          const d = parent.return_date.substring(0, 10);
          const curr = trendMap.get(d) || { good: 0, bad: 0 };
          curr.bad += qty;
          trendMap.set(d, curr);
        }
      }
    });

    // --- CALCULATE ---
    let totalCurrentStock = 0;
    productMap.forEach((prod: any, pId: string) => {
      if (isDivisionMatch(pId)) {
        totalCurrentStock += prod.stock || 0;
      }
    });

    const totalMoved = totalGoodStockOutflow + totalCurrentStock;
    const velocityRate =
      totalMoved > 0 ? (totalGoodStockOutflow / totalMoved) * 100 : 0;

    let velocityStatus = "Stagnant";
    if (velocityRate > 50) velocityStatus = "Fast Moving";
    else if (velocityRate > 20) velocityStatus = "Healthy";
    else if (velocityRate > 5) velocityStatus = "Slow Moving";

    const returnRate =
      totalGoodStockOutflow > 0
        ? (totalBadStockInflow / totalGoodStockOutflow) * 100
        : 0;
    let badStockStatus = "Normal";
    if (returnRate > 5) badStockStatus = "Critical";
    else if (returnRate > 2) badStockStatus = "High";
    else if (returnRate > 0) badStockStatus = "Normal";
    else badStockStatus = "Excellent";

    // --- FORMAT RESULTS ---
    let trendData: any[] = [];
    if (fromDate && toDate) {
      trendData = getDatesInRange(fromDate, toDate).map((date) => ({
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        goodStockOutflow: trendMap.get(date)?.good || 0,
        badStockInflow: trendMap.get(date)?.bad || 0,
      }));
    } else {
      trendData = Array.from(trendMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, vals]) => ({
          date: new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          goodStockOutflow: vals.good,
          badStockInflow: vals.bad,
        }));
    }

    const allSupplierSales = Array.from(supplierSales.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const salesBySupplier = allSupplierSales.slice(0, 10);

    const salesBySalesman = Array.from(salesmanSales.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Increased slice to 50 for pagination support
    const topProducts = Array.from(productSales.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50);

    // Increased slice to 50 for pagination support
    const topCustomers = Array.from(customerSales.entries())
      .filter(
        ([name]) =>
          !name.toUpperCase().includes("MEN2") &&
          !name.toUpperCase().includes("INTERNAL")
      )
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50);

    const supplierBreakdown = allSupplierSales.map((s) => ({
      id: s.name,
      name: s.name,
      totalSales: s.value,
      salesmen: [{ name: "Total Sales", amount: s.value, percent: 100 }],
    }));

    const divisionBreakdown = ALL_DIVISIONS.map((divName) => {
      const stats = divisionStats.get(divName) || { good: 0, bad: 0 };
      return {
        division: divName,
        goodStock: {
          velocityRate: 0,
          totalOutflow: stats.good,
          status: stats.good > 5000 ? "Healthy" : "Warning",
        },
        badStock: { accumulated: stats.bad },
      };
    });

    return NextResponse.json({
      division: activeTab,
      goodStock: {
        velocityRate: Math.round(velocityRate * 100) / 100,
        status: velocityStatus,
        totalOutflow: totalGoodStockOutflow,
        totalInflow: totalMoved,
      },
      badStock: {
        accumulated: totalBadStockInflow,
        status: badStockStatus,
        totalInflow: totalBadStockInflow,
      },
      trendData,
      salesBySupplier,
      salesBySalesman,
      supplierBreakdown,
      divisionBreakdown,
      pareto: { products: topProducts, customers: topCustomers },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
