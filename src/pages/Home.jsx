import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Box, Play, Edit3 } from "lucide-react";
import { WalletBar } from "../components/WalletBar";
import { useCurrentAccount } from "@mysten/dapp-kit";
import {
  getWalrusImageUrl,
  loadDungeonsFromWallet,
} from "../services/dungeonService";
import { PACKAGE_ID } from "../config/sui";
import { useDungeonStore } from "../store/useDungeonStore";

export default function Home() {
  const account = useCurrentAccount();
  const { dungeons, loading, setDungeons, setLoading } = useDungeonStore();

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!account || !PACKAGE_ID) {
        setDungeons([]);
        return;
      }
      setLoading(true);
      try {
        const data = await loadDungeonsFromWallet(account.address, {
          hydrate: true,
        });
        if (isMounted) setDungeons(data || []);
      } catch (err) {
        console.error(err);
        if (isMounted) setDungeons([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [account, setDungeons, setLoading]);

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-orange-100 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <WalletBar />
        <header className="text-center mb-12 flex flex-col items-center gap-4">
          <div className="flex items-center justify-center gap-4 mb-4">
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
          <Link
            to="/editor"
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 w-fit text-white font-bold uppercase border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex items-center gap-2"
          >
            <Box strokeWidth={3} size={20} />
            Tạo map NFT
          </Link>
          <p className="text-base md:text-lg text-slate-700 max-w-3xl mx-auto">
            Nền tảng game Web3 cho phép người chơi tự thiết kế màn chơi, lưu trữ
            phi tập trung trên Walrus và sở hữu dưới dạng NFT trên Sui
            Blockchain.
          </p>
          {loading && PACKAGE_ID && (
            <p className="text-xs text-orange-600 font-mono">
              Đang tải dữ liệu on-chain...
            </p>
          )}
        </header>

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dungeons.map((game) => (
            <div
              key={game.id}
              className="relative group bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden"
            >
              <div className="p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">
                  Map #{game.id}
                </p>
                <h3 className="text-xl font-black text-slate-900">
                  {game.settings?.meta?.title || game.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {game.settings?.meta?.created || ""}
                </p>
                {game.imageBlobId && (
                  <div className="rounded border-2 border-slate-200 overflow-hidden">
                    <img
                      src={getWalrusImageUrl(game.imageBlobId)}
                      alt="Thumbnail"
                      className="w-full h-40 object-cover"
                    />
                  </div>
                )}

                <div className="text-sm text-slate-600 flex gap-3">
                  <span>
                    Size:{" "}
                    {game.settings
                      ? `${game.settings.config.width}x${game.settings.config.height}`
                      : "N/A"}
                  </span>
                  <span>
                    Tile:{" "}
                    {game.settings
                      ? game.settings.config.tileSize
                      : game.tileSize || 32}
                  </span>
                </div>
              </div>

              <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <Link
                  to={`/play/${game.id}`}
                  className="px-4 py-2 bg-green-500 hover:bg-green-400 text-white font-bold uppercase border-2 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.4)] flex items-center gap-2"
                >
                  <Play strokeWidth={3} size={18} /> Play
                </Link>
                <Link
                  to={`/editor/${game.id}`}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold uppercase border-2 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.4)] flex items-center gap-2"
                >
                  <Edit3 strokeWidth={3} size={18} /> Edit
                </Link>
              </div>
            </div>
          ))}
          {!loading && dungeons.length === 0 && (
            <div className="col-span-full text-center text-sm text-slate-500 font-mono py-10">
              {account && PACKAGE_ID
                ? "Chưa có dungeon on-chain. Hãy mint một map mới!"
                : "Kết nối ví để tải dungeon trên testnet."}
            </div>
          )}
          {loading && (
            <div className="col-span-full text-center text-sm text-orange-600 font-mono py-8">
              Đang tải dữ liệu on-chain...
            </div>
          )}
        </section>

        <div className="mt-10 flex flex-col items-center gap-3">
          <footer className="text-center text-sm text-slate-500 font-mono">
            Powered by Sui Blockchain • Walrus Protocol • Kaboom.js
          </footer>
        </div>
      </div>
    </div>
  );
}
