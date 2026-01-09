"use client";

import { useState, useEffect } from "react";
import RealPivotAnalysis from "@/components/executive-v2/RealPivotAnalysis";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { KPICard, formatCurrency } from "@/components/dashboard/KPICard";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  UserCircle,
  RefreshCcw,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { DashboardFilters } from "@/types";

// --- MOCK USERS DATABASE ---
const USERS_DB = [
  {
    id: 1,
    name: "Juan (Dry Goods)",
    role: "Division Head",
    division: "Dry Goods",
  },
  {
    id: 2,
    name: "Pedro (Frozen)",
    role: "Division Head",
    division: "Frozen Goods",
  },
  {
    id: 3,
    name: "Maria (Industrial)",
    role: "Division Head",
    division: "Industrial",
  },
  {
    id: 4,
    name: "Elena (Mama Pina)",
    role: "Division Head",
    division: "Mama Pina's",
  },
  {
    id: 5,
    name: "Admin (Internal)",
    role: "Division Head",
    division: "Internal",
  },
];

export default function DivisionsHeadPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState(USERS_DB[0]);

  // Dynamic Date Initialization (Current Month)
  const [filters, setFilters] = useState<DashboardFilters>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const toLocalISO = (d: Date) => {
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().split("T")[0];
    };

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    return {
      fromDate: toLocalISO(firstDay),
      toDate: toLocalISO(lastDay),
      division: USERS_DB[0].division,
    };
  });

  const handleUserSwitch = (userId: string) => {
    const user = USERS_DB.find((u) => u.id === Number(userId));
    if (user) {
      setCurrentUser(user);
      setFilters((prev) => ({ ...prev, division: user.division }));
      setData(null);
    }
  };

  const fetchDashboardData = async () => {
    if (!filters.fromDate || !filters.toDate) return;

    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      query.set("fromDate", filters.fromDate);
      query.set("toDate", filters.toDate);
      query.set("division", currentUser.division);

      // --- CRITICAL FIX: Updated path to match your backend file location ---
      // Backend File: src/app/api/sales/divisionshead/route.ts
      const res = await fetch(`/api/sales/divisionshead?${query.toString()}`);

      if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown error");
        console.error("API Error Response:", {
          status: res.status,
          statusText: res.statusText,
          body: errorText,
        });
        throw new Error(`Server Error (${res.status}): ${res.statusText}`);
      }

      // Safe JSON parsing
      const json = await res.json();

      if (json.error) {
        throw new Error(json.error || "API returned an error");
      }

      setData(json);
    } catch (err: any) {
      console.error("Dashboard Fetch Error:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filters.division]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-300">
      <div className="w-full mx-auto space-y-6">
        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider dark:bg-blue-900/50 dark:text-blue-200">
                {currentUser.role} View
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">
              {currentUser.division} Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Performance report for{" "}
              <strong className="text-gray-900 dark:text-white font-bold">
                {currentUser.name}
              </strong>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-xs text-gray-400 uppercase font-semibold">
              Simulate Login As:
            </span>
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600">
              <UserCircle className="w-5 h-5 text-gray-500 dark:text-gray-200" />
              <select
                className="bg-transparent border-none text-sm font-bold text-gray-900 dark:text-white focus:ring-0 cursor-pointer outline-none min-w-[150px]"
                value={currentUser.id}
                onChange={(e) => handleUserSwitch(e.target.value)}
              >
                {USERS_DB.map((user) => (
                  <option key={user.id} value={user.id} className="text-black">
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* --- ERROR ALERT (Standard Div) --- */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <h5 className="font-medium leading-none tracking-tight mb-1">
                Error Loading Data
              </h5>
              <div className="text-sm opacity-90">
                {error}. Please check your connection or try refreshing.
              </div>
            </div>
          </div>
        )}

        {/* --- CENTRALIZED DATE PICKER --- */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              From
            </label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) =>
                setFilters({ ...filters, fromDate: e.target.value })
              }
              className="h-9 px-3 py-1 rounded-md border text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              To
            </label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) =>
                setFilters({ ...filters, toDate: e.target.value })
              }
              className="h-9 px-3 py-1 rounded-md border text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white"
            />
          </div>

          <Button
            onClick={fetchDashboardData}
            disabled={loading}
            className="mb-[1px]"
          >
            {loading ? (
              <RefreshCcw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCcw className="w-4 h-4 mr-2" />
            )}
            Refresh Data
          </Button>
        </div>

        {/* --- MAIN CONTENT --- */}
        {loading ? (
          <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-black dark:border-gray-600 dark:border-t-white"></div>
            <p className="text-sm font-medium text-gray-500 animate-pulse dark:text-gray-400">
              Loading sales data...
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {/* 1. STRATEGIC KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPICard
                title="Net Sales"
                value={formatCurrency(data?.kpi?.totalNetSales || 0)}
                icon={TrendingUp}
                subtitle={`Total Sales for ${currentUser.division}`}
              />
              <KPICard
                title="Total Returns"
                value={formatCurrency(data?.kpi?.totalReturns || 0)}
                icon={Package}
                subtitle="Value of Returned Items"
                className="text-red-600 dark:text-red-400"
              />
              <KPICard
                title="Top Product"
                value={data?.topProducts?.[0]?.name || "N/A"}
                icon={ShoppingCart}
                subtitle={
                  data?.topProducts?.[0]
                    ? `${data.topProducts[0].quantity} Units Sold`
                    : "0 Units Sold"
                }
              />
            </div>

            {/* 2. CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SALES TREND */}
              <Card className="shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="dark:text-white">Sales Trend</CardTitle>
                  <CardDescription className="dark:text-gray-400">
                    Daily performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data?.salesTrend || []}>
                        <defs>
                          <linearGradient
                            id="colorSales"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#3b82f6"
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3b82f6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          className="dark:stroke-gray-700"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          className="dark:text-gray-400"
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          className="dark:text-gray-400"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "none",
                            color: "#fff",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="netSales"
                          stroke="#3b82f6"
                          fillOpacity={1}
                          fill="url(#colorSales)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* TOP SUPPLIERS (Bar Chart) */}
              <Card className="shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="dark:text-white">
                    Top Suppliers
                  </CardTitle>
                  <CardDescription className="dark:text-gray-400">
                    Contributors to {currentUser.division}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full [&_.recharts-bar-rectangle]:dark:fill-white">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={data?.topSuppliers || []}
                        margin={{ left: 40, right: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                          className="dark:stroke-gray-700"
                        />
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={120}
                          tick={{ fontSize: 11 }}
                          className="dark:text-gray-400"
                        />
                        <Tooltip
                          cursor={{ fill: "transparent" }}
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "none",
                            color: "#fff",
                          }}
                        />
                        <Bar
                          dataKey="value"
                          fill="#000000"
                          radius={[0, 4, 4, 0]}
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 3. TOP PRODUCTS TABLE */}
            <Card className="shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-white">
                  Top 10 Products ({currentUser.division})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:border-gray-700">
                      <TableHead className="dark:text-gray-400">
                        Product Name
                      </TableHead>
                      <TableHead className="text-right dark:text-gray-400">
                        Qty Sold
                      </TableHead>
                      <TableHead className="text-right dark:text-gray-400">
                        Total Sales
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.topProducts?.length > 0 ? (
                      data.topProducts.map((prod: any, i: number) => (
                        <TableRow key={i} className="dark:border-gray-700">
                          <TableCell className="font-medium dark:text-gray-200">
                            {prod.name}
                          </TableCell>
                          <TableCell className="text-right dark:text-gray-300">
                            {prod.quantity}
                          </TableCell>
                          <TableCell className="text-right font-bold dark:text-white">
                            {formatCurrency(prod.value)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center py-4 text-gray-500"
                        >
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* 4. AD-HOC PIVOT TOOL */}
            <div className="pt-6 border-t dark:border-gray-700">
              <h2 className="text-xl font-bold mb-4 dark:text-white">
                Ad-Hoc Pivot Analysis
              </h2>
              <Card className="shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
                <CardContent className="p-0">
                  <div className="dark:text-gray-200 h-[calc(100vh-220px)] min-h-[600px] w-full">
                    <RealPivotAnalysis
                      key={`${currentUser.division}-${filters.fromDate}-${filters.toDate}`}
                      lockedDivision={currentUser.division}
                      fromDate={filters.fromDate}
                      toDate={filters.toDate}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
