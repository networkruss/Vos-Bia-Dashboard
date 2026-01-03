"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  PackageCheck,
  AlertCircle,
  TrendingUp,
  Activity,
  Users,
  Truck,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  Award,
  ShoppingBag,
  ChevronLeft,
} from "lucide-react";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KPICard, formatCurrency } from "@/components/dashboard/KPICard";
import type { DashboardFilters } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Types ---
interface DashboardData {
  division: string;
  goodStock: {
    velocityRate: number;
    status: "Healthy" | "Warning" | "Critical";
    totalOutflow: number;
    totalInflow: number;
  };
  badStock: {
    accumulated: number;
    status: "Normal" | "High";
    totalInflow: number;
  };
  trendData: any[];
  salesBySupplier: { name: string; value: number }[];
  salesBySalesman: { name: string; value: number }[];
  supplierBreakdown: any[];
  divisionBreakdown?: any[];
  pareto: {
    products: any[];
    customers: any[];
  };
}

const PIE_COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];
const DIVISIONS = [
  "Overview",
  "Dry Goods",
  "Industrial",
  "Mama Pina's",
  "Frozen Goods",
];
const ITEMS_PER_PAGE = 5; // Pagination Limit

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState(DIVISIONS[0]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pagination State
  const [supplierPage, setSupplierPage] = useState(1);

  // Date Filters
  const [filters, setFilters] = useState<DashboardFilters>({
    fromDate: "",
    toDate: "",
    division: "all",
  });

  const onFilterUpdate = useCallback((newFilters: DashboardFilters) => {
    setFilters(newFilters);
    setSupplierPage(1); // Reset page on filter change
  }, []);

  useEffect(() => {
    if (!filters.fromDate || !filters.toDate) return;

    const fetchData = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const query = new URLSearchParams({
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          activeTab: activeTab,
        });

        // FIXED: Correct URL matching your file path
        const res = await fetch(`/api/sales/manager?${query.toString()}`);

        if (!res.ok) {
          throw new Error(`Server Error: ${res.status} ${res.statusText}`);
        }
        const json = await res.json();

        if (json.error) {
          throw new Error(json.details || json.error);
        }

        setData(json);
      } catch (err: any) {
        console.error("Error fetching manager data:", err);
        setErrorMsg(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, filters]);

  const toggleSupplier = (id: string) => {
    setExpandedSupplier(expandedSupplier === id ? null : id);
  };

  const formatPHP = (val: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(val);

  // --- Pagination Logic ---
  const totalSuppliers = data?.supplierBreakdown?.length || 0;
  const totalPages = Math.ceil(totalSuppliers / ITEMS_PER_PAGE);
  const startIdx = (supplierPage - 1) * ITEMS_PER_PAGE;
  const paginatedSuppliers =
    data?.supplierBreakdown?.slice(startIdx, startIdx + ITEMS_PER_PAGE) || [];

  const handleNextPage = () => {
    if (supplierPage < totalPages) setSupplierPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    if (supplierPage > 1) setSupplierPage((prev) => prev - 1);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 min-h-screen relative">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Inventory & Sales Manager
          </h1>
          <p className="text-gray-500">
            Tracking stock velocity, returns, and sales performance
          </p>
        </div>

        <div className="w-full md:w-[200px]">
          <Select
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val);
              setSupplierPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Division" />
            </SelectTrigger>
            <SelectContent>
              {DIVISIONS.map((div) => (
                <SelectItem key={div} value={div}>
                  {div}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <FilterBar onFilterChange={onFilterUpdate} branches={[]} />

      {errorMsg ? (
        <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg border border-red-100">
          <p className="font-semibold">Error Loading Dashboard</p>
          <p className="text-sm">{errorMsg}</p>
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <span className="text-gray-400">Loading metrics...</span>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm border-emerald-100">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <PackageCheck className="text-emerald-600 h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Good Stock Velocity
                      </p>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {data.goodStock.velocityRate}%
                      </h3>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-bold rounded ${
                      data.goodStock.status === "Healthy"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {data.goodStock.status}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${data.goodStock.velocityRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    Outflow:{" "}
                    <strong>
                      {data.goodStock.totalOutflow.toLocaleString()}
                    </strong>
                  </span>
                  <span>
                    Total Moved:{" "}
                    <strong>
                      {data.goodStock.totalInflow.toLocaleString()}
                    </strong>
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-red-100">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="text-red-600 h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Bad Stock Inflow
                      </p>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {data.badStock.accumulated.toLocaleString()}
                      </h3>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-bold rounded ${
                      data.badStock.status === "Normal"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {data.badStock.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-8">
                  <p>
                    Returns Volume:{" "}
                    <span className="font-bold text-red-600">
                      +{data.badStock.totalInflow.toLocaleString()} units
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" /> Stock Movement
                Trend (Historical)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.trendData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f0f0f0"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#888" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#888" }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="goodStockOutflow"
                    name="Good Stock Out"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="badStockInflow"
                    name="Bad Stock In"
                    stroke="#ef4444"
                    strokeWidth={3}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" /> Sales per Supplier
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.salesBySupplier}
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.salesBySupplier?.map(
                        (entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        )
                      )}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatPHP(value)} />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      wrapperStyle={{ fontSize: "11px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" /> Sales per
                  Salesman
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.salesBySalesman}
                    layout="vertical"
                    margin={{ left: 40 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#f0f0f0"
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      formatter={(value: number) => formatPHP(value)}
                    />
                    <Bar
                      dataKey="value"
                      fill="#3b82f6"
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-orange-500" /> Top 10
                  Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.pareto?.products.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0"
                    >
                      <span className="text-gray-700 w-2/3 truncate">
                        {idx + 1}. {item.name}
                      </span>
                      <span className="font-bold text-gray-900">
                        {formatPHP(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" /> Top 10 Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.pareto?.customers.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0"
                    >
                      <span className="text-gray-700 w-2/3 truncate">
                        {idx + 1}. {item.name}
                      </span>
                      <span className="font-bold text-gray-900">
                        {formatPHP(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Supplier Breakdown (With Pagination) */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 border-b border-gray-100 flex flex-row items-center justify-between">
              <CardTitle>Detailed Supplier Breakdown</CardTitle>
              <span className="text-xs text-gray-500 font-normal">
                Showing {startIdx + 1}-
                {Math.min(startIdx + ITEMS_PER_PAGE, totalSuppliers)} of{" "}
                {totalSuppliers}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {paginatedSuppliers.map((supplier: any) => (
                <div
                  key={supplier.id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <button
                    onClick={() => toggleSupplier(supplier.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-800">
                      {supplier.name}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-gray-900">
                        {formatPHP(supplier.totalSales)}
                      </span>
                      {expandedSupplier === supplier.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                  {expandedSupplier === supplier.id && (
                    <div className="bg-gray-50/50 p-4">
                      <table className="w-full text-sm">
                        <tbody>
                          {supplier.salesmen.map((rep: any, idx: number) => (
                            <tr
                              key={idx}
                              className="border-b border-gray-100 last:border-0"
                            >
                              <td className="py-2 text-gray-600 pl-4">
                                {rep.name}
                              </td>
                              <td className="py-2 text-right font-medium text-gray-900">
                                {formatPHP(rep.amount)}
                              </td>
                              <td className="py-2 text-right text-gray-500 pr-4">
                                {rep.percent}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}

              {/* Pagination Controls */}
              {totalSuppliers > ITEMS_PER_PAGE && (
                <div className="p-4 flex items-center justify-between border-t bg-gray-50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={supplierPage === 1}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>
                  <span className="text-sm text-gray-600 font-medium">
                    Page {supplierPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={supplierPage === totalPages}
                    className="flex items-center gap-1"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {activeTab === "Overview" && data.divisionBreakdown && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-8">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-blue-600" />
                  Division Overview Summary
                </h3>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="py-3 px-6">Division</th>
                    <th className="py-3 px-6 text-center">Velocity</th>
                    <th className="py-3 px-6 text-right">Good Stock Out</th>
                    <th className="py-3 px-6 text-right">Bad Stock In</th>
                    <th className="py-3 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.divisionBreakdown.map((div: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-3 px-6 font-medium text-gray-900">
                        {div.division}
                      </td>
                      <td className="py-3 px-6 text-center font-bold text-blue-600">
                        {div.goodStock.velocityRate}%
                      </td>
                      <td className="py-3 px-6 text-right text-gray-700">
                        {div.goodStock.totalOutflow.toLocaleString()}
                      </td>
                      <td className="py-3 px-6 text-right text-red-600">
                        {div.badStock.accumulated.toLocaleString()}
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            div.goodStock.status === "Healthy"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {div.goodStock.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
