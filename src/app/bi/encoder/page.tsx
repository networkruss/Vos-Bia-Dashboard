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
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  ShoppingCart,
  DollarSign,
  Package,
  RefreshCcw,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
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
      <span className="text-xs font-medium w-16 text-right">
        {formatCurrency(gap)}
      </span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${
            isPositiveGap ? "bg-black" : "bg-green-500"
          } rounded-full`}
          style={{ width: `${visualWidth}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8">{percent}%</span>
    </div>
  );
};

export default function SalesmanDashboard() {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [selectedSalesman, setSelectedSalesman] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  // --- Pagination State ---
  const [returnPage, setReturnPage] = useState(1);
  const [productPage, setProductPage] = useState(1); // Added for Product pagination
  const itemsPerPage = 5;

  // Initial Load: Fetch Salesmen List
  useEffect(() => {
    async function fetchSalesmen() {
      try {
        const res = await fetch("/api/sales/encoder?type=salesmen");
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
      setReturnPage(1); // Reset pagination when salesman changes
      setProductPage(1); // Reset product pagination
      try {
        const res = await fetch(
          `/api/sales/encoder?type=dashboard&salesmanId=${selectedSalesman}`
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
            supplierSales: json.data.supplierSales || [
              { name: "Supplier C", value: 450000 },
              { name: "Supplier A", value: 420000 },
              { name: "Supplier B", value: 390000 },
              { name: "Supplier D", value: 230000 },
            ],
            returnHistory: json.data.returnHistory || [
              {
                id: "SR002",
                product: "Product Beta",
                date: "6/12/2025",
                quantity: 3,
                reason: "Wrong Item",
              },
              {
                id: "SR001",
                product: "Product Alpha",
                date: "6/10/2025",
                quantity: 5,
                reason: "Damaged",
              },
              {
                id: "SR003",
                product: "Product Gamma",
                date: "6/09/2025",
                quantity: 1,
                reason: "Defective",
              },
              {
                id: "SR004",
                product: "Product Delta",
                date: "6/08/2025",
                quantity: 2,
                reason: "Wrong Color",
              },
              {
                id: "SR005",
                product: "Product Epsilon",
                date: "6/07/2025",
                quantity: 10,
                reason: "Expired",
              },
              {
                id: "SR006",
                product: "Product Zeta",
                date: "6/06/2025",
                quantity: 4,
                reason: "Damaged",
              },
            ],
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

  // --- Pagination Logic: Returns ---
  const totalReturnPages = data
    ? Math.ceil(data.returnHistory.length / itemsPerPage)
    : 0;

  const currentReturns = data
    ? data.returnHistory.slice(
        (returnPage - 1) * itemsPerPage,
        returnPage * itemsPerPage
      )
    : [];

  const handleNextReturnPage = () => {
    if (returnPage < totalReturnPages) setReturnPage(returnPage + 1);
  };

  const handlePrevReturnPage = () => {
    if (returnPage > 1) setReturnPage(returnPage - 1);
  };

  // --- Pagination Logic: Products ---
  const totalProductPages = data
    ? Math.ceil(data.topProducts.length / itemsPerPage)
    : 0;

  const currentProducts = data
    ? data.topProducts.slice(
        (productPage - 1) * itemsPerPage,
        productPage * itemsPerPage
      )
    : [];

  const handleNextProductPage = () => {
    if (productPage < totalProductPages) setProductPage(productPage + 1);
  };

  const handlePrevProductPage = () => {
    if (productPage > 1) setProductPage(productPage - 1);
  };

  if (loading || !data) {
    return (
      <div className="p-8 flex items-center justify-center h-screen text-gray-500">
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8 bg-gray-50/30 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Salesman Dashboard
          </h1>
          <p className="text-muted-foreground">
            Personal sales performance and order tracking
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
          <span className="text-sm font-semibold text-gray-700 ml-2">
            Salesman:
          </span>
          <select
            value={selectedSalesman}
            onChange={(e) => setSelectedSalesman(e.target.value)}
            className="bg-gray-100 border-none rounded-md px-3 py-1 text-sm font-medium focus:ring-0 cursor-pointer"
          >
            {salesmen.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ROW 1: KPI CARDS */}
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

      {/* ROW 2: SALES ORDER STATUS */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Order Status Monitoring</CardTitle>
          <CardDescription>Track all your sales orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          order.status === "Delivered"
                            ? "bg-black text-white"
                            : order.status === "Shipped"
                            ? "bg-gray-100 text-gray-800 border-gray-200"
                            : "bg-white text-gray-600 border-gray-200"
                        }`}
                      >
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(order.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ROW 3: TARGET TRACKING */}
      <Card>
        <CardHeader>
          <CardTitle>Target Tracking</CardTitle>
          <CardDescription>
            Monitor your performance against targets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Overall Target Bar */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-black rounded-full text-white">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-lg">Overall Target</h3>
              <span className="ml-auto text-xs font-medium bg-gray-200 px-2 py-1 rounded">
                In Progress
              </span>
            </div>

            <div className="flex justify-between text-sm mb-2">
              <div>
                <p className="text-gray-500">Target</p>
                <p className="text-xl font-bold">
                  {formatCurrency(data.target.total)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Achieved</p>
                <p className="text-xl font-bold">
                  {formatCurrency(data.target.achieved)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-500">Gap to Goal</p>
                <p className="text-xl font-bold text-red-500 flex items-center justify-end gap-1">
                  {formatCurrency(data.target.gap)}{" "}
                  <TrendingUp className="h-4 w-4 rotate-180" />
                </p>
              </div>
            </div>

            <div className="relative h-4 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-black rounded-full"
                style={{ width: `${Math.min(data.target.percent, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {data.target.percent}% of target achieved
            </p>
          </div>

          {/* Achievement Trend */}
          <div>
            <h3 className="font-bold text-md mb-4">Target Achievement Trend</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.trend}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorAchieved"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#000000" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#000000"
                        stopOpacity={0.5}
                      />
                    </linearGradient>
                    <linearGradient
                      id="colorTarget"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#000000" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#000000"
                        stopOpacity={0.5}
                      />
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
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="target"
                    name="Target"
                    stroke="none"
                    fill="url(#colorTarget)"
                  />
                  <Area
                    type="monotone"
                    dataKey="achieved"
                    name="Achieved"
                    stroke="#333333"
                    strokeWidth={2}
                    fill="url(#colorAchieved)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tactical SKU Table */}
          <div>
            <h3 className="font-bold text-md mb-4">
              Tactical SKU Performance - Gap to Goal
            </h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right w-[150px]">
                      Target
                    </TableHead>
                    <TableHead className="text-right w-[150px]">
                      Achieved
                    </TableHead>
                    <TableHead className="w-[200px] pl-8">Gap</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.skuPerformance.map((sku, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {sku.product}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(sku.target)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(sku.achieved)}
                      </TableCell>
                      <TableCell className="pl-8">
                        <GapVisualizer gap={sku.gap} percent={sku.gapPercent} />
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                            sku.status === "Behind"
                              ? "bg-red-500"
                              : sku.status === "On Track"
                              ? "bg-black"
                              : "bg-yellow-500"
                          }`}
                        >
                          {sku.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ROW 4: SALES BY PRODUCT & SUPPLIER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Product */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Product</CardTitle>
            <CardDescription>Top performing products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
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
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    formatter={(val: number) => formatCurrency(val)}
                  />
                  <Bar
                    dataKey="value"
                    fill="#000000"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales by Supplier */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Supplier</CardTitle>
            <CardDescription>Supplier distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.supplierSales}
                  margin={{ top: 20, right: 20, left: 20, bottom: 0 }}
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
                  <Bar
                    dataKey="value"
                    fill="#000000"
                    radius={[4, 4, 0, 0]}
                    barSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 5: DETAILED TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Performance Details</CardTitle>
          </CardHeader>
          <CardContent>
            {/* UPDATED: Removed scroll container wrapper */}
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Sales Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Map over currentProducts instead of all data */}
                  {currentProducts.map((prod, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-sm">
                        {prod.name}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {prod.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-gray-700 text-sm">
                        {formatCurrency(prod.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls for Products */}
            {data.topProducts.length > 0 && (
              <div className="flex items-center justify-between mt-4 border-t pt-4">
                <button
                  onClick={handlePrevProductPage}
                  disabled={productPage === 1}
                  className="flex items-center gap-1 text-sm font-medium text-gray-600 disabled:opacity-50 hover:text-black transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {productPage} of {totalProductPages}
                </span>
                <button
                  onClick={handleNextProductPage}
                  disabled={productPage === totalProductPages}
                  className="flex items-center gap-1 text-sm font-medium text-gray-600 disabled:opacity-50 hover:text-black transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Return Monitoring</CardTitle>
            <CardDescription>Track product returns</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Removed scroll container wrapper */}
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Return ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-[100px] text-center">
                      Date
                    </TableHead>
                    <TableHead className="w-20 text-center">Qty</TableHead>
                    <TableHead className="text-right">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentReturns.length > 0 ? (
                    currentReturns.map((ret, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-xs">
                          {ret.id}
                        </TableCell>
                        <TableCell className="text-sm">{ret.product}</TableCell>
                        <TableCell className="text-sm text-center">
                          {ret.date}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {ret.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs border whitespace-nowrap">
                            {ret.reason}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-8"
                      >
                        No returns recorded.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls for Returns */}
            {data.returnHistory.length > 0 && (
              <div className="flex items-center justify-between mt-4 border-t pt-4">
                <button
                  onClick={handlePrevReturnPage}
                  disabled={returnPage === 1}
                  className="flex items-center gap-1 text-sm font-medium text-gray-600 disabled:opacity-50 hover:text-black transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {returnPage} of {totalReturnPages}
                </span>
                <button
                  onClick={handleNextReturnPage}
                  disabled={returnPage === totalReturnPages}
                  className="flex items-center gap-1 text-sm font-medium text-gray-600 disabled:opacity-50 hover:text-black transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
