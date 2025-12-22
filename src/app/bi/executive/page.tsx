"use client";

import { useState, useRef } from "react";
import type { DashboardFilters } from "@/types";
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

  const drilldownRef = useRef<HTMLDivElement>(null);

  const onFilterUpdate = (filters: DashboardFilters) => {
    handleFilterChange(filters);
    setSelectedDivision(null);
  };

  const handleBarClick = (divisionName: string) => {
    setSelectedDivision((prev) => {
      const isNewSelection = prev !== divisionName;
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );

  if (error || !dashboardData)
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  // --- KPI LOGIC ---
  // If a division is selected, try to find its specific KPIs.
  // Fallback to Overall KPI if no division is selected or data is missing.
  const activeKPI =
    selectedDivision && dashboardData.kpiByDivision?.[selectedDivision]
      ? dashboardData.kpiByDivision[selectedDivision]
      : dashboardData.kpi;

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Executive Dashboard</h1>

      <FilterBar onFilterChange={onFilterUpdate} branches={[]} />

      {/* KPI Cards (Now Dynamic!) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title={
            selectedDivision ? `${selectedDivision} Sales` : "Total Net Sales"
          }
          value={formatCurrency(activeKPI?.totalNetSales ?? 0)}
          icon={TrendingUp}
        />
        <KPICard
          title={
            selectedDivision ? `${selectedDivision} Returns` : "Total Returns"
          }
          value={formatCurrency(activeKPI?.totalReturns ?? 0)}
          icon={TrendingDown}
          className="text-red-600"
        />
        <KPICard
          title="Gross Margin"
          value={`${activeKPI?.grossMargin?.toFixed(1) ?? 0}%`}
          icon={Percent}
        />
        <KPICard
          title="Collection Rate"
          value={`${activeKPI?.collectionRate ?? 0}%`}
          icon={Percent}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>
                Division Sales (Click anywhere on a bar&apos;s column to see
                details)
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
              {/* SUPPLIER BREAKDOWN CHART */}
              <Card className="border-gray-200 shadow-md">
                <CardHeader className="bg-gray-50/50 border-b">
                  <CardTitle style={{ color: "#000000" }}>
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

              {/* MONTHLY HEATMAP */}
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
                    divisionName={selectedDivision}
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
