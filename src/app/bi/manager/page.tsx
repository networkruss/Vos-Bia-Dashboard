"use client";

import { useState, useEffect } from "react";
import { KPICard, formatNumber } from "@/components/dashboard/KPICard";
import { Bar, Line } from "react-chartjs-2";
import {
  BarChart,
  XAxis,
  YAxis,
  Bar as RechartsBar,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ChartTooltip,
  Legend
);

const ChartSkeleton = () => (
  <div className="flex items-center justify-center w-full h-48 bg-gray-100 rounded-lg animate-pulse">
    <span className="text-gray-400 text-sm">Loading chart...</span>
  </div>
);

const formatPHP = (value: number): string => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

type Tab = "overview" | "division" | "customers" | "salesman" | "summary";

interface DashboardData {
  kpi: {
    totalSales: number;
    newClients: number;
    retentionRate: number;
    teamPerformance: number;
  };
  salesTrend: {
    labels: string[];
    values: number[];
  };
  departmentSales: {
    labels: string[];
    values: number[];
  };
  topEmployees: Array<{
    name: string;
    sales: number;
    rank: number;
    performance: number;
  }>;
  customers: {
    growth: {
      labels: string[];
      growth: number[];
    };
    topCustomers: Array<{
      name: string;
      revenue: number;
    }>;
    retention: number;
    churn: number;
    activeCount: number;
  };
  summary: {
    insights: {
      salesGrowth: { value: number; label: string; status: string };
      clientGrowth: { value: number; label: string; status: string };
      divisionPerformance: { value: number; label: string; status: string };
      topPerformer: {
        name: string;
        value: number;
        label: string;
        status: string;
      };
    };
    recentTrends: string[];
    recommendedActions: string[];
  };
}

export default function ManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/sales/manager");

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {(
          ["overview", "division", "customers", "salesman", "summary"] as Tab[]
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-medium text-sm md:text-base transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab === "salesman"
              ? "Salespeople"
              : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? (
                <>
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl shadow-sm p-4 h-32 animate-pulse"
                    />
                  ))}
                </>
              ) : data ? (
                <>
                  <KPICard
                    title="Total Sales"
                    value={data.kpi.totalSales}
                    formatValue={formatPHP}
                  />
                  <KPICard
                    title="New Clients"
                    value={data.kpi.newClients}
                    formatValue={formatNumber}
                  />
                  <KPICard
                    title="Retention Rate"
                    value={data.kpi.retentionRate}
                    subtitle="Customer Retention"
                    formatValue={(v) => `${v}%`}
                  />
                  <KPICard
                    title="Team Performance"
                    value={data.kpi.teamPerformance}
                    subtitle="Target Achievement"
                    formatValue={(v) => `${v}%`}
                  />
                </>
              ) : null}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                  Sales Trend
                </h2>
                <div className="h-48">
                  {loading || !data ? (
                    <ChartSkeleton />
                  ) : (
                    <Line
                      data={{
                        labels: data.salesTrend.labels,
                        datasets: [
                          {
                            label: "Sales",
                            data: data.salesTrend.values,
                            borderColor: "#6b7280",
                            backgroundColor: (context) => {
                              const ctx = context.chart.ctx;
                              const gradient = ctx.createLinearGradient(
                                0,
                                0,
                                0,
                                200
                              );
                              gradient.addColorStop(
                                0,
                                "rgba(107, 114, 128, 0.4)"
                              );
                              gradient.addColorStop(
                                0.5,
                                "rgba(107, 114, 128, 0.2)"
                              );
                              gradient.addColorStop(
                                1,
                                "rgba(107, 114, 128, 0.05)"
                              );
                              return gradient;
                            },
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 5,
                            pointBackgroundColor: "#374151",
                            pointBorderColor: "#fff",
                            pointBorderWidth: 2,
                            pointHoverRadius: 7,
                            pointHoverBackgroundColor: "#374151",
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: "rgba(0, 0, 0, 0.9)",
                            padding: 12,
                            titleColor: "#fff",
                            bodyColor: "#fff",
                            borderColor: "#6b7280",
                            borderWidth: 1,
                            displayColors: true,
                            callbacks: {
                              label: (context) => {
                                return ` ${formatPHP(context.parsed.y || 0)}`;
                              },
                            },
                          },
                        },
                        scales: {
                          x: {
                            grid: {
                              display: false,
                            },
                            ticks: {
                              color: "#9ca3af",
                              font: { size: 11 },
                            },
                          },
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: "rgba(156, 163, 175, 0.1)",
                            },
                            ticks: {
                              callback: (v) =>
                                `₱${((v as number) / 1000).toFixed(0)}K`,
                              color: "#9ca3af",
                              font: { size: 11 },
                            },
                          },
                        },
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                  Sales by Division
                </h2>
                <div className="h-48">
                  {loading || !data ? (
                    <ChartSkeleton />
                  ) : (
                    <Bar
                      data={{
                        labels: data.departmentSales.labels,
                        datasets: [
                          {
                            label: "Division Sales",
                            data: data.departmentSales.values,
                            backgroundColor: [
                              "#3b82f6",
                              "#8b5cf6",
                              "#ec4899",
                              "#f59e0b",
                            ],
                            borderRadius: 8,
                            borderSkipped: false,
                            barPercentage: 0.7,
                            categoryPercentage: 0.8,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            padding: 12,
                            titleColor: "#fff",
                            bodyColor: "#fff",
                            callbacks: {
                              label: (context) => {
                                const value = context.parsed.y ?? 0;
                                return ` ${formatPHP(value)}`;
                              },
                            },
                          },
                        },
                        scales: {
                          x: {
                            grid: { display: false },
                            ticks: { color: "#6b7280" },
                          },
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: "rgba(0, 0, 0, 0.05)",
                            },
                            ticks: {
                              callback: (v) =>
                                `₱${((v as number) / 1000).toFixed(0)}K`,
                              color: "#6b7280",
                            },
                          },
                        },
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Top Performing Employees
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="py-2 px-3 font-medium">Rank</th>
                      <th className="py-2 px-3 font-medium">Name</th>
                      <th className="py-2 px-3 font-medium">Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading || !data ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-4 text-center text-gray-400"
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : (
                      data.topEmployees.map((emp) => (
                        <tr key={emp.rank} className="hover:bg-gray-50">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1">
                              {emp.rank === 1 ? (
                                <span className="text-2xl" title="Gold Trophy">
                                  🏆
                                </span>
                              ) : (
                                <span className="text-xl" title="Trophy">
                                  🏅
                                </span>
                              )}
                              <span
                                className={`font-bold ${
                                  emp.rank === 1
                                    ? "text-yellow-600 text-lg"
                                    : "text-gray-700"
                                }`}
                              >
                                {emp.rank}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3 font-medium text-gray-800">
                            {emp.name}
                          </td>
                          <td className="py-2 px-3 text-gray-700">
                            {formatPHP(emp.sales)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Division Tab */}
        {activeTab === "division" && (
          <div className="space-y-6">
            {loading || !data ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl shadow-sm p-4 h-32 animate-pulse"
                  />
                ))}
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <KPICard
                    title="Total Sales"
                    value={data.kpi.totalSales}
                    formatValue={formatPHP}
                  />
                  <KPICard
                    title="Divisions"
                    value={data.departmentSales.labels.length}
                    formatValue={formatNumber}
                  />
                  <KPICard
                    title="Avg per Division"
                    value={
                      data.kpi.totalSales /
                      (data.departmentSales.labels.length || 1)
                    }
                    formatValue={formatPHP}
                  />
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Sales by Division
                  </h2>
                  <div className="h-96">
                    <Bar
                      data={{
                        labels: data.departmentSales.labels,
                        datasets: [
                          {
                            label: "Division Sales",
                            data: data.departmentSales.values,
                            backgroundColor: [
                              "#3b82f6",
                              "#8b5cf6",
                              "#ec4899",
                              "#f59e0b",
                            ],
                            borderRadius: 12,
                            borderSkipped: false,
                            barPercentage: 0.65,
                            categoryPercentage: 0.85,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: "rgba(0, 0, 0, 0.9)",
                            padding: 12,
                            titleColor: "#fff",
                            bodyColor: "#fff",
                            displayColors: true,
                            callbacks: {
                              label: (context) => {
                                const value = context.parsed.y ?? 0;
                                return ` ${formatPHP(value)}`;
                              },
                            },
                          },
                        },
                        scales: {
                          x: {
                            grid: { display: false },
                            ticks: {
                              color: "#6b7280",
                              font: { size: 13, weight: '600' },
                            },
                          },
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: "rgba(156, 163, 175, 0.1)",
                            },
                            ticks: {
                              callback: (v) =>
                                `₱${((v as number) / 1000000).toFixed(0)}M`,
                              color: "#6b7280",
                              font: { size: 12 },
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-4">
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">
                    Division Performance Table
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="py-2 px-3 font-medium">Division</th>
                          <th className="py-2 px-3 font-medium">Net Sales</th>
                          <th className="py-2 px-3 font-medium">% of Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.departmentSales.labels.map((label, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium text-gray-800">
                              {label}
                            </td>
                            <td className="py-2 px-3 text-gray-700">
                              {formatPHP(data.departmentSales.values[idx])}
                            </td>
                            <td className="py-2 px-3 text-gray-700">
                              {data.kpi.totalSales > 0
                                ? (
                                    (data.departmentSales.values[idx] /
                                      data.kpi.totalSales) *
                                    100
                                  ).toFixed(1)
                                : "0.0"}
                              %
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === "customers" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {loading || !data ? (
                <>
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl shadow-sm p-4 h-32 animate-pulse"
                    />
                  ))}
                </>
              ) : (
                <>
                  <KPICard
                    title="Active Customers"
                    value={data.customers.activeCount}
                    formatValue={formatNumber}
                  />
                  <KPICard
                    title="Retention Rate"
                    value={data.customers.retention}
                    formatValue={(v) => `${v}%`}
                    subtitle="vs last quarter"
                  />
                  <KPICard
                    title="Churn Rate"
                    value={data.customers.churn}
                    formatValue={(v) => `${v}%`}
                    subtitle="At risk"
                  />
                </>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                  Customer Growth
                </h2>
                <div className="h-48">
                  {loading || !data ? (
                    <ChartSkeleton />
                  ) : (
                    <Line
                      data={{
                        labels: data.customers.growth.labels,
                        datasets: [
                          {
                            label: "New Customers",
                            data: data.customers.growth.growth,
                            borderColor: "#10b981",
                            backgroundColor: "rgba(16, 185, 129, 0.1)",
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          x: { grid: { display: false } },
                          y: { beginAtZero: true },
                        },
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                  Top Customers
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="py-2 px-3 font-medium">Customer</th>
                        <th className="py-2 px-3 font-medium">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loading || !data ? (
                        <tr>
                          <td
                            colSpan={2}
                            className="py-4 text-center text-gray-400"
                          >
                            Loading...
                          </td>
                        </tr>
                      ) : (
                        data.customers.topCustomers.map((c, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium text-gray-800">
                              {c.name}
                            </td>
                            <td className="py-2 px-3 text-gray-700">
                              {formatPHP(c.revenue)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Salespeople Tab */}
        {activeTab === "salesman" && data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KPICard
                title="Total Salespeople"
                value={data.topEmployees.length}
                formatValue={formatNumber}
              />
              <KPICard
                title="Avg. Performance"
                value={data.kpi.teamPerformance}
                formatValue={(v) => `${v}%`}
                subtitle="vs quota"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                  Performance by Rep
                </h2>
                <div className="h-80">
                  {loading ? (
                    <ChartSkeleton />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.topEmployees.slice(0, 5).map((emp) => ({
                          name: emp.name,
                          sales: emp.sales,
                        }))}
                        layout="vertical"
                        margin={{ left: 40, right: 30, top: 20, bottom: 20 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          axisLine={false}
                          tickLine={false}
                          width={120}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
                                  <p className="font-medium">
                                    {payload[0].payload.name}
                                  </p>
                                  <p className="text-blue-300">
                                    {formatPHP(payload[0].value as number)}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                          cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                        />
                        <RechartsBar dataKey="sales" radius={[0, 8, 8, 0]}>
                          {data.topEmployees.slice(0, 5).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="#3b82f6" />
                          ))}
                        </RechartsBar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                  Sales Leaderboard
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="py-2 px-3 font-medium">Rank</th>
                        <th className="py-2 px-3 font-medium">Salesperson</th>
                        <th className="py-2 px-3 font-medium">Sales</th>
                        <th className="py-2 px-3 font-medium">Performance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.topEmployees.map((emp) => (
                        <tr key={emp.rank} className="hover:bg-gray-50">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1">
                              {emp.rank === 1 ? (
                                <span className="text-2xl" title="Gold Trophy">
                                  🏆
                                </span>
                              ) : (
                                <span className="text-xl" title="Trophy">
                                  🏅
                                </span>
                              )}
                              <span
                                className={`font-bold ${
                                  emp.rank === 1
                                    ? "text-yellow-600 text-lg"
                                    : "text-blue-600"
                                }`}
                              >
                                #{emp.rank}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3 font-medium text-gray-800">
                            {emp.name}
                          </td>
                          <td className="py-2 px-3 text-gray-700">
                            {formatPHP(emp.sales)}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                                emp.performance >= 90
                                  ? "bg-green-100 text-green-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {emp.performance}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === "summary" && data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Total Sales"
                value={data.kpi.totalSales}
                formatValue={formatPHP}
              />
              <KPICard
                title="New Clients"
                value={data.kpi.newClients}
                formatValue={formatNumber}
              />
              <KPICard
                title="Team Avg"
                value={data.kpi.teamPerformance}
                formatValue={(v) => `${v}%`}
              />
              <KPICard
                title="Top Rep"
                value={data.summary.insights.topPerformer.name}
                formatValue={(v) => String(v)}
                subtitle={`${data.summary.insights.topPerformer.value}% performance`}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                  Key Insights (Real Data)
                </h2>
                <div className="space-y-2">
                  {Object.values(data.summary.insights).map((insight, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg flex items-start text-sm ${
                        insight.status === "good"
                          ? "bg-green-50 border-l-4 border-green-500"
                          : insight.status === "warning"
                          ? "bg-amber-50 border-l-4 border-amber-500"
                          : "bg-red-50 border-l-4 border-red-500"
                      }`}
                    >
                      <span className="mr-2 mt-0.5">
                        {insight.status === "good"
                          ? "✅"
                          : insight.status === "warning"
                          ? "⚠️"
                          : "❌"}
                      </span>
                      <span className="text-gray-700">{insight.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Recent Trends (Real Data)
                  </h3>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                    {data.summary.recentTrends.map((trend, i) => (
                      <li key={i}>{trend}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Recommended Actions (Dynamic)
                  </h3>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                    {data.summary.recommendedActions.length > 0 ? (
                      data.summary.recommendedActions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))
                    ) : (
                      <li>All metrics looking good! Keep up the great work.</li>
                    )}
                  </ul>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Data Refresh
                  </h3>
                  <button
                    onClick={fetchDashboardData}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Refreshing..." : "Refresh Data"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}