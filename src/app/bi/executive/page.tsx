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
import { TargetAchievementChart } from "@/components/modules/bi/TargetAchievementChart"; // Ensure this file exists
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
    // Wait for filters to have values (FilterBar sets default thisWeek/thisMonth)
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
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6 min-h-screen relative">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      )}

      <h1 className="text-3xl font-bold">Executive Dashboard</h1>

      {/* Filter Bar */}
      <FilterBar onFilterChange={onFilterUpdate} branches={[]} />

      {error ? (
        <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg border border-red-100">
          <p className="font-semibold">Error Loading Dashboard</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : dashboardData ? (
        <>
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
              {/* PRIMARY CHARTS STACK */}
              <div className="space-y-6">
                {/* 1. DIVISION SALES CHART */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Division Sales Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DivisionSalesChart
                      data={dashboardData.divisionSales || []}
                      onBarClick={handleBarClick}
                      activeDivision={selectedDivision}
                    />
                  </CardContent>
                </Card>

                {/* 2. TARGET VS ACHIEVEMENT CHART (Placed Below) */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Target vs. Actual Achievement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Ensure dashboardData.divisionSales is passed, as it contains the totals we need */}
                    <TargetAchievementChart
                      data={dashboardData.divisionSales || []}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* DRILL DOWN SECTION (Visible only when a division is clicked) */}
              {selectedDivision ? (
                <div
                  ref={drilldownRef}
                  className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                    <Card className="shadow-md">
                      <CardHeader className="border-b">
                        <CardTitle>
                          {selectedDivision} - Monthly Heatmap View
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <SupplierHeatmap
                          data={
                            dashboardData.heatmapDataByDivision?.[
                              selectedDivision
                            ] || []
                          }
                          divisionName={selectedDivision}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                /* OVERALL TREND CHART (Visible when no division selected) */
                <Card className="shadow-sm mt-6">
                  <CardHeader>
                    <CardTitle>Overall Monthly Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SalesTrendChart data={dashboardData.salesTrend || []} />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <span className="text-gray-400">
            Select a date range to view data
          </span>
        </div>
      )}
    </div>
  );
}
