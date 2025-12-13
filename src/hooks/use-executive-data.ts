// src/hooks/use-executive-data.ts
import { useState, useEffect, useCallback } from "react";
import { DashboardFilters, DashboardData } from "@/types"; // Import types from your index.ts

// --- Assuming types are defined in src/types/index.ts (see point 5) ---

export const useExecutiveData = () => {
  const [filters, setFilters] = useState<DashboardFilters>({
    fromDate: "01/01/2024",
    toDate: "12/31/2025",
    division: undefined,
    branch: undefined,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataSource, setDataSource] = useState<"directus" | "mock">("directus");

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (filters.fromDate) params.append("fromDate", filters.fromDate);
      if (filters.toDate) params.append("toDate", filters.toDate);
      if (filters.division && filters.division !== "all") {
        params.append("division", filters.division);
      }

      // API route from the new structured location
      const url = `/api/sales/executive?${params.toString()}`; 
      console.log("🔍 Fetching:", url);

      const response = await fetch(url);
      
      // Error handling logic remains the same
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`API Error: ${data.error}`);
      }

      console.log("✅ Dashboard data loaded:", data);
      setDashboardData(data);
      setDataSource("directus");
    } catch (error: unknown) {
      console.error("💥 Fetch failed:", error);
      setError((error as Error).message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleFilterChange = (newFilters: DashboardFilters) => {
    setFilters(newFilters);
  };

  return {
    filters,
    loading,
    error,
    dashboardData,
    dataSource,
    fetchDashboardData,
    handleFilterChange,
  };
};