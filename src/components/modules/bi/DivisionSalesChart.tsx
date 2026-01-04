"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid, // Added to match dashboard style
} from "recharts";
import { formatCurrency } from "@/components/dashboard/KPICard";

type DivisionSalesData = {
  division: string;
  netSales: number;
};

interface DivisionSalesChartProps {
  data: DivisionSalesData[];
  onBarClick?: (divisionName: string) => void;
  activeDivision?: string | null;
}

const CustomBarLabel = (props: any) => {
  const { x = 0, y = 0, width = 0, value = 0 } = props || {};
  const numeric = Number(value) || 0;
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      className="fill-gray-900 font-bold"
      style={{ fontSize: "13px" }}
    >
      ₱{(numeric / 1000000).toFixed(1)}M
    </text>
  );
};

export const DivisionSalesChart = ({
  data,
  onBarClick,
  activeDivision,
}: DivisionSalesChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-[450px] flex items-center justify-center text-gray-400">
        No division sales data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        margin={{ top: 40, right: 30, left: 20, bottom: 20 }}
        onClick={(state) => {
          if (onBarClick && state && state.activeLabel !== undefined) {
            onBarClick(String(state.activeLabel));
          }
        }}
      >
        {/* Added Grid to match Salesman Dashboard style */}
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#f0f0f0"
        />

        <XAxis
          dataKey="division"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 13, fontWeight: 600, fill: "#666" }}
          height={60}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#888" }}
          tickFormatter={(value) => `₱${(value / 1000000).toFixed(0)}M`}
        />
        <Tooltip
          cursor={{ fill: "transparent" }}
          contentStyle={{
            borderRadius: "8px",
            border: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            backgroundColor: "#fff", // White background
            padding: "12px",
          }}
          itemStyle={{ color: "#000", fontSize: "14px", fontWeight: "bold" }}
          formatter={(value: any) => [
            formatCurrency(Number(value)),
            "Net Sales",
          ]}
        />
        <Bar
          dataKey="netSales"
          radius={[8, 8, 0, 0]}
          maxBarSize={120}
          label={<CustomBarLabel />}
        >
          {data.map((entry, index) => {
            const isActive = entry.division === activeDivision;
            return (
              <Cell
                key={`cell-${index}`}
                // CHANGED: Use Black (#000000) instead of colored array
                fill="#000000"
                // Logic: High opacity if active or no selection, low opacity if inactive
                fillOpacity={activeDivision ? (isActive ? 1 : 0.3) : 1}
                className="cursor-pointer transition-all duration-300"
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
