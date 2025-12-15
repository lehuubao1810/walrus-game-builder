import { Link } from "react-router-dom";
import { Play, Edit3 } from "lucide-react";

export function GameGrid({ games, account }) {
  if (games.length === 0) {
    return (
      <div className="text-center text-sm text-slate-500 font-mono py-10">
        No games found in this category.
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {games.map((game) => (
        <div
          key={game.id}
          className="relative group bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden transition-transform hover:-translate-y-1"
        >
          <div className="p-4 space-y-2">
            <div className="flex justify-between items-baseline">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500 truncate">
                Map #{game.id?.slice(0, 6)}
              </p>
              {game.runCount > 0 && (
                <span className="text-[10px] uppercase font-black text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
                  HOT: {game.runCount} plays
                </span>
              )}
            </div>
            <h3 className="text-xl font-black text-slate-900 truncate">
              {game.name}
            </h3>
            <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
              <span>By: {game.creator?.slice(0, 6)}...</span>
              {game.patchMapId && (
                <span
                  title={game.patchMapId}
                  className="bg-slate-100 px-1 rounded"
                >
                  v.{game.patchMapId.slice(0, 4)}
                </span>
              )}
            </div>
            {game.imageUrl && (
              <div className="rounded border-2 border-slate-200 overflow-hidden bg-slate-100">
                <img
                  src={game.imageUrl}
                  alt="Thumbnail"
                  className="w-full h-40 object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Reward Badge Mock */}
            {game.hasReward && (
              <div className="mt-2 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded inline-block border border-green-200">
                💰 Reward Pool Active
              </div>
            )}
          </div>

          <div className="absolute inset-0 bg-slate-900/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
            {account ? (
              <>
                <Link
                  to={`/play/${game.id}`}
                  className="px-4 py-2 bg-green-500 hover:bg-green-400 text-white font-bold uppercase border-2 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.4)] flex items-center gap-2 transform hover:scale-105 transition-transform"
                >
                  <Play strokeWidth={3} size={18} /> Play
                </Link>
                <Link
                  to={`/editor/${game.id}`}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold uppercase border-2 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.4)] flex items-center gap-2 transform hover:scale-105 transition-transform"
                >
                  <Edit3 strokeWidth={3} size={18} /> Edit
                </Link>
              </>
            ) : (
              <span className="text-white font-bold font-mono bg-slate-800 px-3 py-1 border border-slate-600">
                Connect wallet to play
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
