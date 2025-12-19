"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils"; // Assuming you have a standard cn utility

// Helper: Clean currency format
const formatCurrency = (val: number | string) => {
  const num = Number(val);
  if (num === 0) return "-"; // Returns dash for cleaner look on empty cells
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// Helper: Format YYYY-MM to shorter date (e.g., "Jan '24")
const formatDateHeader = (dateStr: string) => {
  try {
    const [y, m] = dateStr.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

export function SupplierHeatmap({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        No data available for this selection.
      </div>
    );
  }

  // Extract month keys dynamically (exclude non-date keys)
  // Logic matches backend: looks for keys starting with "20" (e.g. 2024-01)
  const monthColumns = Object.keys(data[0])
    .filter((key) => key.match(/^\d{4}-\d{2}$/))
    .sort();

  // Heatmap Color Logic
  const getCellColor = (value: number) => {
    if (value >= 250000) return "bg-blue-600 text-white font-bold";
    if (value >= 150000) return "bg-blue-400 text-white";
    if (value >= 80000) return "bg-blue-200 text-blue-900";
    if (value > 0) return "bg-blue-50 text-blue-700";
    return "bg-transparent text-gray-300"; // Clean look for zero
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Scrollable Container */}
      <div className="relative w-full overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50/80">
            <TableRow>
              {/* STICKY COLUMN: Top Left Header */}
              <TableHead className="min-w-[200px] sticky left-0 z-20 bg-gray-50 font-bold text-gray-900 border-r border-gray-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                Supplier Name
              </TableHead>

              {/* Scrollable Month Headers */}
              {monthColumns.map((month) => (
                <TableHead
                  key={month}
                  className="text-right min-w-[100px] font-semibold text-gray-700 px-4 whitespace-nowrap"
                >
                  {formatDateHeader(month)}
                </TableHead>
              ))}

              {/* Total Header */}
              <TableHead className="text-right font-bold text-blue-700 bg-blue-50/30 min-w-[120px] px-4">
                Total Sales
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((row, index) => {
              // Handle key mismatch (backend uses 'supplier', old frontend used 'supplierName')
              const name = row.supplier || row.supplierName || "Unknown";

              return (
                <TableRow
                  key={index}
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  {/* STICKY COLUMN: Supplier Name Rows */}
                  <TableCell className="font-medium sticky left-0 z-10 bg-white group-hover:bg-gray-50 transition-colors border-r border-gray-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] max-w-[200px] truncate text-gray-700">
                    <span title={name}>{name}</span>
                  </TableCell>

                  {/* Monthly Data Cells */}
                  {monthColumns.map((month) => {
                    const val = row[month] || 0;
                    return (
                      <TableCell
                        key={month}
                        className={cn(
                          "text-right px-4 py-2 text-sm tabular-nums border-r border-gray-50 last:border-0 transition-all",
                          getCellColor(val)
                        )}
                      >
                        {formatCurrency(val)}
                      </TableCell>
                    );
                  })}

                  {/* Total Column Row */}
                  <TableCell className="text-right font-bold text-blue-700 bg-blue-50/10 px-4 tabular-nums">
                    {formatCurrency(row.total || 0)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
