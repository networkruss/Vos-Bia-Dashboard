"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShoppingCart,
  Banknote,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
  LayoutDashboard,
  Calendar,
  TrendingDown,
  Users,
  Clock,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import {
  Pie,
  PieChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface DashboardData {
  salesman: { name: string; level: number; levelUp: number };
  kpi: { orders: number; revenue: number; returns: number };
  target: { quota: number; achieved: number; gap: number; percent: number };
  statusMonitoring: { delivered: number; pending: number; cancelled: number };
  badStorage: Array<{ product: string; reason: string; amount: number }>;
  charts: {
    suppliers: Array<{ name: string; value: number; fill?: string }>;
    products: Array<{ name: string; value: number }>;
  };
}

const formatPHP = (val: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(val || 0);

const chartConfig = {
  value: { label: "Contribution" },
} satisfies ChartConfig;

const KPICard = ({
  title,
  value,
  icon: Icon,
  formatValue,
  badge,
  colorClass = "text-blue-600",
}: any) => (
  <Card className="border-none shadow-sm bg-white dark:bg-gray-900 overflow-hidden relative group">
    <CardContent className="p-6 flex items-center gap-4">
      <div
        className={`p-3 rounded-2xl bg-opacity-10 ${colorClass.replace(
          "text",
          "bg"
        )} ${colorClass}`}
      >
        <Icon size={24} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          {title}
        </p>
        <p className="text-xl font-black text-gray-900 dark:text-white truncate">
          {formatValue ? formatValue(value || 0) : value ?? 0}
        </p>
      </div>
      {badge && (
        <div className="absolute top-0 right-0 bg-blue-600 text-[9px] font-black text-white px-3 py-1 rounded-bl-lg uppercase tracking-tighter">
          {badge}
        </div>
      )}
    </CardContent>
  </Card>
);

export default function SalesmanDashboard() {
  const getTodayDate = () => new Date().toISOString().split("T")[0];

  // UseMemo to keep default values stable across renders
  const initialDates = useMemo(
    () => ({
      today: getTodayDate(),
    }),
    []
  );

  const [selectedSalesman, setSelectedSalesman] = useState<string>("all");
  const [dateFromInput, setDateFromInput] = useState<string>(
    initialDates.today
  );
  const [dateToInput, setDateToInput] = useState<string>(initialDates.today);
  const [salesmanList, setSalesmanList] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [lastSync, setLastSync] = useState<string>("");

  const fetchDashboardData = useCallback(
    async (from: string, to: string, sid: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          fromDate: from,
          toDate: to,
          salesmanId: sid,
        });
        // We try the standard path first
        const response = await fetch(
          `/api/sales/salesman?${params.toString()}`
        );
        const result = await response.json();

        if (result.success) {
          setData(result.data);
          setLastSync(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchSalesmen = useCallback(async () => {
    try {
      const response = await fetch("/api/sales/salesman/list");
      if (!response.ok) throw new Error("List not found");
      const result = await response.json();
      if (result.success) {
        const normalized = result.data.map((item: any) => ({
          id: String(item.id),
          name: item.salesman_name,
        }));
        setSalesmanList([{ id: "all", name: "Whole Team" }, ...normalized]);
      }
    } catch (err) {
      setSalesmanList([{ id: "all", name: "Whole Team (Offline)" }]);
    }
  }, []);

  // Effect for initial load only
  useEffect(() => {
    fetchSalesmen();
    fetchDashboardData(initialDates.today, initialDates.today, "all");
  }, [fetchSalesmen, fetchDashboardData, initialDates.today]);

  const handleQuickDate = (type: "today" | "week" | "month") => {
    const now = new Date();
    const today = new Date().toISOString().split("T")[0];
    let from = today;

    if (type === "week") {
      const first = now.getDate() - now.getDay();
      from = new Date(now.setDate(first)).toISOString().split("T")[0];
    } else if (type === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
    }

    setDateFromInput(from);
    setDateToInput(today);
    fetchDashboardData(from, today, selectedSalesman);
  };

  const handleSalesmanChange = (id: string) => {
    setSelectedSalesman(id);
    fetchDashboardData(dateFromInput, dateToInput, id);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <LayoutDashboard size={20} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">
              SALES<span className="text-blue-600 font-light">CORE</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
              <Users size={14} className="text-blue-500" />
              Salesman:{" "}
              <span className="text-gray-900 dark:text-white font-black">
                {data?.salesman?.name || "Global View"}
              </span>
            </p>
            <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800">
              <ShieldCheck size={12} className="text-blue-600" />
              <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase">
                Level {data?.salesman?.level ?? 0}{" "}
                <span className="ml-1 text-emerald-500">
                  +{data?.salesman?.levelUp ?? 0}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-end gap-2">
            <Clock size={12} /> Last Sync: {lastSync || "--:--:--"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar */}
        <Card className="lg:col-span-4 border-none shadow-sm bg-white dark:bg-gray-900 flex flex-col h-[400px]">
          <div className="p-4 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Representatives
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {salesmanList.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSalesmanChange(item.id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-black uppercase transition-all flex items-center justify-between ${
                  selectedSalesman === item.id
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {item.name}{" "}
                {selectedSalesman === item.id && <ArrowUpRight size={14} />}
              </button>
            ))}
          </div>
        </Card>

        {/* Date Filters */}
        <Card className="lg:col-span-8 border-none shadow-sm bg-white dark:bg-gray-900 p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} className="text-blue-600" /> Date Range
              </label>
              <div className="flex gap-2">
                {["today", "week", "month"].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleQuickDate(t as any)}
                    className="text-[9px] font-black uppercase px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-blue-600 hover:text-white"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center bg-gray-50 dark:bg-gray-800 rounded-2xl p-1.5 border border-transparent focus-within:border-blue-500/20 transition-all gap-2">
              <input
                type="date"
                value={dateFromInput}
                onChange={(e) => setDateFromInput(e.target.value)}
                className="bg-transparent text-sm font-bold p-2 w-full dark:text-white outline-none"
              />
              <ChevronRight
                size={16}
                className="hidden sm:block text-gray-300"
              />
              <input
                type="date"
                value={dateToInput}
                onChange={(e) => setDateToInput(e.target.value)}
                className="bg-transparent text-sm font-bold p-2 w-full dark:text-white outline-none"
              />
            </div>
          </div>
          <button
            onClick={() =>
              fetchDashboardData(dateFromInput, dateToInput, selectedSalesman)
            }
            disabled={loading}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white h-[54px] rounded-2xl font-black text-xs flex items-center justify-center gap-3 shadow-xl uppercase"
          >
            {loading ? (
              <RotateCcw className="animate-spin" size={16} />
            ) : (
              <ShieldCheck size={16} />
            )}
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </Card>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Invoices"
          value={data?.kpi?.orders}
          icon={ShoppingCart}
          badge="LIVE"
        />
        <KPICard
          title="Gross Revenue"
          value={data?.kpi?.revenue}
          formatValue={formatPHP}
          icon={Banknote}
          colorClass="text-emerald-500"
        />
        <KPICard
          title="Return Volume"
          value={data?.kpi?.returns}
          formatValue={formatPHP}
          icon={RotateCcw}
          colorClass="text-rose-500"
        />
        <KPICard
          title="Target Balance"
          value={data?.target?.gap}
          formatValue={formatPHP}
          icon={TrendingDown}
          colorClass="text-amber-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="dark:bg-gray-900 border-none shadow-sm h-[400px]">
          <CardHeader className="items-center">
            <CardTitle className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              Supplier Mix
            </CardTitle>
          </CardHeader>
          <div className="h-[300px] w-full">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={data?.charts?.suppliers || []}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                />
              </PieChart>
            </ChartContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2 dark:bg-gray-900 border-none shadow-sm overflow-hidden">
          <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 border-b border-rose-100 flex items-center gap-2 text-rose-600">
            <AlertTriangle size={14} />{" "}
            <span className="text-[11px] font-black uppercase tracking-widest">
              Returns Log
            </span>
          </div>
          <div className="overflow-auto h-[350px]">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-gray-900">
                <TableRow>
                  <TableHead className="text-[10px] font-black">
                    Product
                  </TableHead>
                  <TableHead className="text-[10px] font-black">
                    Reason
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-black">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.badStorage?.map((ret, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-bold">
                      {ret.product}
                    </TableCell>
                    <TableCell>
                      <span className="text-[9px] px-2 py-1 bg-rose-100 text-rose-700 rounded-lg font-black uppercase">
                        {ret.reason}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-black text-rose-600">
                      {formatPHP(ret.amount)}
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-10 opacity-50 text-xs"
                    >
                      No records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Products Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
        <Card className="dark:bg-gray-900 border-none shadow-sm p-6 h-[400px]">
          <CardTitle className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">
            Top Performers
          </CardTitle>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts?.products ?? []} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tick={{ fontSize: 9, fontWeight: 900 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(val: number) => formatPHP(val)} />
                <Bar
                  dataKey="value"
                  fill="#3b82f6"
                  radius={[0, 10, 10, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Goal Indicator */}
        <Card className="dark:bg-gray-900 border-none shadow-xl border-t-4 border-blue-600 p-8">
          <CardTitle className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-8 text-center">
            Goal Tracking
          </CardTitle>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  className="stroke-gray-100 dark:stroke-gray-800"
                  strokeWidth="4"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  className="stroke-blue-600"
                  strokeWidth="4"
                  strokeDasharray={`${data?.target?.percent ?? 0}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black">
                  {data?.target?.percent ?? 0}%
                </span>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                  Achieved
                </span>
              </div>
            </div>
            <div className="space-y-4 w-full lg:w-1/2">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                <p className="text-[9px] text-gray-400 uppercase font-black">
                  Quota
                </p>
                <p className="text-xl font-black">
                  {formatPHP(data?.target?.quota ?? 0)}
                </p>
              </div>
              <div className="p-4 bg-blue-600 rounded-2xl text-white">
                <p className="text-[9px] text-blue-100 uppercase font-black">
                  Actual
                </p>
                <p className="text-xl font-black">
                  {formatPHP(data?.target?.achieved ?? 0)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
