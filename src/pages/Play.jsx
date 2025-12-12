import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import kaboom from "kaboom";
import { Play as PlayIcon, ArrowLeft, Edit3 } from "lucide-react";
import {
  fetchDungeonById,
  readDungeonMap,
  validateMapJsonSchema,
} from "../services/dungeonService";
import { PACKAGE_ID } from "../config/sui";

export default function Play() {
  const { id } = useParams();
  const gameContainerRef = useRef(null);
  const [gameData, setGameData] = useState(null);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        let game = null;
        if (PACKAGE_ID) {
          const onchain = await fetchDungeonById(id);
          if (onchain) {
            const mapJson = await readDungeonMap(onchain.blobId);
            if (!validateMapJsonSchema(mapJson)) throw new Error("Map không hợp lệ");
            onchain.settings = mapJson;
            game = onchain;
          }
        }
        if (active) setGameData(game);
      } catch (err) {
        console.error(err);
        if (active) setGameData(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (
      !gameData ||
      !gameContainerRef.current ||
      !gameData.settings?.layout ||
      !gameData.settings?.config
    )
      return;

    const { settings } = gameData;
    const tileSize = settings.config.tileSize || 32;
    const width = settings.config.width * tileSize;
    const height = settings.config.height * tileSize;

    // Tính scale để khung game không vượt quá 90% chiều rộng và 80% chiều cao
    const scaleFactor = Math.min(
      (window.innerWidth * 0.95) / width,
      (window.innerHeight * 0.85) / height,
      1.2
    );
    setScale(scaleFactor);

    let k;
    let isCleanedUp = false;

    if (gameContainerRef.current.innerHTML !== "") {
      gameContainerRef.current.innerHTML = "";
    }

    try {
      k = kaboom({
        width,
        height,
        scale: 1,
        root: gameContainerRef.current,
        global: false,
        background: [255, 247, 237],
      });

      k.setGravity(1600);

      function patrol(speed = 60, dir = 1) {
        return {
          id: "patrol",
          require: ["pos", "area"],
          add() {
            this.on("collide", (obj, col) => {
              if (col.isLeft() || col.isRight()) {
                dir = -dir;
              }
            });
          },
          update() {
            this.move(speed * dir, 0);
          },
        };
      }

      const validSprites = new Set();
      const loadPromises = [];

      const tilesDef = {};
      const assets = settings.assets || {};

      Object.keys(assets).forEach((key) => {
        const asset = assets[key];
        tilesDef[key] = () => {
          const comps = [
            k.area(),
            k.body({ isStatic: true }),
            `wall_${key}`,
            "wall",
          ];

          if (asset.type === "image" && asset.value) {
            const p = k
              .loadSprite(`wall_${key}`, asset.value)
              .then(() => validSprites.add(key))
              .catch(() => {});
            loadPromises.push(p);
          }

          if (asset.type === "image" && asset.value && validSprites.has(key)) {
            comps.push(
              k.sprite(`wall_${key}`, { width: tileSize, height: tileSize })
            );
          } else {
            const colorHex =
              asset.type === "color" ? asset.value : "#94a3b8" /* fallback */;
            comps.push(k.rect(tileSize, tileSize));
            comps.push(k.color(k.Color.fromHex(colorHex)));
            comps.push(k.outline(2, k.BLACK));
          }
          return comps;
        };
      });

      tilesDef["$"] = () => [
        k.circle(10),
        k.color(234, 179, 8),
        k.outline(2, k.BLACK),
        k.area(),
        k.pos(16, 16),
        "coin",
      ];

      tilesDef["@"] = () => [
        k.rect(24, 24),
        k.color(59, 130, 246),
        k.outline(2, k.BLACK),
        k.area(),
        k.body(),
        k.anchor("center"),
        k.pos(16, 16),
        "player",
      ];

      tilesDef["E"] = () => [
        k.rect(24, 24),
        k.color(168, 85, 247),
        k.outline(2, k.BLACK),
        k.area(),
        k.body(),
        k.anchor("center"),
        k.pos(16, 16),
        patrol(),
        "enemy",
        "danger",
      ];

      tilesDef["^"] = () => [
        k.polygon([k.vec2(0, 32), k.vec2(16, 0), k.vec2(32, 32)]),
        k.color(239, 68, 68),
        k.outline(2, k.BLACK),
        k.area(),
        k.body({ isStatic: true }),
        "trap",
        "danger",
      ];

      Promise.all(loadPromises).then(() => {
        if (isCleanedUp) return;

        const levelConfig = {
          tileWidth: tileSize,
          tileHeight: tileSize,
          tiles: tilesDef,
        };

        k.scene("main", () => {
          const levelMap = settings.layout.map((row) => row);
          const level = k.addLevel(levelMap, levelConfig);
          const players = level.get("player");

          if (players.length > 0) {
            const player = players[0];
            const SPEED = 200;
            const JUMP_FORCE = 600;

            k.camPos(player.pos);

            player.onUpdate(() => {
              k.camPos(player.pos);
              if (player.pos.y > settings.config.height * tileSize + 200) {
                k.shake(20);
                k.go("main");
              }
            });

            k.onKeyDown("left", () => player.move(-SPEED, 0));
            k.onKeyDown("right", () => player.move(SPEED, 0));
            const jump = () => {
              if (player.isGrounded()) player.jump(JUMP_FORCE);
            };
            k.onKeyPress("up", jump);
            k.onKeyPress("space", jump);

            player.onCollide("coin", (c) => {
              k.destroy(c);
              k.shake(2);
            });
            player.onCollide("danger", () => {
              k.shake(20);
              k.addKaboom(player.pos);
              k.destroy(player);
              k.wait(1, () => k.go("main"));
            });
          }
        });

        k.go("main");
      });
    } catch (err) {
      console.error(err);
    }

    return () => {
      isCleanedUp = true;
      if (k && k.quit) k.quit();
    };
  }, [gameData]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-orange-50 text-slate-900">
        <p className="text-lg font-bold mb-2">Đang tải map...</p>
        <p className="text-sm text-slate-600">Vui lòng chờ trong giây lát</p>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-orange-50 text-slate-900">
        <p className="text-lg font-bold mb-4">Không tìm thấy map</p>
        <Link
          to="/"
          className="px-4 py-2 border-2 border-slate-900 bg-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] font-bold"
        >
          Quay về trang chủ
        </Link>
      </div>
    );
  }

  const tileSize = gameData.settings.config.tileSize || 32;
  const width = gameData.settings.config.width * tileSize;
  const height = gameData.settings.config.height * tileSize;

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-orange-100 relative flex flex-col items-center justify-center p-6 text-slate-900">
      <header className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <Link
          to="/"
          className="px-3 py-2 border-2 border-slate-900 bg-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] font-bold flex items-center gap-2"
        >
          <ArrowLeft strokeWidth={3} size={16} />
          Home
        </Link>

        <div className="text-lg font-black text-slate-900 text-center flex-1">
          {gameData.settings.meta.title}
        </div>

        <Link
          to={`/editor/${id}`}
          className="px-3 py-2 border-2 border-slate-900 bg-yellow-400 hover:bg-yellow-300 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] font-bold flex items-center gap-2"
        >
          <Edit3 strokeWidth={3} size={16} />
          Edit
        </Link>
      </header>

      <div className="w-full flex items-center justify-center mt-16">
        <div
          className="border-4 border-slate-900 shadow-[16px_16px_0px_0px_rgba(0,0,0,0.8)] bg-white flex items-center justify-center"
          style={{
            maxWidth: "92vw",
            maxHeight: "82vh",
            overflow: "hidden",
          }}
        >
          <div
            ref={gameContainerRef}
            className="block"
            style={{
              width,
              height,
              transform: `scale(${scale})`,
              transformOrigin: "center",
            }}
          ></div>
        </div>
      </div>

      <div className="mt-6 px-4 py-3 bg-white/80 border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,0.6)] text-sm font-mono text-slate-800 text-center max-w-3xl">
        <div className="font-bold mb-2">Hướng dẫn</div>
        <div className="flex flex-wrap justify-center gap-4">
          <span>← / → : Di chuyển</span>
          <span>↑ hoặc Space: Nhảy</span>
          <span>@ : Nhân vật</span>
          <span>$ : Coin</span>
          <span>E : Enemy</span>
          <span>^ : Bẫy</span>
          <span>1/2/3 : Tường</span>
        </div>
      </div>
    </div>
  );
}

