"use client";
import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  Users,
  Package,
  Truck,
  AlertCircle,
  LayoutGrid,
  UtensilsCrossed,
} from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Card } from "@/components/ui/card";

export default function SupervisorDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<any>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  useEffect(() => {
    async function fetchData() {
      if (!date?.from || !date?.to) return;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/sales/supervisor?fromDate=${format(
            date.from,
            "yyyy-MM-dd"
          )}&toDate=${format(date.to, "yyyy-MM-dd")}`
        );
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [date]);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-sans transition-colors duration-300">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic flex items-center gap-2">
            Supervisor Dashboard
            <span className="bg-primary text-primary-foreground text-[10px] not-italic px-2 py-1 rounded-sm">
              LEVEL
            </span>
          </h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">
            Field Performance & Operations Tracking
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-1 shadow-sm">
          <DatePickerWithRange date={date} setDate={setDate} />
        </div>
      </div>

      {/* TOP 4 STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Salesman Performance"
          value={`${data?.activeSalesmen || 0} Active`}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Top Products"
          value={`${data?.topProductsCount || 0} Items`}
          icon={Package}
          color="orange"
        />
        <StatCard
          label="Suppliers Covered"
          value={`${data?.suppliersCount || 0} Partners`}
          icon={Truck}
          color="purple"
        />
        <StatCard
          label="Return Rate"
          value={`${data?.returnRate || 0}%`}
          icon={AlertCircle}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CUSTOMER COVERAGE */}
        <Card className="lg:col-span-4 p-6 border-border bg-card/50 backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <LayoutGrid className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest">
              Customer Coverage
            </h3>
          </div>

          <div className="space-y-8">
            <CoverageBar
              label="Sari-Sari Stores"
              percent={data?.coverage?.sariPercent || 0}
              color="bg-emerald-500"
              icon={LayoutGrid}
            />
            <CoverageBar
              label="Restaurants"
              percent={data?.coverage?.restoPercent || 0}
              color="bg-blue-500"
              icon={UtensilsCrossed}
            />

            <div className="pt-6 border-t border-border">
              <p className="text-muted-foreground text-[10px] font-bold uppercase">
                Assigned Area Coverage
              </p>
              <p className="text-3xl font-black mt-1">
                {data?.coverage?.total || 0}{" "}
                <span className="text-sm font-normal text-muted-foreground italic">
                  Total Outlets
                </span>
              </p>
            </div>
          </div>
        </Card>

        {/* EFFICIENCY METRICS */}
        <Card className="lg:col-span-8 p-6 border-border bg-card/50 backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500 italic font-black">
              ⚡
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground/80">
              Efficiency Metrics
            </h3>
          </div>
          <p className="text-[10px] text-muted-foreground font-bold mb-6 italic">
            Strike Rate (Orders / Visits)
          </p>
          <div className="flex flex-col items-center justify-center h-48 border-y border-dashed border-border my-4">
            <p className="text-[10px] font-black uppercase text-muted-foreground">
              Current Avg
            </p>
            <h2 className="text-6xl font-black text-yellow-500 tracking-tighter transition-all hover:scale-110 duration-300">
              {data?.strikeRate || 0}%
            </h2>
          </div>
        </Card>
      </div>

      {/* RANKINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 pb-10">
        <RankingCard
          title="Salesman Ranking"
          data={data?.salesmanRanking}
          type="sales"
        />
        <RankingCard
          title="Top Products by Volume"
          data={data?.topProducts}
          type="volume"
        />
      </div>
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
    <Card className="bg-card border-border shadow-sm p-6 flex items-center gap-5 transition-all hover:shadow-md">
      <div className={`p-4 rounded-2xl border ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
          {label}
        </p>
        <p className="text-xl font-black tracking-tight text-foreground">
          {value}
        </p>
      </div>
    </Card>
  );
}

function CoverageBar({ label, percent, color, icon: Icon }: any) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-black uppercase flex items-center gap-2 text-foreground/80">
          <Icon className="w-3 h-3" /> {label}
        </span>
        <span className="text-sm font-black italic text-foreground">
          {percent}%
        </span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
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
    <Card className="bg-card border-border p-6 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-widest mb-6 text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-3">
        {data?.length > 0 ? (
          data.map((item: any, i: number) => (
            <div
              key={i}
              className="bg-muted/30 border border-border p-4 rounded-xl flex justify-between items-center hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-bold text-foreground">
                #{i + 1} {item.name}
              </span>
              <div className="text-right">
                <p className="text-sm font-black text-foreground">
                  {type === "sales"
                    ? `₱${item.amount.toLocaleString()}`
                    : `${item.cases} Units`}
                </p>
                {type === "sales" && (
                  <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">
                    {item.target} Target
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-center text-muted-foreground italic py-4">
            No data available for this range
          </p>
        )}
      </div>
    </Card>
  );
}
