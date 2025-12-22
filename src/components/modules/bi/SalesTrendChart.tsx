// src/components/modules/bi/SalesTrendChart.tsx
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatCurrency } from "@/components/dashboard/KPICard";

// Assuming SalesTrendData is imported from types
type SalesTrendData = { date: string; netSales: number };

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
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorNetSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#000000" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#000000" stopOpacity={0.05} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#f0f0f0"
        />

        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#888" }}
          dy={10}
        />

        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#888" }}
          tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}K`}
        />

        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            backgroundColor: "#fff",
          }}
          itemStyle={{ color: "#000" }}
          formatter={(value) => [formatCurrency(Number(value)), "Net Sales"]}
        />

        <Legend verticalAlign="bottom" height={36} iconType="circle" />

        <Area
          type="monotone"
          dataKey="netSales"
          name="Net Sales"
          stroke="#333333"
          strokeWidth={2}
          fill="url(#colorNetSales)"
          activeDot={{ r: 6, fill: "#000000" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
