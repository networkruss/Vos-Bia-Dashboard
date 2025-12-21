"use client";

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
  barColor?: string; // Added prop for dynamic color
}

export function SupplierSalesChart({
  data,
  barColor = "#3b82f6", // Default to Blue if no color is provided
}: SupplierSalesChartProps) {
  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          // Increased bottom margin to make room for rotated labels
          margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f0f0f0"
          />
          <XAxis
            dataKey="name"
            interval={0} // <--- CRITICAL: Forces ALL labels to show
            fontSize={11} // Slightly smaller font
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            angle={-45} // <--- Rotates text so long names fit
            textAnchor="end" // Aligns rotated text to the tick mark
            height={80} // Allocates height for the axis itself
          />
          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `₱${(Number(value) / 1000).toFixed(0)}K`}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0, 0.05)" }}
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value: number | string) => [
              `₱${Number(value).toLocaleString()}`,
              "Net Sales",
            ]}
          />

          <Bar
            dataKey="netSales"
            fill={barColor} // Uses the dynamic color passed from parent
            radius={[4, 4, 0, 0]}
            barSize={70} // <--- UPDATED: Increased from 50 to 70 for wider bars
          >
            {/* Optional: subtle opacity change for alternating bars, 
               but keeping the main color consistent with the Division theme 
            */}
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={barColor}
                fillOpacity={index % 2 === 0 ? 1 : 0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
