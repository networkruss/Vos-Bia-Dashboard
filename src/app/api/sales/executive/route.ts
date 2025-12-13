// src/app/api/sales/executive/route.ts
import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://100.126.246.124:8060";

// Directus API Response Types
interface DirectusResponse<T> {
  data: T[];
}

interface DirectusInvoice {
  invoice_id: string;
  invoice_no: string;
  order_id: string;
  invoice_date: string;
  customer_code: string;
  salesman_id: number;
  branch_id: number;
  total_amount: string | number;
  discount_amount: string | number;
}

interface DirectusReturn {
  invoice_no: string;
  total_amount: string | number;
  discount_amount: string | number;
}

interface DirectusSalesman {
  id: number;
  salesman_name: string;
  division_id: number;
}

interface DirectusDivision {
  division_id: number;
  division_name: string;
}

interface DirectusCustomer {
  customer_code: string;
  customer_name: string;
}

interface DirectusBranch {
  id: number;
  branch_name: string;
}

interface ProcessedInvoice {
  invoice_id: string;
  invoice_no: string;
  order_id: string;
  invoice_date: string;
  customer_code: string;
  customer_name: string;
  salesman_id: number;
  salesman_name: string;
  division_id: number;
  division_name: string;
  branch_id: number;
  branch_name: string;
  total_amount: number;
  discount_amount: number;
  return_amount: number;
  return_discount: number;
  netSales: number;
}

// Enhanced fetch with better error handling
async function fetchCritical(
  url: string,
  name: string,
  retries = 3
): Promise<DirectusResponse<unknown>> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`⏳ [${name}] Attempt ${attempt}/${retries}: ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`⏰ [${name}] Timeout after 45s`);
        controller.abort();
      }, 45000);

      const response = await fetch(url, {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        signal: controller.signal,
        cache: "no-store",
        // Add these options for better compatibility
        next: { revalidate: 0 },
      });

      clearTimeout(timeoutId);

      console.log(`📡 [${name}] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [${name}] Error response:`, errorText.substring(0, 200));

        if ([500, 503, 504].includes(response.status) && attempt < retries) {
          const delay = attempt * 2000;
          console.log(`⏸️ [${name}] Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
      }

      const data = await response.json();
      console.log(`✅ [${name}] Success: ${data.data?.length || 0} records`);
      return data as DirectusResponse<unknown>;

    } catch (error) {
      const err = error as Error;
      console.error(`💥 [${name}] Attempt ${attempt} failed:`, {
        message: err.message,
        name: err.name,
        cause: (err as Error & { cause?: Error }).cause?.message,
      });

      // Check for specific network errors
      if (err.name === 'AbortError') {
        console.error(`⏰ [${name}] Request timeout`);
      } else if (err.message.includes('fetch failed')) {
        console.error(`🌐 [${name}] Network error - cannot reach server`);
        console.error(`   Check if Directus is running at: ${DIRECTUS_URL}`);
      }

      if (attempt === retries) {
        throw new Error(`${name} failed after ${retries} attempts: ${err.message}`);
      }

      const delay = attempt * 3000; // Increased delay
      console.log(`⏸️ [${name}] Waiting ${delay}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`${name}: Max retries reached`);
}

// Fetch OPTIONAL data (returns empty array if fails)
async function fetchOptional(
  url: string,
  name: string
): Promise<DirectusResponse<unknown>> {
  try {
    console.log(`⏳ [${name}] Fetching (optional)...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      signal: controller.signal,
      cache: "no-store",
      next: { revalidate: 0 },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`⚠️ [${name}] Failed (${response.status}), using empty data`);
      return { data: [] };
    }

    const data = await response.json();
    console.log(`✅ [${name}] Success: ${data.data?.length || 0} records`);
    return data as DirectusResponse<unknown>;
  } catch (error) {
    const err = error as Error;
    console.warn(`⚠️ [${name}] Error: ${err.message} - using empty data`);
    return { data: [] };
  }
}

// Test connection to Directus
async function testDirectusConnection(): Promise<boolean> {
  try {
    console.log("🔍 Testing Directus connection...");
    console.log("📡 Target URL:", DIRECTUS_URL);

    const testUrl = `${DIRECTUS_URL}/server/ping`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(testUrl, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    console.log(`✅ Directus is reachable (status: ${response.status})`);
    return true;
  } catch (error) {
    const err = error as Error;
    console.error("❌ Cannot reach Directus:", err.message);
    return false;
  }
}

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    console.log("\n🚀 ========================================");
    console.log("🔍 Executive Dashboard API Request");
    console.log("🕐 Timestamp:", new Date().toISOString());
    console.log("📡 DIRECTUS_URL:", DIRECTUS_URL);
    console.log("🌐 Environment:", process.env.NODE_ENV);
    console.log("========================================\n");

    const { searchParams } = new URL(request.url);
    const divisionFilter = searchParams.get("division");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    console.log("🔍 Filters:", { divisionFilter, fromDate, toDate });

    // Test connection first
    const isConnected = await testDirectusConnection();
    if (!isConnected) {
      console.error("\n💥 CRITICAL: Cannot establish connection to Directus");
      console.error("   Please verify:");
      console.error("   1. Directus server is running");
      console.error("   2. URL is correct:", DIRECTUS_URL);
      console.error("   3. Port 8060 is accessible");
      console.error("   4. No firewall blocking the connection\n");
      
      throw new Error(
        `Cannot connect to Directus at ${DIRECTUS_URL}. ` +
        `Please check if the server is running and accessible.`
      );
    }

    const urls = {
      invoices: `${DIRECTUS_URL}/items/sales_invoice?limit=-1`,
      returns: `${DIRECTUS_URL}/items/sales_return?limit=-1`,
      salesmen: `${DIRECTUS_URL}/items/salesman?limit=-1`,
      divisions: `${DIRECTUS_URL}/items/division?limit=-1`,
      customers: `${DIRECTUS_URL}/items/customer?limit=-1`,
      branches: `${DIRECTUS_URL}/items/branches?limit=-1`,
    };

    console.log("\n📦 Fetching CRITICAL data (must succeed)...");

    // Fetch CRITICAL data first (must succeed)
    const [invoices, salesmen, divisions] = await Promise.all([
      fetchCritical(urls.invoices, "Invoices", 3),
      fetchCritical(urls.salesmen, "Salesmen", 3),
      fetchCritical(urls.divisions, "Divisions", 3),
    ]);

    console.log("\n📦 Fetching OPTIONAL data (non-blocking)...");

    // Fetch OPTIONAL data (won't crash if fails)
    const [returns, customers, branches] = await Promise.all([
      fetchOptional(urls.returns, "Returns"),
      fetchOptional(urls.customers, "Customers"),
      fetchOptional(urls.branches, "Branches"),
    ]);

    if (!invoices.data || !Array.isArray(invoices.data)) {
      throw new Error("Invalid invoices data structure");
    }

    console.log("\n✅ Data Summary:");
    console.log("   Invoices:", invoices.data?.length || 0);
    console.log("   Returns:", returns.data?.length || 0);
    console.log("   Salesmen:", salesmen.data?.length || 0);
    console.log("   Divisions:", divisions.data?.length || 0);
    console.log("   Customers:", customers.data?.length || 0);
    console.log("   Branches:", branches.data?.length || 0);

    // Build lookup maps
    const salesmanMap = new Map();
    (salesmen.data || []).forEach((s: any) => {
      salesmanMap.set(s.id, s);
    });

    const divisionMap = new Map();
    (divisions.data || []).forEach((d: any) => {
      divisionMap.set(d.division_id, d.division_name || "Unknown");
    });

    const customerMap = new Map();
    (customers.data || []).forEach((c: any) => {
      customerMap.set(c.customer_code, c);
    });

    const branchMap = new Map();
    (branches.data || []).forEach((b: any) => {
      branchMap.set(b.id, b.branch_name || "Unknown");
    });

    // Build returns map
    const returnsMap = new Map();
    (returns.data || []).forEach((r: any) => {
      const key = r.invoice_no;
      if (!returnsMap.has(key)) {
        returnsMap.set(key, []);
      }
      returnsMap.get(key).push(r);
    });

    console.log("\n🔄 Processing invoices...");

    // Process invoices
    const processedInvoices: ProcessedInvoice[] = (invoices.data || []).map(
      (inv: any) => {
        const invoiceTotal = parseFloat(inv.total_amount || 0);
        const invoiceDiscount = parseFloat(inv.discount_amount || 0);

        const invReturns = returnsMap.get(inv.invoice_no) || [];
        const returnTotal = invReturns.reduce(
          (sum: number, r: any) => sum + parseFloat(r.total_amount || 0),
          0
        );
        const returnDiscount = invReturns.reduce(
          (sum: number, r: any) => sum + parseFloat(r.discount_amount || 0),
          0
        );

        const netSales =
          invoiceTotal - invoiceDiscount - (returnTotal - returnDiscount);

        const salesman = salesmanMap.get(inv.salesman_id);
        const divisionId = salesman?.division_id;
        const divisionName = divisionMap.get(divisionId) || "Unknown";

        const customer = customerMap.get(inv.customer_code);
        const branchName = branchMap.get(inv.branch_id) || "Unknown";

        return {
          invoice_id: inv.invoice_id,
          invoice_no: inv.invoice_no,
          order_id: inv.order_id,
          invoice_date: inv.invoice_date,
          customer_code: inv.customer_code,
          customer_name: customer?.customer_name || "Unknown",
          salesman_id: inv.salesman_id,
          salesman_name: salesman?.salesman_name || "Unknown",
          division_id: divisionId,
          division_name: divisionName,
          branch_id: inv.branch_id,
          branch_name: branchName,
          total_amount: invoiceTotal,
          discount_amount: invoiceDiscount,
          return_amount: returnTotal,
          return_discount: returnDiscount,
          netSales: netSales,
        };
      }
    );

    console.log(`✅ Processed ${processedInvoices.length} invoices`);

    // Apply filters
    let filteredInvoices = processedInvoices;
    if (divisionFilter && divisionFilter !== "all") {
      filteredInvoices = filteredInvoices.filter(
        (inv: ProcessedInvoice) => inv.division_name === divisionFilter
      );
      console.log(`🔍 Filtered by division "${divisionFilter}": ${filteredInvoices.length} invoices`);
    }

    // Calculate KPIs
    const totalNetSales = filteredInvoices.reduce(
      (sum: number, inv: ProcessedInvoice) => sum + inv.netSales,
      0
    );
    const totalGrossSales = filteredInvoices.reduce(
      (sum: number, inv: ProcessedInvoice) => sum + inv.total_amount,
      0
    );
    const totalDiscount = filteredInvoices.reduce(
      (sum: number, inv: ProcessedInvoice) => sum + inv.discount_amount,
      0
    );
    const totalReturns = filteredInvoices.reduce(
      (sum: number, inv: ProcessedInvoice) => sum + inv.return_amount,
      0
    );

    const grossMargin =
      totalGrossSales > 0 ? (totalNetSales / totalGrossSales) * 100 : 0;

    // Division sales
    const divisionSalesMap = new Map<string, number>();
    filteredInvoices.forEach((inv: ProcessedInvoice) => {
      const current = divisionSalesMap.get(inv.division_name) || 0;
      divisionSalesMap.set(inv.division_name, current + inv.netSales);
    });

    const divisionSales = Array.from(divisionSalesMap.entries())
      .map(([division, netSales]) => ({ division, netSales }))
      .sort((a, b) => b.netSales - a.netSales);

    // Sales trend
    const salesByDate = new Map<string, number>();
    filteredInvoices.forEach((inv: ProcessedInvoice) => {
      const date = inv.invoice_date?.split("T")[0] || inv.invoice_date;
      const current = salesByDate.get(date) || 0;
      salesByDate.set(date, current + inv.netSales);
    });

    const salesTrend = Array.from(salesByDate.entries())
      .map(([date, netSales]) => ({ date, netSales }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top customers
    const customerSalesMap = new Map();
    filteredInvoices.forEach((inv: ProcessedInvoice) => {
      const key = inv.customer_code;
      if (!customerSalesMap.has(key)) {
        customerSalesMap.set(key, {
          customerName: inv.customer_name,
          division: inv.division_name,
          branch: inv.branch_name,
          netSales: 0,
          invoiceCount: 0,
          lastInvoiceDate: inv.invoice_date,
        });
      }
      const customer = customerSalesMap.get(key);
      customer.netSales += inv.netSales;
      customer.invoiceCount += 1;
      if (inv.invoice_date > customer.lastInvoiceDate) {
        customer.lastInvoiceDate = inv.invoice_date;
      }
    });

    const topCustomers = Array.from(customerSalesMap.values())
      .sort((a, b) => b.netSales - a.netSales)
      .slice(0, 10)
      .map((c, index) => ({
        rank: index + 1,
        customerName: c.customerName,
        division: c.division,
        branch: c.branch,
        netSales: c.netSales,
        percentOfTotal:
          totalNetSales > 0 ? (c.netSales / totalNetSales) * 100 : 0,
        invoiceCount: c.invoiceCount,
        lastInvoiceDate: c.lastInvoiceDate?.split("T")[0] || c.lastInvoiceDate,
      }));

    // Top salesmen
    const salesmanSalesMap = new Map();
    filteredInvoices.forEach((inv: ProcessedInvoice) => {
      const key = inv.salesman_id;
      if (!salesmanSalesMap.has(key)) {
        salesmanSalesMap.set(key, {
          salesmanName: inv.salesman_name,
          division: inv.division_name,
          branch: inv.branch_name,
          netSales: 0,
          invoiceCount: 0,
          target: 1000000,
        });
      }
      const salesman = salesmanSalesMap.get(key);
      salesman.netSales += inv.netSales;
      salesman.invoiceCount += 1;
    });

    const topSalesmen = Array.from(salesmanSalesMap.values())
      .sort((a, b) => b.netSales - a.netSales)
      .slice(0, 10)
      .map((s, index) => ({
        rank: index + 1,
        salesmanName: s.salesmanName,
        division: s.division,
        branch: s.branch,
        netSales: s.netSales,
        target: s.target,
        targetAttainment: s.target > 0 ? (s.netSales / s.target) * 100 : 0,
        invoiceCount: s.invoiceCount,
      }));

    const dashboardData = {
      kpi: {
        totalNetSales,
        growthVsPrevious: 5.2,
        grossMargin,
        collectionRate: 92.5,
      },
      salesTrend,
      divisionSales,
      topCustomers,
      topSalesmen,
      summary: {
        grossSales: totalGrossSales,
        totalDiscount,
        netSales: totalNetSales,
        returns: totalReturns,
        invoiceCount: filteredInvoices.length,
      },
    };

    const duration = Date.now() - startTime;
    console.log("\n✅ ========================================");
    console.log("✅ Dashboard API Success!");
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`💰 Net Sales: ₱${totalNetSales.toLocaleString()}`);
    console.log(`📊 Divisions: ${divisionSales.length}`);
    console.log(`👥 Top Customers: ${topCustomers.length}`);
    console.log(`🏆 Top Salesmen: ${topSalesmen.length}`);
    console.log("========================================\n");

    return NextResponse.json(dashboardData);
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    console.error("\n💥 ========================================");
    console.error("💥 API ERROR");
    console.error(`⏱️  Duration: ${duration}ms`);
    console.error("📛 Error:", error.message);
    console.error("🔍 Stack:", error.stack?.split("\n").slice(0, 3).join("\n"));
    console.error("========================================\n");

    return NextResponse.json(
      {
        error: error.message || "Server error",
        details: error.stack?.split("\n").slice(0, 5).join("\n"),
        directusUrl: DIRECTUS_URL,
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        troubleshooting: {
          step1: "Verify Directus is running",
          step2: `Check if ${DIRECTUS_URL} is accessible`,
          step3: "Ensure port 8060 is not blocked",
          step4: "Check network/firewall settings",
          step5: "Verify DIRECTUS_URL environment variable",
        }
      },
      { status: 500 }
    );
  }
}