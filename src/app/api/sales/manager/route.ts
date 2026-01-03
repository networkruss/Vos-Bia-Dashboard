import { NextResponse } from "next/server";

// Using port 8056 based on your provided links
const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://100.110.197.61:8056";

// --- HELPERS ---
async function fetchAll<T = any>(url: string): Promise<T[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 mins

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      console.error(`Directus Error ${res.status} on ${url}`);
      return [];
    }
    const json = await res.json();
    return (json.data as T[]) || [];
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    return [];
  }
}

function normalizeDate(d: string | null) {
  if (!d) return null;
  if (d.includes("/")) {
    const parts = d.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  return d;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = normalizeDate(searchParams.get("fromDate"));
    const toDate = normalizeDate(searchParams.get("toDate"));
    const reqDivision = searchParams.get("activeTab") || "Overview";

    // --- 1. OPTIMIZED FETCHING ---
    let invoiceFilter = "?limit=-1";
    let detailsFilter = "?limit=-1";
    let returnsFilter = "?limit=-1";

    if (fromDate && toDate) {
      // Filter by Invoice Date (Invoices)
      invoiceFilter += `&filter[invoice_date][_between]=[${fromDate},${toDate} 23:59:59]`;

      // Filter by Created Date (Details) - assuming close to invoice date for speed
      detailsFilter += `&filter[created_date][_between]=[${fromDate},${toDate} 23:59:59]`;

      // Filter by Return Date
      returnsFilter += `&filter[return_date][_between]=[${fromDate},${toDate} 23:59:59]`;
    }

    const [
      invoices,
      invDetails,
      returns,
      retDetails,
      products,
      salesmen,
      divisions,
      pps,
      suppliers,
      customers,
    ] = await Promise.all([
      fetchAll(
        `${DIRECTUS_URL}/items/sales_invoice${invoiceFilter}&fields=invoice_id,invoice_date,salesman_id,customer_code`
      ),
      fetchAll(
        `${DIRECTUS_URL}/items/sales_invoice_details${detailsFilter}&fields=invoice_no,product_id,quantity,total_amount`
      ),
      fetchAll(
        `${DIRECTUS_URL}/items/sales_return${returnsFilter}&fields=return_number,return_date,salesman_id`
      ),
      fetchAll(
        `${DIRECTUS_URL}/items/sales_return_details?limit=-1&fields=return_no,product_id,quantity,total_amount,unit_price`
      ),
      fetchAll(
        `${DIRECTUS_URL}/items/products?limit=-1&fields=product_id,product_name,parent_id`
      ),
      fetchAll(
        `${DIRECTUS_URL}/items/salesman?limit=-1&fields=id,salesman_name,division_id`
      ),
      fetchAll(
        `${DIRECTUS_URL}/items/division?limit=-1&fields=division_id,division_name`
      ),
      fetchAll(
        `${DIRECTUS_URL}/items/product_per_supplier?limit=-1&fields=product_id,supplier_id`
      ),
      fetchAll(
        `${DIRECTUS_URL}/items/suppliers?limit=-1&fields=id,supplier_name`
      ),
      fetchAll(
        `${DIRECTUS_URL}/items/customer?limit=-1&fields=id,customer_code,customer_name,store_name`
      ),
    ]);

    // 2. BUILD MAPS
    const invoiceMap = new Map<string, any>();
    invoices.forEach((i: any) => invoiceMap.set(String(i.invoice_id), i));

    const returnMap = new Map<string, any>();
    returns.forEach((r: any) => returnMap.set(String(r.return_number), r));

    const productMap = new Map<string, any>();
    products.forEach((p: any) => productMap.set(String(p.product_id), p));

    const supplierMap = new Map<string, string>();
    suppliers.forEach((s: any) =>
      supplierMap.set(String(s.id), s.supplier_name)
    );

    const divisionMap = new Map<string, string>();
    divisions.forEach((d: any) =>
      divisionMap.set(String(d.division_id), d.division_name)
    );

    const customerMap = new Map<string, string>();
    customers.forEach((c: any) => {
      let name = c.customer_name;
      if (!name || name === "0" || name === "0.00") name = c.store_name;
      if (!name || name === "0" || name === "0.00")
        name = "Walk-in / Cash Sales";
      if (c.customer_code) customerMap.set(String(c.customer_code), name);
    });

    const salesmanNameMap = new Map<string, string>();
    const salesmanDivMap = new Map<string, string>();
    salesmen.forEach((s: any) => {
      const sId = String(s.id);
      salesmanNameMap.set(sId, s.salesman_name);
      if (s.division_id) {
        const dName = divisionMap.get(String(s.division_id));
        if (dName) salesmanDivMap.set(sId, dName);
      }
    });

    const productToSupplierIdMap = new Map<string, string>();
    pps.forEach((r: any) => {
      if (!productToSupplierIdMap.has(String(r.product_id))) {
        productToSupplierIdMap.set(String(r.product_id), String(r.supplier_id));
      }
    });

    // --- RESOLVERS ---
    const getSupplierName = (productId: string) => {
      let sId = productToSupplierIdMap.get(productId);
      if (!sId) {
        const prod = productMap.get(productId);
        if (prod?.parent_id)
          sId = productToSupplierIdMap.get(String(prod.parent_id));
      }

      if (sId) {
        const name = supplierMap.get(sId);
        // Exclude placeholder supplier
        if (name && !name.includes("MEN2 MARKETING")) return name;
      }

      const pName = (
        productMap.get(productId)?.product_name || ""
      ).toUpperCase();
      if (
        pName.includes("CDO") ||
        pName.includes("FUNTSTY") ||
        pName.includes("HIGHLANDS")
      )
        return "FOODSPHERE INC.";
      if (pName.includes("SKINTEC") || pName.includes("FIONA"))
        return "SKINTEC";
      if (pName.includes("MAMA PINA")) return "MAMA PINA'S";
      if (pName.includes("SOLANE") || pName.includes("ISLA"))
        return "ISLA LPG CORPORATION";
      if (pName.includes("PUREFOODS") || pName.includes("TENDER"))
        return "SAN MIGUEL FOODS";

      return "Uncategorized Supplier";
    };

    const getDivision = (salesmanId: string, productId: string) => {
      // 1. Salesman's Assigned Division (Strongest Link)
      const sDiv = salesmanDivMap.get(salesmanId);
      if (sDiv) return sDiv;

      const pName = (
        productMap.get(productId)?.product_name || ""
      ).toUpperCase();
      const sName = getSupplierName(productId).toUpperCase();

      // 2. PRODUCT KEYWORD CHECK (Priority: FROZEN GOODS)
      // This catches CDO Hotdogs etc. before they get assigned to Dry Goods via Supplier Name
      if (
        pName.includes("HOTDOG") ||
        pName.includes("BACON") ||
        pName.includes("TOCINO") ||
        pName.includes("NUGGETS") ||
        pName.includes("HAM") ||
        pName.includes("FRANK") ||
        pName.includes("FROZEN") ||
        pName.includes("CHICKEN") ||
        pName.includes("PORK")
      )
        return "Frozen Goods";

      // 3. Supplier Logic (Secondary)
      if (
        sName.includes("SKINTEC") ||
        sName.includes("FOODSPHERE") ||
        sName.includes("VOS")
      )
        return "Dry Goods";
      if (
        sName.includes("ISLA") ||
        sName.includes("INDUSTRIAL") ||
        pName.includes("LPG")
      )
        return "Industrial";
      if (sName.includes("MAMA PINA")) return "Mama Pina's";

      return "Unassigned";
    };

    // 3. AGGREGATES
    let totalGoodOut = 0;
    let totalBadIn = 0;

    const supplierSales = new Map<string, number>();
    const salesmanSales = new Map<string, number>();
    const productSales = new Map<string, number>();
    const customerSales = new Map<string, number>();
    const supplierDetails = new Map<
      string,
      { id: string; name: string; total: number; salesmen: Map<string, number> }
    >();
    const trendMap = new Map<string, { good: number; bad: number }>();

    const divisionStats = new Map<string, { goodOut: number; badIn: number }>();
    [
      "Dry Goods",
      "Industrial",
      "Mama Pina's",
      "Frozen Goods",
      "Unassigned",
    ].forEach((d) => divisionStats.set(d, { goodOut: 0, badIn: 0 }));

    // --- PROCESS SALES ---
    invDetails.forEach((det: any) => {
      const invId = String(det.invoice_no);
      const inv = invoiceMap.get(invId);

      // Skip if invoice not found (e.g. filtered out by date)
      if (!inv) return;

      const sManId = String(inv.salesman_id);
      const pId = String(det.product_id);
      const divName = getDivision(sManId, pId);

      // Global Filter
      if (reqDivision !== "Overview" && divName !== reqDivision) return;

      const qty = Number(det.quantity) || 0;
      const amount = Number(det.total_amount) || 0;

      const dateObj = new Date(inv.invoice_date);
      const monthKey = dateObj.toLocaleString("en-US", { month: "short" });
      if (!trendMap.has(monthKey)) trendMap.set(monthKey, { good: 0, bad: 0 });
      trendMap.get(monthKey)!.good += qty;

      const d = inv.invoice_date.substring(0, 10);
      if ((!fromDate || d >= fromDate) && (!toDate || d <= toDate)) {
        totalGoodOut += qty;
        if (divisionStats.has(divName))
          divisionStats.get(divName)!.goodOut += qty;

        const sName = getSupplierName(pId);
        let smName = salesmanNameMap.get(sManId);
        if (!smName) smName = `Unknown Salesman (${sManId})`;
        const pName = productMap.get(pId)?.product_name || `Product #${pId}`;
        const cCode = String(inv.customer_code);
        const cName = customerMap.get(cCode) || `Customer ${cCode}`;

        supplierSales.set(sName, (supplierSales.get(sName) || 0) + amount);
        salesmanSales.set(smName, (salesmanSales.get(smName) || 0) + amount);
        productSales.set(pName, (productSales.get(pName) || 0) + amount);
        customerSales.set(cName, (customerSales.get(cName) || 0) + amount);

        if (!supplierDetails.has(sName)) {
          supplierDetails.set(sName, {
            id: sName,
            name: sName,
            total: 0,
            salesmen: new Map(),
          });
        }
        const sd = supplierDetails.get(sName)!;
        sd.total += amount;
        sd.salesmen.set(smName, (sd.salesmen.get(smName) || 0) + amount);
      }
    });

    // --- PROCESS RETURNS ---
    retDetails.forEach((ret: any) => {
      const parent = returnMap.get(String(ret.return_no));
      if (!parent || !parent.return_date) return;

      const sManId = String(parent.salesman_id);
      const pId = String(ret.product_id);
      const divName = getDivision(sManId, pId);

      if (reqDivision !== "Overview" && divName !== reqDivision) return;

      let qty = Number(ret.quantity) || 0;
      if (qty === 0 && Number(ret.unit_price) > 0) {
        qty = Math.round(
          (Number(ret.total_amount) || 0) / Number(ret.unit_price)
        );
      }

      const dateObj = new Date(parent.return_date);
      const monthKey = dateObj.toLocaleString("en-US", { month: "short" });

      if (!trendMap.has(monthKey)) trendMap.set(monthKey, { good: 0, bad: 0 });
      trendMap.get(monthKey)!.bad += qty;

      const d = parent.return_date.substring(0, 10);
      if ((!fromDate || d >= fromDate) && (!toDate || d <= toDate)) {
        totalBadIn += qty;
        if (divisionStats.has(divName))
          divisionStats.get(divName)!.badIn += qty;
      }
    });

    // --- FORMAT OUTPUT ---
    const totalMovement = totalGoodOut + totalBadIn;
    const velocityRate =
      totalMovement > 0 ? Math.round((totalGoodOut / totalMovement) * 100) : 0;

    let velocityStatus: "Healthy" | "Warning" | "Critical" = "Healthy";
    if (velocityRate < 80) velocityStatus = "Warning";
    if (velocityRate < 50) velocityStatus = "Critical";

    let badStockStatus: "Normal" | "High" = "Normal";
    if (totalBadIn > totalGoodOut * 0.05) badStockStatus = "High";

    const monthOrder = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const trendData = monthOrder.map((m) => ({
      date: m,
      goodStockOutflow: trendMap.get(m)?.good || 0,
      badStockInflow: trendMap.get(m)?.bad || 0,
    }));

    const formatChart = (map: Map<string, number>, topN = 10) =>
      Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, topN);

    const supplierBreakdownFormatted = Array.from(supplierDetails.values())
      .map((s) => {
        const salesmenList = Array.from(s.salesmen.entries())
          .map(([name, amount]) => ({
            name,
            amount,
            percent:
              s.total > 0 ? Number(((amount / s.total) * 100).toFixed(1)) : 0,
          }))
          .filter((i) => i.amount > 0)
          .sort((a, b) => b.amount - a.amount);

        return {
          id: s.id,
          name: s.name,
          totalSales: s.total,
          salesmen: salesmenList,
        };
      })
      .filter((s) => s.totalSales > 0)
      .sort((a, b) => b.totalSales - a.totalSales);

    const divisionBreakdownFormatted = Array.from(divisionStats.entries()).map(
      ([div, stats]) => {
        const divTotal = stats.goodOut + stats.badIn;
        const divVelocity =
          divTotal > 0 ? Math.round((stats.goodOut / divTotal) * 100) : 0;

        let divStatus = "Healthy";
        if (divVelocity < 80) divStatus = "Warning";
        if (divVelocity < 50) divStatus = "Critical";
        if (divTotal === 0) divStatus = "No Data";

        return {
          division: div,
          goodStock: {
            velocityRate: divVelocity,
            status: divStatus,
            totalOutflow: stats.goodOut,
            totalInflow: divTotal,
          },
          badStock: {
            accumulated: stats.badIn,
            status: stats.badIn > stats.goodOut * 0.05 ? "High" : "Normal",
            totalInflow: stats.badIn,
          },
        };
      }
    );

    return NextResponse.json({
      division: reqDivision,
      goodStock: {
        velocityRate,
        status: velocityStatus,
        totalOutflow: totalGoodOut,
        totalInflow: totalMovement,
      },
      badStock: {
        accumulated: totalBadIn,
        status: badStockStatus,
        totalInflow: totalBadIn,
      },
      trendData,
      salesBySupplier: formatChart(supplierSales, 15),
      salesBySalesman: formatChart(salesmanSales, 20),
      supplierBreakdown: supplierBreakdownFormatted,
      pareto: {
        products: formatChart(productSales, 10),
        customers: formatChart(customerSales, 10),
      },
      divisionBreakdown: divisionBreakdownFormatted,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ Manager API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data", details: msg },
      { status: 500 }
    );
  }
}
