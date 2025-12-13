// src/components/dashboard/FilterBar.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, X } from 'lucide-react';
import { format } from 'date-fns';

interface FilterBarProps {
  onFilterChange: (filters: {
    fromDate: string;
    toDate: string;
    division?: string;
    branch?: string;
  }) => void;
  divisions?: string[];
  branches?: string[];
  showDivision?: boolean;
  showBranch?: boolean;
}

export function FilterBar({
  onFilterChange,
  divisions = [],
  branches = [],
  showDivision = true,
  showBranch = true,
}: FilterBarProps) {
  const [fromDate, setFromDate] = useState(
    format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')
  );
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [division, setDivision] = useState<string>('ALL');
  const [branch, setBranch] = useState<string>('ALL');

  const activeFilters: { key: string; label: string; value: string }[] = [];
  if (division !== 'ALL') activeFilters.push({ key: 'division', label: 'Division', value: division });
  if (branch !== 'ALL') activeFilters.push({ key: 'branch', label: 'Branch', value: branch });

  const handleApplyFilters = () => {
    onFilterChange({
      fromDate,
      toDate,
      division: division === 'ALL' ? undefined : division,
      branch: branch === 'ALL' ? undefined : branch,
    });
  };

  const handleClearFilters = () => {
    setFromDate(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
    setToDate(format(new Date(), 'yyyy-MM-dd'));
    setDivision('ALL');
    setBranch('ALL');
    onFilterChange({
      fromDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
      toDate: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const removeFilter = (key: string) => {
    if (key === 'division') {
      setDivision('ALL');
    } else if (key === 'branch') {
      setBranch('ALL');
    }
    handleApplyFilters();
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6 sticky top-0 z-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-3">
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

        {showDivision && divisions.length > 0 && (
          <div>
            <Label htmlFor="division">Division</Label>
            <Select value={division} onValueChange={setDivision}>
              <SelectTrigger id="division">
                <SelectValue placeholder="Select Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Divisions</SelectItem>
                {divisions.map((div) => (
                  <SelectItem key={div} value={div}>
                    {div}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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