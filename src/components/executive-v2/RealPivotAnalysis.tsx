"use client";

import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Table2,
  X,
  Loader2,
  RefreshCcw,
  FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";

// --- TYPES ---
type DataItem = {
  id: string;
  name: string;
  sales: number;
};

// --- TABLE ROW COMPONENT (Mukhang Excel Row) ---
function SortableTableRow({
  item,
  isOverlay = false,
}: {
  item: DataItem;
  isOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, data: item });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        grid grid-cols-12 gap-4 items-center p-2 border-b text-sm
        ${isDragging ? "opacity-30 bg-blue-50 z-50" : "bg-white"}
        ${
          isOverlay
            ? "shadow-xl border border-blue-500 bg-white scale-105"
            : "hover:bg-gray-50"
        }
        transition-colors select-none cursor-grab
      `}
      {...attributes}
      {...listeners}
    >
      {/* Column 1: Grip & Name */}
      <div className="col-span-8 flex items-center gap-3">
        <GripVertical size={16} className="text-gray-400" />
        <span className="font-medium text-gray-700 truncate" title={item.name}>
          {item.name}
        </span>
      </div>

      {/* Column 2: Sales Value (Right Aligned) */}
      <div className="col-span-4 text-right font-mono font-semibold text-gray-600">
        ₱
        {item.sales.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function RealPivotAnalysis() {
  const [dateFrom, setDateFrom] = useState(
    format(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      "yyyy-MM-dd"
    )
  );
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedDivision, setSelectedDivision] = useState("Dry Goods");

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<{ source: DataItem[]; pivot: DataItem[] }>(
    {
      source: [],
      pivot: [],
    }
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  // FETCH DATA
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sales/executive-v2?fromDate=${dateFrom}&toDate=${dateTo}&division=${selectedDivision}`
      );
      const json = await res.json();

      if (json.data && json.data[selectedDivision]) {
        const divisionData = json.data[selectedDivision];

        const formattedItems: DataItem[] = divisionData.map(
          (d: any, index: number) => ({
            id: `row-${index}-${d.name.replace(/\s+/g, "-")}`, // Unique ID
            name: d.name,
            sales: parseFloat(d.sales),
          })
        );

        setItems({
          source: formattedItems,
          pivot: [],
        });
      } else {
        setItems({ source: [], pivot: [] });
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo, selectedDivision]);

  // COMPUTATIONS
  const totalSales = items.pivot.reduce((acc, i) => acc + i.sales, 0);

  // DND SENSORS
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findContainer = (id: string) => {
    if (items.source.find((i) => i.id === id)) return "source";
    if (items.pivot.find((i) => i.id === id)) return "pivot";
    return undefined;
  };

  const handleDragStart = (event: DragStartEvent) =>
    setActiveId(event.active.id as string);

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(active.id as string);
    const overContainer =
      findContainer(over.id as string) ||
      (over.id === "source" || over.id === "pivot" ? over.id : null);
    if (!activeContainer || !overContainer || activeContainer === overContainer)
      return;

    setItems((prev) => {
      const activeItems = prev[activeContainer as keyof typeof prev];
      const overItems = prev[overContainer as keyof typeof prev];
      const activeIndex = activeItems.findIndex((i) => i.id === active.id);
      const overIndex = overItems.findIndex((i) => i.id === over.id);
      let newIndex;
      if (over.id === "source" || over.id === "pivot") {
        newIndex = overItems.length + 1;
      } else {
        const isBelowOverItem =
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top > over.rect.top + over.rect.height;
        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }
      return {
        ...prev,
        [activeContainer]: [
          ...prev[activeContainer as keyof typeof prev].filter(
            (item) => item.id !== active.id
          ),
        ],
        [overContainer]: [
          ...prev[overContainer as keyof typeof prev].slice(0, newIndex),
          activeItems[activeIndex],
          ...prev[overContainer as keyof typeof prev].slice(
            newIndex,
            prev[overContainer as keyof typeof prev].length
          ),
        ],
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeContainer = findContainer(active.id as string);
    const overContainer =
      findContainer(over?.id as string) ||
      (over?.id === "source" || over?.id === "pivot" ? over?.id : null);
    if (activeContainer && overContainer && activeContainer === overContainer) {
      const activeIndex = items[activeContainer].findIndex(
        (i) => i.id === active.id
      );
      const overIndex = items[overContainer].findIndex(
        (i) => i.id === over?.id
      );
      if (activeIndex !== overIndex) {
        setItems((prev) => ({
          ...prev,
          [activeContainer]: arrayMove(
            prev[activeContainer],
            activeIndex,
            overIndex
          ),
        }));
      }
    }
    setActiveId(null);
  };

  const activeItem = activeId
    ? [...items.source, ...items.pivot].find((i) => i.id === activeId)
    : null;

  return (
    <div className="space-y-6">
      {/* --- CONTROLS --- */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-wrap gap-4 items-end justify-between">
        <div className="flex gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border rounded p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border rounded p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Division
            </label>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="border rounded p-2 text-sm w-40 font-medium"
            >
              <option value="Dry Goods">Dry Goods</option>
              <option value="Frozen Goods">Frozen Goods</option>
              <option value="Industrial">Industrial</option>
              <option value="Mama Pina's">Mama Pina's</option>
            </select>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="animate-spin w-4 h-4" />
          ) : (
            <RefreshCcw className="w-4 h-4" />
          )}{" "}
          Refresh
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 h-[700px]">
          {/* --- LEFT: SOURCE LIST (AVAILABLE SUPPLIERS) --- */}
          <div className="w-1/3 flex flex-col bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="p-3 bg-gray-50 border-b font-semibold text-gray-700 text-sm flex justify-between items-center">
              <span className="flex items-center gap-2">
                <FileSpreadsheet size={16} /> Suppliers ({selectedDivision})
              </span>
              <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                {items.source.length}
              </span>
            </div>

            {/* Header Row for Source */}
            <div className="grid grid-cols-12 gap-4 p-2 bg-gray-100 text-xs font-bold text-gray-500 border-b">
              <div className="col-span-8 pl-2">SUPPLIER NAME</div>
              <div className="col-span-4 text-right">SALES</div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50/30">
              {loading ? (
                <div className="flex justify-center items-center h-full text-gray-400">
                  Loading Data...
                </div>
              ) : (
                <SortableContext
                  id="source"
                  items={items.source.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="min-h-[100px]">
                    {items.source.map((item) => (
                      <SortableTableRow key={item.id} item={item} />
                    ))}
                  </div>
                </SortableContext>
              )}
            </div>
          </div>

          {/* --- RIGHT: PIVOT TABLE (DROP ZONE) --- */}
          <div className="flex-1 flex flex-col bg-white border rounded-xl shadow-sm overflow-hidden border-dashed border-2 border-blue-200">
            <div className="p-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
              <span className="font-semibold text-blue-800 text-sm flex items-center gap-2">
                <Table2 className="w-4 h-4" /> Pivot Table Area
              </span>
              <button
                onClick={() =>
                  setItems({
                    source: [...items.source, ...items.pivot],
                    pivot: [],
                  })
                }
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 bg-white px-2 py-1 rounded border border-red-100 hover:bg-red-50"
              >
                <X size={14} /> Clear Pivot
              </button>
            </div>

            {/* Excel Header Row */}
            <div className="grid grid-cols-12 gap-4 p-2 bg-slate-100 border-b text-xs font-bold text-slate-600 uppercase tracking-wide">
              <div className="col-span-8 pl-2">Supplier Name</div>
              <div className="col-span-4 text-right">Total Net Sales</div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white">
              <SortableContext
                id="pivot"
                items={items.pivot.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="min-h-[300px] h-full">
                  {items.pivot.length === 0 && !loading && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 mt-10">
                      <Table2 size={48} className="mb-2 opacity-20" />
                      <p>Drag Suppliers here to build your table</p>
                    </div>
                  )}
                  {items.pivot.map((item) => (
                    <SortableTableRow key={item.id} item={item} />
                  ))}
                </div>
              </SortableContext>
            </div>

            {/* TOTALS FOOTER */}
            <div className="p-4 bg-slate-50 border-t flex justify-end items-center gap-4 border-t-4 border-t-double">
              <span className="text-sm font-bold text-gray-500 uppercase">
                Grand Total:
              </span>
              <span className="text-3xl font-bold text-green-700 font-mono bg-white px-4 py-1 rounded border border-green-200 shadow-sm">
                ₱
                {totalSales.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        <DragOverlay
          dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({}) }}
        >
          {activeItem ? <SortableTableRow item={activeItem} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
