"use client";

import { useState, useEffect } from "react";
import {
  Area,
  AreaChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import {
  DollarSign,
  Percent,
  Users,
  TrendingUp,
  Loader2,
  Target,
  Store,
  MapPin,
  Truck,
  Package,
  ChevronLeft,
  ChevronRight,
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

import { KPICard, formatCurrency } from "@/components/dashboard/KPICard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 10;
const DETAIL_ITEMS_PER_PAGE = 5;
// REDUCED TO 5 TO PREVENT OVERLAP
const COVERAGE_ITEMS_PER_PAGE = 5;

// SOLID COLORS (No Fading)
const COVERAGE_COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#4f46e5",
  "#ea580c",
  "#059669",
  "#be123c",
  "#1d4ed8",
  "#b91c1c",
  "#4338ca",
  "#0f766e",
];

const truncateLabel = (str: string, max: number = 18) => {
  return str.length > max ? str.substring(0, max) + "..." : str;
};

// --- TYPES ---
type SalesmanStats = {
  id: string;
  name: string;
  netSales: number;
  target: number;
  returnRate: number;
  visits: number;
  orders: number;
  strikeRate: number;
  topProduct: string;
  topSupplier: string;
  productsSold: number;
};

type SupervisorData = {
  teamSales: number;
  teamTarget: number;
  totalInvoices: number;
  penetrationRate: number;
  salesmen: SalesmanStats[];
  coverageDistribution: any[];
  monthlyPerformance: any[];
  topProducts: any[];
  topSuppliers: any[];
  returnHistory: any[];
};

// --- COMPONENTS ---

const ProgressBar = ({ value, max }: { value: number; max: number }) => {
  if (max === 0) {
    return (
      <div className="h-2 w-full bg-gray-100 rounded-full mt-2 overflow-hidden">
        <div className="h-full bg-gray-300 w-full opacity-30" />
      </div>
    );
  }
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-2 w-full bg-gray-100 rounded-full mt-2 overflow-hidden">
      <div
        className="h-full bg-gray-900 rounded-full transition-all duration-500"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

const IndividualKPIs = ({ salesman }: { salesman: SalesmanStats }) => {
  const hasTarget = salesman.target > 0;
  const achievement = hasTarget
    ? (salesman.netSales / salesman.target) * 100
    : 0;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <KPICard
        title="Total Sales"
        value={salesman.netSales}
        formatValue={formatCurrency}
        icon={Users}
        subtitle="Current period"
      />
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-gray-500">
              Target Achievement
            </span>
            <Target className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-2xl font-bold">
              {hasTarget ? `${achievement.toFixed(1)}%` : "N/A"}
            </span>
            {!hasTarget && (
              <span className="text-xs text-muted-foreground ml-1">
                (No Target)
              </span>
            )}
          </div>
          <ProgressBar value={salesman.netSales} max={salesman.target} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-gray-500">
              Return Rate
            </span>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold mb-2">{salesman.returnRate}%</div>
          <span
            className={`text-xs font-bold px-2 py-1 rounded-full ${
              salesman.returnRate < 2
                ? "bg-gray-900 text-white"
                : "bg-red-100 text-red-700"
            }`}
          >
            {salesman.returnRate < 2 ? "Good" : "High"}
          </span>
        </CardContent>
      </Card>
      <KPICard
        title="Products Sold"
        value={salesman.productsSold}
        icon={Package}
        subtitle="Unique items"
      />
    </div>
  );
};

const IndividualChartsRow = ({
  monthlyData,
  productData,
  supplierData,
}: any) => {
  return (
    <div className="space-y-6 mb-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Target vs Achievement
          </CardTitle>
          <CardDescription>Daily performance tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fillTarget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillAchieved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#888" }}
                  dy={10}
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
                <Legend verticalAlign="bottom" height={36} />
                <Area
                  type="monotone"
                  dataKey="target"
                  name="Target"
                  stroke="#000000"
                  fill="url(#fillTarget)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="achieved"
                  name="Achieved"
                  stroke="#000000"
                  fill="url(#fillAchieved)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Sales by Product
            </CardTitle>
            <CardDescription>Top performing products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={productData}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
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
                    width={150}
                    tick={{ fontSize: 11, fill: "#666" }}
                    tickFormatter={(val) => truncateLabel(val, 20)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    formatter={(val: number) => formatCurrency(val)}
                  />
                  <Bar
                    dataKey="sales"
                    fill="#18181b"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Sales by Supplier
            </CardTitle>
            <CardDescription>Supplier distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={supplierData}
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f0f0f0"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "#666" }}
                    tickFormatter={(val) => truncateLabel(val, 10)}
                    dy={12}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    formatter={(val: number) => formatCurrency(val)}
                  />
                  <Bar
                    dataKey="sales"
                    fill="#18181b"
                    radius={[4, 4, 0, 0]}
                    barSize={100}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const DetailedTablesRow = ({
  productData = [],
  returnHistory = [],
}: {
  productData?: any[];
  returnHistory?: any[];
}) => {
  const [prodPage, setProdPage] = useState(1);
  const [retPage, setRetPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => {
      setProdPage(1);
      setRetPage(1);
    }, 0);
    return () => clearTimeout(t);
  }, [productData, returnHistory]);
  const totalProdPages = Math.ceil(productData.length / DETAIL_ITEMS_PER_PAGE);
  const currentProducts = productData.slice(
    (prodPage - 1) * DETAIL_ITEMS_PER_PAGE,
    prodPage * DETAIL_ITEMS_PER_PAGE
  );
  const totalRetPages = Math.ceil(returnHistory.length / DETAIL_ITEMS_PER_PAGE);
  const currentReturns = returnHistory.slice(
    (retPage - 1) * DETAIL_ITEMS_PER_PAGE,
    retPage * DETAIL_ITEMS_PER_PAGE
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Product Performance Details
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentProducts.length > 0 ? (
                currentProducts.map((prod, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-sm">
                      {truncateLabel(prod.name, 35)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-gray-900 text-sm">
                      {formatCurrency(prod.sales)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center text-sm text-gray-500 py-8"
                  >
                    No product data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {productData.length > DETAIL_ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between pt-4 mt-auto border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProdPage((p) => Math.max(1, p - 1))}
                disabled={prodPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-gray-500">
                Page {prodPage} of {totalProdPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setProdPage((p) => Math.min(totalProdPages, p + 1))
                }
                disabled={prodPage === totalProdPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Return History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentReturns.length > 0 ? (
                currentReturns.map((ret, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-sm">
                      {truncateLabel(ret.product, 30)}
                    </TableCell>
                    <TableCell className="text-center text-sm font-bold text-gray-900">
                      {ret.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs border border-red-100 font-medium">
                        {ret.reason}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground text-sm py-8"
                  >
                    No returns recorded.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {returnHistory.length > DETAIL_ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between pt-4 mt-auto border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRetPage((p) => Math.max(1, p - 1))}
                disabled={retPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-gray-500">
                Page {retPage} of {totalRetPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setRetPage((p) => Math.min(totalRetPages, p + 1))
                }
                disabled={retPage === totalRetPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ------------------ Main Component ------------------
export default function SupervisorDashboard() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SupervisorData | null>(null);
  const [selectedSalesman, setSelectedSalesman] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [coveragePage, setCoveragePage] = useState(1);

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
    async function fetchData() {
      setLoading(true);
      setErrorMsg(null);
      setCurrentPage(1);
      setCoveragePage(1);
      try {
        const query = new URLSearchParams({
          fromDate: format(date.from!, "yyyy-MM-dd"),
          toDate: format(date.to!, "yyyy-MM-dd"),
          salesmanId: selectedSalesman,
        });
        const res = await fetch(`/api/sales/supervisor?${query.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch data");
        const json = await res.json();
        if (json.success)
          setData({
            ...json.data,
            topProducts: json.data.topProducts || [],
            topSuppliers: json.data.topSuppliers || [],
            returnHistory: json.data.returnHistory || [],
          });
        else setErrorMsg(json.error || "Unknown error occurred");
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [date, selectedSalesman]);

  const activeSalesmanData =
    selectedSalesman === "all"
      ? null
      : data?.salesmen?.find((s) => s.id === selectedSalesman);
  const currentAttainmentValue = activeSalesmanData
    ? activeSalesmanData.target > 0
      ? (activeSalesmanData.netSales / activeSalesmanData.target) * 100
      : 0
    : data && data.teamTarget > 0
    ? (data.teamSales / data.teamTarget) * 100
    : 0;
  const salesmanList = data?.salesmen || [];
  const totalPages = Math.ceil(salesmanList.length / ITEMS_PER_PAGE);
  const paginatedSalesmen = salesmanList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Pagination for Coverage
  const coverageData = data?.coverageDistribution || [];
  const totalCoveragePages = Math.ceil(
    coverageData.length / COVERAGE_ITEMS_PER_PAGE
  );
  const paginatedCoverage = coverageData.slice(
    (coveragePage - 1) * COVERAGE_ITEMS_PER_PAGE,
    coveragePage * COVERAGE_ITEMS_PER_PAGE
  );

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Supervisor Dashboard
        </h1>
        <p className="text-muted-foreground">
          {activeSalesmanData
            ? `Detailed analysis: ${activeSalesmanData.name}`
            : "Team Performance Overview"}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white p-4 rounded-xl border shadow-sm transition-all duration-300">
        <div
          className={
            timePeriod === "custom" ? "md:col-span-3" : "md:col-span-6"
          }
        >
          <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">
            Salesman
          </label>
          <Select value={selectedSalesman} onValueChange={setSelectedSalesman}>
            <SelectTrigger className="w-full h-12">
              <SelectValue placeholder="Select Salesman" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Salesmen (Team View)</SelectItem>
              {salesmanList.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
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
          <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">
            Time Period
          </label>
          <Select value={timePeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-full h-12">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {timePeriod === "custom" && (
          <div className="md:col-span-6 animate-in fade-in slide-in-from-left-4 duration-300">
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">
              Custom Date Range
            </label>
            <DatePickerWithRange
              className="w-full"
              date={date}
              setDate={handleDateSelect}
            />
          </div>
        )}
      </div>

      {loading && (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">Loading supervisor data...</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-600 rounded border border-red-200">
          Error: {errorMsg}
        </div>
      )}

      {!loading && data && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title={activeSalesmanData ? "Salesman Sales" : "Team Net Sales"}
              value={
                activeSalesmanData
                  ? activeSalesmanData.netSales
                  : data.teamSales
              }
              formatValue={formatCurrency}
              icon={DollarSign}
              subtitle="Total Revenue"
            />
            <KPICard
              title="Target"
              value={
                activeSalesmanData ? activeSalesmanData.target : data.teamTarget
              }
              formatValue={formatCurrency}
              icon={Target}
              subtitle="Assigned Goal"
            />
            <Card>
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {activeSalesmanData ? "Attainment" : "Team Attainment"}
                    </p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">
                      {data.teamTarget > 0
                        ? `${currentAttainmentValue.toFixed(1)}%`
                        : "N/A"}
                    </h3>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Percent className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end">
                  {data.teamTarget > 0 ? (
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${
                        currentAttainmentValue >= 100
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {currentAttainmentValue >= 100
                        ? "On Track"
                        : "Below Target"}
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                      No Target Data
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
            <KPICard
              title={activeSalesmanData ? "Strike Rate" : "Penetration Rate"}
              value={
                activeSalesmanData
                  ? `${activeSalesmanData.strikeRate}%`
                  : `${data.penetrationRate}%`
              }
              icon={activeSalesmanData ? TrendingUp : MapPin}
              subtitle={activeSalesmanData ? "Orders / Visits" : "Coverage"}
            />
          </div>

          {!activeSalesmanData ? (
            <div className="space-y-6">
              {/* 1. SALESMAN TABLE */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" /> Salesman
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold text-gray-600">
                          Salesman
                        </TableHead>
                        <TableHead className="text-right font-semibold text-gray-600">
                          Net Sales
                        </TableHead>
                        <TableHead className="text-center font-semibold text-gray-600">
                          Attainment
                        </TableHead>
                        <TableHead className="hidden md:table-cell font-semibold text-gray-600">
                          Top Product
                        </TableHead>
                        <TableHead className="text-center font-semibold text-gray-600">
                          Top Supplier
                        </TableHead>
                        <TableHead className="text-center font-semibold text-gray-600">
                          Return Rate
                        </TableHead>
                        <TableHead className="text-center font-semibold text-gray-600">
                          Strike Rate
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSalesmen.map((agent) => {
                        const attain =
                          agent.target > 0
                            ? (agent.netSales / agent.target) * 100
                            : 0;
                        return (
                          <TableRow
                            key={agent.id}
                            className="cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0"
                            onClick={() => setSelectedSalesman(agent.id)}
                          >
                            <TableCell className="font-medium text-gray-900">
                              {agent.name}
                            </TableCell>
                            <TableCell className="text-right font-bold text-gray-900">
                              {formatCurrency(agent.netSales)}
                            </TableCell>
                            <TableCell className="text-center">
                              {agent.target > 0 ? (
                                <span
                                  className={`px-2 py-1 rounded text-xs font-bold ${
                                    attain >= 100
                                      ? "bg-green-100 text-green-700"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {attain.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  N/A
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-gray-500">
                              {truncateLabel(agent.topProduct, 20)}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-gray-500">
                              <div className="flex items-center gap-1 justify-center">
                                <Truck className="w-3 h-3 text-gray-400" />{" "}
                                {truncateLabel(agent.topSupplier, 10)}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`text-xs font-bold ${
                                  agent.returnRate > 2
                                    ? "text-red-600"
                                    : "text-green-600"
                                }`}
                              >
                                {agent.returnRate}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-sm font-medium text-gray-700">
                              {agent.strikeRate > 0
                                ? `${agent.strikeRate}%`
                                : "N/A"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {salesmanList.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between py-4 border-t mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                      </Button>
                      <span className="text-sm text-gray-500">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                      >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 2. STORE COVERAGE (FIXED LAYOUT - 5 ITEMS) */}
              <Card className="flex flex-col shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-blue-600" /> Store Coverage
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-[400px]">
                  <div className="flex flex-col sm:flex-row h-full items-center">
                    {/* Chart */}
                    <div className="w-full sm:w-1/2 h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={coverageData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={0}
                            dataKey="count"
                            nameKey="type"
                            stroke="none"
                          >
                            {coverageData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  COVERAGE_COLORS[
                                    index % COVERAGE_COLORS.length
                                  ]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "none",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* PAGINATED LEGEND - FIXED WITH FLEX-1 */}
                    <div className="w-full sm:w-1/2 h-[350px] flex flex-col justify-between pl-6 border-l border-gray-100 py-2 pt-6">
                      {" "}
                      {/* Added pt-6 for alignment */}
                      <div className="flex flex-col h-full">
                        <h4 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">
                          Categories
                        </h4>

                        {/* Item List */}
                        <div className="flex-1 min-h-0 space-y-3">
                          {paginatedCoverage.map((entry, idx) => {
                            const globalIndex =
                              (coveragePage - 1) * COVERAGE_ITEMS_PER_PAGE +
                              idx;
                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-sm group hover:bg-gray-50 p-2 rounded-lg transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                                    style={{
                                      backgroundColor:
                                        COVERAGE_COLORS[
                                          globalIndex % COVERAGE_COLORS.length
                                        ],
                                    }}
                                  ></div>
                                  <span
                                    className="font-medium text-gray-700 truncate max-w-[200px]"
                                    title={entry.type}
                                  >
                                    {entry.type}
                                  </span>
                                </div>
                                <span className="font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full">
                                  {entry.count}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Pagination Controls */}
                        {coverageData.length > COVERAGE_ITEMS_PER_PAGE && (
                          <div className="flex items-center justify-between pt-4 border-t mt-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCoveragePage((p) => Math.max(1, p - 1))
                              }
                              disabled={coveragePage === 1}
                              className="h-8 px-2"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs text-gray-500">
                              Page {coveragePage} of {totalCoveragePages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCoveragePage((p) =>
                                  Math.min(totalCoveragePages, p + 1)
                                )
                              }
                              disabled={coveragePage === totalCoveragePages}
                              className="h-8 px-2"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. EFFICIENCY (FULL WIDTH) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" /> Efficiency
                    (Strike Rate)
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {paginatedSalesmen.some((s) => s.strikeRate > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={paginatedSalesmen}
                        layout="vertical"
                        margin={{ left: 10 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                          stroke="#f0f0f0"
                        />
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={120}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(val) => truncateLabel(val, 15)}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip cursor={{ fill: "transparent" }} />
                        <Bar
                          dataKey="strikeRate"
                          fill="#00000"
                          radius={[0, 4, 4, 0]}
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <TrendingUp className="h-8 w-8 mb-2 opacity-20" />
                      <span className="text-sm font-medium">
                        No efficiency data available
                      </span>
                      <span className="text-xs opacity-70">
                        Logs for store visits are missing in the database.
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <IndividualKPIs salesman={activeSalesmanData} />
              <IndividualChartsRow
                monthlyData={data.monthlyPerformance}
                productData={data.topProducts}
                supplierData={data.topSuppliers}
              />
              <DetailedTablesRow
                productData={data.topProducts}
                returnHistory={data.returnHistory}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
