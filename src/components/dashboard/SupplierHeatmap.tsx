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

// --- CONFIG: Modern Black/Monochrome Theme ---
// Updated from Blue to Black/Gray to match the Salesman Dashboard
const MODERN_BLACK_THEME = {
  header: "bg-white text-gray-900 border-b border-gray-200",
  cells: {
    high: "bg-black text-white font-bold", // Highest Sales: Black
    mid: "bg-gray-500 text-white font-medium", // Mid Sales: Dark Gray
    low: "bg-gray-200 text-gray-900", // Low Sales: Light Gray
    faint: "bg-gray-50 text-gray-400", // Very Low: Faint Gray
  },
};

// Helper: Clean currency format
const formatCurrency = (val: number | string) => {
  const num = Number(val);
  if (num === 0) return "-";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// Helper: Format YYYY-MM to "Dec 2025"
const formatDateHeader = (dateStr: string) => {
  try {
    const [y, m] = dateStr.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

interface SupplierHeatmapProps {
  data: any[];
  divisionName?: string | null;
}

export function SupplierHeatmap({ data }: SupplierHeatmapProps) {
  // 1. FILTER ROWS: Only keep suppliers where 'total' sales > 0
  const activeRows = data.filter((row) => Number(row.total || 0) > 0);

  if (!activeRows || activeRows.length === 0) {
    return (
      <div className="p-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
        <p className="text-sm font-medium">
          No sales data found for this selection.
        </p>
      </div>
    );
  }

  // 2. FILTER COLUMNS (MONTHS)
  const allMonthKeys = Object.keys(activeRows[0])
    .filter((key) => key.match(/^\d{4}-\d{2}$/))
    .sort();

  const activeMonthColumns = allMonthKeys.filter((month) => {
    return activeRows.some((row) => Number(row[month] || 0) > 0);
  });

  // Dynamic Cell Color based on value (Updated to Black Theme)
  const getCellColor = (value: number) => {
    if (value >= 250000) return MODERN_BLACK_THEME.cells.high; // Black
    if (value >= 150000) return MODERN_BLACK_THEME.cells.mid; // Dark Gray
    if (value >= 50000) return MODERN_BLACK_THEME.cells.low; // Light Gray
    if (value > 0) return "bg-gray-100 text-gray-900"; // Faint Gray
    return "bg-transparent text-gray-300"; // Zero
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="relative w-full overflow-x-auto max-h-[600px]">
        <Table>
          <TableHeader className="sticky top-0 z-30 bg-white shadow-sm">
            <TableRow className="hover:bg-transparent border-b border-gray-200">
              <TableHead className="min-w-[220px] sticky left-0 z-40 bg-white font-bold text-gray-900 border-r border-gray-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] pl-6 py-4">
                Supplier Name
              </TableHead>

              {activeMonthColumns.map((month) => (
                <TableHead
                  key={month}
                  className="text-right min-w-[120px] font-semibold text-gray-600 px-4 whitespace-nowrap bg-white"
                >
                  {formatDateHeader(month)}
                </TableHead>
              ))}

              <TableHead className="text-right font-bold min-w-[140px] px-6 text-gray-900 bg-gray-50/50">
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
                  className="hover:bg-gray-50/50 transition-colors group border-b border-gray-50 last:border-0"
                >
                  <TableCell className="font-medium sticky left-0 z-20 bg-white group-hover:bg-gray-50 transition-colors border-r border-gray-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] max-w-[220px] truncate text-gray-700 pl-6 py-3">
                    <span title={name}>{name}</span>
                  </TableCell>

                  {activeMonthColumns.map((month) => {
                    const val = row[month] || 0;
                    return (
                      <TableCell
                        key={month}
                        className={cn(
                          "text-right px-4 py-2 text-sm tabular-nums border-r border-gray-50/50 last:border-0 transition-all",
                          getCellColor(val)
                        )}
                      >
                        {formatCurrency(val)}
                      </TableCell>
                    );
                  })}

                  <TableCell className="text-right font-bold px-6 tabular-nums text-gray-900 bg-gray-50/30">
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
