"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "@/components/dashboard/KPICard";

interface TargetAchievementChartProps {
  data: {
    division: string;
    netSales: number | string;
  }[];
}

export function TargetAchievementChart({ data }: TargetAchievementChartProps) {
  // --- DATA PREPARATION ---
  // In a real app, you would join this with a 'Targets' table.
  // For now, we simulate a target (Sales + ~20%) to visualize the UI.
  const chartData = data.map((item) => {
    const actual = Number(item.netSales);

    // MOCK LOGIC: Create a target that is slightly higher than actual
    // We adjust specific divisions to show variety (some hit target, some miss)
    let multiplier = 1.2; // Default 120% target
    if (item.division === "Internal") multiplier = 1.5; // Harder target for Internal
    if (item.division === "Frozen Goods") multiplier = 0.95; // Simulate hitting target

    const target = Math.round(actual * multiplier);
    const achievementRate = target > 0 ? (actual / target) * 100 : 0;

    return {
      name: item.division,
      actual: actual,
      target: target,
      achievementRate: achievementRate,
    };
  });

  // Sort by Target size so the chart looks organized
  const sortedData = [...chartData].sort((a, b) => b.target - a.target);

  // --- CUSTOM TOOLTIP COMPONENT ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // payload[0] is usually the first bar defined (Target), payload[1] is Actual
      // We find them by dataKey to be safe
      const targetVal =
        payload.find((p: any) => p.dataKey === "target")?.value || 0;
      const actualVal =
        payload.find((p: any) => p.dataKey === "actual")?.value || 0;

      const pct = targetVal > 0 ? (actualVal / targetVal) * 100 : 0;
      const isMet = pct >= 100;

      return (
        <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-sm z-50">
          <p className="font-bold text-slate-800 mb-2 border-b pb-1">{label}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-6 text-slate-500">
              <span>Target Goal:</span>
              <span className="font-mono">{formatCurrency(targetVal)}</span>
            </div>
            <div className="flex items-center justify-between gap-6 text-blue-700 font-semibold">
              <span>Actual Sales:</span>
              <span className="font-mono">{formatCurrency(actualVal)}</span>
            </div>
            <div
              className={`flex items-center gap-2 mt-1 pt-2 font-bold ${
                isMet ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isMet ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span>{pct.toFixed(1)}% Achieved</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
          barGap={4}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="#f1f5f9"
          />

          {/* Hide X Axis numbers for cleaner look, tooltip handles exact values */}
          <XAxis type="number" hide />

          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 13, fill: "#475569", fontWeight: 500 }}
            width={110}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />

          <Legend
            verticalAlign="top"
            align="right"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: "12px", color: "#64748b" }}
          />

          {/* TARGET BAR (Background Reference) */}
          <Bar
            dataKey="target"
            name="Target Goal"
            fill="#e2e8f0" // Light gray
            radius={[0, 4, 4, 0]}
            barSize={18}
          />

          {/* ACTUAL SALES BAR */}
          <Bar
            dataKey="actual"
            name="Actual Sales"
            radius={[0, 4, 4, 0]}
            barSize={18}
          >
            {sortedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                // Turn Green (emerald-500) if target met, else Blue (blue-500)
                fill={entry.actual >= entry.target ? "#10b981" : "#3b82f6"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
