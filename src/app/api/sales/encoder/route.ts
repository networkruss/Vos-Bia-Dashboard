import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://100.110.197.61:8056";

// Helper to fetch
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

// Helper to get "Jan 2024" format for grouping
function getMonthKey(dateString: string) {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Helper to get sortable date value
function getDateValue(dateString: string) {
  if (!dateString) return 0;
  return new Date(dateString).getTime();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const salesmanId = searchParams.get("salesmanId");

    // --- 1. GET SALESMEN LIST ---
    if (type === "salesmen") {
      const salesmen = await fetchAll(
        `${DIRECTUS_URL}/items/salesman?limit=-1`
      );
      const list = salesmen
        .filter((s: any) => s.isActive)
        .map((s: any) => ({ id: s.id, name: s.salesman_name }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      return NextResponse.json({ success: true, data: list });
    }

    // --- 2. GET DASHBOARD DATA ---
    if (type === "dashboard" && salesmanId) {
      const [
        invoices,
        invoiceDetails,
        products,
        returns,
        returnDetails,
        returnTypes,
        suppliers,
        productSupplierMap,
        // NEW: Fetch Targets from DB
        targets,
        tacticalSkus,
      ] = await Promise.all([
        fetchAll(
          `${DIRECTUS_URL}/items/sales_invoice?filter[salesman_id][_eq]=${salesmanId}&limit=-1`
        ),
        fetchAll(`${DIRECTUS_URL}/items/sales_invoice_details?limit=-1`),
        fetchAll(`${DIRECTUS_URL}/items/products?limit=-1`),
        fetchAll(
          `${DIRECTUS_URL}/items/sales_return?filter[salesman_id][_eq]=${salesmanId}&limit=-1`
        ),
        fetchAll(`${DIRECTUS_URL}/items/sales_return_details?limit=-1`),
        fetchAll(`${DIRECTUS_URL}/items/sales_return_type?limit=-1`),
        fetchAll(`${DIRECTUS_URL}/items/suppliers?limit=-1`),
        fetchAll(`${DIRECTUS_URL}/items/product_per_supplier?limit=-1`),
        // REAL TARGET DATA
        fetchAll(
          `${DIRECTUS_URL}/items/salesman_target_setting?filter[salesman_id][_eq]=${salesmanId}&sort=-date_range_from&limit=12`
        ),
        fetchAll(
          `${DIRECTUS_URL}/items/salesman_tactical_sku?filter[salesman_id][_eq]=${salesmanId}&limit=-1`
        ),
      ]);

      // --- 1. PROCESS TREND (Target vs Actual) ---
      // We will group everything by Month-Year
      const trendMap = new Map<
        string,
        { dateVal: number; month: string; target: number; achieved: number }
      >();

      // A. Process Targets (Real Data)
      targets.forEach((t: any) => {
        if (!t.date_range_from) return;
        const monthKey = getMonthKey(t.date_range_from);

        if (!trendMap.has(monthKey)) {
          trendMap.set(monthKey, {
            dateVal: getDateValue(t.date_range_from),
            month: monthKey,
            target: 0,
            achieved: 0,
          });
        }
        // 'volume' is the target amount based on your schema
        const targetVal = Number(t.volume) || 0;
        trendMap.get(monthKey)!.target += targetVal;
      });

      // B. Process Actual Sales (Invoices)
      invoices.forEach((inv: any) => {
        if (!inv.invoice_date) return;
        const monthKey = getMonthKey(inv.invoice_date);

        // If this month doesn't exist in targets, add it anyway
        if (!trendMap.has(monthKey)) {
          trendMap.set(monthKey, {
            dateVal: getDateValue(inv.invoice_date),
            month: monthKey,
            target: 0,
            achieved: 0,
          });
        }
        trendMap.get(monthKey)!.achieved += Number(inv.total_amount) || 0;
      });

      // C. Convert to Array & Sort by Date
      const trend = Array.from(trendMap.values())
        .sort((a, b) => a.dateVal - b.dateVal)
        // Clean up the month label to just "Jan", "Feb" if preferred, or keep "Jan 2025"
        .map((t) => ({
          month: t.month.split(" ")[0], // Just Month Name for cleaner X-Axis
          fullDate: t.month,
          target: t.target,
          achieved: t.achieved,
        }));

      // --- 2. CALCULATE KPI AGGREGATES ---
      const totalOrders = invoices.length;
      const orderValue = invoices.reduce(
        (sum: number, inv: any) => sum + (Number(inv.total_amount) || 0),
        0
      );
      const pendingOrders = invoices.filter((inv: any) => !inv.isPosted).length;

      // Calculate Total Target (Sum of all visible targets in trend)
      const totalTarget = trend.reduce((sum, t) => sum + t.target, 0) || 1; // Avoid 0 div
      const gap = totalTarget - orderValue;
      const percentAchieved = Math.round((orderValue / totalTarget) * 100);

      // --- 3. PRODUCTS & SUPPLIERS LOGIC ---
      const productMap = new Map(
        products.map((p: any) => [p.product_id, p.product_name])
      );
      const supplierNameMap = new Map(
        suppliers.map((s: any) => [s.id, s.supplier_name])
      );
      const productToSupplierMap = new Map();

      productSupplierMap.forEach((pps: any) => {
        if (!productToSupplierMap.has(pps.product_id)) {
          const sName = supplierNameMap.get(pps.supplier_id);
          if (sName) productToSupplierMap.set(pps.product_id, sName);
        }
      });

      const productSales = new Map<
        string,
        { value: number; quantity: number }
      >();
      const supplierSalesMap = new Map<string, number>();
      const validInvoiceIds = new Set(invoices.map((i: any) => i.invoice_id));

      invoiceDetails.forEach((det: any) => {
        const invId =
          typeof det.invoice_no === "object"
            ? det.invoice_no.id
            : det.invoice_no;
        if (validInvoiceIds.has(invId)) {
          const pName = String(
            productMap.get(det.product_id) || `Product ${det.product_id}`
          );
          const amount = Number(det.total_amount) || 0;
          const qty = Number(det.quantity) || 0;
          const supplier = String(
            productToSupplierMap.get(det.product_id) || "Internal"
          );

          const curr = productSales.get(pName) || { value: 0, quantity: 0 };
          productSales.set(pName, {
            value: curr.value + amount,
            quantity: curr.quantity + qty,
          });
          supplierSalesMap.set(
            supplier,
            (supplierSalesMap.get(supplier) || 0) + amount
          );
        }
      });

      const topProducts = Array.from(productSales.entries())
        .map(([name, stats]) => ({
          name,
          value: stats.value,
          quantity: stats.quantity,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      const supplierSales = Array.from(supplierSalesMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // --- 4. RETURNS LOGIC ---
      const returnTypeMap = new Map(
        returnTypes.map((t: any) => [t.type_id, t.type_name])
      );
      const returnHistory = [];
      const validReturnNumbers = new Set(
        returns.map((r: any) => r.return_number)
      );

      for (const det of returnDetails) {
        if (validReturnNumbers.has(det.return_no)) {
          const pName = productMap.get(det.product_id) || "Unknown";
          const reason =
            returnTypeMap.get(det.sales_return_type_id) || "Unspecified";
          returnHistory.push({
            id: det.return_no,
            product: pName,
            date: formatParseDate(det.created_at),
            quantity: Number(det.quantity),
            reason: reason,
          });
        }
      }
      returnHistory.sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // --- 5. TACTICAL SKU (Real Data) ---
      // Assuming tactical_sku table has: product_id, target_amount
      const skuPerformance: Array<{
        product: string;
        target: number;
        achieved: number;
        gap: number;
        gapPercent: number;
        status: string;
      }> = [];
      // If no tactical skus set, use Top 5 products as fallback
      const skuSource =
        tacticalSkus.length > 0 ? tacticalSkus : topProducts.slice(0, 5);

      skuSource.forEach((item: any) => {
        let pName = "",
          target = 0,
          achieved = 0;

        if (tacticalSkus.length > 0) {
          // Real Tactical SKU Logic
          pName = String(productMap.get(item.product_id) || "Unknown SKU");
          target = Number(item.target_amount) || 1000;
          achieved = productSales.get(pName)?.value || 0;
        } else {
          // Fallback Logic
          pName = item.name;
          achieved = item.value;
          target = Math.round(achieved * 1.1); // Mock 10% higher target
        }

        const gap = target - achieved;
        skuPerformance.push({
          product: pName,
          target,
          achieved,
          gap,
          gapPercent: target > 0 ? Math.round((gap / target) * 100) : 0,
          status: gap > target * 0.1 ? "Behind" : "On Track",
        });
      });

      const ordersList = invoices.slice(0, 10).map((inv: any) => ({
        id: inv.invoice_no || `INV-${inv.invoice_id}`,
        date: formatParseDate(inv.invoice_date),
        status: inv.isPosted ? "Delivered" : "Pending",
        amount: Number(inv.total_amount) || 0,
      }));

      return NextResponse.json({
        success: true,
        data: {
          salesmanName: "",
          kpi: {
            totalOrders,
            orderValue,
            pendingOrders,
            returns: returnHistory.length,
          },
          orders: ordersList,
          target: {
            total: totalTarget,
            achieved: orderValue,
            gap,
            percent: percentAchieved,
          },
          trend, // REAL TREND DATA
          skuPerformance,
          topProducts,
          supplierSales,
          returnHistory,
        },
      });
    }
    return NextResponse.json({ success: false, error: "Invalid Request" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function formatParseDate(dateString: string | null) {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("en-US");
}
