"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, X } from "lucide-react";
import { format } from "date-fns";

interface FilterBarProps {
  onFilterChange: (filters: {
    fromDate: string;
    toDate: string;
    branch?: string;
  }) => void;
  branches?: string[];
  showBranch?: boolean;
}

export function FilterBar({
  onFilterChange,
  branches = [],
  showBranch = true,
}: FilterBarProps) {
  const [fromDate, setFromDate] = useState(
    format(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      "yyyy-MM-dd"
    )
  );
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [branch, setBranch] = useState<string>("ALL");

  const activeFilters: { key: string; label: string; value: string }[] = [];
  if (branch !== "ALL")
    activeFilters.push({ key: "branch", label: "Branch", value: branch });

  const handleApplyFilters = () => {
    onFilterChange({
      fromDate,
      toDate,
      branch: branch === "ALL" ? undefined : branch,
    });
  };

  const handleClearFilters = () => {
    const firstDay = format(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      "yyyy-MM-dd"
    );
    const today = format(new Date(), "yyyy-MM-dd");
    setFromDate(firstDay);
    setToDate(today);
    setBranch("ALL");
    onFilterChange({
      fromDate: firstDay,
      toDate: today,
    });
  };

  const removeFilter = (key: string) => {
    if (key === "branch") {
      setBranch("ALL");
    }
    handleApplyFilters();
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6 sticky top-0 z-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
        <div>
          <Label htmlFor="fromDate">From Date</Label>
          <Input
            id="fromDate"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="toDate">To Date</Label>
          <Input
            id="toDate"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        {showBranch && branches.length > 0 && (
          <div>
            <Label htmlFor="branch">Branch</Label>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger id="branch">
                <SelectValue placeholder="Select Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Branches</SelectItem>
                {branches.map((br) => (
                  <SelectItem key={br} value={br}>
                    {br}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-end gap-2">
          <Button onClick={handleApplyFilters} className="flex-1">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleClearFilters} variant="outline">
            Clear
          </Button>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="pl-2 pr-1">
              {filter.label}: {filter.value}
              <button
                onClick={() => removeFilter(filter.key)}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
