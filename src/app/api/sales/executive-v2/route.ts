import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.DIRECTUS_URL;

// Mapping para sa Dummy Data
const SUPPLIER_MAPPING: Record<string, string> = {
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
  COSTSAVER: "Dry Goods",
};
const ALL_DIVISIONS = [
  "Dry Goods",
  "Frozen Goods",
  "Industrial",
  "Mama Pina's",
];

async function fetchAll(url: string, label: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 min timeout

  try {
    // No-store para laging fresh ang dummy data
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`❌ Error [${label}]: ${res.status} ${res.statusText}`);
      return [];
    }
    const json = await res.json();
    console.log(`✅ [${label}] Items: ${json.data?.length || 0}`);
    return json.data || [];
  } catch (e: any) {
    console.error(`❌ Failed [${label}]:`, e.message);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedDivision = searchParams.get("division");

    console.log(`🚀 FETCHING DUMMY DATA (Port 8056)...`);

    // 1. GET ALL DATA (Walang Date Filter para sure na lumabas ang dummy data mo)
    const [invoices, details, pps, suppliers] = await Promise.all([
      fetchAll(
        `${DIRECTUS_URL}/items/sales_invoice?limit=-1&fields=invoice_id,invoice_date`,
        "Invoices"
      ),
      fetchAll(
        `${DIRECTUS_URL}/items/sales_invoice_details?limit=-1&fields=invoice_no,product_id,total_amount,discount_amount`,
        "Details"
      ),
      fetchAll(
        `${DIRECTUS_URL}/items/product_per_supplier?limit=-1&fields=product_id,supplier_id`,
        "Prod-Supplier"
      ),
      fetchAll(
        `${DIRECTUS_URL}/items/suppliers?limit=-1&fields=id,supplier_name`,
        "Suppliers"
      ),
    ]);

    if (invoices.length === 0) {
      // Kung walang nakuha, baka mali pa rin ang URL or Permissions
      console.error("⚠️ No Invoices Found. Check Permissions or URL.");
      return NextResponse.json({ data: {} });
    }

    // 2. BUILD MAPS
    const supplierNameMap = new Map(
      suppliers.map((s: any) => [String(s.id), s.supplier_name.toUpperCase()])
    );
    const productSupplierMap = new Map(
      pps.map((p: any) => [String(p.product_id), String(p.supplier_id)])
    );

    // 3. FILTER VALID INVOICES (Status Only)
    const validInvoiceIds = new Set<string>();
    invoices.forEach((inv: any) => {
      // Isama natin kahit anong date, basta hindi cancelled
      if (
        inv.status === "void" ||
        inv.status === "cancelled" ||
        inv.is_cancelled === true
      )
        return;
      validInvoiceIds.add(String(inv.invoice_id));
    });

    console.log(`🎯 Valid Dummy Invoices: ${validInvoiceIds.size}`);

    // 4. GROUP BY SUPPLIER
    const supplierSales: Record<string, number> = {};
    const supplierDivisions: Record<string, string> = {};

    details.forEach((det: any) => {
      const invId =
        typeof det.invoice_no === "object"
          ? det.invoice_no?.id
          : det.invoice_no;
      if (!validInvoiceIds.has(String(invId))) return;

      const pId = String(det.product_id);
      const netSales =
        (Number(det.total_amount) || 0) - (Number(det.discount_amount) || 0);

      // Identify Supplier
      const suppId = productSupplierMap.get(pId);
      const suppName = suppId ? supplierNameMap.get(suppId) : "UNASSIGNED";

      if (!suppName) return;

      // Identify Division
      let division = "Dry Goods"; // Default fallback
      for (const [key, val] of Object.entries(SUPPLIER_MAPPING)) {
        if (suppName.includes(key)) {
          division = val;
          break;
        }
      }

      if (!supplierSales[suppName]) {
        supplierSales[suppName] = 0;
        supplierDivisions[suppName] = division;
      }
      supplierSales[suppName] += netSales;
    });

    // 5. FORMAT LIST
    const resultList = Object.entries(supplierSales)
      .map(([name, sales]) => ({
        name,
        sales,
        division: supplierDivisions[name],
      }))
      .sort((a, b) => b.sales - a.sales);

    console.log(`📦 Found ${resultList.length} suppliers in dummy data`);

    const finalResponse: any = {};
    if (selectedDivision && selectedDivision !== "all") {
      finalResponse[selectedDivision] = resultList.filter(
        (i) => i.division === selectedDivision
      );

      // FORCE SHOW: Kung walang match sa Division, ipakita ang UNASSIGNED sa Dry Goods para makita mo
      if (selectedDivision === "Dry Goods") {
        const unassigned = resultList.filter((i) => i.name === "UNASSIGNED");
        if (unassigned.length > 0) {
          finalResponse["Dry Goods"] = [
            ...finalResponse["Dry Goods"],
            ...unassigned,
          ];
        }
      }
    } else {
      ALL_DIVISIONS.forEach((div) => {
        finalResponse[div] = resultList.filter((i) => i.division === div);
      });
    }

    return NextResponse.json({ data: finalResponse });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
