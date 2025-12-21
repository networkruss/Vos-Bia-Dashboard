"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// --- CONFIG: Division Color Themes ---
const DIVISION_THEMES: Record<string, any> = {
  "Dry Goods": {
    base: "blue",
    header: "bg-blue-50 text-blue-700",
    cells: {
      high: "bg-blue-600 text-white font-bold",
      mid: "bg-blue-400 text-white",
      low: "bg-blue-200 text-blue-900",
      faint: "bg-blue-50 text-blue-700",
    },
  },
  Industrial: {
    base: "violet",
    header: "bg-violet-50 text-violet-700",
    cells: {
      high: "bg-violet-600 text-white font-bold",
      mid: "bg-violet-400 text-white",
      low: "bg-violet-200 text-violet-900",
      faint: "bg-violet-50 text-violet-700",
    },
  },
  "Mama Pina's": {
    base: "amber",
    header: "bg-amber-50 text-amber-700",
    cells: {
      high: "bg-amber-600 text-white font-bold",
      mid: "bg-amber-400 text-white",
      low: "bg-amber-200 text-amber-900",
      faint: "bg-amber-50 text-amber-700",
    },
  },
  "Frozen Goods": {
    base: "cyan",
    header: "bg-cyan-50 text-cyan-700",
    cells: {
      high: "bg-cyan-600 text-white font-bold",
      mid: "bg-cyan-400 text-white",
      low: "bg-cyan-200 text-cyan-900",
      faint: "bg-cyan-50 text-cyan-700",
    },
  },
  Unassigned: {
    base: "pink",
    header: "bg-pink-50 text-pink-700",
    cells: {
      high: "bg-pink-600 text-white font-bold",
      mid: "bg-pink-400 text-white",
      low: "bg-pink-200 text-pink-900",
      faint: "bg-pink-50 text-pink-700",
    },
  },
};

const DEFAULT_THEME = DIVISION_THEMES["Dry Goods"];

// Helper: Clean currency format
const formatCurrency = (val: number | string) => {
  const num = Number(val);
  // Returns "0" for zero values
  if (num === 0) return "0";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// Helper: Format YYYY-MM to Full Month Year (e.g., "December 2025")
const formatDateHeader = (dateStr: string) => {
  try {
    const [y, m] = dateStr.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1);

    // UPDATED FORMAT: "December 2025"
    // This clears the confusion between Year '25 and Day 25
    return date.toLocaleDateString("en-US", {
      month: "long", // Full month name (e.g., December)
      year: "numeric", // Full year (e.g., 2025)
    });
  } catch {
    return dateStr;
  }
};

interface SupplierHeatmapProps {
  data: any[];
  divisionName?: string | null;
}

export function SupplierHeatmap({ data, divisionName }: SupplierHeatmapProps) {
  // 1. FILTER ROWS: Only keep suppliers where 'total' sales > 0
  const activeRows = data.filter((row) => Number(row.total || 0) > 0);

  if (!activeRows || activeRows.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 border border-dashed rounded-lg">
        No active sales data for this selection.
      </div>
    );
  }

  // 2. THEME Selection
  const activeTheme =
    divisionName && DIVISION_THEMES[divisionName]
      ? DIVISION_THEMES[divisionName]
      : DEFAULT_THEME;

  // 3. FILTER COLUMNS (MONTHS): Only show months that have sales > 0
  // Step A: Get all potential month keys (e.g., "2024-01")
  const allMonthKeys = Object.keys(activeRows[0])
    .filter((key) => key.match(/^\d{4}-\d{2}$/))
    .sort();

  // Step B: Filter keys where at least one supplier has sales > 0 for that month
  const activeMonthColumns = allMonthKeys.filter((month) => {
    // Check if ANY row has a value > 0 for this specific month
    return activeRows.some((row) => Number(row[month] || 0) > 0);
  });

  // Dynamic Cell Color
  const getCellColor = (value: number) => {
    if (value >= 250000) return activeTheme.cells.high;
    if (value >= 150000) return activeTheme.cells.mid;
    if (value >= 80000) return activeTheme.cells.low;
    if (value > 0) return activeTheme.cells.faint;
    return "bg-transparent text-gray-300"; // Light gray for zero cells
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="relative w-full overflow-x-auto max-h-[600px]">
        <Table>
          {/* Sticky Header */}
          <TableHeader className="bg-gray-50/80 sticky top-0 z-30 backdrop-blur-sm">
            <TableRow>
              <TableHead className="min-w-[200px] sticky left-0 z-40 bg-gray-50 font-bold text-gray-900 border-r border-gray-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                Supplier Name
              </TableHead>

              {activeMonthColumns.map((month) => (
                <TableHead
                  key={month}
                  className="text-right min-w-[140px] font-semibold text-gray-700 px-4 whitespace-nowrap" // Made slightly wider for full date
                >
                  {formatDateHeader(month)}
                </TableHead>
              ))}

              <TableHead
                className={cn(
                  "text-right font-bold min-w-[120px] px-4",
                  activeTheme.header
                )}
              >
                Total Sales
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {activeRows.map((row, index) => {
              const name = row.supplier || row.supplierName || "Unknown";

              return (
                <TableRow
                  key={index}
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  <TableCell className="font-medium sticky left-0 z-20 bg-white group-hover:bg-gray-50 transition-colors border-r border-gray-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] max-w-[200px] truncate text-gray-700">
                    <span title={name}>{name}</span>
                  </TableCell>

                  {/* Render ONLY the active months */}
                  {activeMonthColumns.map((month) => {
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

                  <TableCell
                    className={cn(
                      "text-right font-bold px-4 tabular-nums opacity-90",
                      activeTheme.header
                    )}
                  >
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
