import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://100.110.197.61:8056";

// --- RULES CONFIGURATION (UPDATED BASED ON SCREENSHOTS) ---
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
    ],
    sections: ["Frozen", "Meat", "Processed Meat", "Cold Cuts", "Ice Cream"],
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
    ],
    sections: [
      "Condiments",
      "Oil",
      "Sacks",
      "Sugar",
      "Flour",
      "Industrial",
      "Gas",
    ],
  },
  "Mama Pina's": {
    brands: ["Mama Pina", "Mama Pinas", "Mama Pina's"],
    sections: ["Franchise", "Ready to Eat", "Kiosk"],
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
  const timeoutId = setTimeout(() => controller.abort(), 300000);
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
    const fromDate = normalizeDate(searchParams.get("fromDate"));
    const toDate = normalizeDate(searchParams.get("toDate"));
    const activeTab = searchParams.get("activeTab") || "Overview";

    let invoiceFilter = "";
    let returnFilter = "";

    if (fromDate && toDate) {
      invoiceFilter = `&filter[invoice_date][_between]=[${fromDate},${toDate} 23:59:59]`;
      returnFilter = `&filter[return_date][_between]=[${fromDate},${toDate} 23:59:59]`;
    }

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
        `&fields=invoice_no,product_id,total_amount,quantity`
      ),
      fetchAll(
        "sales_return",
        `&fields=return_number,return_date${returnFilter}`
      ),
      fetchAll("sales_return_details", `&fields=return_no,product_id,quantity`),
      fetchAll(
        "products",
        "&fields=product_id,product_name,product_brand,product_section"
      ),
      fetchAll("salesman", "&fields=id,salesman_name"),
      fetchAll("customer", "&fields=customer_code,store_name"),
      fetchAll("suppliers", "&fields=id,supplier_name"),
      fetchAll("product_per_supplier", "&fields=product_id,supplier_id"),
      fetchAll("brand", "&fields=brand_id,brand_name"),
      fetchAll("sections", "&fields=section_id,section_name"),
    ]);

    const brandMap = new Map();
    brands.forEach((b: any) =>
      brandMap.set(b.brand_id, b.brand_name.toUpperCase())
    );
    const sectionMap = new Map();
    sections.forEach((s: any) =>
      sectionMap.set(s.section_id, s.section_name.toUpperCase())
    );

    const productMap = new Map();
    products.forEach((p: any) => {
      productMap.set(String(p.product_id), {
        ...p,
        brand_name: brandMap.get(p.product_brand) || "",
        section_name: sectionMap.get(p.product_section) || "",
      });
    });

    const salesmanMap = new Map();
    salesmen.forEach((s: any) =>
      salesmanMap.set(String(s.id), s.salesman_name)
    );
    const customerMap = new Map();
    customers.forEach((c: any) =>
      customerMap.set(String(c.customer_code), c.store_name)
    );
    const supplierMap = new Map();
    suppliers.forEach((s: any) =>
      supplierMap.set(String(s.id), s.supplier_name)
    );
    const prodToSuppMap = new Map();
    pps.forEach((p: any) =>
      prodToSuppMap.set(String(p.product_id), String(p.supplier_id))
    );

    const getSupplier = (pId: string) => {
      const sId = prodToSuppMap.get(pId);
      if (sId && supplierMap.has(sId)) return supplierMap.get(sId);
      const pName = (productMap.get(pId)?.product_name || "").toUpperCase();
      if (pName.includes("MEN2")) return "MEN2 MARKETING";
      return "Internal / Others";
    };

    const validInvoiceIds = new Set(
      invoices.map((i: any) => String(i.invoice_id))
    );
    const validReturnIds = new Set(
      returns.map((r: any) => String(r.return_number))
    );

    // --- AGGREGATION SETUP ---
    const trendMap = new Map<string, { good: number; bad: number }>();
    const supplierSales = new Map<string, number>();
    const salesmanSales = new Map<string, number>();
    const productSales = new Map<string, number>();
    const customerSales = new Map<string, number>();

    // Initialize stats for ALL divisions
    const divisionStats = new Map<string, { good: number; bad: number }>();
    ALL_DIVISIONS.forEach((div) => {
      divisionStats.set(div, { good: 0, bad: 0 });
    });

    let totalGoodStockOutflow = 0;
    let totalBadStockInflow = 0;

    // --- UPDATED MATCHING LOGIC (Includes Product Name Check) ---
    const checkDivision = (pId: string, divisionName: string) => {
      const prod = productMap.get(pId);
      if (!prod) return false;

      const pBrand = (prod.brand_name || "").toUpperCase();
      const pSection = (prod.section_name || "").toUpperCase();
      const pName = (prod.product_name || "").toUpperCase(); // Check Product Name directly
      const tab = divisionName.toUpperCase().trim();

      // 1. Rules Based (Brand OR Product Name matches keywords)
      const rules = DIVISION_RULES[divisionName];
      if (rules) {
        // Check Brands list against Brand Field OR Product Name
        if (
          rules.brands.some(
            (b: string) =>
              pBrand.includes(b.toUpperCase()) ||
              pName.includes(b.toUpperCase())
          )
        )
          return true;
        // Check Sections
        if (
          rules.sections.some((s: string) => pSection.includes(s.toUpperCase()))
        )
          return true;
      }

      // 2. Generic Name Matching Fallback
      const cleanTab = tab.replace(" GOODS", "").replace(" OVERVIEW", "");
      if (
        cleanTab &&
        (pSection.includes(cleanTab) || pBrand.includes(cleanTab))
      )
        return true;

      return false;
    };

    const isDivisionMatch = (pId: string) => {
      if (activeTab === "Overview") return true;
      return checkDivision(pId, activeTab);
    };

    // Init Trend
    invoices.forEach((inv: any) => {
      const date = inv.invoice_date?.substring(0, 10);
      if (date && !trendMap.has(date)) trendMap.set(date, { good: 0, bad: 0 });
    });

    // --- PROCESS INVOICES ---
    invoiceDetails.forEach((det: any) => {
      const invId = String(det.invoice_no);
      if (validInvoiceIds.has(invId)) {
        const pId = String(det.product_id);
        const qty = Number(det.quantity) || 0;
        const amt = Number(det.total_amount) || 0;

        // 1. Overview Division Breakdown (Always run to populate summary table)
        ALL_DIVISIONS.forEach((divName) => {
          if (checkDivision(pId, divName)) {
            const curr = divisionStats.get(divName)!;
            curr.good += qty;
          }
        });

        // 2. Standard Filtering for Dashboard Cards
        if (isDivisionMatch(pId)) {
          totalGoodStockOutflow += qty;

          const pName = productMap.get(pId)?.product_name || `Product ${pId}`;
          productSales.set(pName, (productSales.get(pName) || 0) + amt);

          const sName = getSupplier(pId);
          supplierSales.set(sName, (supplierSales.get(sName) || 0) + amt);

          const parent = invoices.find(
            (i: any) => String(i.invoice_id) === invId
          );
          if (parent) {
            const d = parent.invoice_date.substring(0, 10);
            const curr = trendMap.get(d) || { good: 0, bad: 0 };
            curr.good += qty;
            trendMap.set(d, curr);

            const smName =
              salesmanMap.get(String(parent.salesman_id)) || "Unknown";
            salesmanSales.set(smName, (salesmanSales.get(smName) || 0) + amt);

            const cName =
              customerMap.get(String(parent.customer_code)) || "Unknown";
            customerSales.set(cName, (customerSales.get(cName) || 0) + amt);
          }
        }
      }
    });

    // --- PROCESS RETURNS ---
    returnDetails.forEach((ret: any) => {
      const retId = String(ret.return_no);
      if (validReturnIds.has(retId)) {
        const pId = String(ret.product_id);
        const qty = Number(ret.quantity) || 0;

        ALL_DIVISIONS.forEach((divName) => {
          if (checkDivision(pId, divName)) {
            const curr = divisionStats.get(divName)!;
            curr.bad += qty;
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
      }
    });

    // --- BUILD RESPONSE ---
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
        .sort()
        .map(([d, v]) => ({
          date: new Date(d).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          goodStockOutflow: v.good,
          badStockInflow: v.bad,
        }));
    }

    const salesBySupplier = Array.from(supplierSales.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    const salesBySalesman = Array.from(salesmanSales.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    const topProducts = Array.from(productSales.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    const topCustomers = Array.from(customerSales.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const supplierBreakdown = salesBySupplier.map((s) => ({
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
          velocityRate: stats.good > 0 ? 95 : 0,
          totalOutflow: stats.good,
          status:
            stats.good > 5000
              ? "Healthy"
              : stats.good > 0
              ? "Warning"
              : "Critical",
        },
        badStock: { accumulated: stats.bad },
      };
    });

    return NextResponse.json({
      division: activeTab,
      goodStock: {
        velocityRate: 95,
        status: "Healthy",
        totalOutflow: totalGoodStockOutflow,
        totalInflow: totalGoodStockOutflow + 5000,
      },
      badStock: {
        accumulated: totalBadStockInflow,
        status: "Normal",
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
