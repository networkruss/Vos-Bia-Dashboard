// src/components/modules/bi/SalesTrendChart.tsx
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/components/dashboard/KPICard"; // Utility function location

// Assuming SalesTrendData is imported from types
type SalesTrendData = { date: string; netSales: number; }; 

interface SalesTrendChartProps {
  data: SalesTrendData[];
}

export const SalesTrendChart = ({ data }: SalesTrendChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-400">
        No sales trend data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6b7280" stopOpacity={0.3} />
            <stop offset="50%" stopColor="#6b7280" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#6b7280" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: "11px" }} />
        <YAxis
          stroke="#9ca3af"
          style={{ fontSize: "11px" }}
          tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}K`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(0, 0, 0, 0.9)", border: "none", borderRadius: "8px", color: "#fff",
          }}
          formatter={(value) => [formatCurrency(Number(value)), "Net Sales"]}
        />
        <Area
          type="monotone"
          dataKey="netSales"
          stroke="#6b7280"
          strokeWidth={2}
          fill="url(#colorSales)"
          dot={{ fill: "#374151", r: 4, strokeWidth: 2, stroke: "#fff" }}
          activeDot={{ r: 6, fill: "#374151" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};