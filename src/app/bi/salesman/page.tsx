"use client";

import { useState, useEffect, useCallback } from "react";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  ShoppingCart,
  Banknote,
  Target,
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

// --- Types ---
interface DashboardData {
  salesman: { name: string; level: number; levelUp: number };
  kpi: { orders: number; revenue: number; returns: number };
  target: { quota: number; achieved: number; gap: number; percent: number };
  statusMonitoring: { delivered: number; pending: number; cancelled: number };
  badStorage: Array<{ product: string; reason: string; amount: number }>;
  charts: {
    suppliers: Array<{ name: string; value: number }>;
    products: Array<{ name: string; value: number }>;
  };
}

const formatPHP = (val: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(val || 0);

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

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

  const [selectedSalesman, setSelectedSalesman] = useState<string>("all");
  const [dateFromInput, setDateFromInput] = useState<string>(getTodayDate());
  const [dateToInput, setDateToInput] = useState<string>(getTodayDate());
  const [salesmanList, setSalesmanList] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [lastSync, setLastSync] = useState<string>("");

  const fetchSalesmen = useCallback(async () => {
    try {
      const response = await fetch("/api/sales/salesman/list");
      const result = await response.json();
      if (result.success) {
        const normalized = result.data.map((item: any) => ({
          id: String(item.id),
          name: item.salesman_name,
        }));
        setSalesmanList([{ id: "all", name: "Whole Team" }, ...normalized]);
      }
    } catch (err) {
      console.error("List Fetch Error:", err);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        fromDate: dateFromInput,
        toDate: dateToInput,
        salesmanId: selectedSalesman,
      });
      const response = await fetch(`/api/sales/salesman?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setLastSync(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Data Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedSalesman, dateFromInput, dateToInput]);

  useEffect(() => {
    fetchSalesmen();
  }, [fetchSalesmen]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleReset = () => {
    const today = getTodayDate();
    setSelectedSalesman("all");
    setDateFromInput(today);
    setDateToInput(today);
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-gray-950">
        <div className="h-10 w-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] animate-pulse">
          Syncing Sales Engine...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 p-4 md:p-8 space-y-6 transition-colors duration-500">
      {/* Header Section */}
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
                Level {data?.salesman?.level ?? 0}
                <span className="ml-1 text-emerald-500">
                  +{data?.salesman?.levelUp ?? 0}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-end gap-2">
            <Clock size={12} /> Last Sync: {lastSync}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Salesman Selector */}
        <Card className="lg:col-span-4 border-none shadow-sm bg-white dark:bg-gray-900 flex flex-col h-[300px]">
          <div className="p-4 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">
              Active Sales Representatives
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {salesmanList.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedSalesman(item.id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-black uppercase transition-all flex items-center justify-between ${
                  selectedSalesman === item.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {item.name}
                {selectedSalesman === item.id && <ArrowUpRight size={14} />}
              </button>
            ))}
          </div>
        </Card>

        {/* Right: Date Filters & Trigger */}
        <Card className="lg:col-span-8 border-none shadow-sm bg-white dark:bg-gray-900 p-6 flex flex-col justify-center">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} className="text-blue-600" /> Period Analytics
            </label>
            <div className="flex flex-col sm:flex-row items-center bg-gray-50 dark:bg-gray-800 rounded-2xl p-1.5 border border-transparent focus-within:border-blue-500/20 transition-all gap-2">
              <input
                type="date"
                value={dateFromInput}
                onChange={(e) => setDateFromInput(e.target.value)}
                className="bg-transparent text-sm font-bold p-2 w-full dark:text-white outline-none"
              />
              <div className="hidden sm:block px-2 text-gray-300">
                <ChevronRight size={16} />
              </div>
              <input
                type="date"
                value={dateToInput}
                onChange={(e) => setDateToInput(e.target.value)}
                className="bg-transparent text-sm font-bold p-2 w-full dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="flex-[3] bg-gray-900 dark:bg-blue-600 hover:scale-[1.01] text-white h-[54px] rounded-2xl font-black text-xs flex items-center justify-center gap-3 shadow-xl transition-all uppercase tracking-widest disabled:opacity-50"
            >
              <RotateCcw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Generate Real-Time Report
            </button>
            <button
              onClick={handleReset}
              className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-500 h-[54px] rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center justify-center"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </Card>
      </div>

      {/* KPI Row */}
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
          title="Quota Balance"
          value={data?.target?.gap}
          formatValue={formatPHP}
          icon={TrendingDown}
          colorClass="text-amber-500"
        />
      </div>

      {/* Monitoring Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="dark:bg-gray-900 border-none shadow-sm">
          <CardHeader className="border-b border-gray-50 dark:border-gray-800">
            <CardTitle className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
              i. Sales Order Status Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {[
              {
                label: "Delivered",
                val: data?.statusMonitoring?.delivered,
                color: "bg-emerald-500",
                text: "text-emerald-600",
              },
              {
                label: "Pending",
                val: data?.statusMonitoring?.pending,
                color: "bg-blue-500",
                text: "text-blue-600",
              },
              {
                label: "Cancelled",
                val: data?.statusMonitoring?.cancelled,
                color: "bg-rose-500",
                text: "text-rose-600",
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                  <span className="text-gray-400">{item.label}</span>
                  <span className={item.text}>{item.val ?? 0} Unit(s)</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden border dark:border-gray-700">
                  <div
                    className={`${item.color} h-full transition-all duration-1000 ease-out`}
                    style={{
                      width: `${
                        (data?.kpi?.orders ?? 0) > 0
                          ? ((item.val || 0) / data!.kpi.orders) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 dark:bg-gray-900 border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-rose-50/50 dark:bg-rose-950/10 border-b border-rose-100 dark:border-rose-900/20 py-4">
            <CardTitle className="text-[11px] font-black text-rose-600 uppercase tracking-[0.2em] flex items-center gap-2">
              <AlertTriangle size={14} /> ii. Sales Return Monitoring
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                <TableRow className="bg-gray-50/50 dark:bg-gray-800/20 border-none">
                  <TableHead className="text-[10px] font-black uppercase py-4">
                    Product
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase py-4">
                    Reason Code
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase py-4 text-right">
                    Value Loss
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.badStorage?.length ? (
                  data.badStorage.map((ret, i) => (
                    <TableRow
                      key={i}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 border-gray-50 dark:border-gray-800"
                    >
                      <TableCell className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        {ret.product}
                      </TableCell>
                      <TableCell>
                        <span className="text-[9px] px-2 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg font-black uppercase">
                          {ret.reason}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-black text-rose-600">
                        {formatPHP(ret.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-20 text-[10px] font-black text-gray-300 uppercase italic"
                    >
                      No returns found (0)
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="dark:bg-gray-900 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              iii. Supplier Contribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.charts?.suppliers ?? []}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                >
                  {(data?.charts?.suppliers ?? []).map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "10px",
                    color: "#fff",
                  }}
                  formatter={(val: number) => formatPHP(val)}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{
                    fontSize: "10px",
                    fontWeight: "900",
                    textTransform: "uppercase",
                    paddingTop: "20px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              iii. Product Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.charts?.products ?? []}
                layout="vertical"
                margin={{ left: 20, right: 40 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 9, fontWeight: 900, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
                  formatter={(val: number) => formatPHP(val)}
                />
                <Bar
                  dataKey="value"
                  fill="#3b82f6"
                  radius={[0, 10, 10, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Target Tracking */}
      <Card className="dark:bg-gray-900 border-none shadow-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 overflow-hidden border-t-4 border-blue-600">
        <CardHeader className="px-8 pt-8">
          <CardTitle className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
            iv. Goal Realization
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-12 px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 max-w-5xl mx-auto">
            <div className="relative w-48 h-48">
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
                  className="stroke-blue-600 transition-all duration-1000"
                  strokeWidth="4"
                  strokeDasharray={`${data?.target?.percent ?? 0}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-gray-900 dark:text-white">
                  {data?.target?.percent ?? 0}%
                </span>
                <span className="text-[10px] font-black text-blue-600 uppercase">
                  Achieved
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full lg:w-2/3">
              <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] text-gray-400 uppercase font-black mb-2 flex items-center gap-2">
                  <Target size={14} className="text-blue-600" /> Target
                </p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">
                  {formatPHP(data?.target?.quota ?? 0)}
                </p>
              </div>
              <div className="p-6 bg-blue-600 rounded-3xl shadow-xl shadow-blue-500/20">
                <p className="text-[10px] text-blue-100 uppercase font-black mb-2 flex items-center gap-2">
                  <ArrowUpRight size={14} /> Actual
                </p>
                <p className="text-2xl font-black text-white">
                  {formatPHP(data?.target?.achieved ?? 0)}
                </p>
              </div>
              <div className="col-span-full p-8 bg-rose-50 dark:bg-rose-900/10 rounded-3xl border border-rose-100 dark:border-rose-900/20 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-rose-600 uppercase font-black mb-1">
                    Gap to Goal
                  </p>
                  <p className="text-3xl font-black text-rose-600">
                    {formatPHP(data?.target?.gap ?? 0)}
                  </p>
                </div>
                <div className="p-4 bg-rose-100 dark:bg-rose-900/30 rounded-2xl text-rose-600">
                  <TrendingDown size={32} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
