"use client";

import { useState, useEffect } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { Calendar as CalendarIcon, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DashboardFilters } from "@/types";

interface FilterBarProps {
  onFilterChange: (filters: DashboardFilters) => void;
  branches?: any[]; // Kept for compatibility, though unused in this specific view
}

export function FilterBar({ onFilterChange }: FilterBarProps) {
  // 1. STATE: Manage the dropdown preset value
  const [datePreset, setDatePreset] = useState("This Month");

  // 2. STATE: Manage the actual date range values
  const [fromDate, setFromDate] = useState<Date | undefined>(
    startOfMonth(new Date())
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    endOfMonth(new Date())
  );

  // 3. HANDLER: Update dates when a preset is selected
  const handlePresetChange = (value: string) => {
    setDatePreset(value);
    const now = new Date();

    let newFrom: Date | undefined;
    let newTo: Date | undefined;

    switch (value) {
      case "Today":
        newFrom = now;
        newTo = now;
        break;
      case "This Week":
        newFrom = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
        newTo = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "This Month":
        newFrom = startOfMonth(now);
        newTo = endOfMonth(now);
        break;
      case "Custom Range":
        // Don't change dates, just let user pick
        newFrom = fromDate;
        newTo = toDate;
        break;
    }

    if (value !== "Custom Range") {
      setFromDate(newFrom);
      setToDate(newTo);
      // Auto-apply for presets to save a click
      if (newFrom && newTo) {
        onFilterChange({
          fromDate: format(newFrom, "yyyy-MM-dd"),
          toDate: format(newTo, "yyyy-MM-dd"),
          division: "all",
        });
      }
    }
  };

  const handleApply = () => {
    if (fromDate && toDate) {
      onFilterChange({
        fromDate: format(fromDate, "yyyy-MM-dd"),
        toDate: format(toDate, "yyyy-MM-dd"),
        division: "all",
      });
    }
  };

  const handleClear = () => {
    // Reset to "This Month"
    setDatePreset("This Month");
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    setFromDate(start);
    setToDate(end);
    onFilterChange({
      fromDate: format(start, "yyyy-MM-dd"),
      toDate: format(end, "yyyy-MM-dd"),
      division: "all",
    });
  };

  // Initial Load Trigger
  useEffect(() => {
    handleApply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
      {/* 1. Date Preset Dropdown */}
      <div className="w-[200px]">
        <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
          Time Period
        </label>
        <Select value={datePreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Today">Today</SelectItem>
            <SelectItem value="This Week">This Week</SelectItem>
            <SelectItem value="This Month">This Month</SelectItem>
            <SelectItem value="Custom Range">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 2. Custom Range Pickers (Only visible if "Custom Range" is selected) */}
      {datePreset === "Custom Range" && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              Start Date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[140px] justify-start text-left font-normal",
                    !fromDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? (
                    format(fromDate, "MMM dd, yyyy")
                  ) : (
                    <span>Pick date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={setFromDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              End Date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[140px] justify-start text-left font-normal",
                    !toDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? (
                    format(toDate, "MMM dd, yyyy")
                  ) : (
                    <span>Pick date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={setToDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 ml-auto">
        <Button
          onClick={handleApply}
          className="bg-black text-white hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        <Button
          variant="outline"
          onClick={handleClear}
          className="text-gray-600 border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <X className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
