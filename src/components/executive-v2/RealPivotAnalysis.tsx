"use client";

import { useState, useEffect } from "react";

interface RealPivotAnalysisProps {
  lockedDivision?: string;
  fromDate: string;
  toDate: string;
}

export default function RealPivotAnalysis({
  lockedDivision,
  fromDate,
  toDate,
}: RealPivotAnalysisProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch Data automatically when props change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          fromDate: fromDate,
          toDate: toDate,
          division: lockedDivision || "Dry Goods",
        });

        const res = await fetch(`/api/sales/divisionshead?${query.toString()}`);
        const json = await res.json();
        setData(json.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [lockedDivision, fromDate, toDate]); // Re-fetch when ANY prop changes

  return (
    <div className="h-full flex flex-col p-4 bg-white dark:bg-gray-800 rounded-lg">
      {/* HEADER / STATUS (Since controls are removed) */}
      <div className="mb-4 text-sm text-gray-500 dark:text-gray-400 flex justify-between items-center border-b pb-2 dark:border-gray-700">
        <span>
          Analysis for:{" "}
          <strong className="text-gray-900 dark:text-white">
            {lockedDivision}
          </strong>
        </span>
        <span>
          Period: {fromDate} to {toDate}
        </span>
      </div>

      {/* RESULT AREA */}
      <div className="flex-1 overflow-auto border rounded-lg p-4 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
        {loading ? (
          <div className="flex h-full items-center justify-center text-gray-400 animate-pulse">
            Loading Pivot Data...
          </div>
        ) : data ? (
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-sm border-b pb-2 mb-2 dark:text-gray-300">
              <span>Supplier</span>
              <span>Total Sales</span>
            </div>
            {(() => {
              // Handle API structure
              const list = Array.isArray(data)
                ? data
                : lockedDivision && data[lockedDivision]
                ? data[lockedDivision]
                : [];

              if (list.length === 0)
                return (
                  <p className="text-center text-gray-400 mt-10">
                    No records found for this selection.
                  </p>
                );

              return list.map((item: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-100 dark:hover:bg-gray-800 px-2 rounded"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {item.name}
                  </span>
                  <span className="font-mono font-medium dark:text-white">
                    {Number(item.sales).toLocaleString("en-PH", {
                      style: "currency",
                      currency: "PHP",
                    })}
                  </span>
                </div>
              ));
            })()}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            No data loaded.
          </div>
        )}
      </div>
    </div>
  );
}
