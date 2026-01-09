"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { DashboardFilters } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, Percent, TrendingDown } from "lucide-react";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KPICard, formatCurrency } from "@/components/dashboard/KPICard";
import { SalesTrendChart } from "@/components/modules/bi/SalesTrendChart";
import { DivisionSalesChart } from "@/components/modules/bi/DivisionSalesChart";
import { TargetAchievementChart } from "@/components/modules/bi/TargetAchievementChart";
import { SupplierSalesChart } from "@/components/dashboard/SupplierSalesChart";
import { SupplierHeatmap } from "@/components/dashboard/SupplierHeatmap";

export default function ExecutiveDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    fromDate: "",
    toDate: "",
    division: "all",
  });

  const drilldownRef = useRef<HTMLDivElement>(null);

  const onFilterUpdate = useCallback((newFilters: DashboardFilters) => {
    setFilters(newFilters);
    setSelectedDivision(null);
  }, []);

  useEffect(() => {
    if (!filters.fromDate || !filters.toDate) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams();
        query.set("fromDate", filters.fromDate);
        query.set("toDate", filters.toDate);
        if (filters.division) query.set("division", filters.division);

        const res = await fetch(`/api/sales/executive?${query.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch executive data");

        const json = await res.json();
        if (json.error) throw new Error(json.error);

        setDashboardData(json);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

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

  const activeKPI =
    selectedDivision && dashboardData?.kpiByDivision?.[selectedDivision]
      ? dashboardData.kpiByDivision[selectedDivision]
      : dashboardData?.kpi;

  return (
    <div className="p-6 w-full mx-auto space-y-6 min-h-screen relative dark:bg-gray-900 transition-colors duration-300">
      <h1 className="text-3xl font-bold dark:text-white">
        Executive Dashboard
      </h1>

      {/* Filter Bar */}
      <FilterBar onFilterChange={onFilterUpdate} branches={[]} />

      {/* Main Content Area */}
      {loading ? (
        <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-black dark:border-gray-600 dark:border-t-white"></div>
          <p className="text-sm font-medium text-gray-500 animate-pulse dark:text-gray-400">
            Loading sales data...
          </p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg border border-red-100 dark:bg-red-900/20 dark:border-red-900">
          <p className="font-semibold">Error Loading Dashboard</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : dashboardData ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPICard
              title={
                selectedDivision
                  ? `${selectedDivision} Sales`
                  : "Total Net Sales"
              }
              value={formatCurrency(activeKPI?.totalNetSales ?? 0)}
              icon={TrendingUp}
            />
            <KPICard
              title={
                selectedDivision
                  ? `${selectedDivision} Returns`
                  : "Total Returns"
              }
              value={formatCurrency(activeKPI?.totalReturns ?? 0)}
              icon={TrendingDown}
              className="text-red-600 dark:text-red-400"
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
            <TabsList className="dark:bg-gray-800">
              <TabsTrigger
                value="overview"
                className="dark:data-[state=active]:bg-gray-700 dark:text-gray-300"
              >
                Overview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* PRIMARY CHARTS STACK */}
              <div className="space-y-6">
                {/* 1. DIVISION SALES CHART */}
                <Card className="shadow-sm dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white">
                      Division Sales Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* CSS Override: Forces bars to be white in dark mode if they are standard SVG rects */}
                    <div className="dark:text-gray-100 [&_.recharts-bar-rectangle]:dark:fill-white">
                      <DivisionSalesChart
                        data={dashboardData.divisionSales || []}
                        onBarClick={handleBarClick}
                        activeDivision={selectedDivision}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 2. TARGET VS ACHIEVEMENT CHART */}
                <Card className="shadow-sm dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white">
                      Target vs. Actual Achievement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* For Target chart, we usually keep colors (Blue/Green), so we just fix axis text color */}
                    <div className="dark:text-gray-100 [&_.recharts-cartesian-axis-tick-value]:dark:fill-gray-400">
                      <TargetAchievementChart
                        data={dashboardData.divisionSales || []}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* DRILL DOWN SECTION */}
              {selectedDivision ? (
                <div
                  ref={drilldownRef}
                  className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Supplier Sales Chart */}
                    <Card className="border-gray-200 shadow-md dark:bg-gray-800 dark:border-gray-700">
                      <CardHeader className="bg-gray-50/50 border-b dark:bg-gray-900/50 dark:border-gray-700">
                        <CardTitle
                          style={{ color: "var(--foreground)" }}
                          className="dark:text-white"
                        >
                          Supplier Breakdown: {selectedDivision}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        {/* CSS Override: Forces supplier bars to be white in dark mode */}
                        <div className="[&_.recharts-bar-rectangle]:dark:fill-white [&_.recharts-cartesian-axis-tick-value]:dark:fill-gray-400">
                          <SupplierSalesChart
                            data={
                              dashboardData.supplierSalesByDivision?.[
                                selectedDivision
                              ] || []
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Heatmap Card */}
                    <Card className="shadow-md dark:bg-gray-800 dark:border-gray-700">
                      <CardHeader className="border-b dark:border-gray-700">
                        <CardTitle className="dark:text-white">
                          {selectedDivision} - Monthly Heatmap View
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="dark:text-gray-200">
                          <SupplierHeatmap
                            data={
                              dashboardData.heatmapDataByDivision?.[
                                selectedDivision
                              ] || []
                            }
                            divisionName={selectedDivision}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                /* OVERALL TREND CHART */
                <Card className="shadow-sm mt-6 dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white">
                      Overall Monthly Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="dark:text-gray-100 [&_.recharts-cartesian-axis-tick-value]:dark:fill-gray-400">
                      <SalesTrendChart data={dashboardData.salesTrend || []} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        // EMPTY STATE
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl border border-dashed border-gray-200 dark:bg-gray-800/50 dark:border-gray-700">
          <span className="text-gray-400 dark:text-gray-500">
            Select a date range to view data
          </span>
        </div>
      )}
    </div>
  );
}
