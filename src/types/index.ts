// src/types/index.ts

// --- USER AND AUTH TYPES ---
export type UserRole = 'executive' | 'manager' | 'salesman' | 'encoder';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    division?: string;
    branch?: string;
    salesman_id?: string;
}

// --- FILTERING AND UTILITY TYPES ---
// Renaming FilterOptions to DashboardFilters to match the hook usage and use simpler types for API calls
export interface DashboardFilters {
    fromDate: string; // Use string for direct API passing (e.g., "YYYY-MM-DD")
    toDate: string;   // Use string for direct API passing
    division?: string;
    branch?: string;
}

// --- DATA STRUCTURES (KPI, TRENDS, COMPARISONS) ---
export interface KPIData {
    totalNetSales: number;
    growthVsPrevious: number;
    grossMargin?: number;
    collectionRate?: number;
}

export interface SalesTrendData {
    date: string;
    netSales: number;
    target?: number;
}

export interface DivisionSalesData {
    division: string;
    netSales: number;
    grossSales: number;
    discount: number;
    returns: number;
    invoiceCount: number;
    avgInvoice: number;
    percentOfTotal: number;
}

export interface BranchSalesData {
    branch: string;
    division: string;
    netSales: number;
    grossSales: number;
    discount: number;
    returns: number;
    invoiceCount: number;
    avgInvoice: number;
    percentOfTotal: number;
}

export interface TopCustomer {
    rank: number;
    customerName: string;
    classification?: string;
    storeType?: string;
    division: string;
    branch: string;
    netSales: number;
    invoiceCount: number;
    avgInvoice: number;
    lastInvoiceDate: string;
    percentOfTotal: number;
}

export interface TopSalesman {
    rank: number;
    salesmanName: string;
    division: string;
    branch: string;
    netSales: number;
    grossSales: number;
    discount: number;
    returns: number;
    invoiceCount: number;
    avgInvoice: number;
    target?: number;
    targetAttainment?: number;
}

// Renaming SummaryBand to SalesSummary
export interface SalesSummary {
    grossSales: number;
    totalDiscount: number;
    netSales: number;
    returns: number;
    invoiceCount: number;
}


// --- SUPPLIER/ENCODER SPECIFIC TYPES (Keeping these for completeness) ---

export interface SupplierTrendData {
    supplier: string;
    date: string;
    netSales: number;
}

export interface SupplierComparison {
    supplier: string;
    currentPeriodSales: number;
    previousPeriodSales: number;
    growth: number;
    invoiceCount: number;
    avgInvoice: number;
    shareOfTotal: number;
}

export interface SupplierMonthlyData {
    year: number;
    supplier: string;
    jan: number;
    feb: number;
    mar: number;
    apr: number;
    may: number;
    jun: number;
    jul: number;
    aug: number;
    sep: number;
    oct: number;
    nov: number;
    dec: number;
    total: number;
}

export interface InvoiceQueueItem {
    invoiceNo: string;
    date: string;
    customerName: string;
    amount: number;
    branch: string;
    priority: 'high' | 'medium' | 'low';
    status: 'pending' | 'encoded' | 'error';
}

export interface ValidationIssue {
    invoiceNo: string;
    errorType: string;
    description: string;
    customerName: string;
    date: string;
    status: 'open' | 'fixed';
    assignedTo?: string;
}

// --- AGGREGATE DASHBOARD DATA TYPE ---
// This is the main structure returned by the /api/bi/sales/executive route
export interface ExecutiveDashboardData {
    kpi: KPIData;
    salesTrend: SalesTrendData[];
    divisionSales: DivisionSalesData[];
    topCustomers: TopCustomer[];
    topSalesmen: TopSalesman[];
    summary: SalesSummary;
}

// Exporting the main required types for the Executive Dashboard
export { ExecutiveDashboardData as DashboardData };
export { SalesSummary as SummaryBand };