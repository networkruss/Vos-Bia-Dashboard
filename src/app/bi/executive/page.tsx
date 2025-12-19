"use client";

import { useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, Percent, TrendingDown } from "lucide-react";
import { useExecutiveData } from "@/hooks/use-executive-data";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KPICard, formatCurrency } from "@/components/dashboard/KPICard";
import { SalesTrendChart } from "@/components/modules/bi/SalesTrendChart";
import { DivisionSalesChart } from "@/components/modules/bi/DivisionSalesChart";
import { SupplierSalesChart } from "@/components/dashboard/SupplierSalesChart";
import { SupplierHeatmap } from "@/components/dashboard/SupplierHeatmap";

export default function ExecutiveDashboard() {
  const { loading, error, dashboardData, handleFilterChange } =
    useExecutiveData();
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  // Reference for smooth scrolling
  const drilldownRef = useRef<HTMLDivElement>(null);

  const onFilterUpdate = (filters: any) => {
    handleFilterChange(filters);
    setSelectedDivision(null); // Reset drilldown on filter change
  };

  const handleBarClick = (divisionName: string) => {
    setSelectedDivision((prev) => {
      const isNewSelection = prev !== divisionName;

      // If we are selecting a new division, scroll to details
      if (isNewSelection) {
        setTimeout(() => {
          drilldownRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
        return divisionName;
      }
      return null;
    });
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );

  if (error || !dashboardData)
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Executive Dashboard</h1>

      <FilterBar
        onFilterChange={onFilterUpdate}
        divisions={Array.from(
          new Set(dashboardData.divisionSales.map((d: any) => d.division))
        )}
        // Prevent crash if topCustomers is undefined in new route
        branches={[]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Net Sales"
          value={formatCurrency(dashboardData.kpi?.totalNetSales ?? 0)}
          icon={TrendingUp}
        />
        {/* Changed 'Growth Rate' to 'Total Returns' to reflect new data accuracy */}
        <KPICard
          title="Total Returns"
          value={formatCurrency(dashboardData.kpi?.totalReturns ?? 0)}
          icon={TrendingDown}
          className="text-red-600"
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
        {/* Simplified TabsList - Customers removed */}
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>
                Division Sales (Click anywhere on a bar's column to see details)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DivisionSalesChart
                data={dashboardData.divisionSales}
                onBarClick={handleBarClick}
                activeDivision={selectedDivision}
              />
            </CardContent>
          </Card>

          {selectedDivision ? (
            <div
              ref={drilldownRef}
              className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500"
            >
              <Card className="border-blue-100 shadow-md">
                <CardHeader className="bg-blue-50/30 border-b">
                  <CardTitle className="text-blue-800">
                    Supplier Breakdown: {selectedDivision}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <SupplierSalesChart
                    data={
                      dashboardData.supplierSalesByDivision?.[
                        selectedDivision
                      ] || []
                    }
                  />
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader className="border-b">
                  <CardTitle>
                    {selectedDivision} - Monthly Heatmap View
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <SupplierHeatmap
                    data={
                      dashboardData.heatmapDataByDivision?.[selectedDivision] ||
                      []
                    }
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Overall Sales Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <SalesTrendChart data={dashboardData.salesTrend} />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
