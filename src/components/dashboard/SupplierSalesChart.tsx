"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface SupplierDatum {
  name: string;
  netSales: number;
}

interface SupplierSalesChartProps {
  data: SupplierDatum[];
}

export function SupplierSalesChart({ data }: SupplierSalesChartProps) {
  // State to track which bar is clicked
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
          // 1. CLICK HANDLER: Manages selection state
          onClick={(state) => {
            if (state && state.activeTooltipIndex !== undefined) {
              // Toggle: if clicking the same bar, reset; otherwise set active
              setActiveIndex(
                state.activeTooltipIndex === activeIndex
                  ? null
                  : state.activeTooltipIndex
              );
            } else {
              // Clicking chart background resets selection
              setActiveIndex(null);
            }
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f0f0f0"
          />

          <XAxis
            dataKey="name"
            interval={0}
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            tick={{ fill: "#6b7280" }}
            angle={-45}
            textAnchor="end"
            height={80}
          />

          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#6b7280" }}
            tickFormatter={(value) => `₱${(Number(value) / 1000).toFixed(0)}K`}
          />

          <Tooltip
            cursor={{ fill: "transparent" }}
            contentStyle={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              padding: "12px",
            }}
            itemStyle={{
              color: "#000000",
              fontWeight: "bold",
              fontSize: "14px",
            }}
            labelStyle={{
              color: "#6b7280",
              marginBottom: "4px",
              fontSize: "12px",
            }}
            formatter={(value: number | string) => [
              `₱${Number(value).toLocaleString()}`,
              "Net Sales",
            ]}
          />

          {/* 2. RENDER BARS: Black color with dynamic opacity */}
          <Bar dataKey="netSales" radius={[4, 4, 0, 0]} barSize={70}>
            {data.map((entry, index) => {
              // Logic: Active if NO selection exists OR if this specific bar is selected
              const isActive = activeIndex === null || activeIndex === index;

              return (
                <Cell
                  key={`cell-${index}`}
                  fill="#000000" // Force Black Color
                  fillOpacity={isActive ? 1 : 0.3} // 100% opacity for active, 30% for others
                  className="cursor-pointer transition-all duration-300 hover:opacity-80"
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
