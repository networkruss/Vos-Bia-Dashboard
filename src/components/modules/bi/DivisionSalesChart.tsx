// src/components/modules/bi/DivisionSalesChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency } from "@/components/dashboard/KPICard";

// Assuming DivisionSalesData is imported from types
type DivisionSalesData = { division: string; netSales: number; };

interface DivisionSalesChartProps {
  data: DivisionSalesData[];
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
      className="fill-gray-900 dark:fill-white"
      style={{ fontSize: "13px", fontWeight: 700 }}
    >
      ₱{(value / 1000000).toFixed(1)}M
    </text>
  );
};

export const DivisionSalesChart = ({ data }: DivisionSalesChartProps) => {
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
          contentStyle={{ backgroundColor: "rgba(0, 0, 0, 0.95)", border: "none", borderRadius: "8px", color: "#fff", padding: "12px" }}
          formatter={(value) => [formatCurrency(Number(value)), "Net Sales"]}
          labelStyle={{ color: "#fff", fontWeight: "bold", marginBottom: "4px" }}
          itemStyle={{ color: "#fff", padding: "4px 0" }}
          cursor={{ fill: "rgba(107, 114, 128, 0.1)" }}
        />
        <Bar
          dataKey="netSales"
          radius={[8, 8, 0, 0]}
          maxBarSize={120}
          minBarSize={60}
          label={<CustomBarLabel />}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={DIVISION_COLORS[index % DIVISION_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};