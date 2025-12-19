"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
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

const DIVISION_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

const CustomBarLabel = (props: {
  x?: number;
  y?: number;
  width?: number;
  value?: number;
}) => {
  const { x = 0, y = 0, width = 0, value = 0 } = props;
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      className="fill-gray-900 dark:fill-white font-bold"
      style={{ fontSize: "13px" }}
    >
      ₱{(value / 1000000).toFixed(1)}M
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
          if (onBarClick && state && state.activeLabel) {
            onBarClick(state.activeLabel);
          }
        }}
      >
        <XAxis
          dataKey="division"
          className="fill-gray-900 dark:fill-white"
          style={{ fontSize: "13px", fontWeight: 600 }}
          tick={{ fill: "currentColor" }}
          height={60}
        />
        <YAxis
          className="fill-gray-900 dark:fill-white"
          style={{ fontSize: "12px" }}
          tick={{ fill: "currentColor" }}
          tickFormatter={(value) => `₱${(value / 1000000).toFixed(0)}M`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            border: "none",
            borderRadius: "8px",
            padding: "12px",
          }}
          // FIX: Explicitly set the label (Division Name) color to white
          labelStyle={{
            color: "#fff",
            fontWeight: "bold",
            marginBottom: "4px",
          }}
          // FIX: Explicitly set the item (Net Sales) text color to white
          itemStyle={{ color: "#fff", fontSize: "14px" }}
          formatter={(value) => [formatCurrency(Number(value)), "Net Sales"]}
          cursor={{ fill: "rgba(0, 0, 0, 0.05)", cursor: "pointer" }}
        />
        <Bar
          dataKey="netSales"
          radius={[8, 8, 0, 0]}
          maxBarSize={120}
          minBarSize={60}
          label={<CustomBarLabel />}
        >
          {data.map((entry, index) => {
            const isActive = entry.division === activeDivision;
            return (
              <Cell
                key={`cell-${index}`}
                fill={DIVISION_COLORS[index % DIVISION_COLORS.length]}
                fillOpacity={activeDivision ? (isActive ? 1 : 0.4) : 1}
                stroke={isActive ? "#000" : "none"}
                strokeWidth={2}
                className="cursor-pointer transition-all duration-300"
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
