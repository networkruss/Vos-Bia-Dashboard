"use client";

import { useState, useEffect } from "react";
import {
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  PackageCheck,
  AlertCircle,
  Activity,
  Truck,
  LayoutGrid,
  Award,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  TrendingUp,
} from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { DateRange } from "react-day-picker";

import type { DashboardFilters } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const DIVISIONS = [
  "Overview",
  "Dry Goods",
  "Industrial",
  "Mama Pina's",
  "Frozen Goods",
  "Internal",
];

const ITEMS_PER_PAGE = 5;
const LIST_ITEMS_PER_PAGE = 5;

const CHART_COLORS = [
  "#2563eb",
  "#16a34a",
  "#e11d48",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#4f46e5",
  "#ca8a04",
  "#0f172a",
];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState(DIVISIONS[0]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [supplierPage, setSupplierPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [customerPage, setCustomerPage] = useState(1);

  const [timePeriod, setTimePeriod] = useState("thisMonth");
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const handlePeriodChange = (val: string) => {
    setTimePeriod(val);
    const now = new Date();
    let newDate: DateRange | undefined;

    switch (val) {
      case "today":
        newDate = { from: now, to: now };
        break;
      case "thisWeek":
        newDate = { from: startOfWeek(now), to: endOfWeek(now) };
        break;
      case "thisMonth":
        newDate = { from: startOfMonth(now), to: endOfMonth(now) };
        break;
      case "custom":
        return;
      default:
        return;
    }
    setDate(newDate);
  };

  const handleDateSelect = (newDate: DateRange | undefined) => {
    setDate(newDate);
    setTimePeriod("custom");
  };

  useEffect(() => {
    if (!date?.from || !date?.to) return;

    const fetchData = async () => {
      setLoading(true);
      setErrorMsg(null);
      setSupplierPage(1);
      setProductPage(1);
      setCustomerPage(1);

      try {
        const query = new URLSearchParams({
          fromDate: format(date.from!, "yyyy-MM-dd"),
          toDate: format(date.to!, "yyyy-MM-dd"),
          activeTab: activeTab,
        });

        const res = await fetch(`/api/sales/manager?${query.toString()}`);

        if (!res.ok) {
          if (res.status === 404)
            throw new Error(
              "API Route not found. Check /api/sales/manager/route.ts exists."
            );
          throw new Error(`Server Error: ${res.status}`);
        }

        const json = await res.json();
        if (json.error) throw new Error(json.details || json.error);

        setData(json);
      } catch (err: any) {
        console.error("Error:", err);
        setErrorMsg(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, date]);

  const toggleSupplier = (id: string) => {
    setExpandedSupplier(expandedSupplier === id ? null : id);
  };

  const formatPHP = (val: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(val);

  const totalSuppliers = data?.supplierBreakdown?.length || 0;
  const totalSupplierPages = Math.ceil(totalSuppliers / ITEMS_PER_PAGE);
  const paginatedSuppliers =
    data?.supplierBreakdown?.slice(
      (supplierPage - 1) * ITEMS_PER_PAGE,
      supplierPage * ITEMS_PER_PAGE
    ) || [];

  const totalProducts = data?.pareto?.products?.length || 0;
  const totalProductPages = Math.ceil(totalProducts / LIST_ITEMS_PER_PAGE);
  const paginatedProducts =
    data?.pareto?.products?.slice(
      (productPage - 1) * LIST_ITEMS_PER_PAGE,
      productPage * LIST_ITEMS_PER_PAGE
    ) || [];

  const totalCustomers = data?.pareto?.customers?.length || 0;
  const totalCustomerPages = Math.ceil(totalCustomers / LIST_ITEMS_PER_PAGE);
  const paginatedCustomers =
    data?.pareto?.customers?.slice(
      (customerPage - 1) * LIST_ITEMS_PER_PAGE,
      customerPage * LIST_ITEMS_PER_PAGE
    ) || [];

  const calculateBadStockRate = () => {
    if (!data || data.badStock.totalInflow === 0) return 0;
    return Math.min(
      100,
      (data.badStock.accumulated / data.badStock.totalInflow) * 100
    );
  };

  return (
    // UPDATED: Changed 'max-w-7xl' to 'w-full' to allow full expansion
    // Added 'dark:bg-gray-900' for better dark mode support
    <div className="p-6 w-full mx-auto space-y-6 min-h-screen relative dark:bg-gray-900 transition-all duration-300">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-[1px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Inventory & Sales Manager
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Tracking stock velocity, returns, and sales performance
        </p>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-300">
        <div
          className={
            timePeriod === "custom" ? "md:col-span-3" : "md:col-span-6"
          }
        >
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
            Division
          </label>
          <Select value={activeTab} onValueChange={(val) => setActiveTab(val)}>
            <SelectTrigger className="w-full h-12 dark:bg-gray-900 dark:border-gray-700 dark:text-white">
              <SelectValue placeholder="Select Division" />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              {DIVISIONS.map((div) => (
                <SelectItem
                  key={div}
                  value={div}
                  className="dark:text-gray-200 dark:focus:bg-gray-700"
                >
                  {div}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          className={
            timePeriod === "custom" ? "md:col-span-3" : "md:col-span-6"
          }
        >
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
            Time Period
          </label>
          <Select value={timePeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-full h-12 dark:bg-gray-900 dark:border-gray-700 dark:text-white">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              <SelectItem value="today" className="dark:text-gray-200">
                Today
              </SelectItem>
              <SelectItem value="thisWeek" className="dark:text-gray-200">
                This Week
              </SelectItem>
              <SelectItem value="thisMonth" className="dark:text-gray-200">
                This Month
              </SelectItem>
              <SelectItem value="custom" className="dark:text-gray-200">
                Custom Range
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {timePeriod === "custom" && (
          <div className="md:col-span-6 animate-in fade-in slide-in-from-left-4 duration-300">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
              Custom Date Range
            </label>
            <DatePickerWithRange
              className="w-full dark:bg-gray-900 dark:border-gray-700 dark:text-white"
              date={date}
              setDate={handleDateSelect}
            />
          </div>
        )}
      </div>

      {errorMsg ? (
        <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900">
          <p className="font-semibold">Error Loading Dashboard</p>{" "}
          <p className="text-sm">{errorMsg}</p>
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          <span className="text-gray-400 dark:text-gray-500">
            Loading metrics...
          </span>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 mt-6">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm border-emerald-100 dark:border-emerald-900 dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                      <PackageCheck className="text-emerald-600 dark:text-emerald-400 h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Good Stock Velocity
                      </p>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {data.goodStock.velocityRate}%
                      </h3>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-bold rounded ${
                      data.goodStock.status.includes("Healthy") ||
                      data.goodStock.status.includes("Fast")
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                    }`}
                  >
                    {data.goodStock.status}
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-4">
                  <div
                    className="bg-gray-900 dark:bg-white h-2 rounded-full"
                    style={{ width: `${data.goodStock.velocityRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>
                    Outflow:{" "}
                    <strong className="dark:text-gray-200">
                      {data.goodStock.totalOutflow.toLocaleString()}
                    </strong>
                  </span>
                  <span>
                    Total Moved:{" "}
                    <strong className="dark:text-gray-200">
                      {data.goodStock.totalInflow.toLocaleString()}
                    </strong>
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-red-100 dark:border-red-900 dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                      <AlertCircle className="text-red-600 dark:text-red-400 h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Bad Stock Inflow
                      </p>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {data.badStock.accumulated.toLocaleString()}
                      </h3>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-bold rounded ${
                      data.badStock.status === "Normal"
                        ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                    }`}
                  >
                    {data.badStock.status}
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-4">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${calculateBadStockRate()}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>
                    Accumulated:{" "}
                    <strong className="dark:text-gray-200">
                      {data.badStock.accumulated.toLocaleString()}
                    </strong>
                  </span>
                  <span>
                    Returns Volume:{" "}
                    <strong className="text-red-600 dark:text-red-400">
                      +{data.badStock.totalInflow.toLocaleString()}
                    </strong>
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TREND CHART */}
          <Card className="shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />{" "}
                Stock Movement Trend (Historical)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.trendData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="fillGood" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#18181b" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#18181b"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient id="fillBad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#ef4444"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f0f0f0"
                    className="dark:stroke-gray-700"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#888" }}
                    minTickGap={30}
                    tickMargin={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#888" }}
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "none",
                      color: "#fff",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area
                    type="monotone"
                    dataKey="goodStockOutflow"
                    name="Good Stock Out"
                    stroke="#18181b"
                    fill="url(#fillGood)"
                    strokeWidth={2}
                    stackId="a"
                    className="dark:stroke-white dark:fill-white/20"
                  />
                  <Area
                    type="monotone"
                    dataKey="badStockInflow"
                    name="Bad Stock In"
                    stroke="#ef4444"
                    fill="url(#fillBad)"
                    strokeWidth={2}
                    stackId="a"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="flex flex-col shadow-sm dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="items-center pb-0">
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />{" "}
                  Sales per Supplier
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Top 10 Suppliers
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-0 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.salesBySupplier}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {data.salesBySupplier.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatPHP(value)}
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
              <CardFooter className="flex-col gap-2 text-sm pt-4 dark:text-gray-300">
                <div className="flex items-center gap-2 leading-none font-medium">
                  {data.salesBySupplier.length > 0 ? (
                    <>Top Supplier: {data.salesBySupplier[0]?.name}</>
                  ) : (
                    "No Data Available"
                  )}
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardFooter>
            </Card>

            <Card className="shadow-sm dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />{" "}
                  Sales per Salesman
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
                      className="dark:stroke-gray-700"
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fontSize: 11, fill: "#888" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      formatter={(value: number) => formatPHP(value)}
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "none",
                        color: "#fff",
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill="#000000" // Fallback
                      className="fill-black dark:fill-white" // CSS Class for dark mode switch
                      radius={[0, 0, 0, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TOP PRODUCTS */}
            <Card className="shadow-sm dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <ShoppingBag className="h-5 w-5 text-orange-500" /> Top
                  Products
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 dark:hover:bg-gray-700"
                    onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                    disabled={productPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 dark:text-white" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 dark:hover:bg-gray-700"
                    onClick={() =>
                      setProductPage((p) => Math.min(totalProductPages, p + 1))
                    }
                    disabled={productPage === totalProductPages}
                  >
                    <ChevronRight className="h-4 w-4 dark:text-white" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paginatedProducts.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between text-sm border-b border-gray-50 dark:border-gray-700 pb-2 last:border-0"
                    >
                      <span className="text-gray-700 dark:text-gray-300 w-2/3 truncate">
                        {(productPage - 1) * LIST_ITEMS_PER_PAGE + idx + 1}.{" "}
                        {item.name}
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {formatPHP(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* TOP CUSTOMERS */}
            <Card className="shadow-sm dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Award className="h-5 w-5 text-yellow-500" /> Top Customers
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 dark:hover:bg-gray-700"
                    onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                    disabled={customerPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 dark:text-white" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 dark:hover:bg-gray-700"
                    onClick={() =>
                      setCustomerPage((p) =>
                        Math.min(totalCustomerPages, p + 1)
                      )
                    }
                    disabled={customerPage === totalCustomerPages}
                  >
                    <ChevronRight className="h-4 w-4 dark:text-white" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paginatedCustomers.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between text-sm border-b border-gray-50 dark:border-gray-700 pb-2 last:border-0"
                    >
                      <span className="text-gray-700 dark:text-gray-300 w-2/3 truncate">
                        {(customerPage - 1) * LIST_ITEMS_PER_PAGE + idx + 1}.{" "}
                        {item.name}
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {formatPHP(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 flex flex-row items-center justify-between">
              <CardTitle className="dark:text-white">
                Detailed Supplier Breakdown
              </CardTitle>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                Showing{" "}
                {Math.min(
                  (supplierPage - 1) * ITEMS_PER_PAGE + 1,
                  totalSuppliers
                )}
                -{Math.min(supplierPage * ITEMS_PER_PAGE, totalSuppliers)} of{" "}
                {totalSuppliers}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {paginatedSuppliers.map((supplier: any) => (
                <div
                  key={supplier.id}
                  className="border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <button
                    onClick={() => toggleSupplier(supplier.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {supplier.name}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-gray-900 dark:text-white">
                        {formatPHP(supplier.totalSales)}
                      </span>
                      {expandedSupplier === supplier.id ? (
                        <ChevronDown className="h-4 w-4 dark:text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 dark:text-gray-400" />
                      )}
                    </div>
                  </button>
                  {expandedSupplier === supplier.id && (
                    <div className="bg-gray-50/50 dark:bg-gray-900/50 p-4">
                      <table className="w-full text-sm">
                        <tbody>
                          {supplier.salesmen.map((rep: any, idx: number) => (
                            <tr
                              key={idx}
                              className="border-b border-gray-100 dark:border-gray-700 last:border-0"
                            >
                              <td className="py-2 text-gray-600 dark:text-gray-400 pl-4">
                                {rep.name}
                              </td>
                              <td className="py-2 text-right font-medium text-gray-900 dark:text-gray-200">
                                {formatPHP(rep.amount)}
                              </td>
                              <td className="py-2 text-right text-gray-500 dark:text-gray-500 pr-4">
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
              {totalSuppliers > ITEMS_PER_PAGE && (
                <div className="p-4 flex items-center justify-between border-t bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSupplierPage((p) => p - 1)}
                    disabled={supplierPage === 1}
                    className="flex items-center gap-1 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Page {supplierPage} of {totalSupplierPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSupplierPage((p) => p + 1)}
                    disabled={supplierPage === totalSupplierPages}
                    className="flex items-center gap-1 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {activeTab === "Overview" && data.divisionBreakdown && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mt-8">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-blue-600" /> Division
                  Overview Summary
                </h3>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-medium">
                  <tr>
                    <th className="py-3 px-6">Division</th>
                    <th className="py-3 px-6 text-center">Velocity</th>
                    <th className="py-3 px-6 text-right">Good Stock Out</th>
                    <th className="py-3 px-6 text-right">Bad Stock In</th>
                    <th className="py-3 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.divisionBreakdown.map((div: any, idx: number) => (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-3 px-6 font-medium text-gray-900 dark:text-gray-200">
                        {div.division}
                      </td>
                      <td className="py-3 px-6 text-center font-bold text-blue-600 dark:text-blue-400">
                        {div.goodStock.velocityRate}%
                      </td>
                      <td className="py-3 px-6 text-right text-gray-700 dark:text-gray-300">
                        {div.goodStock.totalOutflow.toLocaleString()}
                      </td>
                      <td className="py-3 px-6 text-right text-red-600 dark:text-red-400">
                        {div.badStock.accumulated.toLocaleString()}
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            div.goodStock.status === "Healthy"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
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
