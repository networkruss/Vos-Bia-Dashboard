// src/app/bi/encoder/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  KPICard,
  formatCurrency,
  formatNumber,
} from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pencil,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

type EncoderKPI = {
  pendingInvoices: number;
  encodedToday: number;
  validationErrors: number;
  avgProcessingTime: number;
};

type Entry = {
  id: number;
  invoiceNo: string;
  date: string;
  encoder?: string;
  customer: string;
  amount: number;
  status: "Pending" | "Encoded" | "With Errors";
  dueDate: string;
  priority: "High" | "Medium" | "Low";
  errorType?: string;
  assignedTo?: string;
  paymentStatus?: string;
  salesmanId?: number;
};

type ValidationIssue = {
  invoiceNo: string;
  errorType: string;
  customer: string;
  assignedTo: string;
  status: string;
};

export default function EncoderDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Pending" | "Encoded" | "With Errors"
  >("All");
  const [sortBy, setSortBy] = useState<"invoiceNo" | "dueDate" | "amount">(
    "dueDate"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>(
    []
  );
  const [kpiData, setKpiData] = useState<EncoderKPI>({
    pendingInvoices: 0,
    encodedToday: 0,
    validationErrors: 0,
    avgProcessingTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Fetching encoder data...");

      const response = await fetch("/api/sales/encoder");

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const invoicesData = await response.json();
      console.log("Received data:", invoicesData);

      let dataArray = [];
      if (Array.isArray(invoicesData)) {
        dataArray = invoicesData;
      } else if (invoicesData.data && Array.isArray(invoicesData.data)) {
        dataArray = invoicesData.data;
      } else {
        throw new Error("Unexpected data format");
      }

      console.log("Processing", dataArray.length, "invoices");

      const transformedEntries: Entry[] = dataArray.map((item: any) => {
        let status: "Pending" | "Encoded" | "With Errors" = "Pending";

        if (item.isPosted) {
          status = "Encoded";
        } else if (
          !item.customer_code ||
          !item.salesman_id ||
          item.total_amount === null
        ) {
          status = "With Errors";
        }

        let priority: "High" | "Medium" | "Low" = "Medium";
        if (item.due_date) {
          const dueDate = new Date(item.due_date);
          const today = new Date();
          const daysUntilDue = Math.ceil(
            (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilDue < 7) priority = "High";
          else if (daysUntilDue < 30) priority = "Medium";
          else priority = "Low";
        }

        return {
          id: item.invoice_id,
          invoiceNo: item.invoice_no || `INV-${item.invoice_id}`,
          date:
            item.dispatch_date || item.created_date || new Date().toISOString(),
          encoder: item.created_by || item.posted_by || undefined,
          customer: item.customer_code || "Unknown",
          amount: parseFloat(item.total_amount || 0),
          status,
          dueDate:
            item.due_date || item.dispatch_date || new Date().toISOString(),
          priority,
          errorType:
            status === "With Errors" ? "Missing required fields" : undefined,
          assignedTo: item.modified_by || undefined,
          paymentStatus: item.payment_status || "Unknown",
          salesmanId: item.salesman_id,
        };
      });

      setEntries(transformedEntries);

      const pending = transformedEntries.filter(
        (e) => e.status === "Pending"
      ).length;
      const today = new Date().toDateString();
      const encodedToday = transformedEntries.filter(
        (e) =>
          e.status === "Encoded" && new Date(e.date).toDateString() === today
      ).length;
      const errors = transformedEntries.filter(
        (e) => e.status === "With Errors"
      ).length;

      setKpiData({
        pendingInvoices: pending,
        encodedToday,
        validationErrors: errors,
        avgProcessingTime: 12.5,
      });

      const issues = transformedEntries
        .filter((e) => e.status === "With Errors")
        .map((e) => ({
          invoiceNo: e.invoiceNo,
          errorType: e.errorType || "Unknown Error",
          customer: e.customer,
          assignedTo: e.assignedTo || "Unassigned",
          status: "Pending Fix",
        }));

      setValidationIssues(issues);
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = useMemo(() => {
    let result = [...entries];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.invoiceNo.toLowerCase().includes(query) ||
          e.customer.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((e) => e.status === statusFilter);
    }

    result.sort((a, b) => {
      if (sortBy === "invoiceNo") {
        return sortOrder === "asc"
          ? a.invoiceNo.localeCompare(b.invoiceNo)
          : b.invoiceNo.localeCompare(a.invoiceNo);
      } else if (sortBy === "dueDate") {
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      } else if (sortBy === "amount") {
        return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount;
      }
      return 0;
    });

    return result;
  }, [entries, searchQuery, statusFilter, sortBy, sortOrder]);

  // Paginated entries
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredEntries.slice(startIndex, endIndex);
  }, [filteredEntries, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

  const handleSortToggle = (field: "invoiceNo" | "dueDate" | "amount") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading encoder data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-screen-2xl mx-auto">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Encoder Dashboard</h1>
        <p className="text-muted-foreground">
          Manage workload and fix data-quality issues in sales invoices.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by Invoice Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border rounded px-3 py-2 flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border rounded px-2 py-1 min-w-[150px]"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending Encoding</option>
            <option value="Encoded">Encoded</option>
            <option value="With Errors">With Errors</option>
          </select>
          <button
            onClick={fetchData}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Pending Invoices"
          value={kpiData.pendingInvoices}
          formatValue={formatNumber}
          icon={Pencil}
        />
        <KPICard
          title="Encoded Today"
          value={kpiData.encodedToday}
          formatValue={formatNumber}
          icon={CheckCircle}
        />
        <KPICard
          title="Validation Errors"
          value={kpiData.validationErrors}
          formatValue={formatNumber}
          icon={AlertTriangle}
        />
        <KPICard
          title="Avg Processing Time (min)"
          value={kpiData.avgProcessingTime}
          formatValue={(v) => `${v.toFixed(1)} min`}
          icon={Clock}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices to Encode ({filteredEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        onClick={() => handleSortToggle("invoiceNo")}
                        className="cursor-pointer"
                      >
                        Invoice No{" "}
                        {sortBy === "invoiceNo" &&
                          (sortOrder === "asc" ? (
                            <ArrowUp className="inline h-4 w-4" />
                          ) : (
                            <ArrowDown className="inline h-4 w-4" />
                          ))}
                      </TableHead>
                      <TableHead
                        onClick={() => handleSortToggle("dueDate")}
                        className="cursor-pointer"
                      >
                        Due Date{" "}
                        {sortBy === "dueDate" &&
                          (sortOrder === "asc" ? (
                            <ArrowUp className="inline h-4 w-4" />
                          ) : (
                            <ArrowDown className="inline h-4 w-4" />
                          ))}
                      </TableHead>
                      <TableHead>Salesman ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead
                        onClick={() => handleSortToggle("amount")}
                        className="cursor-pointer"
                      >
                        Amount{" "}
                        {sortBy === "amount" &&
                          (sortOrder === "asc" ? (
                            <ArrowUp className="inline h-4 w-4" />
                          ) : (
                            <ArrowDown className="inline h-4 w-4" />
                          ))}
                      </TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
              
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {entry.invoiceNo}
                        </TableCell>
                        <TableCell>
                          {new Date(entry.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{entry.salesmanId || "—"}</TableCell>
                        <TableCell>{entry.customer}</TableCell>
                        <TableCell>{formatCurrency(entry.amount)}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              entry.paymentStatus === "Paid"
                                ? "bg-green-100 text-green-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {entry.paymentStatus}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-white text-sm ${
                              entry.status === "Encoded"
                                ? "bg-green-500"
                                : entry.status === "With Errors"
                                ? "bg-red-500"
                                : "bg-yellow-500"
                            }`}
                          >
                            {entry.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              entry.priority === "High"
                                ? "bg-red-100 text-red-800"
                                : entry.priority === "Medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {entry.priority}
                          </span>
                        </TableCell>
                       
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredEntries.length)}{" "}
                  of {filteredEntries.length} invoices
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Last
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {validationIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Issues ({validationIssues.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Error Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validationIssues.map((issue, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{issue.invoiceNo}</TableCell>
                    <TableCell>{issue.errorType}</TableCell>
                    <TableCell>{issue.customer}</TableCell>
                    <TableCell>{issue.assignedTo}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-yellow-500 text-white rounded-full text-xs">
                        {issue.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button className="text-blue-600 hover:underline">
                        Fix Now
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      
    </div>
  );
}
