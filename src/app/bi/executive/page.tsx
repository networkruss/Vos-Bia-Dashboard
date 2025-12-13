// src/app/bi/executive/page.tsx (Refactored to be clean and container-focused)
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Percent } from "lucide-react";

// Imports from the newly structured files
import { useExecutiveData } from "@/hooks/use-executive-data";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KPICard, formatCurrency } from "@/components/dashboard/KPICard";
import { SalesTrendChart } from "@/components/modules/bi/SalesTrendChart";
import { DivisionSalesChart } from "@/components/modules/bi/DivisionSalesChart";
import { RankBadge } from "@/components/modules/bi/RankBadge";


// ------------------ Component ------------------
export default function ExecutiveDashboard() {
  const { 
    loading, 
    error, 
    dashboardData, 
    dataSource, 
    fetchDashboardData, 
    handleFilterChange 
  } = useExecutiveData();

  // --- LOADING STATE (Rendered by the Container) ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading dashboard data...</p>
          <p className="text-sm text-gray-400 mt-2">Fetching from {dataSource}</p>
        </div>
      </div>
    );
  }

  // --- ERROR STATE (Rendered by the Container) ---
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={fetchDashboardData} className="mt-4 bg-blue-500 text-white px-6 py-2 rounded">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // --- NO DATA / MAIN UI RENDER ---
  if (!dashboardData) return null;

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Executive Dashboard</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">Company-wide sales performance overview</p>
            {dataSource === "directus" && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                ✓ Live Directus Data
              </span>
            )}
          </div>
        </div>
      </div>

      <FilterBar
        onFilterChange={handleFilterChange}
        // Data derived from dashboardData, keeping this logic here is fine
        divisions={Array.from(new Set(dashboardData.divisionSales.map((d) => d.division)))}
        branches={Array.from(new Set(dashboardData.topCustomers.map((c) => c.branch)))}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* All KPI cards use optional chaining for safety */}
        <KPICard
          title="Total Net Sales"
          value={formatCurrency(dashboardData.kpi?.totalNetSales ?? 0)}
          icon={TrendingUp}
          trend={dashboardData.kpi?.growthVsPrevious ?? 0}
          subtitle="vs previous period"
        />
        <KPICard
          title="Growth Rate"
          value={`${dashboardData.kpi?.growthVsPrevious ?? 0}%`}
          icon={TrendingUp}
          subtitle="period over period"
        />
        <KPICard
          title="Gross Margin"
          value={`${dashboardData.kpi?.grossMargin?.toFixed(1) ?? 0}%`}
          icon={Percent}
        />
        <KPICard
          title="Collection Rate"
          value={`${dashboardData.kpi?.collectionRate ?? 0}%`}
          icon={Percent}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="salesmen">Salesmen</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {/* Overview Tab (Charts are extracted) */}
        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle>Sales Trend</CardTitle></CardHeader>
            <CardContent><SalesTrendChart data={dashboardData.salesTrend} /></CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader><CardTitle>Division Sales</CardTitle></CardHeader>
            <CardContent><DivisionSalesChart data={dashboardData.divisionSales} /></CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab (Table logic remains here as it's simple rendering) */}
        <TabsContent value="customers">
          <Card>
            <CardHeader><CardTitle>Top Customers</CardTitle></CardHeader>
            <CardContent>
              {dashboardData.topCustomers && dashboardData.topCustomers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead><TableHead>Customer</TableHead><TableHead>Division</TableHead>
                      <TableHead>Branch</TableHead><TableHead>Net Sales</TableHead><TableHead>% of Total</TableHead>
                      <TableHead>Invoices</TableHead><TableHead>Last Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.topCustomers.map((c) => (
                      <TableRow key={c.rank}>
                        <TableCell><RankBadge rank={c.rank} /></TableCell>
                        <TableCell>{c.customerName}</TableCell><TableCell>{c.division}</TableCell>
                        <TableCell>{c.branch}</TableCell><TableCell>{formatCurrency(c.netSales)}</TableCell>
                        <TableCell>{c.percentOfTotal.toFixed(2)}%</TableCell><TableCell>{c.invoiceCount}</TableCell>
                        <TableCell>{c.lastInvoiceDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-gray-400">No customer data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Salesmen Tab (Table logic remains here as it's simple rendering) */}
        <TabsContent value="salesmen">
          <Card>
            <CardHeader><CardTitle>Top Salesmen</CardTitle></CardHeader>
            <CardContent>
              {dashboardData.topSalesmen && dashboardData.topSalesmen.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead><TableHead>Salesman</TableHead><TableHead>Division</TableHead>
                      <TableHead>Branch</TableHead><TableHead>Net Sales</TableHead><TableHead>Target</TableHead>
                      <TableHead>Attainment %</TableHead><TableHead>Invoices</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.topSalesmen.map((s) => (
                      <TableRow key={s.rank}>
                        <TableCell><RankBadge rank={s.rank} /></TableCell>
                        <TableCell>{s.salesmanName}</TableCell><TableCell>{s.division}</TableCell>
                        <TableCell>{s.branch}</TableCell><TableCell>{formatCurrency(s.netSales)}</TableCell>
                        <TableCell>{formatCurrency(s.target)}</TableCell><TableCell>{s.targetAttainment.toFixed(2)}%</TableCell>
                        <TableCell>{s.invoiceCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-gray-400">No salesman data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary">
          <Card>
            <CardHeader><CardTitle>Sales Summary</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gross Sales</TableHead><TableHead>Total Discount</TableHead>
                    <TableHead>Net Sales</TableHead><TableHead>Returns</TableHead><TableHead>Invoices</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>{formatCurrency(dashboardData.summary?.grossSales ?? 0)}</TableCell>
                    <TableCell>{formatCurrency(dashboardData.summary?.totalDiscount ?? 0)}</TableCell>
                    <TableCell>{formatCurrency(dashboardData.summary?.netSales ?? 0)}</TableCell>
                    <TableCell>{formatCurrency(dashboardData.summary?.returns ?? 0)}</TableCell>
                    <TableCell>{dashboardData.summary?.invoiceCount ?? 0}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}