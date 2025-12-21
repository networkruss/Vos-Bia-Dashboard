"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

// --- Types ---
interface InventoryMetric {
  velocityRate: number;
  status: "Healthy" | "Warning" | "Critical";
  totalOutflow: number;
  totalInflow: number;
}

interface BadStockMetric {
  accumulated: number;
  status: "Normal" | "High";
  totalInflow: number;
}

interface SalesData {
  name: string;
  value: number;
}

interface SalesmanPerformance {
  name: string;
  sales: number;
}

interface SupplierDetail {
  id: string;
  name: string;
  totalSales: number;
  salesmen: { name: string; amount: number; percent: number }[];
}

interface ParetoItem {
  name: string;
  value: number;
}

interface DashboardData {
  division: string;
  goodStock: InventoryMetric;
  badStock: BadStockMetric;
  trendData: Array<{
    date: string;
    goodStockOutflow: number;
    badStockInflow: number;
  }>;
  salesBySupplier?: SalesData[];
  salesBySalesman?: SalesmanPerformance[];
  supplierBreakdown?: SupplierDetail[];
  divisionBreakdown?: DashboardData[];
  pareto?: {
    products: ParetoItem[];
    customers: ParetoItem[];
  };
}

// --- COLORS ---
const PIE_COLORS = [
  "#2563eb", // Deep Blue
  "#3b82f6", // Standard Blue
  "#60a5fa", // Lighter Blue
  "#93c5fd", // Pale Blue
  "#bfdbfe", // Very Pale Blue
];

// Standard colors for other charts
const BAR_COLORS = ["#8b5cf6"];

const TABS = [
  "Overview",
  "Dry Goods",
  "Industrial",
  "Mama Pina's",
  "Frozen Goods",
];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/sales/manager?activeTab=${encodeURIComponent(activeTab)}`
        );
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`);
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Fetch Execution Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  const toggleSupplier = (id: string) => {
    setExpandedSupplier(expandedSupplier === id ? null : id);
  };

  const formatPHP = (val: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(val);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Inventory & Sales Manager
        </h1>
        <p className="text-gray-600">
          Tracking stock velocity, returns, and top drivers, Sales team
          performance and analytics
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium text-sm md:text-base transition-colors whitespace-nowrap border-b-2 ${
              activeTab === tab
                ? "text-blue-600 border-blue-600"
                : "text-gray-500 border-transparent hover:text-gray-800 hover:border-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl animate-pulse">
          <span className="text-gray-400">Loading metrics...</span>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Top Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <PackageCheck className="text-emerald-600 h-5 w-5" />
                    </div>
                    Good Stock Velocity
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Depletion rate of sellable inventory
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    data.goodStock.status === "Healthy"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {data.goodStock.status}
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {data.goodStock.velocityRate}%
                  </span>
                  <span className="text-sm text-emerald-600 font-medium mb-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" /> Movement Rate
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${data.goodStock.velocityRate}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    Outflow:{" "}
                    <span className="font-semibold text-gray-900">
                      {data.goodStock.totalOutflow.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    Throughput:{" "}
                    <span className="font-semibold text-gray-900">
                      {data.goodStock.totalInflow.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="text-red-600 h-5 w-5" />
                    </div>
                    Bad Stock Accumulation
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Volume moving to 'Bad' storage
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    data.badStock.status === "Normal"
                      ? "bg-gray-50 text-gray-600 border-gray-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  {data.badStock.status}
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {data.badStock.accumulated.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500 font-medium mb-1">
                    units
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    New Inflow:{" "}
                    <span className="font-semibold text-red-600">
                      +{data.badStock.totalInflow.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    Impact:{" "}
                    <span className="font-semibold text-gray-900">
                      {data.badStock.status === "High" ? "Critical" : "Stable"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- STOCK MOVEMENT CHART --- */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[320px]">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-blue-600" /> Stock Movement
              Trend
            </h3>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart
                data={data.trendData}
                margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f3f4f6"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend />

                {/* Good Stock: Solid Green Curve (Natural) */}
                <Line
                  type="natural"
                  dataKey="goodStockOutflow"
                  name="Good Stock (Out)"
                  stroke="#10b981"
                  strokeWidth={4}
                  dot={false}
                />

                {/* Bad Stock: Dotted Red Line (Monotone) */}
                <Line
                  type="monotone"
                  dataKey="badStockInflow"
                  name="Bad Stock (In)"
                  stroke="#ef4444"
                  strokeWidth={3}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* --- SALES PER SUPPLIER (PIE CHART WITH LEGEND) --- */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[350px]">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" /> Sales per Supplier
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.salesBySupplier}
                    innerRadius={60} // Donut style
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.salesBySupplier?.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatPHP(value)} />
                  {/* Legend brought back to the right side */}
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px", maxWidth: "40%" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* --- SALES PER SALESMAN (BAR CHART - SQUARE EDGES) --- */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[350px]">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" /> Sales per Salesman
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.salesBySalesman}
                  layout="vertical"
                  margin={{ left: 20 }}
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
                  {/* Blue Bars with Square Edges */}
                  <Bar
                    dataKey="sales"
                    fill="#3b82f6"
                    radius={[0, 0, 0, 0]} // Square edges
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Supplier Breakdown List */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                Detailed Supplier Breakdown
              </h3>
            </div>
            {data.supplierBreakdown?.map((supplier) => (
              <div
                key={supplier.id}
                className="border-b border-gray-100 last:border-0"
              >
                <button
                  onClick={() => toggleSupplier(supplier.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
                >
                  <span className="font-medium text-gray-700">
                    {supplier.name}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-900">
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
                  <div className="bg-gray-50/50 p-4 border-t border-gray-100">
                    <table className="w-full text-sm">
                      <tbody>
                        {supplier.salesmen.map((rep, idx) => (
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
          </div>

          {/* Pareto Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <ShoppingBag className="h-5 w-5 text-orange-500" />
                Pareto: Top 10 Products ({activeTab})
              </h3>
              <div className="space-y-3">
                {data.pareto?.products.slice(0, 10).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700 truncate w-2/3">
                      {idx + 1}. {item.name}
                    </span>
                    <span className="font-medium text-gray-900">
                      {formatPHP(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-yellow-500" />
                Pareto: Top 10 Customers ({activeTab})
              </h3>
              <div className="space-y-3">
                {data.pareto?.customers.slice(0, 10).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700 truncate w-2/3">
                      {idx + 1}. {item.name}
                    </span>
                    <span className="font-medium text-gray-900">
                      {formatPHP(item.value)}
                    </span>
                  </div>
                ))}
                {!data.pareto?.customers.length && (
                  <p className="text-gray-400 text-sm">
                    No sales data available.
                  </p>
                )}
              </div>
            </div>
          </div>

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
                  {data.divisionBreakdown.map((div, idx) => (
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
