import { Link } from "react-router-dom";
import { Box, Play } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-black text-slate-900 mb-4 flex items-center justify-center gap-4">
            <Box strokeWidth={3} className="text-orange-600" size={64} />
            WALRUS DUNGEON
          </h1>
          <p className="text-xl font-bold text-slate-600 uppercase tracking-widest">
            Craft & Conquer
          </p>
        </div>

        <div className="bg-white border-4 border-slate-900 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] p-8 mb-8">
          <p className="text-lg text-slate-700 mb-6">
            Nền tảng game Web3 cho phép người chơi tự thiết kế màn chơi, lưu trữ
            phi tập trung trên Walrus và sở hữu dưới dạng NFT trên Sui
            Blockchain.
          </p>

          <div className="flex flex-col gap-4">
            <Link
              to="/editor"
              className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg uppercase border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] hover:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all flex items-center justify-center gap-3"
            >
              <Box strokeWidth={3} size={24} />
              Tạo Map Mới
            </Link>

            <button
              disabled
              className="px-8 py-4 bg-slate-300 text-slate-500 font-bold text-lg uppercase border-4 border-slate-900 opacity-50 cursor-not-allowed flex items-center justify-center gap-3"
            >
              <Play strokeWidth={3} size={24} />
              Chơi Game (Sắp ra mắt)
            </button>
          </div>
        </div>

        <div className="text-sm text-slate-500 font-mono">
          <p>Powered by Sui Blockchain • Walrus Protocol • Kaboom.js</p>
        </div>
      </div>
    </div>
  );
}
