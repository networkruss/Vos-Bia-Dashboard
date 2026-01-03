import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://100.110.197.61:8056";

// Helper function to fetch data from Directus
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'salesmen' or 'dashboard'
    const salesmanId = searchParams.get("salesmanId");

    // --- 1. GET SALESMEN LIST ---
    if (type === "salesmen") {
      const salesmen = await fetchAll(
        `${DIRECTUS_URL}/items/salesman?limit=-1`
      );
      const list = salesmen
        .filter((s: any) => s.isActive)
        .map((s: any) => ({
          id: s.id,
          name: s.salesman_name,
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      return NextResponse.json({ success: true, data: list });
    }

    // --- 2. GET DASHBOARD DATA ---
    if (type === "dashboard" && salesmanId) {
      // Fetch all necessary tables in parallel
      const [
        invoices,
        invoiceDetails,
        products,
        returns,
        returnDetails,
        returnTypes,
        suppliers,
        productSupplierMap,
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
        // Fetch Supplier Data
        fetchAll(`${DIRECTUS_URL}/items/suppliers?limit=-1`),
        fetchAll(`${DIRECTUS_URL}/items/product_per_supplier?limit=-1`),
      ]);

      // --- MAPPING LOGIC ---

      // 1. Map Product ID -> Product Name
      const productMap = new Map(
        products.map((p: any) => [p.product_id, p.product_name])
      );

      // 2. Map Return Type ID -> Return Reason Text
      const returnTypeMap = new Map(
        returnTypes.map((t: any) => [t.type_id, t.type_name])
      );

      // 3. Map Product ID -> Supplier Name
      // First, map Supplier ID to Supplier Name
      const supplierNameMap = new Map(
        suppliers.map((s: any) => [s.id, s.supplier_name])
      );

      // Then, link Product ID to Supplier Name using the junction table
      const productToSupplierMap = new Map();
      productSupplierMap.forEach((pps: any) => {
        // Only map if we haven't found a supplier for this product yet (primary supplier)
        if (!productToSupplierMap.has(pps.product_id)) {
          const sName = supplierNameMap.get(pps.supplier_id);
          if (sName) {
            productToSupplierMap.set(pps.product_id, sName);
          }
        }
      });

      // --- PROCESS SALES & KPI ---
      const totalOrders = invoices.length;
      const orderValue = invoices.reduce(
        (sum: number, inv: any) => sum + (Number(inv.total_amount) || 0),
        0
      );
      const pendingOrders = invoices.filter((inv: any) => !inv.isPosted).length;

      // Identify valid invoice IDs for this salesman
      const validInvoiceIds = new Set(invoices.map((i: any) => i.invoice_id));

      // Aggregators
      const productSales = new Map<
        string,
        { value: number; quantity: number; supplier: string }
      >();
      const supplierSalesMap = new Map<string, number>();

      // Iterate Invoice Details
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

          // Identify Supplier (Default to 'Internal' if not found in map)
          const supplier = String(
            productToSupplierMap.get(det.product_id) || "Internal / Others"
          );

          // Add to Product Sales
          const currentProd = productSales.get(pName) || {
            value: 0,
            quantity: 0,
            supplier,
          };
          productSales.set(pName, {
            value: currentProd.value + amount,
            quantity: currentProd.quantity + qty,
            supplier,
          });

          // Add to Supplier Sales
          supplierSalesMap.set(
            supplier,
            (supplierSalesMap.get(supplier) || 0) + amount
          );
        }
      });

      // Format Top Products (Sort by Value)
      const topProducts = Array.from(productSales.entries())
        .map(([name, stats]) => ({
          name,
          value: stats.value,
          quantity: stats.quantity,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // Format Supplier Sales (Sort by Value)
      const supplierSales = Array.from(supplierSalesMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5 Suppliers

      // --- PROCESS RETURNS ---
      const returnHistory = [];
      let totalReturnCount = 0;

      const validReturnNumbers = new Set(
        returns.map((r: any) => r.return_number)
      );

      for (const det of returnDetails) {
        if (validReturnNumbers.has(det.return_no)) {
          const pName = productMap.get(det.product_id) || "Unknown Product";
          const reason =
            returnTypeMap.get(det.sales_return_type_id) || "Unspecified";

          returnHistory.push({
            id: det.return_no,
            product: pName,
            date: formatParseDate(det.created_at),
            quantity: Number(det.quantity),
            reason: reason,
          });
          totalReturnCount++;
        }
      }

      // Sort returns by date (most recent)
      returnHistory.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // --- MOCK TARGETS & TRENDS (Since targets table not provided) ---
      const totalTarget = Math.round(orderValue * 1.2) || 100000;
      const gap = totalTarget - orderValue;
      const percentAchieved =
        totalTarget > 0 ? Math.round((orderValue / totalTarget) * 100) : 0;

      const trend = generateMockTrend(totalTarget, orderValue);
      const skuPerformance = generateMockSkuPerformance(topProducts);

      // --- ORDERS LIST ---
      const ordersList = invoices
        .sort(
          (a: any, b: any) =>
            new Date(b.invoice_date).getTime() -
            new Date(a.invoice_date).getTime()
        )
        .slice(0, 10)
        .map((inv: any) => ({
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
            returns: totalReturnCount,
          },
          orders: ordersList,
          target: {
            total: totalTarget,
            achieved: orderValue,
            gap,
            percent: percentAchieved,
          },
          trend,
          skuPerformance,
          topProducts,
          supplierSales,
          returnHistory,
        },
      });
    }

    return NextResponse.json({ success: false, error: "Invalid Request" });
  } catch (error: any) {
    console.error("Salesman API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// --- HELPERS ---

function formatParseDate(dateString: string | null) {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("en-US");
}

function generateMockTrend(target: number, actual: number) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return months.map((month) => ({
    month,
    target: target / 6,
    achieved: (actual / 6) * (0.8 + Math.random() * 0.4), // Random variance around average
  }));
}

function generateMockSkuPerformance(products: any[]) {
  return products.slice(0, 5).map((p) => {
    const t = Math.round(p.value * 1.15);
    const g = t - p.value;
    return {
      product: p.name,
      target: t,
      achieved: p.value,
      gap: g,
      gapPercent: Math.round((g / t) * 100),
      status: g > t * 0.2 ? "Behind" : "On Track",
    };
  });
}
