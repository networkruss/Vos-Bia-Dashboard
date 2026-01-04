"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Area,
  AreaChart,
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
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
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
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KPICard, formatCurrency } from "@/components/dashboard/KPICard";
import type { DashboardFilters } from "@/types";
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

// ------------------ Constants & Types ------------------
const ITEMS_PER_PAGE = 10;
const DETAIL_ITEMS_PER_PAGE = 5;
const PIE_COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];

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

// --- Components ---

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
      {/* Target vs Achievement Area Chart */}
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
                  type="natural"
                  dataKey="target"
                  name="Target"
                  stroke="#000000"
                  fill="url(#fillTarget)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="natural"
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
    setProdPage(1);
    setRetPage(1);
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
      {/* Product Performance Table */}
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
                      {prod.name}
                    </TableCell>
                    {/* Bold Black Sales */}
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

      {/* Return History Table */}
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
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-right">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentReturns.length > 0 ? (
                currentReturns.map((ret, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-sm">
                      {ret.product}
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
                    No returns recorded for this period.
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

  const [filters, setFilters] = useState<DashboardFilters>({
    fromDate: "",
    toDate: "",
    division: "all",
  });

  const onFilterUpdate = useCallback((newFilters: DashboardFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    if (!filters.fromDate || !filters.toDate) return;

    async function fetchData() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const query = new URLSearchParams({
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          salesmanId: selectedSalesman,
        });

        const res = await fetch(`/api/sales/supervisor?${query.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch data");
        const json = await res.json();

        if (json.success) {
          const enhancedData = {
            ...json.data,
            topProducts: json.data.topProducts || [],
            topSuppliers: json.data.topSuppliers || [],
            returnHistory: json.data.returnHistory || [],
          };
          setData(enhancedData);
        } else {
          setErrorMsg(json.error || "Unknown error occurred");
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [filters.fromDate, filters.toDate, selectedSalesman]); // OPTIMIZED DEPENDENCY

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

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
      {/* HEADER SECTION */}
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

      {/* FILTER ROW */}
      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center">
        <div className="w-full xl:w-[280px]">
          <div className="bg-white p-1 rounded-lg border shadow-sm">
            <Select
              value={selectedSalesman}
              onValueChange={setSelectedSalesman}
            >
              <SelectTrigger className="w-full border-0 focus:ring-0 shadow-none h-auto py-2">
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
        </div>
        <div className="flex-1 w-full">
          <FilterBar onFilterChange={onFilterUpdate} branches={[]} />
        </div>
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
                      {currentAttainmentValue.toFixed(1)}%
                    </h3>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Percent className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end">
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
              {/* Salesman Performance Table */}
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
                              <span
                                className={`px-2 py-1 rounded text-xs font-bold ${
                                  attain >= 100
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {attain.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-gray-500">
                              {agent.topProduct}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-gray-500">
                              <div className="flex items-center gap-1 justify-center">
                                <Truck className="w-3 h-3 text-gray-400" />{" "}
                                {agent.topSupplier}
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
                              {agent.strikeRate}%
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

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="h-5 w-5 text-blue-600" /> Store Coverage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        data={data.coverageDistribution}
                      >
                        <PolarGrid gridType="circle" radialLines={false} />
                        <PolarAngleAxis dataKey="type" />
                        <Radar
                          name="Stores"
                          dataKey="count"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.6}
                          dot={{
                            r: 4,
                            fillOpacity: 1,
                          }}
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />{" "}
                      Efficiency (Strike Rate)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={paginatedSalesmen}
                        layout="vertical"
                        margin={{ left: 20 }}
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
                        <Tooltip cursor={{ fill: "transparent" }} />
                        <Bar
                          dataKey="strikeRate"
                          fill="#00000"
                          radius={[0, 4, 4, 0]}
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <IndividualKPIs salesman={activeSalesmanData} />
              <IndividualChartsRow
                monthlyData={data.monthlyPerformance}
                productData={data.topProducts}
                supplierData={data.topSuppliers}
              />

              {/* Data Tables */}
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
