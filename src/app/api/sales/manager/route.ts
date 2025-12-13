// src/app/api/sales/manager/route.ts
import { NextResponse } from "next/server";

const DIRECTUS_URL = "http://100.126.246.124:8060";

// Define proper types
interface Customer {
  id?: number;
  customer_name?: string;
  store_name?: string;
  isActive?: number;
  date_entered?: string;
}

interface Salesman {
  id?: number;
  salesman_name?: string;
  salesman_code?: string;
  employee_id?: number;
  branch_code?: number;
  division_id?: number;
  isActive?: number;
}

interface Collection {
  id?: number;
  totalAmount?: number;
  collection_date?: string;
  salesman_id?: number;
  isCancelled?: number | { type: string; data: number[] };
  isPosted?: number | { type: string; data: number[] };
}

interface Division {
  division_id?: number;
  division_name?: string;
  division_description?: string;
}

interface Branch {
  id?: number;
  branch_code?: string;
  branch_name?: string;
  branch_description?: string;
  isActive?: number;
}

interface DirectusResponse<T> {
  data?: T[];
}

export async function GET() {
  try {
    console.log("🔍 Manager API: Starting fetch from Directus");

    // Fetch data with error handling
    let customers: Customer[] = [];
    let salesmen: Salesman[] = [];
    let collections: Collection[] = [];
    let divisions: Division[] = [];
    let branches: Branch[] = [];

    try {
      const customersRes = await fetch(`${DIRECTUS_URL}/items/customer?limit=-1`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (customersRes.ok) {
        const data: DirectusResponse<Customer> = await customersRes.json();
        customers = data.data || [];
      }
    } catch (e) {
      console.error("Failed to fetch customers:", e);
    }

    try {
      const salesmenRes = await fetch(`${DIRECTUS_URL}/items/salesman?limit=-1`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (salesmenRes.ok) {
        const data: DirectusResponse<Salesman> = await salesmenRes.json();
        salesmen = data.data || [];
      }
    } catch (e) {
      console.error("Failed to fetch salesmen:", e);
    }

    try {
      const collectionsRes = await fetch(`${DIRECTUS_URL}/items/collection?limit=-1`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (collectionsRes.ok) {
        const data: DirectusResponse<Collection> = await collectionsRes.json();
        collections = data.data || [];
      }
    } catch (e) {
      console.error("Failed to fetch collections:", e);
    }

    try {
      const divisionsRes = await fetch(`${DIRECTUS_URL}/items/division?limit=-1`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (divisionsRes.ok) {
        const data: DirectusResponse<Division> = await divisionsRes.json();
        divisions = data.data || [];
      }
    } catch (e) {
      console.error("Failed to fetch divisions:", e);
    }

    try {
      const branchesRes = await fetch(`${DIRECTUS_URL}/items/branches?limit=-1`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (branchesRes.ok) {
        const data: DirectusResponse<Branch> = await branchesRes.json();
        branches = data.data || [];
      }
    } catch (e) {
      console.error("Failed to fetch branches:", e);
    }

    console.log("✅ Fetched:", {
      customers: customers.length,
      salesmen: salesmen.length,
      collections: collections.length,
      divisions: divisions.length,
      branches: branches.length,
    });

    // Filter valid collections (not cancelled)
    const validCollections = collections.filter((c) => {
      try {
        if (!c.isCancelled) return true;
        if (typeof c.isCancelled === 'number') return c.isCancelled !== 1;
        if (typeof c.isCancelled === 'object' && c.isCancelled.data?.[0] === 1) return false;
        return true;
      } catch {
        return true;
      }
    });

    console.log(`📊 Valid collections: ${validCollections.length}`);

    // Calculate total sales
    const totalSales = validCollections.reduce((sum, c) => {
      return sum + (Number(c.totalAmount) || 0);
    }, 0);

    // Customer metrics
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter((c) => c.isActive === 1).length;

    // New clients (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newClients = customers.filter((c) => {
      if (!c.date_entered) return false;
      return new Date(c.date_entered) >= thirtyDaysAgo;
    }).length;

    const retentionRate = totalCustomers > 0 
      ? Math.round((activeCustomers / totalCustomers) * 100) 
      : 0;
    const churnRate = 100 - retentionRate;

    // Sales by Division
    const salesByDivision: Record<number, number> = {};
    divisions.forEach((div) => {
      if (div.division_id) salesByDivision[div.division_id] = 0;
    });
    
    validCollections.forEach((collection) => {
      const salesman = salesmen.find((s) => s.id === collection.salesman_id);
      if (salesman?.division_id) {
        salesByDivision[salesman.division_id] = 
          (salesByDivision[salesman.division_id] || 0) + (Number(collection.totalAmount) || 0);
      }
    });

    const sortedDivisions = [...divisions].sort((a, b) => 
      (a.division_id || 0) - (b.division_id || 0)
    );

    const divisionLabels = sortedDivisions.map((d) => d.division_name || "Unknown");
    const divisionValues = sortedDivisions.map((d) => salesByDivision[d.division_id!] || 0);

    // Salesman Performance
    const activeSalesmen = salesmen.filter((s) => s.isActive === 1);
    const salesmenPerformance = activeSalesmen
      .map((salesman) => {
        const salesmanCollections = validCollections.filter(
          (c) => c.salesman_id === salesman.id
        );
        const salesmanTotalSales = salesmanCollections.reduce(
          (sum, c) => sum + (Number(c.totalAmount) || 0), 0
        );
        const target = 500000;
        const performance = Math.min(100, Math.round((salesmanTotalSales / target) * 100));

        return {
          name: salesman.salesman_name || "Unknown",
          sales: salesmanTotalSales,
          performance,
        };
      })
      .sort((a, b) => b.sales - a.sales);

    const avgPerformance = salesmenPerformance.length > 0
      ? Math.round(salesmenPerformance.reduce((sum, s) => sum + s.performance, 0) / salesmenPerformance.length)
      : 0;

    const topEmployees = salesmenPerformance.slice(0, 10).map((emp, idx) => ({
      name: emp.name,
      sales: emp.sales,
      rank: idx + 1,
      performance: emp.performance,
    }));

    // Sales Trend (last 6 months)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const salesByMonth: Record<string, number> = {};

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      salesByMonth[monthKey] = 0;
    }

    validCollections.forEach((collection) => {
      if (!collection.collection_date) return;
      const collectionDate = new Date(collection.collection_date);
      const monthKey = `${collectionDate.getFullYear()}-${collectionDate.getMonth()}`;
      if (salesByMonth.hasOwnProperty(monthKey)) {
        salesByMonth[monthKey] += Number(collection.totalAmount) || 0;
      }
    });

    const trendLabels: string[] = [];
    const trendValues: number[] = [];
    Object.keys(salesByMonth).forEach(key => {
      const [, month] = key.split("-").map(Number);
      trendLabels.push(months[month]);
      trendValues.push(salesByMonth[key]);
    });

    // Customer Growth
    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    const currentYear = now.getFullYear();
    const growthByQuarter: Record<string, number> = {};
    quarters.forEach(q => { growthByQuarter[q] = 0; });

    customers.forEach((customer) => {
      if (!customer.date_entered) return;
      const createdDate = new Date(customer.date_entered);
      if (createdDate.getFullYear() === currentYear) {
        const quarter = Math.floor(createdDate.getMonth() / 3);
        growthByQuarter[quarters[quarter]]++;
      }
    });

    // Top Customers
    const topCustomers = customers
      .filter((c) => c.isActive === 1)
      .slice(0, 10)
      .map((c) => ({
        name: c.customer_name || c.store_name || "Unknown",
        revenue: 150000,
      }));

    // Monthly sales comparison
    const currentMonth = now.getMonth();
    const currentYear2 = now.getFullYear();
    
    const currentMonthSales = validCollections.reduce((sum, c) => {
      if (!c.collection_date) return sum;
      const d = new Date(c.collection_date);
      return (d.getMonth() === currentMonth && d.getFullYear() === currentYear2)
        ? sum + (Number(c.totalAmount) || 0)
        : sum;
    }, 0);

    const lastMonth = currentMonth - 1;
    const lastYear = lastMonth < 0 ? currentYear2 - 1 : currentYear2;
    const lastMonthNum = lastMonth < 0 ? 11 : lastMonth;
    
    const lastMonthSales = validCollections.reduce((sum, c) => {
      if (!c.collection_date) return sum;
      const d = new Date(c.collection_date);
      return (d.getMonth() === lastMonthNum && d.getFullYear() === lastYear)
        ? sum + (Number(c.totalAmount) || 0)
        : sum;
    }, 0);

    const salesGrowth = lastMonthSales > 0
      ? Math.round(((currentMonthSales - lastMonthSales) / lastMonthSales) * 100)
      : 0;

    const lastMonthClients = customers.filter((c) => {
      if (!c.date_entered) return false;
      const d = new Date(c.date_entered);
      return d.getMonth() === lastMonthNum && d.getFullYear() === lastYear;
    }).length;

    const clientGrowth = lastMonthClients > 0
      ? Math.round(((newClients - lastMonthClients) / lastMonthClients) * 100)
      : 0;

    // Division performance
    const lowestDivisionSales = divisionValues.length > 0 ? Math.min(...divisionValues) : 0;
    const lowestDivisionIndex = divisionValues.indexOf(lowestDivisionSales);
    const lowestDivision = divisionLabels[lowestDivisionIndex] || "Unknown";
    const avgDivisionSales = divisionValues.length > 0
      ? divisionValues.reduce((a, b) => a + b, 0) / divisionValues.length
      : 0;
    const divisionPerformance = avgDivisionSales > 0
      ? Math.round(((lowestDivisionSales - avgDivisionSales) / avgDivisionSales) * 100)
      : 0;

    const topPerformer = topEmployees[0] || { name: "N/A", performance: 0 };

    // Build response
    const responseData = {
      kpi: {
        totalSales,
        newClients,
        retentionRate,
        teamPerformance: avgPerformance,
      },
      salesTrend: {
        labels: trendLabels,
        values: trendValues,
      },
      departmentSales: {
        labels: divisionLabels,
        values: divisionValues,
      },
      topEmployees,
      customers: {
        growth: {
          labels: quarters,
          growth: quarters.map(q => growthByQuarter[q]),
        },
        topCustomers,
        retention: retentionRate,
        churn: churnRate,
        activeCount: activeCustomers,
      },
      summary: {
        insights: {
          salesGrowth: {
            value: salesGrowth,
            label: `Sales ${salesGrowth >= 0 ? "↑" : "↓"} ${Math.abs(salesGrowth)}% MoM`,
            status: salesGrowth >= 10 ? "good" : salesGrowth >= 0 ? "warning" : "bad",
          },
          clientGrowth: {
            value: clientGrowth,
            label: `New Client Growth ${clientGrowth >= 0 ? "↑" : "↓"} ${Math.abs(clientGrowth)}%`,
            status: clientGrowth >= 10 ? "good" : clientGrowth >= 0 ? "warning" : "bad",
          },
          divisionPerformance: {
            value: divisionPerformance,
            label: `${lowestDivision} Division ${divisionPerformance >= 0 ? "↑" : "↓"} ${Math.abs(divisionPerformance)}% vs Avg`,
            status: divisionPerformance >= 0 ? "good" : "warning",
          },
          topPerformer: {
            name: topPerformer.name,
            value: topPerformer.performance,
            label: `Top Rep: ${topPerformer.name} (${topPerformer.performance}%)`,
            status: "good",
          },
        },
        recentTrends: [
          `${trendLabels[trendLabels.length - 1] || 'Current'}: ₱${(currentMonthSales / 1000).toFixed(0)}K sales (${salesGrowth >= 0 ? "+" : ""}${salesGrowth}%)`,
          `New clients: ${newClients} this month`,
          `${lowestDivision} division ${divisionPerformance < 0 ? "lags" : "leads"} by ${Math.abs(divisionPerformance)}%`,
        ],
        recommendedActions: [] as string[],
      },
    };

    // Add recommendations
    if (divisionPerformance < -5) {
      responseData.summary.recommendedActions.push(`Schedule coaching for ${lowestDivision} division`);
    }
    if (topEmployees.length >= 3) {
      responseData.summary.recommendedActions.push(`Reward top ${Math.min(3, topEmployees.length)} performers`);
    }
    if (churnRate > 10) {
      responseData.summary.recommendedActions.push(`Follow up with ${Math.round(totalCustomers * (churnRate / 100))} at-risk clients`);
    }
    if (salesGrowth < 5) {
      responseData.summary.recommendedActions.push("Review sales strategy and targets");
    }
    if (responseData.summary.recommendedActions.length === 0) {
      responseData.summary.recommendedActions.push("All metrics looking good! Keep up the great work.");
    }

    console.log("✅ Manager API: Successfully processed data");
    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Manager API: Critical error:", error);
    
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard data",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}