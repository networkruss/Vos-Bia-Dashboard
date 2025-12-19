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

export function SupplierSalesChart({ data }: { data: any[] }) {
  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f0f0f0"
          />
          <XAxis
            dataKey="name"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `₱${(Number(value) / 1000).toFixed(0)}K`}
          />
          <Tooltip
            cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
            formatter={(value: any) => [
              `₱${Number(value).toLocaleString()}`,
              "Sales",
            ]}
          />

          <Bar
            dataKey="netSales"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            barSize={60}
          >
            {data.map((_: any, index: number) => (
              <Cell
                key={`cell-${index}`}
                fill={index % 2 === 0 ? "#3b82f6" : "#60a5fa"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
