import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Box, Play, Edit3, TrendingUp, Trophy, Grid } from "lucide-react";
import { WalletBar } from "../components/WalletBar";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { loadDungeonsFromWallet } from "../services/dungeonService";
import { PACKAGE_ID } from "../config/sui";
import { useDungeonStore } from "../store/useDungeonStore";
import { GameGrid } from "../components/GameGrid";

const TABS = [
  { id: "all", label: "All Games", icon: Grid },
  { id: "hot", label: "Hot & Trending", icon: TrendingUp },
  { id: "reward", label: "Play-to-Earn", icon: Trophy },
];

export default function Home() {
  const account = useCurrentAccount();
  const { dungeons, loading, setDungeons, setLoading } = useDungeonStore();
  const [activeTab, setActiveTab] = useState("all");
  const [stats, setStats] = useState({});

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // 1. Load Stats
        let statsData = {};
        try {
          const statsRes = await fetch("http://localhost:3000/api/stats");
          statsData = await statsRes.json();
          if (isMounted) setStats(statsData);
        } catch (e) {
          console.warn("API offline");
        }

        // 2. Load Maps (Discovery)
        try {
          const mapsRes = await fetch("http://localhost:3000/api/dungeons");
          const mapsData = await mapsRes.json();

          // Transform API data to expected format if needed
          // API returns { id, name, blob_id ... }
          if (isMounted) {
            setDungeons(
              mapsData.map((m) => ({
                ...m,
                data: {
                  name: m.name,
                  image_url: m.image_url,
                  blob_id: m.blob_id,
                },
                // Use captured image_url from event, fallback to placeholder
                imageUrl:
                  m.image_url ||
                  "https://placehold.co/600x400/orange/white?text=No+Image",
              }))
            );
          }
        } catch (err) {
          console.error("Failed to load discovery:", err);
          // Fallback to wallet if API fails?
          if (account) {
            const data = await loadDungeonsFromWallet(account.address, {
              hydrate: false,
            });
            if (isMounted) setDungeons(data || []);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [account, setDungeons, setLoading]);

  // Merge Stats & Filter
  const processedDungeons = useMemo(() => {
    return dungeons
      .map((d) => ({
        ...d,
        runCount: stats[d.id]?.runCount || 0,
        lastRunAt: stats[d.id]?.lastRunAt || 0,
        hasReward: true, // Mock: assume all have basic reward pool for now
      }))
      .sort((a, b) => {
        // Default sort by ID (newest first assuming ID increases, or we can use another field if available)
        // Since we don't have timestamp in NFT struct easily accessible without parsing ID,
        // we heavily rely on runCount for Hot.
        return 0;
      });
  }, [dungeons, stats]);

  const filteredGames = useMemo(() => {
    let games = [...processedDungeons];
    if (activeTab === "hot") {
      return games.sort((a, b) => b.runCount - a.runCount);
    }
    if (activeTab === "reward") {
      return games.filter((g) => g.hasReward);
    }
    return games.reverse(); // Show newest minted first (roughly)
  }, [processedDungeons, activeTab]);

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-orange-100 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <WalletBar />
        <header className="text-center mb-10 flex flex-col items-center gap-4">
          <div className="flex items-center justify-center gap-4 mb-2">
            <Box strokeWidth={3} className="text-orange-600" size={64} />
            <div>
              <h1 className="text-5xl font-black text-slate-900">
                WALRUS DUNGEON
              </h1>
              <p className="text-lg font-bold text-slate-600 uppercase tracking-widest">
                Craft & Conquer
              </p>
            </div>
          </div>

          <p className="text-base md:text-lg text-slate-700 max-w-2xl mx-auto">
            Design levels, store on Walrus, own on Sui. <br />
            <span className="font-bold text-orange-600">
              Play, compete, and earn rewards!
            </span>
          </p>

          <div className="flex gap-4 mt-4">
            {account ? (
              <Link
                to="/editor"
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex items-center gap-2"
              >
                <Box strokeWidth={3} size={20} />
                Create New Map
              </Link>
            ) : (
              <button className="px-6 py-3 bg-slate-200 text-slate-500 font-bold uppercase border-4 border-slate-300 cursor-not-allowed">
                Connect Wallet to Create
              </button>
            )}
          </div>
        </header>

        {/* Discovery Tabs */}
        <div className="mb-8 border-b-4 border-slate-200 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-3 font-bold uppercase tracking-wider text-sm transition-all
                  ${
                    isActive
                      ? "bg-white border-x-4 border-t-4 border-slate-900 text-orange-600 -mb-1 pb-4 z-10"
                      : "text-slate-500 hover:bg-white/50 border-transparent border-x-4 border-t-4 hover:border-slate-200"
                  }
                `}
              >
                <Icon size={18} strokeWidth={3} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="col-span-full text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500 mx-auto mb-4"></div>
            <p className="text-slate-500 font-mono">
              Loading data from Sui Network...
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <GameGrid games={filteredGames} account={account} />
          </div>
        )}

        <div className="mt-16 flex flex-col items-center gap-3">
          <footer className="text-center text-sm text-slate-500 font-mono">
            Powered by Sui Blockchain • Walrus Protocol • Kaboom.js
          </footer>
        </div>
      </div>
    </div>
  );
}
