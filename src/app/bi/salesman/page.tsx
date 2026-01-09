"use client";

import { useState, useEffect } from "react";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  ShoppingCart,
  DollarSign,
  Package,
  RefreshCcw,
  TrendingUp,
} from "lucide-react";
import { KPICard, formatCurrency } from "@/components/dashboard/KPICard";

// --- Types ---
type Salesman = {
  id: number;
  name: string;
};

type Order = {
  id: string;
  date: string;
  status: "Pending" | "Shipped" | "Delivered";
  amount: number;
};

type SKUPerformance = {
  product: string;
  target: number;
  achieved: number;
  gap: number;
  gapPercent: number;
  status: "Behind" | "On Track" | "At Risk";
};

type ReturnRecord = {
  id: string;
  product: string;
  date: string;
  quantity: number;
  reason: string;
};

type SupplierSales = {
  name: string;
  value: number;
};

type TopProduct = {
  name: string;
  value: number;
  quantity: number;
};

type DashboardData = {
  salesmanName: string;
  kpi: {
    totalOrders: number;
    orderValue: number;
    pendingOrders: number;
    returns: number;
  };
  orders: Order[];
  target: {
    total: number;
    achieved: number;
    gap: number;
    percent: number;
  };
  trend: Array<{ month: string; target: number; achieved: number }>;
  skuPerformance: SKUPerformance[];
  topProducts: TopProduct[];
  supplierSales: SupplierSales[];
  returnHistory: ReturnRecord[];
};

// --- Components ---

const GapVisualizer = ({ gap, percent }: { gap: number; percent: number }) => {
  const visualWidth = Math.min(Math.abs(percent), 100);
  const isPositiveGap = gap > 0;

  return (
    <div className="flex items-center gap-2 w-32">
      <span className="text-xs font-medium w-16 text-right dark:text-gray-300">
        {formatCurrency(gap)}
      </span>
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${
            isPositiveGap ? "bg-black dark:bg-white" : "bg-green-500"
          } rounded-full`}
          style={{ width: `${visualWidth}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-8">
        {percent}%
      </span>
    </div>
  );
};

export default function SalesmanDashboard() {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [selectedSalesman, setSelectedSalesman] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  // Initial Load: Fetch Salesmen List
  useEffect(() => {
    async function fetchSalesmen() {
      try {
        const res = await fetch("/api/sales/salesman?type=salesmen");
        const json = await res.json();

        if (json.data && Array.isArray(json.data)) {
          setSalesmen(json.data);

          if (json.data.length > 0) {
            const firstId = json.data[0].id;
            if (firstId !== undefined && firstId !== null) {
              setSelectedSalesman(String(firstId));
            }
          }
        }
      } catch (e) {
        console.error("Failed to load salesmen", e);
      }
    }
    fetchSalesmen();
  }, []);

  // Fetch Dashboard Data
  useEffect(() => {
    if (!selectedSalesman) return;

    async function fetchDashboard() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/sales/salesman?type=dashboard&salesmanId=${selectedSalesman}`
        );
        const json = await res.json();

        if (json.data) {
          const rawProducts = json.data.topProducts || [];
          const processedProducts: TopProduct[] = rawProducts.map((p: any) => ({
            name: p.name,
            value: p.value,
            quantity:
              p.quantity || Math.floor(p.value / (Math.random() * 500 + 100)),
          }));

          const fullData: DashboardData = {
            ...json.data,
            topProducts: processedProducts,
            supplierSales: json.data.supplierSales || [],
            returnHistory: json.data.returnHistory || [],
          };
          setData(fullData);
        }
      } catch (e) {
        console.error("Failed to load dashboard", e);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [selectedSalesman]);

  if (loading || !data) {
    return (
      <div className="p-8 flex items-center justify-center h-screen text-gray-500 dark:text-gray-400 bg-gray-50/30 dark:bg-gray-900">
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="p-6 w-full mx-auto space-y-8 bg-gray-50/30 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Salesman Dashboard
          </h1>
          <p className="text-muted-foreground dark:text-gray-400">
            Personal sales performance and order tracking
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg border dark:border-gray-700 shadow-sm">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-2">
            Salesman:
          </span>
          <select
            value={selectedSalesman}
            onChange={(e) => setSelectedSalesman(e.target.value)}
            className="bg-gray-100 dark:bg-gray-900 border-none rounded-md px-3 py-1 text-sm font-medium focus:ring-0 cursor-pointer dark:text-white"
          >
            {salesmen.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Orders"
          value={data.kpi.totalOrders}
          icon={ShoppingCart}
          subtitle="All time"
        />
        <KPICard
          title="Order Value"
          value={data.kpi.orderValue}
          formatValue={formatCurrency}
          icon={DollarSign}
          subtitle="Total revenue"
        />
        <KPICard
          title="Pending Orders"
          value={data.kpi.pendingOrders}
          icon={Package}
          subtitle="Awaiting fulfillment"
        />
        <KPICard
          title="Returns"
          value={data.kpi.returns}
          icon={RefreshCcw}
          subtitle="Total returns"
        />
      </div>

      {/* SALES ORDER STATUS */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Sales Order Status</CardTitle>
          <CardDescription className="dark:text-gray-400">
            Recent order updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-gray-700">
                  <TableHead className="dark:text-gray-400">Order ID</TableHead>
                  <TableHead className="dark:text-gray-400">Date</TableHead>
                  <TableHead className="dark:text-gray-400">Status</TableHead>
                  <TableHead className="text-right dark:text-gray-400">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.orders.map((order) => (
                  <TableRow key={order.id} className="dark:border-gray-700">
                    <TableCell className="font-medium dark:text-gray-200">
                      {order.id}
                    </TableCell>
                    <TableCell className="dark:text-gray-300">
                      {order.date}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          order.status === "Delivered"
                            ? "bg-black text-white dark:bg-white dark:text-black"
                            : order.status === "Shipped"
                            ? "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                            : "bg-white text-gray-600 border-gray-200 dark:bg-transparent dark:text-gray-400 dark:border-gray-600"
                        }`}
                      >
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold dark:text-white">
                      {formatCurrency(order.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* TARGET TRACKING */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Performance Targets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Overall Target Bar */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 dark:bg-gray-900 dark:border-gray-700">
            <div className="flex justify-between text-sm mb-2">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Target</p>
                <p className="text-xl font-bold dark:text-white">
                  {formatCurrency(data.target.total)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Achieved</p>
                <p className="text-xl font-bold dark:text-white">
                  {formatCurrency(data.target.achieved)}
                </p>
              </div>
            </div>
            <div className="relative h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-black dark:bg-white rounded-full"
                style={{ width: `${Math.min(data.target.percent, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {data.target.percent}% of target achieved
            </p>
          </div>

          {/* Achievement Trend Chart */}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.trend}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fillAchieved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f0f0f0"
                  className="dark:stroke-gray-700"
                />
                <XAxis
                  dataKey="month"
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
                    backgroundColor: "#1f2937",
                    border: "none",
                    color: "#fff",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="achieved"
                  name="Achieved"
                  stroke="#3b82f6"
                  fill="url(#fillAchieved)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="target"
                  name="Target"
                  stroke="#000000"
                  fill="none"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  className="dark:stroke-gray-400"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* SALES BY PRODUCT & SUPPLIER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Product */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">Sales by Product</CardTitle>
            <CardDescription className="dark:text-gray-400">
              Top performing products
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* CSS Override for Bar Color in Dark Mode */}
            <div className="h-[350px] w-full [&_.recharts-bar-rectangle]:dark:fill-white">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.topProducts}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 70, bottom: 0 }}
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
                    width={120}
                    tick={{ fontSize: 12, fill: "#666" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      color: "#fff",
                    }}
                    formatter={(val: number) => formatCurrency(val)}
                  />
                  <Bar
                    dataKey="value"
                    fill="#000000"
                    radius={[0, 0, 0, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales by Supplier */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">Sales by Supplier</CardTitle>
            <CardDescription className="dark:text-gray-400">
              Supplier distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* CSS Override for Bar Color in Dark Mode */}
            <div className="h-[350px] w-full [&_.recharts-bar-rectangle]:dark:fill-white">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.supplierSales}
                  margin={{ top: 20, right: 20, left: 20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f0f0f0"
                    className="dark:stroke-gray-700"
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
                      backgroundColor: "#1f2937",
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      color: "#fff",
                    }}
                    formatter={(val: number) => formatCurrency(val)}
                  />
                  <Bar
                    dataKey="value"
                    fill="#000000"
                    radius={[0, 0, 0, 0]}
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
}
