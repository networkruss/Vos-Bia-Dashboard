// src/app/api/sales/salesman/route.ts
import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = "http://100.126.246.124:8060";
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || "";

// Define types for Directus data
interface Invoice {
  invoice_id?: number;
  invoice_no?: string;
  dispatch_date?: string; // Using this as invoice_date is null
  due_date?: string;
  customer_code?: string; // Using customer_code instead of customer_id
  salesman_id?: number;
  total_amount?: number;
  net_amount?: number;
  gross_amount?: number;
  status?: string;
}

interface Customer {
  id?: number;
  customer_code?: string; // Match with invoice.customer_code
  customer_name?: string;
  store_name?: string;
  province?: string; // Using as division
  city?: string; // Using as branch
  isActive?: number;
}

interface Deal {
  id?: number;
  opportunity_name?: string;
  customer_id?: number;
  salesman_id?: number;
  stage?: string;
  expected_close_date?: string;
  next_action?: string;
  due_date?: string;
  amount?: number;
}

interface Target {
  id?: number;
  salesman_id?: number;
  period?: string;
  target_amount?: number;
  year?: number;
  month?: number;
}

interface DirectusResponse<T> {
  data?: T[];
  errors?: Array<{ message: string }>;
}

// Helper to get headers with optional auth
function getHeaders() {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (DIRECTUS_TOKEN) {
    headers["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  }
  
  return headers;
}

// Helper to safely fetch from Directus
async function safeFetch<T>(url: string, collectionName: string): Promise<T[]> {
  try {
    console.log(`📍 Fetching ${collectionName} from:`, url);
    
    const response = await fetch(url, {
      headers: getHeaders(),
      cache: "no-store",
    });

    console.log(`📊 ${collectionName} status:`, response.status);

    if (response.ok) {
      const json = await response.json() as DirectusResponse<T>;
      const data = json.data || [];
      console.log(`✅ ${collectionName}: ${data.length} records`);
      return data;
    } else if (response.status === 403) {
      console.warn(`⚠️ ${collectionName}: 403 Forbidden - check Directus permissions`);
      return [];
    } else if (response.status === 404) {
      console.warn(`⚠️ ${collectionName}: Collection not found`);
      return [];
    } else {
      console.error(`❌ ${collectionName}: ${response.status} ${response.statusText}`);
      return [];
    }
  } catch (error) {
    console.error(`❌ Error fetching ${collectionName}:`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const salesmanId = searchParams.get("salesmanId") || "1";

  try {
    console.log("🔍 Fetching salesman data from Directus:", {
      url: DIRECTUS_URL,
      fromDate,
      toDate,
      salesmanId,
      hasToken: !!DIRECTUS_TOKEN,
    });

    // Build invoice URL with corrected collection and field names
    const invoiceUrl = `${DIRECTUS_URL}/items/sales_invoice?filter[dispatch_date][_gte]=${fromDate}&filter[dispatch_date][_lte]=${toDate}&filter[salesman_id][_eq]=${salesmanId}&limit=-1`;
    console.log("📍 Invoice URL:", invoiceUrl);

    // Fetch all data in parallel
    const [invoices, customers, deals, targets] = await Promise.all([
      safeFetch<Invoice>(invoiceUrl, "sales_invoice"),
      safeFetch<Customer>(
        `${DIRECTUS_URL}/items/customer?limit=-1`,
        "customers"
      ),
      safeFetch<Deal>(
        `${DIRECTUS_URL}/items/deals?filter[stage][_neq]=Closed&filter[salesman_id][_eq]=${salesmanId}&sort=due_date&limit=-1`,
        "deals"
      ),
      safeFetch<Target>(
        `${DIRECTUS_URL}/items/targets?filter[salesman_id][_eq]=${salesmanId}&filter[period][_eq]=${fromDate?.substring(0, 7)}&limit=1`,
        "targets"
      ),
    ]);

    console.log("✅ Data fetched successfully:", {
      invoicesCount: invoices.length,
      customersCount: customers.length,
      dealsCount: deals.length,
      targetsCount: targets.length,
    });

    // Log first invoice for debugging
    if (invoices.length > 0) {
      console.log("📋 Sample invoice:", JSON.stringify(invoices[0], null, 2));
    } else {
      console.warn("⚠️ No invoices found for the date range");
    }

    // Log first customer for debugging
    if (customers.length > 0) {
      console.log("👤 Sample customer:", JSON.stringify(customers[0], null, 2));
    }

    // Create customer lookup map by customer_code
    const customerMap = new Map<string, Customer>();
    customers.forEach((c) => {
      if (c.customer_code) customerMap.set(c.customer_code, c);
    });

    // Calculate total sales and invoice count
    const totalSales = invoices.reduce((sum, inv) => {
      const amount = inv.total_amount || 0;
      console.log(`💰 Invoice ${inv.invoice_no}: ${amount}`);
      return sum + amount;
    }, 0);
    const totalInvoices = invoices.length;

    console.log("💵 Total calculated:", { totalSales, totalInvoices });

    // Group sales by date for chart (using dispatch_date)
    const dailySalesMap = new Map<string, number>();
    invoices.forEach((inv) => {
      if (!inv.dispatch_date) return;
      const date = inv.dispatch_date.split("T")[0];
      const current = dailySalesMap.get(date) || 0;
      dailySalesMap.set(date, current + (inv.total_amount || 0));
    });

    const dailySales = Array.from(dailySalesMap.entries())
      .map(([date, netSales]) => ({ date, netSales }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Group by customer for top customers (using customer_code)
    const customerSalesMap = new Map<string, {
      customer: string;
      division: string;
      branch: string;
      netSales: number;
      invoices: number;
      lastInvoiceDate: string;
    }>();

    invoices.forEach((inv) => {
      const customerCode = inv.customer_code;
      if (!customerCode) return;

      const customer = customerMap.get(customerCode);
      const existing = customerSalesMap.get(customerCode);
      const invoiceAmount = inv.total_amount || 0;

      if (existing) {
        existing.netSales += invoiceAmount;
        existing.invoices += 1;
        if (inv.dispatch_date && inv.dispatch_date > existing.lastInvoiceDate) {
          existing.lastInvoiceDate = inv.dispatch_date;
        }
      } else {
        customerSalesMap.set(customerCode, {
          customer: customer?.customer_name || customer?.store_name || customerCode,
          division: customer?.province || "N/A",
          branch: customer?.city || "N/A",
          netSales: invoiceAmount,
          invoices: 1,
          lastInvoiceDate: inv.dispatch_date || new Date().toISOString(),
        });
      }
    });

    const topCustomers = Array.from(customerSalesMap.values())
      .sort((a, b) => b.netSales - a.netSales)
      .slice(0, 5);

    console.log("🏆 Top customers:", topCustomers.length);

    // Process open deals
    const openDeals = deals.map((deal) => {
      // Note: deals might have customer_id as number, but we need customer_code string
      // For now, we'll just show "Unknown Customer" until we have proper mapping
      return {
        opportunity: deal.opportunity_name || "Untitled Opportunity",
        customer: "Unknown Customer",
        stage: deal.stage || "Unknown",
        expectedClose: deal.expected_close_date || new Date().toISOString(),
        nextAction: deal.next_action || "No action specified",
        dueDate: deal.due_date || new Date().toISOString(),
      };
    });

    // Get target amount (default to 300000 if not set)
    const target = targets.length > 0 ? (targets[0].target_amount || 300000) : 300000;

    const responseData = {
      success: true,
      data: {
        dailySales,
        topCustomers,
        openDeals,
        target,
        totalSales,
        totalInvoices,
      },
      debug: {
        invoicesFound: invoices.length,
        customersFound: customers.length,
        dealsFound: deals.length,
        targetsFound: targets.length,
        dateRange: { fromDate, toDate },
        salesmanId,
      },
    };

    console.log("✅ Returning processed salesman data:", {
      totalSales,
      totalInvoices,
      topCustomersCount: topCustomers.length,
      openDealsCount: openDeals.length,
      target,
    });

    return NextResponse.json(responseData);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error in salesman API route:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch salesman data",
        details: errorMessage,
        directusUrl: DIRECTUS_URL,
      },
      { status: 500 }
    );
  }
}