import RealPivotAnalysis from "@/components/executive-v2/RealPivotAnalysis";

export default function ExecutiveV2Page() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Executive Ad-Hoc Analysis (V2)
          </h1>
          <p className="text-gray-500">
            Interactive Pivot Tool: Drag and drop items to create custom sales
            reports.
          </p>
        </div>

        {/* Load the Drag-and-Drop Component */}
        <RealPivotAnalysis />
      </div>
    </div>
  );
}
