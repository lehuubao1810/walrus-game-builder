import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import kaboom from "kaboom";
import { ArrowLeft, Edit3, Trophy, RotateCcw, Wallet } from "lucide-react";
import { useCurrentAccount, ConnectButton } from "@mysten/dapp-kit";
import {
  fetchDungeonById,
  readDungeonMap,
  validateMapJsonSchema,
} from "../services/dungeonService";
import { useDungeonRegistry } from "../hooks/useDungeonRegistry";
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { PACKAGE_ID, GAME_REGISTRY } from "../config/sui";

export default function Play() {
  const { id } = useParams();
  const account = useCurrentAccount();
  const { getGameInfo, playChallenge } = useDungeonRegistry();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const gameContainerRef = useRef(null);
  const [gameData, setGameData] = useState(null);
  const [scale, setScale] = useState(1);
  const [loadingMap, setLoadingMap] = useState(false);
  const [mapError, setMapError] = useState(null);
  // Challenge Mode State
  const [challengeInfo, setChallengeInfo] = useState(null); // { fee, creator }
  const [hasPaid, setHasPaid] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const [showWinModal, setShowWinModal] = useState(false);
  const [winScore, setWinScore] = useState({ collected: 0, total: 0 });

  // Claim State
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  const [isGameFocused, setIsGameFocused] = useState(false);
  const isGameFocusedRef = useRef(false);

  const kaboomInstanceRef = useRef(null);
  const gameWrapperRef = useRef(null);
  const hasAutoActivatedRef = useRef(false);

  const focusGameCanvas = useCallback(() => {
    /* ... */
    const root = gameContainerRef.current;
    if (!root) return;
    const canvas = root.querySelector("canvas");
    if (!canvas) return;
    if (!canvas.hasAttribute("tabindex")) canvas.setAttribute("tabindex", "0");
    try {
      canvas.focus({ preventScroll: true });
    } catch {
      canvas.focus();
    }
  }, []);

  const activateGame = useCallback(() => {
    setIsGameFocused(true);
    isGameFocusedRef.current = true;
    requestAnimationFrame(() => {
      focusGameCanvas();
    });
  }, [focusGameCanvas]);

  // Load Map & Challenge Info
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (PACKAGE_ID) {
          // 1. Fetch Dungeon NFT
          const onchain = await fetchDungeonById(id);
          if (!onchain) throw new Error("Dungeon NFT not found");

          // 2. Fetch Registry Info (Check for Fee)
          const info = await getGameInfo(id);
          if (active && info) {
            // If user is creator, logic for free play?
            // Currently contract enforces fee for everyone unless we bypass on client.
            // Let's require fee for everyone for simplicity of testing "Challenge Mode".
            console.log("Challenge Info:", info);
            setChallengeInfo(info);
          }

          if (active) setGameData(onchain);
          setLoadingMap(true);
          setMapError(null);

          try {
            const idToUse = onchain.patchMapId || onchain.blobId;
            if (!idToUse) throw new Error("No patchMapId or blobId");
            const mapJson = await readDungeonMap(idToUse);
            if (!validateMapJsonSchema(mapJson)) throw new Error("Invalid Map");
            if (active) setGameData({ ...onchain, settings: mapJson });
          } catch (mapErr) {
            console.error("Error loading map:", mapErr);
            if (active) setMapError(mapErr.message);
          } finally {
            if (active) setLoadingMap(false);
          }
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setGameData(null);
          setMapError(err.message);
          setLoadingMap(false);
        }
      }
    };

    hasAutoActivatedRef.current = false;
    setIsGameFocused(false);
    isGameFocusedRef.current = false;
    setChallengeInfo(null);
    setHasPaid(false);

    load();
    return () => {
      active = false;
    };
  }, [id, account]);

  // Skip Auto-Play if Fee Required and Not Paid
  useEffect(() => {
    if (hasAutoActivatedRef.current) return;
    if (showWinModal) return;
    if (loadingMap || mapError) return;
    if (!gameData?.settings) return;

    // Block if challenge and not paid
    if (challengeInfo && challengeInfo.fee > 0 && !hasPaid) return;

    hasAutoActivatedRef.current = true;
    activateGame();
  }, [
    loadingMap,
    mapError,
    gameData,
    showWinModal,
    activateGame,
    challengeInfo,
    hasPaid,
  ]);

  /* ... Keep Kaboom Logic ... */
  useEffect(() => {
    console.log("Play: Kaboom Init Triggered", {
      hasGameData: !!gameData,
      hasContainer: !!gameContainerRef.current,
      hasLayout: !!gameData?.settings?.layout,
      hasConfig: !!gameData?.settings?.config,
    });

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

    console.log("Play: Map Dimensions", {
      width,
      height,
      tileSize,
      layout: settings.layout,
    });

    const scaleFactor = Math.min(
      (window.innerWidth * 0.95) / width,
      (window.innerHeight * 0.85) / height,
      1.2
    );
    setScale(scaleFactor);
    console.log("Play: Scale Factor", scaleFactor);

    let k;

    let isCleanedUp = false;
    if (gameContainerRef.current.innerHTML !== "")
      gameContainerRef.current.innerHTML = "";

    try {
      k = kaboom({
        width,
        height,
        scale: 1,
        root: gameContainerRef.current,
        global: false,
        background: [255, 247, 237],
      });
      kaboomInstanceRef.current = k;
      k.setGravity(1600);

      // Reconstruct wallConfigs from settings.assets
      const wallConfigs = {};
      const assets = gameData.settings.assets || {};
      Object.keys(assets).forEach((key) => {
        if (assets[key].type === "color") {
          wallConfigs[key] = { color: assets[key].value };
        }
      });

      Promise.resolve().then(() => {
        if (isCleanedUp) return;

        const tilesDef = {};

        // 1. Dynamic Walls
        Object.keys(wallConfigs).forEach((key) => {
          const conf = wallConfigs[key];
          tilesDef[key] = () => {
            return [
              k.area(),
              k.body({ isStatic: true }),
              `wall_${key}`,
              "wall",
              k.rect(tileSize, tileSize),
              k.color(k.Color.fromHex(conf.color)),
              k.outline(2, k.BLACK),
            ];
          };
        });

        // 2. Standard Entities
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

        function patrol(speed = 60, dir = 1) {
          return {
            id: "patrol",
            require: ["pos", "area"],
            add() {
              this.on("collide", (obj, col) => {
                if (col.isLeft() || col.isRight()) dir = -dir;
              });
            },
            update() {
              this.move(speed * dir, 0);
            },
          };
        }

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
          tileWidth: tileSize,
          tileHeight: tileSize,
          tiles: tilesDef,
        };

        k.scene("main", () => {
          const levelMap = gameData.settings.layout || [];
          const level = k.addLevel(levelMap, levelConfig);

          const players = level.get("player");
          const totalCoins = (
            Array.isArray(levelMap) ? levelMap.join("") : levelMap
          )
            .split("")
            .filter((c) => c === "$").length;
          let collectedCoins = 0;
          let isWon = false;

          if (players.length > 0) {
            const player = players[0];
            const SPEED = 200;
            const JUMP_FORCE = 600;

            k.camPos(player.pos);

            player.onUpdate(() => {
              if (isWon) return;
              k.camPos(player.pos);
              if (player.pos.y > height + 200) {
                k.shake(20);
                k.go("main");
              }
            });

            k.onKeyDown("left", () => {
              if (!isWon && isGameFocusedRef.current) player.move(-SPEED, 0);
            });
            k.onKeyDown("right", () => {
              if (!isWon && isGameFocusedRef.current) player.move(SPEED, 0);
            });
            k.onKeyPress("up", () => {
              if (!isWon && isGameFocusedRef.current && player.isGrounded())
                player.jump(JUMP_FORCE);
            });
            k.onKeyPress("space", () => {
              if (!isWon && isGameFocusedRef.current && player.isGrounded())
                player.jump(JUMP_FORCE);
            });

            player.onCollide("coin", (c) => {
              if (isWon) return;
              k.destroy(c);
              k.shake(2);
              collectedCoins++;
              if (collectedCoins >= totalCoins) {
                isWon = true;
                k.shake(10);
                k.addKaboom(player.pos);
                setWinScore({ collected: collectedCoins, total: totalCoins });
                setShowWinModal(true);
                setIsGameFocused(false);
                isGameFocusedRef.current = false;
              }
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

        if (isGameFocusedRef.current || hasAutoActivatedRef.current) {
          requestAnimationFrame(() => focusGameCanvas());
        }
      });
    } catch (e) {
      console.error(e);
    }
    // ... cleanup ...
  }, [gameData]);

  // -- Updating Return JSX --
  if (!gameData && !loadingMap && !mapError) {
    /* ... Loading or Not Found ... */
    return <div className="min-h-screen...*/">...</div>;
  }

  // Need to calculate width/height for JSX styles
  const tileSize = gameData?.settings?.config?.tileSize || 32;
  const width = gameData?.settings?.config?.width
    ? gameData.settings.config.width * tileSize
    : 640;
  const height = gameData?.settings?.config?.height
    ? gameData.settings.config.height * tileSize
    : 384;

  const feeSui = challengeInfo ? Number(challengeInfo.fee) / 1_000_000_000 : 0;
  const limits = {
    maxWidth: "92vw",
    maxHeight: "82vh",
    overflow: "hidden",
    minWidth: width,
    minHeight: height,
  };

  // -- HANDLERS --
  const handlePayFee = async () => {
    if (!challengeInfo || !account) {
      alert("Please connect wallet first");
      return;
    }
    try {
      setIsPaying(true);
      await playChallenge(id, challengeInfo.fee);
      setHasPaid(true);
    } catch (e) {
      console.error(e);
      alert("Payment failed: " + e.message);
    } finally {
      setIsPaying(false);
    }
  };

  const handleClaimReward = async () => {
    if (!challengeInfo || !account) return;
    try {
      setIsClaiming(true);

      // 1. Request Signature
      const res = await fetch("http://localhost:3000/api/claim-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapId: id,
          runId: `run_${Date.now()}`,
          score: winScore.collected,
          address: account.address,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const { signature, amount, runId } = data.data;
      console.log("Received signature from backend", signature);

      // 2. Submit to Blockchain
      const tx = new Transaction();
      // Ensure signature is array of numbers
      const sigArray = Object.values(signature).map(Number);

      console.log(
        "Constructing Transaction to",
        `${PACKAGE_ID}::dungeon::claim_registry_reward`
      );

      tx.moveCall({
        target: `${PACKAGE_ID}::dungeon::claim_registry_reward`,
        arguments: [
          tx.object(GAME_REGISTRY),
          tx.pure.id(id),
          tx.pure.vector("u8", sigArray),
          tx.pure.u64(amount),
          tx.pure.string(runId),
          tx.object("0x8"), // SUI Randomness Object
        ],
      });

      console.log("Requesting Wallet Signature...");
      await signAndExecute({ transaction: tx });
      console.log("Transaction Submitted!");
      setClaimSuccess(true);
      alert("Reward Claimed Successfully!");
    } catch (e) {
      console.error(e);
      alert("Claim Failed: " + e.message);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-orange-100 relative flex flex-col items-center justify-center p-6 text-slate-900">
      {/* HEADER */}
      <header className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <Link
          to="/"
          className="px-3 py-2 border-2 border-slate-900 bg-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] font-bold flex items-center gap-2"
        >
          <ArrowLeft strokeWidth={3} size={16} /> Home
        </Link>
        <div className="text-lg font-black text-slate-900 text-center flex-1 flex flex-col items-center leading-tight">
          <span>
            {gameData?.settings?.meta?.title || gameData?.name || "Loading..."}
          </span>
          {challengeInfo && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded border border-red-200 mt-1">
              Challenge Mode: {feeSui} SUI
            </span>
          )}
        </div>
        <Link
          to={`/editor/${id}`}
          className="px-3 py-2 border-2 border-slate-900 bg-yellow-400 hover:bg-yellow-300 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] font-bold flex items-center gap-2"
        >
          <Edit3 strokeWidth={3} size={16} /> Edit
        </Link>
      </header>

      {/* MAIN GAME AREA */}
      <div className="w-full flex items-center justify-center mt-16">
        <div
          ref={gameWrapperRef}
          className="border-4 border-slate-900 shadow-[16px_16px_0px_0px_rgba(0,0,0,0.8)] bg-white flex items-center justify-center relative cursor-pointer"
          style={limits}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (
              !loadingMap &&
              !mapError &&
              gameData?.settings &&
              !showWinModal &&
              (!challengeInfo || hasPaid)
            ) {
              activateGame();
            }
          }}
        >
          {loadingMap && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500 mb-4"></div>
              <p className="text-sm font-bold text-slate-700">Loading map...</p>
            </div>
          )}

          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-60">
              {/* ... Error UI ... */}
              <div className="text-center p-8 bg-white border-4 border-red-500 shadow-xl max-w-md">
                <h2 className="text-2xl font-black text-red-600 mb-4">ERROR</h2>
                <div className="text-slate-700 font-bold font-mono whitespace-pre-wrap">
                  {mapError}
                </div>
                <Link
                  to="/"
                  className="inline-block mt-6 px-6 py-2 bg-slate-900 text-white font-bold uppercase hover:bg-slate-700"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          )}

          {/* CHALLENGE PAYMENT OVERLAY */}
          {challengeInfo && !hasPaid && !loadingMap && !mapError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-50 backdrop-blur-md">
              <div className="bg-white border-4 border-slate-900 p-8 max-w-sm w-full text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                <Trophy size={48} className="mx-auto text-yellow-500 mb-4" />
                <h2 className="text-3xl font-black text-slate-900 mb-2">
                  CHALLENGE MODE
                </h2>
                <p className="text-slate-600 mb-6 font-medium">
                  Entry Fee Required to Play
                </p>

                <div className="bg-purple-50 p-4 rounded border-2 border-purple-100 mb-6">
                  <div className="text-3xl font-black text-purple-600">
                    {feeSui} SUI
                  </div>
                  <div className="text-xs text-purple-400 font-bold uppercase">
                    Ticket Price
                  </div>
                </div>

                <button
                  onClick={handlePayFee}
                  disabled={isPaying}
                  className="w-full py-3 bg-green-500 hover:bg-green-400 text-white font-bold text-lg uppercase border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  {isPaying ? (
                    "PROCESSING..."
                  ) : (
                    <>
                      <Wallet size={20} /> PAY & PLAY
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {!loadingMap && !mapError && gameData?.settings && (
            <div
              ref={gameContainerRef}
              className="block"
              style={{
                width,
                height,
                transform: `scale(${scale})`,
                transformOrigin: "center",
              }}
            />
          )}

          {!loadingMap &&
            !mapError &&
            gameData?.settings &&
            !isGameFocused &&
            !showWinModal &&
            (!challengeInfo || hasPaid) && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 z-30 backdrop-blur-sm cursor-pointer"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  activateGame();
                }}
              >
                <div className="bg-white/95 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] px-8 py-6 rounded-lg pointer-events-auto">
                  <p className="text-2xl font-black text-slate-900 mb-2 text-center">
                    Click to Play
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* ... Instructions and Modals ... */}
      <div className="mt-6 px-4 py-3 bg-white/80 border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,0.6)] text-sm font-mono text-slate-800 text-center max-w-3xl">
        {/* ... */}
        <div className="font-bold mb-2">Instructions</div>
        <div className="flex flex-wrap justify-center gap-4">
          <span>← / → : Move</span> <span>↑ or Space: Jump</span>{" "}
          <span>$ Collect all coins to win</span>
        </div>
      </div>

      {showWinModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-300"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) handleReplay();
          }}
        >
          <div className="bg-white border-4 border-slate-900 shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full mx-4 animate-in zoom-in-95 duration-300">
            {/* Win Content */}
            <div className="flex flex-col items-center text-center">
              <h2 className="text-4xl font-black text-slate-900 mb-2">
                YOU WIN!
              </h2>

              {/* CLAIM BUTTON FOR CHALLENGE MODE */}
              {challengeInfo && !claimSuccess && (
                <div className="mb-6 bg-yellow-50 p-4 border-2 border-yellow-200 w-full">
                  <p className="text-sm font-bold text-yellow-800 mb-2">
                    Challenge Complete!
                  </p>
                  <button
                    onClick={handleClaimReward}
                    disabled={isClaiming}
                    className="w-full py-2 bg-purple-600 text-white font-bold uppercase hover:bg-purple-500 disabled:opacity-50"
                  >
                    {isClaiming ? "Claiming..." : "Claim Reward (0.5 SUI)"}
                  </button>
                </div>
              )}

              {claimSuccess && (
                <div className="mb-6 bg-green-50 p-4 border-2 border-green-200 w-full text-green-700 font-bold">
                  REWARD CLAIMED!
                </div>
              )}

              <button
                onClick={handleReplay}
                className="w-full px-6 py-3 bg-green-500 hover:bg-green-400 text-white font-bold text-lg border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function handleReplay() {
    /* ... */
    setShowWinModal(false);
    if (kaboomInstanceRef.current) kaboomInstanceRef.current.go("main");
    setIsGameFocused(false);
    isGameFocusedRef.current = false;
    hasAutoActivatedRef.current = false;
  }
}
