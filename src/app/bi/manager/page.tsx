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
  Award,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  TrendingUp,
  Target,
  BadgeDollarSign,
  Briefcase,
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
    status: string;
    totalOutflow: number;
    totalInflow: number;
  };
  badStock: {
    accumulated: number;
    status: string;
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
const SALESMEN_PER_PAGE = 5; // New constant for salesman pagination

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
  // Track page for each supplier's salesman list: { supplierId: pageNumber }
  const [salesmenPages, setSalesmenPages] = useState<Record<string, number>>(
    {}
  );

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
      setSalesmenPages({}); // Reset salesman pages on new fetch

      try {
        const query = new URLSearchParams({
          fromDate: format(date.from!, "yyyy-MM-dd"),
          toDate: format(date.to!, "yyyy-MM-dd"),
          activeTab: activeTab,
        });

        const res = await fetch(`/api/sales/manager?${query.toString()}`);

        if (!res.ok) {
          throw new Error(`Server Error: ${res.status}`);
        }

        const json = await res.json();
        if (json.error) throw new Error(json.details || json.error);

        setData(json);
      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
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

  const grandTotalSales =
    data?.supplierBreakdown?.reduce(
      (sum: number, sup: any) => sum + (sup.totalSales || 0),
      0
    ) ?? 0;

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
    <div className="p-6 w-full mx-auto space-y-6 min-h-screen relative bg-slate-50 dark:bg-gray-950 transition-all duration-300">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-[1px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-white"></div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            Manager Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Real-time supply chain & sales intelligence
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-lg border shadow-sm">
          <div className="flex items-center gap-2 px-3 py-1 border-r">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-bold">
              {data?.goodStock.velocityRate}% Velocity
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-bold">
              {data?.badStock.accumulated.toLocaleString()} Returns
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div
          className={
            timePeriod === "custom" ? "md:col-span-3" : "md:col-span-6"
          }
        >
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 block">
            Select Division
          </label>
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full h-11 dark:bg-gray-800 dark:border-gray-700 font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              {DIVISIONS.map((div) => (
                <SelectItem key={div} value={div} className="font-medium">
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
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 block">
            Timeframe
          </label>
          <Select value={timePeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-full h-11 dark:bg-gray-800 dark:border-gray-700 font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {timePeriod === "custom" && (
          <div className="md:col-span-6">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 block">
              Custom Date Range
            </label>
            <DatePickerWithRange
              className="w-full dark:bg-gray-800 dark:border-gray-700"
              date={date}
              setDate={handleDateSelect}
            />
          </div>
        )}
      </div>

      {errorMsg ? (
        <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100">
          <p className="font-bold">Execution Error</p>
          <p className="text-sm opacity-80">{errorMsg}</p>
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
          <span className="text-gray-400 font-medium animate-pulse">
            Syncing data streams...
          </span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm border-none bg-white dark:bg-gray-900 overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl group-hover:scale-110 transition-transform">
                      <PackageCheck className="text-blue-600 dark:text-blue-400 h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Good Stock Velocity
                      </p>
                      <h3 className="text-3xl font-black text-gray-900 dark:text-white leading-none mt-1">
                        {data.goodStock.velocityRate}%
                      </h3>
                    </div>
                  </div>
                  <span className="px-3 py-1 text-[10px] font-black uppercase rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {data.goodStock.status}
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-4">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${data.goodStock.velocityRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                  <span className="text-gray-400">
                    Outflow:{" "}
                    <span className="text-gray-900 dark:text-white">
                      {data.goodStock.totalOutflow.toLocaleString()}
                    </span>
                  </span>
                  <span className="text-gray-400">
                    Total:{" "}
                    <span className="text-gray-900 dark:text-white">
                      {data.goodStock.totalInflow.toLocaleString()}
                    </span>
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none bg-white dark:bg-gray-900 overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl group-hover:scale-110 transition-transform">
                      <AlertCircle className="text-red-600 dark:text-red-400 h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Returns / Bad Stock
                      </p>
                      <h3 className="text-3xl font-black text-gray-900 dark:text-white leading-none mt-1">
                        {data.badStock.accumulated.toLocaleString()}
                      </h3>
                    </div>
                  </div>
                  <span className="px-3 py-1 text-[10px] font-black uppercase rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {data.badStock.status}
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-4">
                  <div
                    className="bg-red-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${calculateBadStockRate()}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                  <span className="text-gray-400">
                    Accumulated:{" "}
                    <span className="text-gray-900 dark:text-white">
                      {data.badStock.accumulated.toLocaleString()}
                    </span>
                  </span>
                  <span className="text-red-600">
                    New Returns: +{data.badStock.totalInflow.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trend Chart */}
          <Card className="shadow-sm border-none bg-white dark:bg-gray-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Activity className="h-5 w-5 text-blue-600" />
                Operational Movement Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.trendData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="fillGood" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillBad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" />
                  <Area
                    type="monotone"
                    dataKey="goodStockOutflow"
                    name="Inventory Outflow"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fill="url(#fillGood)"
                  />
                  <Area
                    type="monotone"
                    dataKey="badStockInflow"
                    name="Return Inflow"
                    stroke="#ef4444"
                    strokeWidth={3}
                    fill="url(#fillBad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sales Visualization Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border-none bg-white dark:bg-gray-900">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-500" />
                  Sales Contribution by Supplier
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.salesBySupplier}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                    >
                      {data.salesBySupplier.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatPHP(value)} />
                    <Legend
                      iconType="rect"
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none bg-white dark:bg-gray-900">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  Salesman Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.salesBySalesman}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fontSize: 11, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc" }}
                      formatter={(value: number) => formatPHP(value)}
                    />
                    <Bar
                      dataKey="value"
                      fill="#0f172a"
                      className="dark:fill-blue-500"
                      radius={[0, 10, 10, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Supplier Breakdown Section */}
          <Card className="shadow-xl border-none overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-none">
            <div className="bg-slate-50 dark:bg-black p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Detailed Supplier Breakdown
                  </h2>
                  <p className="text-slate-500 dark:text-gray-400 text-sm font-medium">
                    Drilldown by partner & representative
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full md:w-auto">
                  <div className="bg-white dark:bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <p className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 mb-1 tracking-tighter">
                      Grand Total Sales
                    </p>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">
                      {formatPHP(grandTotalSales)}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <p className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 mb-1 tracking-tighter">
                      Supplier Count
                    </p>
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400 leading-none">
                      {totalSuppliers}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="p-0">
              {paginatedSuppliers.length === 0 ? (
                <div className="py-20 text-center text-gray-400 italic">
                  No supplier data detected.
                </div>
              ) : (
                paginatedSuppliers.map((supplier: any) => {
                  const isExpanded = expandedSupplier === supplier.id;
                  const percentOfTotal =
                    grandTotalSales > 0
                      ? (supplier.totalSales / grandTotalSales) * 100
                      : 0;

                  // Salesmen Pagination Logic
                  const currentSalesmenPage = salesmenPages[supplier.id] || 1;
                  const totalSalesmen = supplier.salesmen?.length || 0;
                  const totalSalesmenPages = Math.ceil(
                    totalSalesmen / SALESMEN_PER_PAGE
                  );
                  const paginatedSalesmen =
                    supplier.salesmen?.slice(
                      (currentSalesmenPage - 1) * SALESMEN_PER_PAGE,
                      currentSalesmenPage * SALESMEN_PER_PAGE
                    ) || [];

                  const setSalesmanPage = (newPage: number) => {
                    setSalesmenPages((prev) => ({
                      ...prev,
                      [supplier.id]: newPage,
                    }));
                  };

                  return (
                    <div
                      key={supplier.id}
                      className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <button
                        onClick={() => toggleSupplier(supplier.id)}
                        className={`w-full flex flex-col md:flex-row md:items-center justify-between p-5 transition-all ${
                          isExpanded
                            ? "bg-blue-50/50 dark:bg-blue-900/10"
                            : "hover:bg-slate-50 dark:hover:bg-gray-800/40"
                        }`}
                      >
                        <div className="flex flex-col items-start gap-1.5 w-full md:w-2/5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-600" />
                            <span className="font-black text-slate-800 dark:text-slate-100 uppercase text-sm tracking-tight">
                              {supplier.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 w-full max-w-[250px]">
                            <div className="h-1.5 flex-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${percentOfTotal}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-black text-blue-600 italic">
                              {percentOfTotal.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-10 mt-4 md:mt-0 w-full md:w-auto">
                          <div className="text-left md:text-right">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">
                              Revenue
                            </p>
                            <p className="text-xl font-black text-slate-900 dark:text-white leading-none">
                              {formatPHP(supplier.totalSales)}
                            </p>
                          </div>
                          <div
                            className={`p-2 rounded-lg transition-all ${
                              isExpanded
                                ? "bg-blue-600 text-white shadow-lg"
                                : "bg-slate-100 dark:bg-gray-800 text-slate-400"
                            }`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Salesmen Expandable Table with Pagination */}
                      {isExpanded && (
                        <div className="bg-slate-50/50 dark:bg-black/40 px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                          <div className="rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-inner">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest">
                                <tr>
                                  <th className="py-3 px-5 text-left">
                                    Sales Representative
                                  </th>
                                  <th className="py-3 px-5 text-right">
                                    Contribution
                                  </th>
                                  <th className="py-3 px-5 text-right w-24">
                                    Share
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                                {paginatedSalesmen.map(
                                  (rep: any, idx: number) => (
                                    <tr
                                      key={idx}
                                      className="hover:bg-blue-50/30 dark:hover:bg-gray-800/30 transition-colors"
                                    >
                                      <td className="py-4 px-5 font-bold text-slate-700 dark:text-slate-300">
                                        <div className="flex items-center gap-2">
                                          <Users className="h-4 w-4 text-slate-400" />
                                          {rep.name}
                                        </div>
                                      </td>
                                      <td className="py-4 px-5 text-right font-black text-slate-900 dark:text-white">
                                        {formatPHP(rep.amount)}
                                      </td>
                                      <td className="py-4 px-5 text-right">
                                        <span className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-[10px] font-black text-blue-600">
                                          {rep.percent}%
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>

                            {/* Salesman Pagination Controls */}
                            {totalSalesmenPages > 1 && (
                              <div className="p-3 flex items-center justify-between bg-slate-50/50 dark:bg-gray-800/50 border-t dark:border-gray-800">
                                <span className="text-[10px] font-bold text-slate-400">
                                  {currentSalesmenPage} of {totalSalesmenPages}
                                </span>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-[10px] font-bold"
                                    onClick={() =>
                                      setSalesmanPage(currentSalesmenPage - 1)
                                    }
                                    disabled={currentSalesmenPage === 1}
                                  >
                                    <ChevronLeft className="h-3 w-3 mr-1" />{" "}
                                    Back
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-[10px] font-bold"
                                    onClick={() =>
                                      setSalesmanPage(currentSalesmenPage + 1)
                                    }
                                    disabled={
                                      currentSalesmenPage === totalSalesmenPages
                                    }
                                  >
                                    Next{" "}
                                    <ChevronRight className="h-3 w-3 ml-1" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>

            {totalSupplierPages > 1 && (
              <div className="p-5 flex items-center justify-between bg-slate-50 dark:bg-gray-900 border-t dark:border-gray-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Page {supplierPage} / {totalSupplierPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-bold"
                    onClick={() => setSupplierPage((p) => p - 1)}
                    disabled={supplierPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-bold"
                    onClick={() => setSupplierPage((p) => p + 1)}
                    disabled={supplierPage === totalSupplierPages}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Pareto Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Products Pareto */}
            <Card className="shadow-sm border-none bg-white dark:bg-gray-900">
              <CardHeader className="flex flex-row items-center justify-between bg-orange-50/50 dark:bg-orange-900/10">
                <CardTitle className="text-md font-bold flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-orange-500" />
                  Top Performing Products
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                    disabled={productPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setProductPage((p) => Math.min(totalProductPages, p + 1))
                    }
                    disabled={productPage === totalProductPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedProducts.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-gray-300">
                          #{(productPage - 1) * LIST_ITEMS_PER_PAGE + i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[200px]">
                            {item.name}
                          </p>
                          <p className="text-[10px] font-medium text-gray-400">
                            {item.category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-gray-900 dark:text-white">
                          {formatPHP(item.value)}
                        </p>
                        <p className="text-[10px] font-bold text-orange-500">
                          {item.contribution}% contribution
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Customers Pareto */}
            <Card className="shadow-sm border-none bg-white dark:bg-gray-900">
              <CardHeader className="flex flex-row items-center justify-between bg-blue-50/50 dark:bg-blue-900/10">
                <CardTitle className="text-md font-bold flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  Key Account Customers
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                    disabled={customerPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setCustomerPage((p) =>
                        Math.min(totalCustomerPages, p + 1)
                      )
                    }
                    disabled={customerPage === totalCustomerPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedCustomers.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-gray-300">
                          #{(customerPage - 1) * LIST_ITEMS_PER_PAGE + i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[200px]">
                            {item.name}
                          </p>
                          <p className="text-[10px] font-medium text-gray-400">
                            {item.location || "Active Account"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-gray-900 dark:text-white">
                          {formatPHP(item.value)}
                        </p>
                        <p className="text-[10px] font-bold text-blue-500">
                          {item.contribution}% share
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
