"use client";

import { useState, useMemo, useEffect } from "react";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
} from "date-fns";
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
  DollarSign,
  Percent,
  Users,
  TrendingUp,
  Loader2,
  Target,
  Store,
  MapPin,
  ShoppingBag,
  Truck,
  ArrowDownRight,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { KPICard, formatCurrency } from "@/components/dashboard/KPICard";

// ------------------ Constants ------------------
const ITEMS_PER_PAGE = 10;

// ------------------ Types ------------------
type PeriodPreset = "today" | "thisWeek" | "thisMonth" | "custom";

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

type CoverageData = {
  type: string;
  count: number;
  fill: string;
};

type MonthlyPerformance = {
  month: string;
  target: number;
  achieved: number;
};

type ProductPerformance = {
  name: string;
  sales: number;
};

type SupplierPerformance = {
  name: string;
  sales: number;
};

type ReturnRecord = {
  product: string;
  quantity: number;
  reason: string;
};

type SupervisorData = {
  teamSales: number;
  teamTarget: number;
  totalInvoices: number;
  penetrationRate: number;
  salesmen: SalesmanStats[];
  coverageDistribution: CoverageData[];
  monthlyPerformance: MonthlyPerformance[];
  topProducts: ProductPerformance[];
  topSuppliers: SupplierPerformance[];
  returnHistory: ReturnRecord[];
};

// ------------------ Components ------------------

const PeriodAndSalesmanSelector = ({
  period,
  setPeriod,
  customRange,
  setCustomRange,
  dateRange,
  salesmen,
  selectedSalesman,
  setSelectedSalesman,
}: {
  period: PeriodPreset;
  setPeriod: (p: PeriodPreset) => void;
  customRange: { from: string; to: string };
  setCustomRange: (r: { from: string; to: string }) => void;
  dateRange: { from: Date; to: Date };
  salesmen: SalesmanStats[];
  selectedSalesman: string;
  setSelectedSalesman: (id: string) => void;
}) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-lg border shadow-sm">
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex flex-col">
        <label className="text-xs font-semibold text-gray-500 mb-1">
          Salesman
        </label>
        <select
          value={selectedSalesman}
          onChange={(e) => setSelectedSalesman(e.target.value)}
          className="border rounded px-3 py-2 bg-gray-50 min-w-[200px] font-medium"
        >
          <option value="all">All Salesmen (Team View)</option>
          {salesmen?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-semibold text-gray-500 mb-1">
          Period
        </label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodPreset)}
          className="border rounded px-3 py-2 bg-gray-50"
        >
          <option value="today">Today</option>
          <option value="thisWeek">This Week</option>
          <option value="thisMonth">This Month</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {period === "custom" && (
        <div className="flex items-end gap-2">
          <input
            type="date"
            value={customRange.from}
            onChange={(e) =>
              setCustomRange({ ...customRange, from: e.target.value })
            }
            className="border rounded px-2 py-2"
          />
          <span className="pb-2 text-gray-400">to</span>
          <input
            type="date"
            value={customRange.to}
            onChange={(e) =>
              setCustomRange({ ...customRange, to: e.target.value })
            }
            className="border rounded px-2 py-2"
          />
        </div>
      )}
    </div>

    <div className="text-right">
      <span className="text-xs text-gray-400 block uppercase tracking-wider">
        Date Range
      </span>
      <span className="text-sm font-medium text-gray-700">
        {format(dateRange.from, "MMM d, yyyy")} –{" "}
        {format(dateRange.to, "MMM d, yyyy")}
      </span>
    </div>
  </div>
);

// --- INDIVIDUAL VIEW COMPONENTS ---

const ProgressBar = ({ value, max }: { value: number; max: number }) => {
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
  const achievement =
    salesman.target > 0 ? (salesman.netSales / salesman.target) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-gray-500">
              Total Sales
            </span>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">
            {formatCurrency(salesman.netSales)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Current period</div>
        </CardContent>
      </Card>

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
              {achievement.toFixed(1)}%
            </span>
            {achievement < 100 && (
              <ArrowDownRight className="h-4 w-4 text-red-500 mb-1" />
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

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-gray-500">
              Products Sold
            </span>
            <Package className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">{salesman.productsSold}</div>
          <div className="text-xs text-gray-400 mt-1">Unique items</div>
        </CardContent>
      </Card>
    </div>
  );
};

const IndividualChartsRow = ({
  monthlyData = [],
  productData = [],
  supplierData = [],
}: {
  monthlyData?: MonthlyPerformance[];
  productData?: ProductPerformance[];
  supplierData?: SupplierPerformance[];
}) => {
  return (
    <div className="space-y-6 mb-6">
      {/* Target vs Achievement Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Target vs Achievement
          </CardTitle>
          <CardDescription>Monthly performance tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
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
                <Line
                  type="monotone"
                  dataKey="target"
                  name="Target"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: "#8b5cf6",
                    strokeWidth: 2,
                    stroke: "#fff",
                  }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="achieved"
                  name="Achieved"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: "#10b981",
                    strokeWidth: 2,
                    stroke: "#fff",
                  }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Product & Supplier Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Product (Horizontal Bar) */}
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
                    width={100}
                    tick={{ fontSize: 11, fill: "#666" }}
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
                    fill="#8b5cf6"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales by Supplier (Vertical Bar) */}
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
                    tick={{ fontSize: 11, fill: "#666" }}
                    dy={10}
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
                  {/* Vertical Bar Chart matching image_54abad.png */}
                  <Bar
                    dataKey="sales"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
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
  productData?: ProductPerformance[];
  returnHistory?: ReturnRecord[];
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Product Performance Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Product Performance Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[300px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productData && productData.length > 0 ? (
                  productData.map((prod, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-sm">
                        {prod.name}
                      </TableCell>
                      <TableCell className="text-right font-bold text-gray-700 text-sm">
                        {formatCurrency(prod.sales)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="text-center text-sm text-gray-500"
                    >
                      No product data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Return History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Return History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[300px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnHistory && returnHistory.length > 0 ? (
                  returnHistory.map((ret, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-sm">
                        {ret.product}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {ret.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs border">
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
                      No returns recorded for this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ------------------ Main Component ------------------
export default function SupervisorDashboard() {
  const [period, setPeriod] = useState<PeriodPreset>("thisMonth");
  const [customRange, setCustomRange] = useState({
    from: "2025-10-01",
    to: "2025-10-31",
  });
  const [selectedSalesman, setSelectedSalesman] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SupervisorData | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Date Logic
  const { fromDateStr, toDateStr } = useMemo(() => {
    const today = new Date();
    let from: Date;
    let to: Date;

    switch (period) {
      case "today":
        from = startOfDay(today);
        to = endOfDay(today);
        break;
      case "thisWeek":
        from = startOfWeek(today, { weekStartsOn: 1 });
        to = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case "thisMonth":
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case "custom":
        from = parseISO(customRange.from);
        to = parseISO(customRange.to);
        break;
      default:
        from = startOfMonth(today);
        to = endOfMonth(today);
    }
    return {
      fromDateStr: format(from, "yyyy-MM-dd"),
      toDateStr: format(to, "yyyy-MM-dd"),
    };
  }, [period, customRange]);

  const dateRange = useMemo(
    () => ({ from: parseISO(fromDateStr), to: parseISO(toDateStr) }),
    [fromDateStr, toDateStr]
  );

  // --- FETCH REAL DATA ---
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/sales/supervisor?fromDate=${fromDateStr}&toDate=${toDateStr}`
        );
        if (!res.ok) throw new Error("Failed to fetch data");
        const json = await res.json();

        if (json.success) {
          // Initialize mock data structure if API returns incomplete objects
          // This prevents undefined errors
          const enhancedData = {
            ...json.data,
            topProducts: json.data.topProducts || [
              { name: "Product Zeta", sales: 315275 },
              { name: "Product Delta", sales: 242063 },
              { name: "Product Alpha", sales: 239634 },
              { name: "Product Beta", sales: 179952 },
              { name: "Product Eta", sales: 160754 },
            ],
            topSuppliers: json.data.topSuppliers || [
              { name: "Supplier C", sales: 450000 },
              { name: "Supplier A", sales: 420000 },
              { name: "Supplier B", sales: 380000 },
            ],
            returnHistory: json.data.returnHistory || [
              {
                product: "Product Gamma",
                quantity: 2,
                reason: "Quality Issue",
              },
            ],
          };
          setData(enhancedData);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [fromDateStr, toDateStr]);

  if (loading || !data) {
    return (
      <div className="p-6 max-w-screen-2xl mx-auto flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading supervisor data...</span>
      </div>
    );
  }

  const teamAttainment =
    data.teamTarget > 0 ? (data.teamSales / data.teamTarget) * 100 : 0;
  const activeSalesmanData =
    selectedSalesman === "all"
      ? null
      : data.salesmen?.find((s) => s.id === selectedSalesman);

  // --- PAGINATION LOGIC ---
  const salesmanList = data.salesmen || [];
  const totalPages = Math.ceil(salesmanList.length / ITEMS_PER_PAGE);
  const paginatedSalesmen = salesmanList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="p-4 md:p-6 max-w-screen-2xl mx-auto space-y-6">
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

      <PeriodAndSalesmanSelector
        period={period}
        setPeriod={setPeriod}
        customRange={customRange}
        setCustomRange={setCustomRange}
        dateRange={dateRange}
        salesmen={salesmanList}
        selectedSalesman={selectedSalesman}
        setSelectedSalesman={setSelectedSalesman}
      />

      {/* INDIVIDUAL VIEW */}
      {activeSalesmanData ? (
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
      ) : (
        /* TEAM OVERVIEW */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Team Net Sales"
              value={data.teamSales}
              formatValue={formatCurrency}
              icon={DollarSign}
              subtitle="Total Revenue"
            />
            <KPICard
              title="Team Target"
              value={data.teamTarget}
              formatValue={formatCurrency}
              icon={Target}
              subtitle="Assigned Goal"
            />
            <div className="relative">
              <KPICard
                title="Team Attainment"
                value={`${teamAttainment.toFixed(1)}%`}
                icon={Percent}
                subtitle=""
              />
              <span
                className={`absolute bottom-4 right-4 text-xs font-bold ${
                  teamAttainment >= 100 ? "text-green-600" : "text-amber-500"
                }`}
              >
                {teamAttainment >= 100 ? "On Track" : "Below Target"}
              </span>
            </div>
            <KPICard
              title="Penetration Rate"
              value={`${data.penetrationRate}%`}
              icon={MapPin}
              subtitle="Area Coverage"
            />
          </div>

          {/* Salesman Table with PAGINATION */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Per Salesman Performance Overview
              </CardTitle>
              <CardDescription>
                Breakdown by Sales, Targets, Top drivers & Returns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Salesman</TableHead>
                      <TableHead className="text-right">Net Sales</TableHead>
                      <TableHead className="text-center">Attainment</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Top Product
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        Top Supplier
                      </TableHead>
                      <TableHead className="text-center">Return Rate</TableHead>
                      <TableHead className="text-center">Strike Rate</TableHead>
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
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => setSelectedSalesman(agent.id)}
                        >
                          <TableCell className="font-medium text-blue-600 hover:underline">
                            {agent.name}
                          </TableCell>
                          <TableCell className="text-right font-bold text-gray-700">
                            {formatCurrency(agent.netSales)}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`px-2 py-1 rounded text-xs font-bold ${
                                attain >= 100
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {attain.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3" />{" "}
                              {agent.topProduct}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Truck className="w-3 h-3" /> {agent.topSupplier}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`font-semibold ${
                                agent.returnRate > 2
                                  ? "text-red-500"
                                  : "text-green-600"
                              }`}
                            >
                              {agent.returnRate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {agent.strikeRate}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* PAGINATION CONTROLS */}
              {salesmanList.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                    {Math.min(
                      currentPage * ITEMS_PER_PAGE,
                      salesmanList.length
                    )}{" "}
                    of {salesmanList.length} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </button>
                    <span className="text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-emerald-600" />
                  Customer Coverage
                </CardTitle>
                <CardDescription>
                  Penetration rate: Sari-Sari vs Restaurants
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row items-center justify-between">
                <div className="w-full md:w-1/2 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.coverageDistribution}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {data.coverageDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-4">
                  <div className="space-y-2">
                    {data.coverageDistribution.map((item) => (
                      <div
                        key={item.type}
                        className="flex justify-between text-sm items-center border-b pb-1"
                      >
                        <span className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.fill }}
                          ></div>
                          {item.type}
                        </span>
                        <span className="font-semibold">
                          {item.count} stores
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Efficiency: Strike Rate
                </CardTitle>
                <CardDescription>Orders divided by Visits (%)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={paginatedSalesmen}
                      layout="vertical"
                      margin={{ left: 20, right: 30 }}
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
                        width={100}
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "transparent" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white p-2 border shadow-sm rounded text-xs">
                                <p className="font-bold">{d.name}</p>
                                <p className="text-purple-600 font-bold">
                                  Strike Rate: {d.strikeRate}%
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="strikeRate"
                        fill="#8b5cf6"
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
