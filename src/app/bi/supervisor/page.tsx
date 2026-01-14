"use client";

import { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  isSameDay,
} from "date-fns";
import {
  Users,
  Package,
  Truck,
  AlertCircle,
  Zap,
  CalendarCheck2,
  Filter,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function SupervisorDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize with "Today" instead of hardcoded December
  const [confirmedDate, setConfirmedDate] = useState<any>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  const [localDate, setLocalDate] = useState<any>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [confirmedDate]);

  const fetchData = async () => {
    if (!confirmedDate?.from || !confirmedDate?.to) return;
    setLoading(true);
    try {
      const fromStr = format(confirmedDate.from, "yyyy-MM-dd");
      const toStr = format(confirmedDate.to, "yyyy-MM-dd");

      // Fetching from updated API with date defaults
      const res = await fetch(
        `/api/sales/supervisor?fromDate=${fromStr}&toDate=${toStr}`
      );
      const json = await res.json();

      if (json.success) {
        setData(json.data);
      }
    } catch (err: any) {
      console.error("Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDate = () => {
    setConfirmedDate(localDate);
    setIsPopoverOpen(false);
  };

  const setQuickRange = (type: "today" | "week" | "month") => {
    const now = new Date();
    let range = { from: now, to: now };
    if (type === "today") range = { from: startOfDay(now), to: endOfDay(now) };
    else if (type === "week")
      range = { from: startOfWeek(now), to: endOfWeek(now) };
    else if (type === "month")
      range = { from: startOfMonth(now), to: endOfMonth(now) };

    setLocalDate(range);
    setConfirmedDate(range);
    setIsPopoverOpen(false);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-sans dark:bg-[#0a0c10]">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight uppercase italic dark:text-white">
              Supervisor
            </h1>
            <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/20">
              LEVEL
            </span>
          </div>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
            Field Performance & Operations Tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-14 px-6 gap-4 border-border/60 hover:bg-muted/50 rounded-2xl shadow-sm min-w-[240px]"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <Filter className="w-5 h-5 text-primary" />
                )}
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase text-muted-foreground leading-none mb-1">
                    {loading ? "Refreshing..." : "Active Filter"}
                  </p>
                  <p className="text-sm font-bold">
                    {isSameDay(confirmedDate.from, confirmedDate.to)
                      ? format(confirmedDate.from, "MMMM dd, yyyy")
                      : `${format(confirmedDate.from, "MMM dd")} - ${format(
                          confirmedDate.to,
                          "MMM dd, yyyy"
                        )}`}
                  </p>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 shadow-2xl border-border bg-card overflow-hidden rounded-[2rem]"
              align="end"
            >
              <div className="p-6 flex flex-col gap-6 bg-[#0f1117]">
                <div className="flex flex-col gap-3">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
                    Quick Presets
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {["today", "week", "month"].map((range) => (
                      <Button
                        key={range}
                        variant="secondary"
                        size="sm"
                        onClick={() => setQuickRange(range as any)}
                        className="text-[10px] font-black bg-white/5 hover:bg-white/10 border-white/5 rounded-xl h-10"
                      >
                        {range.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="bg-background/50 p-2 rounded-[1.5rem] border border-white/5">
                  <DatePickerWithRange
                    date={localDate}
                    setDate={setLocalDate}
                  />
                </div>
                <Button
                  onClick={handleApplyDate}
                  disabled={loading}
                  className="w-full h-12 gap-2 font-black uppercase italic rounded-xl shadow-lg shadow-primary/20"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CalendarCheck2 className="w-4 h-4" />
                  )}
                  Apply Selection
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[400px] items-center justify-center w-full">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
              Loading Analytics...
            </p>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              label="Active Salesmen"
              value={data?.activeSalesmen ?? 0}
              icon={Users}
              color="blue"
            />
            <StatCard
              label="Active Products"
              value={data?.topProductsCount ?? 0}
              icon={Package}
              color="orange"
            />
            <StatCard
              label="Active Suppliers"
              value={data?.suppliersCount ?? 0}
              icon={Truck}
              color="purple"
            />
            <StatCard
              label="Return Rate"
              value={`${data?.returnRate ?? "0.00"}%`}
              icon={AlertCircle}
              color="red"
            />
          </div>

          <Card className="rounded-3xl border-border bg-card/40 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/50 py-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">
                  Efficiency & Coverage Metrics
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-4 flex flex-col items-center text-center border-r border-border/50">
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">
                    Strike Rate (Orders/Visits)
                  </p>
                  <h2 className="text-7xl font-black text-foreground tracking-tighter italic">
                    {data?.strikeRate ?? 0}
                    <span className="text-primary text-3xl not-italic ml-1">
                      %
                    </span>
                  </h2>
                </div>
                <div className="lg:col-span-8 space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <CoverageBar
                      label="Sari-Sari Stores"
                      percent={data?.coverage?.sariPercent ?? 0}
                      color="bg-emerald-500"
                    />
                    <CoverageBar
                      label="Restaurants"
                      percent={data?.coverage?.restoPercent ?? 0}
                      color="bg-blue-500"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
            <RankingCard
              title="Salesman Leaderboard"
              data={data?.salesmanRanking}
              type="sales"
            />
            <RankingCard
              title="Volume Leaders"
              data={data?.topProducts}
              type="volume"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    orange: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    red: "text-red-500 bg-red-500/10 border-red-500/20",
  };
  return (
    <Card className="bg-card/50 border-border/60 p-5 flex items-center gap-4 hover:border-primary/30 transition-all rounded-2xl">
      <div className={`p-2.5 rounded-xl border ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wider leading-none mb-1">
          {label}
        </p>
        <p className="text-xl font-black italic tracking-tight">{value}</p>
      </div>
    </Card>
  );
}

function CoverageBar({ label, percent, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-[9px] font-black uppercase text-muted-foreground">
          {label}
        </span>
        <span className="text-xs font-black italic">{percent}%</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-1000`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function RankingCard({ title, data, type }: any) {
  return (
    <Card className="bg-card/30 border-border/60 p-6 rounded-3xl">
      <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 text-muted-foreground flex items-center gap-2">
        <ChevronRight className="w-3 h-3 text-primary" /> {title}
      </h3>
      <div className="space-y-3">
        {data?.length > 0 ? (
          data.slice(0, 5).map((item: any, i: number) => (
            <div
              key={i}
              className="bg-background/50 border border-border/40 p-3.5 rounded-xl flex justify-between items-center"
            >
              <span className="text-xs font-bold uppercase tracking-tight">
                <span className="text-muted-foreground mr-2 font-mono">
                  {i + 1}.
                </span>{" "}
                {item.name}
              </span>
              <div className="text-right">
                <p className="text-xs font-black italic">
                  {type === "sales"
                    ? `₱${Number(item.amount).toLocaleString()}`
                    : `${item.cases} Units`}
                </p>
                {type === "sales" && item.target && (
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">
                    {item.target}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-[10px] text-center text-muted-foreground italic py-8">
            No records found for this period.
          </p>
        )}
      </div>
    </Card>
  );
}
