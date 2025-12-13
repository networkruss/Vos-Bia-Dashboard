// src/app/bi/salesman/page.tsx
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
  isWithinInterval,
  parseISO,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, Percent, FileText, Users, CalendarClock, TrendingUp, Loader2, Trophy } from "lucide-react";
import { KPICard, formatCurrency } from "@/components/dashboard/KPICard";

// ------------------ Types ------------------
type PeriodPreset = "today" | "thisWeek" | "thisMonth" | "custom";

type KPIMetrics = {
  netSales: number;
  target: number;
  attainment: number;
  invoices: number;
};

type DailyChartData = {
  date: string;
  netSales: number;
  cumulativeSales: number;
  idealTarget: number;
};

type CustomerData = {
  customer: string;
  division: string;
  branch: string;
  netSales: number;
  invoices: number;
  lastInvoiceDate: string;
};

type DealData = {
  opportunity: string;
  customer: string;
  stage: string;
  expectedClose: string;
  nextAction: string;
  dueDate: string;
};

type SalesData = {
  dailySales: Array<{ date: string; netSales: number }>;
  topCustomers: CustomerData[];
  openDeals: DealData[];
  target: number;
  totalSales: number;
  totalInvoices: number;
};

// ------------------ PeriodSelector Component ------------------
const PeriodSelector = ({
  period,
  setPeriod,
  customRange,
  setCustomRange,
  dateRange,
}: {
  period: PeriodPreset;
  setPeriod: (p: PeriodPreset) => void;
  customRange: { from: string; to: string };
  setCustomRange: (r: { from: string; to: string }) => void;
  dateRange: { from: Date; to: Date };
}) => (
  <div className="flex flex-wrap items-center gap-4 mb-6">
    <label className="font-medium">Period:</label>
    <select
      value={period}
      onChange={(e) => setPeriod(e.target.value as PeriodPreset)}
      className="border rounded px-3 py-1 bg-background"
    >
      <option value="today">Today</option>
      <option value="thisWeek">This Week</option>
      <option value="thisMonth">This Month</option>
      <option value="custom">Custom Range</option>
    </select>

    {period === "custom" && (
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={customRange.from}
          onChange={(e) => setCustomRange({ ...customRange, from: e.target.value })}
          className="border rounded px-2 py-1"
        />
        <span>to</span>
        <input
          type="date"
          value={customRange.to}
          onChange={(e) => setCustomRange({ ...customRange, to: e.target.value })}
          className="border rounded px-2 py-1"
        />
      </div>
    )}

    <div className="text-sm text-muted-foreground">
      Showing: {format(dateRange.from, "MMM d")} – {format(dateRange.to, "MMM d, yyyy")}
    </div>
  </div>
);

// ------------------ Main Component ------------------
export default function SalesmanDashboard() {
  // Default to October 2025 where actual Directus data exists
  const [period, setPeriod] = useState<PeriodPreset>("custom");
  const [customRange, setCustomRange] = useState({
    from: "2025-10-01", // October has real data
    to: "2025-10-31",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<SalesData>({
    dailySales: [],
    topCustomers: [],
    openDeals: [],
    target: 0,
    totalSales: 0,
    totalInvoices: 0,
  });

  // Calculate date strings for API
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
  }, [period, customRange.from, customRange.to]);

  // Create dateRange for display
  const dateRange = useMemo(
    () => ({
      from: parseISO(fromDateStr),
      to: parseISO(toDateStr),
    }),
    [fromDateStr, toDateStr]
  );

  // Fetch data effect
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!isMounted) return;
      
      setLoading(true);
      setError(null);

      try {
        // Using salesman_id = 75 to match actual Directus data
        const salesmanId = "75";
        const url = `/api/sales/salesman?fromDate=${fromDateStr}&toDate=${toDateStr}&salesmanId=${salesmanId}`;
        
        console.log("Fetching from:", url);
        
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!isMounted) return;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!isMounted) return;

        console.log("API Response:", result);
        console.log("Debug info:", result.debug);

        if (result.success) {
          console.log("✅ Data loaded:", {
            totalSales: result.data.totalSales,
            totalInvoices: result.data.totalInvoices,
            topCustomers: result.data.topCustomers.length,
          });
          setSalesData(result.data);
        } else {
          const errorMsg = result.details || result.error || "Failed to load data";
          throw new Error(errorMsg);
        }
      } catch (err) {
        if (!isMounted) return;
        
        console.error("Fetch error:", err);
        const message = err instanceof Error ? err.message : "Failed to load dashboard data";
        setError(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [fromDateStr, toDateStr]);

  // Calculate KPI metrics
  const kpiData = useMemo((): KPIMetrics => {
    const { totalSales, target, totalInvoices } = salesData;
    return {
      netSales: totalSales,
      target,
      attainment: target > 0 ? Math.round((totalSales / target) * 1000) / 10 : 0,
      invoices: totalInvoices,
    };
  }, [salesData]);

  // Process chart data
  const chartData = useMemo((): DailyChartData[] => {
    if (period !== "thisMonth" || salesData.dailySales.length === 0) return [];

    const { dailySales, target } = salesData;
    let cumulativeSales = 0;
    const daysInMonth = Math.ceil(
      (endOfMonth(new Date()).getTime() - startOfMonth(new Date()).getTime()) / (1000 * 60 * 60 * 24)
    );

    return dailySales.map((day, index) => {
      cumulativeSales += day.netSales;
      const dayIndex = index + 1;
      const ideal = Math.round((target / daysInMonth) * dayIndex);

      return {
        date: format(parseISO(day.date), "MMM d"),
        netSales: day.netSales,
        cumulativeSales,
        idealTarget: ideal,
      };
    });
  }, [period, salesData]);

  // Loading state
  if (loading) {
    return (
      <div className="p-6 max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading dashboard data...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 max-w-screen-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-600 font-medium">Error</p>
            <p className="text-red-600 mt-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Sales Dashboard</h1>
        <p className="text-muted-foreground">Your performance and priorities</p>
      </div>

      <PeriodSelector
        period={period}
        setPeriod={setPeriod}
        customRange={customRange}
        setCustomRange={setCustomRange}
        dateRange={dateRange}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="My Sales (Net)"
          value={kpiData.netSales}
          formatValue={formatCurrency}
          icon={Percent}
          subtitle="This period"
        />
        <KPICard
          title="My Target"
          value={kpiData.target}
          formatValue={formatCurrency}
          icon={Percent}
          subtitle="Assigned goal"
        />
        <div>
          <KPICard
            title="Target Attainment"
            value={`${kpiData.attainment}%`}
            icon={Percent}
            subtitle=""
          />
          <p
            className={`text-center text-sm mt-1 ${
              kpiData.attainment >= 100 ? "text-green-600 font-medium" : "text-orange-500"
            }`}
          >
            {kpiData.attainment >= 100 ? "✅ Exceeded" : "⚠️ Behind"}
          </p>
        </div>
        <KPICard
          title="# Invoices"
          value={kpiData.invoices}
          icon={FileText}
          subtitle="This period"
        />
      </div>

      {/* Chart: My Sales vs Target (This Month) */}
      {period === "thisMonth" && chartData.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              My Sales vs Target (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(value as number),
                    name === "cumulativeSales"
                      ? "Cumulative Actual"
                      : name === "idealTarget"
                      ? "Ideal Target"
                      : "Daily Sales",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeSales"
                  name="Cumulative Actual"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="idealTarget"
                  name="Ideal Target"
                  stroke="#10b981"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Customers */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Top Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salesData.topCustomers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Division / Branch</TableHead>
                  <TableHead className="text-right">Net Sales</TableHead>
                  <TableHead className="text-center"># Invoices</TableHead>
                  <TableHead>Last Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.topCustomers.map((cust, idx) => {
                  const rank = idx + 1;
                  let trophyColor = "text-gray-400";
                  let rowBg = "";
                  
                  if (rank === 1) {
                    trophyColor = "text-yellow-500"; // Gold for #1 only
                    rowBg = "bg-yellow-50 hover:bg-yellow-100";
                  } else if (rank === 2) {
                    trophyColor = "text-gray-400"; // Silver for #2
                  } else if (rank === 3) {
                    trophyColor = "text-orange-400"; // Bronze for #3
                  }
                  
                  return (
                    <TableRow key={idx} className={rowBg}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Trophy className={`h-5 w-5 ${trophyColor}`} />
                          <span className="font-semibold">{rank}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{cust.customer}</TableCell>
                      <TableCell>
                        {cust.division} / {cust.branch}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(cust.netSales)}
                      </TableCell>
                      <TableCell className="text-center">{cust.invoices}</TableCell>
                      <TableCell>{format(parseISO(cust.lastInvoiceDate), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground italic">No customer data available for this period.</p>
          )}
        </CardContent>
      </Card>

      {/* Today's Focus / Open Deals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Today&apos;s Focus / Open Deals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salesData.openDeals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Expected Close</TableHead>
                  <TableHead>Next Action</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.openDeals.map((deal, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{deal.opportunity}</TableCell>
                    <TableCell>{deal.customer}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">
                        {deal.stage}
                      </span>
                    </TableCell>
                    <TableCell>{format(parseISO(deal.expectedClose), "MMM d")}</TableCell>
                    <TableCell>{deal.nextAction}</TableCell>
                    <TableCell>
                      <span
                        className={
                          isWithinInterval(parseISO(deal.dueDate), {
                            start: new Date(),
                            end: new Date(),
                          })
                            ? "text-red-600 font-medium"
                            : ""
                        }
                      >
                        {format(parseISO(deal.dueDate), "MMM d")}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground italic">No open deals or tasks at the moment.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}