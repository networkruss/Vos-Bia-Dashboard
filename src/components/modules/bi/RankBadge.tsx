// src/components/modules/bi/RankBadge.tsx
import { Trophy } from "lucide-react";

interface RankBadgeProps {
  rank: number;
}

export const RankBadge = ({ rank }: RankBadgeProps) => {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center">
        <div className="relative w-8 h-8">
          <Trophy className="w-8 h-8 text-yellow-500 fill-yellow-500" />
          <span
            className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white"
            style={{ paddingTop: "2px" }}
          >
            1
          </span>
        </div>
      </div>
    );
  }

  // Ranks 2+
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-7 h-7">
        <Trophy className="w-7 h-7 text-gray-400 fill-gray-400 dark:text-gray-500 dark:fill-gray-500" />
        <span
          className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300"
          style={{ paddingTop: "2px" }}
        >
          {rank}
        </span>
      </div>
    </div>
  );
};