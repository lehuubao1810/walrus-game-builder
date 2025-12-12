import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import kaboom from "kaboom";

import {
  Play,
  Edit3,
  Box,
  CircleDollarSign,
  User,
  Eraser,
  Palette,
  MousePointer2,
  Grid,
  Download,
  Ghost,
  Flame,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Search,
  Hand,
} from "lucide-react";
import { WalletBar } from "../components/WalletBar";
import { useWalrusUpload } from "../hooks/useWalrusUpload";
import { useDungeonMint } from "../hooks/useDungeonMint";
import {
  fetchDungeonById,
  readDungeonMap,
  validateMapJsonSchema,
} from "../services/dungeonService";

// --- CẤU HÌNH BAN ĐẦU ---

const BASE_TILE_SIZE = 32;

// KÍCH THƯỚC KHUNG HÌNH CAMERA (VIEWPORT) CỐ ĐỊNH KHI CHƠI

const VIEWPORT_WIDTH = 20; // 20 ô ngang

const VIEWPORT_HEIGHT = 12; // 12 ô dọc

// Danh sách công cụ

const TOOLS = [
  { id: "1", char: "1", label: "TƯỜNG LOẠI 1", type: "WALL" },

  { id: "2", char: "2", label: "TƯỜNG LOẠI 2", type: "WALL" },

  { id: "3", char: "3", label: "TƯỜNG LOẠI 3", type: "WALL" },

  {
    id: "TRAP",
    char: "^",
    label: "BẪY (GAI)",
    type: "OBJ",
    icon: Flame,
    color: "#ef4444",
  },

  {
    id: "ENEMY",
    char: "E",
    label: "QUÁI VẬT",
    type: "OBJ",
    icon: Ghost,
    color: "#a855f7",
  },

  {
    id: "PLAYER",
    char: "@",
    label: "NHÂN VẬT",
    type: "OBJ",
    icon: User,
    color: "#3b82f6",
  },

  {
    id: "COIN",
    char: "$",
    label: "KHO BÁU",
    type: "OBJ",
    icon: CircleDollarSign,
    color: "#eab308",
  },

  {
    id: "EMPTY",
    char: " ",
    label: "CỤC TẨY",
    type: "TOOL",
    icon: Eraser,
    color: "#94a3b8",
  },
];

const PRESETS = {
  BRICK:
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/underground/brick-piece.png",

  STONE:
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/underground/iron-ball.png",

  WOOD: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/underground/hard-stone.png",
};

const DEFAULT_WALLS = {
  1: { color: "#f97316", type: "color", imgUrl: "" },
  2: { color: "#64748b", type: "color", imgUrl: "" },
  3: { color: "#78350f", type: "color", imgUrl: "" },
};

export default function Editor() {
  const { id } = useParams();

  const [wallConfigs, setWallConfigs] = useState(DEFAULT_WALLS);

  const [mapSize, setMapSize] = useState({ width: 20, height: 12 });

  const [mapData, setMapData] = useState(
    Array(12)
      .fill()
      .map(() => Array(20).fill(" "))
  );

  const [mode, setMode] = useState("EDIT");

  const [selectedToolId, setSelectedToolId] = useState("1");

  const [zoom, setZoom] = useState(1.0);

  const [isZoomMode, setIsZoomMode] = useState(false);
  const [mintStatus, setMintStatus] = useState("");

  const scrollContainerRef = useRef(null);

  const isDragging = useRef(false);

  const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0 });

  const gameContainerRef = useRef(null);

  const editorGridRef = useRef(null);
  const { uploadMap, uploadImage, isUploading } = useWalrusUpload();
  const { mintDungeon, isMinting } = useDungeonMint();

  // Nạp dữ liệu map on-chain theo id
  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const dungeon = await fetchDungeonById(id);
        if (!dungeon) return;
        // Sử dụng patchMapId để đọc map (nếu có), fallback về blobId
        const idToUse = dungeon.patchMapId || dungeon.blobId;
        if (!idToUse) return;
        const mapJson = await readDungeonMap(idToUse);
        if (!validateMapJsonSchema(mapJson)) return;

        setMapSize({
          width: mapJson.config.width,
          height: mapJson.config.height,
        });
        setMapData(mapJson.layout.map((row) => row.split("")));

        const nextWalls = { ...DEFAULT_WALLS };
        Object.entries(mapJson.assets).forEach(([key, asset]) => {
          nextWalls[key] = {
            ...nextWalls[key],
            type: asset.type,
            color: asset.type === "color" ? asset.value : nextWalls[key]?.color,
            imgUrl:
              asset.type === "image" ? asset.value : nextWalls[key]?.imgUrl,
          };
        });
        setWallConfigs(nextWalls);
        setMode("EDIT");
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [id]);

  const currentTool = TOOLS.find((t) => t.id === selectedToolId) || TOOLS[0];

  // --- XỬ LÝ ZOOM WHEEL ---

  useEffect(() => {
    const containerEl = scrollContainerRef.current;

    if (!containerEl) return;

    const handleWheel = (e) => {
      // Chỉ zoom khi đang bật chế độ Zoom

      if (mode === "EDIT" && isZoomMode) {
        e.preventDefault();

        const delta = e.deltaY > 0 ? -0.1 : 0.1;

        setZoom((prev) => Math.min(Math.max(prev + delta, 0.2), 3.0));
      }
    };

    containerEl.addEventListener("wheel", handleWheel, { passive: false });

    return () => containerEl.removeEventListener("wheel", handleWheel);
  }, [isZoomMode, mode]);

  const handleZoomChange = (delta) => {
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.2), 3.0));
  };

  // --- XỬ LÝ KÉO THẢ (DRAG TO PAN) ---

  const handleMouseDown = (e) => {
    // ĐIỀU KIỆN NGHIÊM NGẶT: Phải mode EDIT và đang bật ZOOM

    if (mode !== "EDIT" || !isZoomMode) return;

    e.preventDefault();

    isDragging.current = true;

    const container = scrollContainerRef.current;

    if (container) {
      dragStart.current = {
        x: e.pageX,

        y: e.pageY,

        left: container.scrollLeft,

        top: container.scrollTop,
      };

      container.style.cursor = "grabbing";
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;

    e.preventDefault();

    const container = scrollContainerRef.current;

    if (container) {
      const dx = e.pageX - dragStart.current.x;

      const dy = e.pageY - dragStart.current.y;

      container.scrollLeft = dragStart.current.left - dx;

      container.scrollTop = dragStart.current.top - dy;
    }
  };

  const handleMouseUp = () => {
    if (isDragging.current) {
      isDragging.current = false;

      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.cursor = isZoomMode
          ? "grab"
          : "default";
      }
    }
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      // Reset cursor dựa trên mode

      if (mode === "EDIT" && isZoomMode) {
        scrollContainerRef.current.style.cursor = "grab";
      } else {
        scrollContainerRef.current.style.cursor = "default";
      }
    }
  }, [isZoomMode, mode]);

  // Center map khi mới load EDITOR

  useEffect(() => {
    if (mode === "EDIT" && scrollContainerRef.current) {
      const container = scrollContainerRef.current;

      container.scrollLeft = (2000 - container.clientWidth) / 2;

      container.scrollTop = (2000 - container.clientHeight) / 2;
    }
  }, [mode]); // Chạy lại khi chuyển sang mode EDIT

  const handleFileUpload = (wallId, event) => {
    const file = event.target.files[0];

    if (file) {
      const objectUrl = URL.createObjectURL(file);

      updateWallConfig(wallId, "imgUrl", objectUrl);
    }
  };

  const handleResize = (dWidth, dHeight) => {
    const newW = mapSize.width + dWidth;

    const newH = mapSize.height + dHeight;

    if (newW < 5 || newW > 100 || newH < 5 || newH > 100) return;

    const newMap = Array(newH)
      .fill()
      .map((_, r) =>
        Array(newW)
          .fill()
          .map((_, c) => {
            if (mapData[r] && mapData[r][c]) return mapData[r][c];

            return " ";
          })
      );

    setMapSize({ width: newW, height: newH });

    setMapData(newMap);
  };

  const handleCellClick = (rowIndex, colIndex) => {
    if (isZoomMode) return;

    const newMap = [...mapData];

    if (!newMap[rowIndex]) return;

    if (currentTool.id === "PLAYER") {
      for (let r = 0; r < mapSize.height; r++) {
        for (let c = 0; c < mapSize.width; c++) {
          if (newMap[r] && newMap[r][c] === "@") newMap[r][c] = " ";
        }
      }
    }

    newMap[rowIndex][colIndex] = currentTool.char;

    setMapData(newMap);
  };

  // Validate map trước khi PLAY hoặc Export
  const validateMap = () => {
    const flat = mapData.flat();
    const allowedChars = new Set([...Object.keys(wallConfigs), "@", "$", "E", "^", " "]);

    // Ít nhất 1 player
    const playerCount = flat.filter((c) => c === "@").length;
    if (playerCount !== 1) {
      alert("Map cần có đúng 1 nhân vật (@).");
      return false;
    }

    // Không toàn ô trống
    if (flat.every((c) => c === " ")) {
      alert("Map không được để trống toàn bộ.");
      return false;
    }

    // Kiểm tra legend (chỉ ký tự cho phép)
    const hasIllegal = flat.some((c) => !allowedChars.has(c));
    if (hasIllegal) {
      alert("Map chứa ký tự không hợp lệ (ngoài legend cho phép).");
      return false;
    }

    // Giới hạn kích thước
    if (mapSize.width > 300 || mapSize.height > 100) {
      alert("Kích thước vượt giới hạn 300x100.");
      return false;
    }

    return true;
  };

  const updateWallConfig = (wallId, field, value) => {
    setWallConfigs((prev) => ({
      ...prev,

      [wallId]: { ...prev[wallId], [field]: value },
    }));
  };

  const buildMapPayload = () => {
    const assetsExport = {};

    Object.keys(wallConfigs).forEach((key) => {
      const conf = wallConfigs[key];

      assetsExport[key] = {
        type: conf.type,
        value: conf.type === "color" ? conf.color : conf.imgUrl,
      };
    });

    return {
      meta: {
        title: "Walrus Dungeon Map",
        created: new Date().toISOString(),
        engine: "Kaboom.js",
        version: "1.1",
      },
      config: {
        width: mapSize.width,
        height: mapSize.height,
        tileSize: BASE_TILE_SIZE,
      },
      assets: assetsExport,
      layout: mapData.map((row) => row.join("")),
    };
  };

  const handleExport = () => {
    const exportData = buildMapPayload();
    console.log("Exported map:", exportData);
    alert("Đã log dữ liệu map ra console.");
  };

  const handleSaveAndMint = async () => {
    if (!validateMap()) return;
    try {
      setMintStatus("Uploading map to Walrus...");
      const mapJson = buildMapPayload();
      
      // Upload map lên Walrus
      const mapResult = await uploadMap(mapJson);
      console.log("mapResult", mapResult);
      const blobId = mapResult.blobId;
      const patchMapId = mapResult.patchId;

      // Upload thumbnail riêng để lấy patchId và tạo URL
      setMintStatus("Uploading thumbnail to Walrus...");
      const thumbnail = await captureThumbnail();
      const imageResult = await uploadImage(thumbnail);
      const imagePatchId = imageResult.patchId;
      
      // Tạo image URL từ patchId
      const imageUrl = `https://wal-aggregator-testnet.staketab.org/v1/blobs/by-quilt-patch-id/${imagePatchId}`;

      setMintStatus("Minting on Sui testnet...");
      const digest = await mintDungeon({
        name: mapJson.meta.title,
        blobId,
        patchMapId,
        imageUrl,
      });

      setMintStatus(`Mint thành công: ${digest}`);
      // setMintStatus(`Mint thành công`);
    } catch (err) {
      console.error(err);
      setMintStatus(`Lỗi: ${err.message}`);
      alert(err.message);
    }
  };

  const captureThumbnail = async () => {
    const thumbTile = 16;
    const canvas = document.createElement("canvas");
    canvas.width = mapSize.width * thumbTile;
    canvas.height = mapSize.height * thumbTile;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#fff7ed";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawCell = (r, c, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(c * thumbTile, r * thumbTile, thumbTile, thumbTile);
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1;
      ctx.strokeRect(c * thumbTile, r * thumbTile, thumbTile, thumbTile);
    };

    mapData.forEach((row, r) => {
      row.forEach((cell, c) => {
        const wallConf = wallConfigs[cell];
        if (wallConf) {
          drawCell(r, c, wallConf.color || "#cbd5e1");
        } else if (cell === "@") {
          drawCell(r, c, "#3b82f6");
        } else if (cell === "$") {
          drawCell(r, c, "#eab308");
        } else if (cell === "E") {
          drawCell(r, c, "#a855f7");
        } else if (cell === "^") {
          drawCell(r, c, "#ef4444");
        }
      });
    });

    return new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/png")
    );
  };

  useEffect(() => {
    let k;

    let isCleanedUp = false;

    if (mode === "PLAY" && gameContainerRef.current) {
      if (gameContainerRef.current.innerHTML !== "")
        gameContainerRef.current.innerHTML = "";

      try {
        k = kaboom({
          width: VIEWPORT_WIDTH * BASE_TILE_SIZE,

          height: VIEWPORT_HEIGHT * BASE_TILE_SIZE,

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

        const loadPromises = [];

        const validSprites = new Set();

        Object.keys(wallConfigs).forEach((key) => {
          const conf = wallConfigs[key];

          if (conf.type === "image" && conf.imgUrl) {
            const p = k
              .loadSprite(`wall_${key}`, conf.imgUrl)
              .then(() => {
                if (!isCleanedUp) validSprites.add(key);
              })
              .catch(() => {});

            loadPromises.push(p);
          }
        });

        Promise.all(loadPromises).then(() => {
          if (isCleanedUp) return;

          const tilesDef = {};

          Object.keys(wallConfigs).forEach((key) => {
            const conf = wallConfigs[key];

            tilesDef[key] = () => {
              const comps = [
                k.area(),
                k.body({ isStatic: true }),
                `wall_${key}`,
                "wall",
              ];

              if (
                conf.type === "image" &&
                conf.imgUrl &&
                validSprites.has(key)
              ) {
                comps.push(
                  k.sprite(`wall_${key}`, {
                    width: BASE_TILE_SIZE,
                    height: BASE_TILE_SIZE,
                  })
                );
              } else {
                comps.push(k.rect(BASE_TILE_SIZE, BASE_TILE_SIZE));

                comps.push(k.color(k.Color.fromHex(conf.color)));

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

          const levelConfig = {
            tileWidth: BASE_TILE_SIZE,
            tileHeight: BASE_TILE_SIZE,
            tiles: tilesDef,
          };

          k.scene("main", () => {
            const levelMap = mapData.map((row) => row.join(""));

            const level = k.addLevel(levelMap, levelConfig);

            const players = level.get("player");

            if (players.length > 0) {
              const player = players[0];

              const SPEED = 200;

              const JUMP_FORCE = 600;

              k.camPos(player.pos);

              player.onUpdate(() => {
                k.camPos(player.pos);

                if (player.pos.y > mapSize.height * BASE_TILE_SIZE + 200) {
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
    }

     return () => {
       isCleanedUp = true;
       if (k && k.quit) k.quit();
     };
   }, [mode, mapData, mapSize, wallConfigs]);

  const RetroButton = ({ onClick, active, children, className, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative px-4 py-2 font-mono font-bold text-sm uppercase transition-all border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-[2px] disabled:translate-y-[2px] ${
        active ? "text-white" : "text-slate-900 hover:opacity-80"
      } ${className}`}
    >
      {children}
    </button>
  );

  const RetroIconButton = ({ onClick, children, className }) => (
    <button
      onClick={onClick}
      className={`p-1 border-2 border-slate-900 bg-white hover:bg-orange-100 transition-colors ${className}`}
    >
      {children}
    </button>
  );

  const currentTileSize = BASE_TILE_SIZE * zoom;

  return (
    <div className="flex h-screen bg-orange-50 text-slate-900 font-mono overflow-hidden relative pt-12">
      <div className="absolute top-0 left-0 right-0 z-40">
        <WalletBar />
      </div>
      <style>{`

        .hide-scrollbar::-webkit-scrollbar { display: none; }

        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

      `}</style>

      {/* SIDEBAR */}

      <div className="w-80 bg-white border-r-4 border-slate-900 flex flex-col shadow-xl z-10 overflow-y-auto">
        <div className="p-6 border-b-4 border-slate-900 bg-orange-100">
          <h1 className="text-2xl font-black tracking-tighter text-orange-600 drop-shadow-sm flex items-center gap-2">
            <Box strokeWidth={3} /> WALRUS{" "}
            <span className="text-slate-900">BUILDER</span>
          </h1>

          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            Pixel Dungeon Editor v1.5
          </p>
        </div>

        <div className="p-6 border-b-4 border-slate-900 border-dashed">
          <h3 className="text-sm font-bold uppercase mb-4 flex items-center gap-2">
            <Grid size={16} strokeWidth={3} /> Kích thước Map
          </h3>

          <div className="flex gap-4">
            <div className="flex-1">
              <div className="text-xs font-bold mb-1 text-center text-slate-500">
                RỘNG: {mapSize.width}
              </div>

              <div className="flex items-center justify-between border-2 border-slate-900 bg-slate-100 p-1">
                <RetroIconButton
                  onClick={() => handleResize(-1, 0)}
                  className="w-8 h-8"
                >
                  -
                </RetroIconButton>

                <RetroIconButton
                  onClick={() => handleResize(1, 0)}
                  className="w-8 h-8"
                >
                  +
                </RetroIconButton>
              </div>
            </div>

            <div className="flex-1">
              <div className="text-xs font-bold mb-1 text-center text-slate-500">
                CAO: {mapSize.height}
              </div>

              <div className="flex items-center justify-between border-2 border-slate-900 bg-slate-100 p-1">
                <RetroIconButton
                  onClick={() => handleResize(0, -1)}
                  className="w-8 h-8"
                >
                  -
                </RetroIconButton>

                <RetroIconButton
                  onClick={() => handleResize(0, 1)}
                  className="w-8 h-8"
                >
                  +
                </RetroIconButton>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 flex-1 bg-slate-50">
          <h3 className="text-sm font-bold uppercase mb-4 flex items-center gap-2">
            <MousePointer2 size={16} strokeWidth={3} /> Công cụ vẽ
          </h3>

          <div className="flex flex-col gap-3">
            {TOOLS.map((tool) => {
              const isSelected = selectedToolId === tool.id;

              const isWall = tool.type === "WALL";

              return (
                <div
                  key={tool.id}
                  className={`transition-all ${
                    isSelected ? "translate-x-2" : ""
                  }`}
                >
                  <button
                    onClick={() => setSelectedToolId(tool.id)}
                    className={`w-full flex items-center gap-4 p-3 text-left border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.2)] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all ${
                      isSelected
                        ? "bg-orange-500 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] translate-y-[2px]"
                        : "bg-white text-slate-900"
                    }`}
                  >
                    <div
                      className="w-10 h-10 border-2 border-slate-900 flex items-center justify-center shrink-0 bg-white"
                      style={{
                        backgroundColor: isWall
                          ? wallConfigs[tool.id].color
                          : tool.color || "white",
                      }}
                    >
                      {isWall &&
                        wallConfigs[tool.id].type === "image" &&
                        wallConfigs[tool.id].imgUrl && (
                          <img
                            src={wallConfigs[tool.id].imgUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => (e.target.style.display = "none")}
                          />
                        )}

                      {!isWall && tool.icon && (
                        <tool.icon
                          size={20}
                          className={`relative z-10 ${
                            isSelected ? "text-white" : "text-slate-900"
                          }`}
                          strokeWidth={2.5}
                        />
                      )}
                    </div>

                    <span className="text-sm font-bold tracking-tight">
                      {tool.label}
                    </span>
                  </button>

                  {isWall && isSelected && (
                    <div className="mt-2 ml-4 p-3 border-l-4 border-slate-900 bg-white shadow-sm animate-in slide-in-from-left-2">
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() =>
                            updateWallConfig(tool.id, "type", "color")
                          }
                          className={`flex-1 text-[10px] font-bold py-1 border-2 border-slate-900 ${
                            wallConfigs[tool.id].type === "color"
                              ? "bg-slate-900 text-white"
                              : "bg-white"
                          }`}
                        >
                          MÀU
                        </button>

                        <button
                          onClick={() =>
                            updateWallConfig(tool.id, "type", "image")
                          }
                          className={`flex-1 text-[10px] font-bold py-1 border-2 border-slate-900 ${
                            wallConfigs[tool.id].type === "image"
                              ? "bg-slate-900 text-white"
                              : "bg-white"
                          }`}
                        >
                          ẢNH
                        </button>
                      </div>

                      {wallConfigs[tool.id].type === "color" ? (
                        <div className="flex items-center gap-2 border-2 border-slate-200 p-1 bg-slate-100">
                          <Palette size={16} className="text-slate-500" />
                          <input
                            type="color"
                            value={wallConfigs[tool.id].color}
                            onChange={(e) =>
                              updateWallConfig(tool.id, "color", e.target.value)
                            }
                            className="bg-transparent w-full h-8 cursor-pointer"
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Dán URL ảnh..."
                            value={
                              wallConfigs[tool.id].imgUrl.startsWith("blob:")
                                ? "(File từ máy)"
                                : wallConfigs[tool.id].imgUrl
                            }
                            onChange={(e) =>
                              updateWallConfig(
                                tool.id,
                                "imgUrl",
                                e.target.value
                              )
                            }
                            className="w-full text-[10px] font-mono border-2 border-slate-300 p-1 focus:border-orange-500 outline-none bg-slate-50"
                          />

                          <div className="flex gap-2">
                            <div className="flex-1 relative group">
                              <input
                                type="file"
                                accept="image/*"
                                id={`file-${tool.id}`}
                                className="hidden"
                                onChange={(e) => handleFileUpload(tool.id, e)}
                              />
                              <label
                                htmlFor={`file-${tool.id}`}
                                className="block text-center border-2 border-slate-900 bg-slate-200 hover:bg-white py-1 text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                UPLOAD
                              </label>
                            </div>

                            <button
                              onClick={() =>
                                updateWallConfig(
                                  tool.id,
                                  "imgUrl",
                                  Object.values(PRESETS)[
                                    parseInt(tool.id) - 1
                                  ] || PRESETS.BRICK
                                )
                              }
                              className="flex-1 border-2 border-slate-900 bg-slate-200 hover:bg-white py-1 text-[10px] font-bold transition-colors"
                            >
                              MẪU
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN AREA - TÁCH BIỆT HOÀN TOÀN EDITOR VÀ PLAYER */}

      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* TOP BAR (Luôn hiển thị) */}

        <div className="absolute top-6 right-6 z-30 flex gap-4 items-center">
          {mode === "EDIT" ? (
            <>
               <RetroButton
                 onClick={() => {
                   if (validateMap()) setMode("PLAY");
                 }}
                 className="bg-green-500 hover:bg-green-400 text-white flex items-center gap-2"
               >
                 <Play size={18} fill="currentColor" strokeWidth={3} />{" "}
                 CHƠI THỬ
               </RetroButton>

              <div className="flex gap-2">
                <RetroButton
                  onClick={handleExport}
                  className="bg-purple-500 hover:bg-purple-400 text-white flex items-center gap-2"
                >
                  <Download size={18} strokeWidth={3} /> SAVE
                </RetroButton>
                <RetroButton
                  onClick={handleSaveAndMint}
                  disabled={isUploading || isMinting}
                  className="bg-pink-500 hover:bg-pink-400 text-white flex items-center gap-2"
                >
                  {isUploading || isMinting ? "ĐANG XỬ LÝ..." : "SAVE & MINT"}
                </RetroButton>
              </div>
            </>
          ) : (
            <RetroButton
              onClick={() => setMode("EDIT")}
              className="bg-yellow-500 hover:bg-yellow-400 text-white flex items-center gap-2"
            >
              <Edit3 size={18} strokeWidth={3} /> SỬA MAP
            </RetroButton>
          )}
        </div>

        {mintStatus && (
          <div className="absolute top-6 left-6 z-30 bg-white border-2 border-slate-900 px-3 py-2 shadow-[6px_6px_0px_0px_rgba(15,23,42,0.6)] text-xs font-mono">
            {mintStatus}
          </div>
        )}

        {/* --- KHÔNG GIAN EDIT (INFINITE CANVAS) --- */}

        {mode === "EDIT" && (
          <>
            <div
              ref={scrollContainerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] bg-orange-50 overflow-auto hide-scrollbar cursor-crosshair transition-colors"
            >
              <div className="flex items-center justify-center min-w-[2000px] min-h-[2000px] p-20">
                <div
                  ref={editorGridRef}
                  className={`bg-white p-2 border-4 border-slate-900 shadow-[20px_20px_0px_0px_rgba(15,23,42,0.2)] transition-transform duration-100 origin-center ${
                    isZoomMode ? "" : "cursor-crosshair"
                  }`}
                >
                  <div
                    style={{
                      display: "grid",

                      gridTemplateColumns: `repeat(${mapSize.width}, ${currentTileSize}px)`,

                      gridTemplateRows: `repeat(${mapSize.height}, ${currentTileSize}px)`,

                      width: mapSize.width * currentTileSize,

                      height: mapSize.height * currentTileSize,
                    }}
                  >
                    {mapData.map((row, rIndex) =>
                      row.map((cellChar, cIndex) => {
                        let bgStyle = { backgroundColor: "white" };

                        let icon = null;

                        let isImageMissing = false;

                        const wallConfig = wallConfigs[cellChar];

                        if (wallConfig) {
                          if (wallConfig.type === "color") {
                            bgStyle = { backgroundColor: wallConfig.color };
                          } else if (wallConfig.type === "image") {
                            if (wallConfig.imgUrl) {
                              bgStyle = {
                                backgroundImage: `url(${wallConfig.imgUrl})`,
                                backgroundSize: "cover",
                              };
                            } else {
                              isImageMissing = true;
                              bgStyle = {
                                backgroundColor: "#e2e8f0",
                                backgroundImage:
                                  "repeating-linear-gradient(45deg, #cbd5e1 0, #cbd5e1 1px, #f1f5f9 1px, #f1f5f9 8px)",
                              };
                            }
                          } else {
                            bgStyle = { backgroundColor: wallConfig.color };
                          }
                        } else if (cellChar === "@")
                          icon = (
                            <User
                              size={24 * zoom}
                              className="text-blue-600 drop-shadow-md"
                              strokeWidth={3}
                            />
                          );
                        else if (cellChar === "$")
                          icon = (
                            <CircleDollarSign
                              size={24 * zoom}
                              className="text-yellow-500 drop-shadow-md"
                              strokeWidth={3}
                            />
                          );
                        else if (cellChar === "E")
                          icon = (
                            <Ghost
                              size={24 * zoom}
                              className="text-purple-500 drop-shadow-md"
                              strokeWidth={3}
                            />
                          );
                        else if (cellChar === "^")
                          icon = (
                            <Flame
                              size={24 * zoom}
                              className="text-red-500 drop-shadow-md"
                              strokeWidth={3}
                            />
                          );

                        return (
                          <div
                            key={`${rIndex}-${cIndex}`}
                            onMouseDown={() => handleCellClick(rIndex, cIndex)}
                            onMouseEnter={(e) => {
                              if (e.buttons === 1)
                                handleCellClick(rIndex, cIndex);
                            }}
                            className="border-r border-b border-slate-200 hover:border-orange-500 hover:border-2 hover:z-10 flex items-center justify-center select-none relative group"
                            style={bgStyle}
                          >
                            {cellChar === " " && (
                              <div
                                className="bg-slate-200 rounded-full"
                                style={{ width: 4 * zoom, height: 4 * zoom }}
                              ></div>
                            )}

                            {icon}

                            {isImageMissing && (
                              <ImageIcon
                                size={14 * zoom}
                                className="text-slate-400"
                              />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ZOOM CONTROLS (Chỉ hiện ở EDIT) */}

            <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2 items-end">
              <div className="bg-white border-2 border-slate-900 p-1 flex gap-1 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                <button
                  onClick={() => setIsZoomMode(!isZoomMode)}
                  className={`p-2 border-2 border-slate-900 font-bold text-xs flex items-center gap-2 transition-all ${
                    isZoomMode
                      ? "bg-red-500 text-white"
                      : "bg-slate-200 text-slate-700 hover:bg-white"
                  }`}
                >
                  {isZoomMode ? (
                    <Hand size={16} strokeWidth={3} />
                  ) : (
                    <Search size={16} strokeWidth={3} />
                  )}

                  {isZoomMode ? "CHẾ ĐỘ: KÉO/ZOOM" : "CHẾ ĐỘ: VẼ"}
                </button>
              </div>

              <div className="bg-white border-2 border-slate-900 p-1 flex gap-1 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                <RetroIconButton
                  onClick={() => handleZoomChange(-0.1)}
                  className="w-10 h-10"
                >
                  <ZoomOut size={20} />
                </RetroIconButton>

                <div className="w-12 h-10 flex items-center justify-center font-bold border-2 border-slate-900 bg-slate-50">
                  {Math.round(zoom * 100)}%
                </div>

                <RetroIconButton
                  onClick={() => handleZoomChange(0.1)}
                  className="w-10 h-10"
                >
                  <ZoomIn size={20} />
                </RetroIconButton>
              </div>
            </div>
          </>
        )}

        {/* --- KHÔNG GIAN PLAY (FIXED CENTERED) --- */}

        {mode === "PLAY" && (
          <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] flex items-center justify-center">
            <div
              ref={gameContainerRef}
              className="block border-4 border-slate-900 shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]"
              style={{
                width: VIEWPORT_WIDTH * BASE_TILE_SIZE,

                height: VIEWPORT_HEIGHT * BASE_TILE_SIZE,
              }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}
