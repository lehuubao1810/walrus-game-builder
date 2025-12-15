import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { signReward } from "./signer";
import {
  startIndexer,
  indexedLeaderboard,
  mapStats,
  allGames,
} from "./indexer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Start Indexer
startIndexer().catch(console.error);

app.use(cors());
app.use(express.json());

// --- APIs ---

app.get("/", (req, res) => {
  res.send("Walrus Game Builder Backend is Running");
});

// GET /api/leaderboard
app.get("/api/leaderboard", (req, res) => {
  // Use indexed data
  // Limit to top 50
  const top = indexedLeaderboard.slice(0, 50);
  res.json(top);
});

// GET /api/stats
app.get("/api/stats", (req, res) => {
  res.json(mapStats);
});

// GET /api/dungeons (Discovery)
app.get("/api/dungeons", (req, res) => {
  // Sort by newest first
  const sorted = [...allGames].reverse();
  res.json(sorted);
});

// POST /api/claim
// Body: { runId, score, address, proof }
// This simulates the "End Run" and "Request Reward" flow.
// In a real secure game, "proof" would be replay inputs that backend verifies.
// Here we just accept logic and sign.
app.post("/api/claim", async (req, res) => {
  const { runId, score, address } = req.body;

  if (!runId || !score || !address) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // --- 1. Validate Game Logic (MOCKED) ---
  // Check if score is reasonable, check constraints...
  console.log(`Processing claim for ${address}: run=${runId}, score=${score}`);

  // Update mock leaderboard (optimistic)
  indexedLeaderboard.push({
    player: address,
    score: Number(score),
    run_id: runId,
    timestamp: Date.now(),
  });

  // --- 2. Determine Reward Amount ---
  // Simple formula: 1 Score = 1 MIST (very small) for testing, or fixed amount
  const amount = 1000000; // 0.001 SUI fixed for legacy vault

  // --- 3. Sign Reward ---
  try {
    const signedData = await signReward(runId, amount, address);
    res.json({
      success: true,
      data: {
        amount,
        signature: signedData.signature,
        msg: signedData.msg,
      },
    });
  } catch (err: any) {
    console.error("Sign error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Phase 5: Claim Registry Reward
// Body: { mapId, runId, score, address }
import { signRegistryReward } from "./signer";

app.post("/api/claim-reward", async (req, res) => {
  const { mapId, runId, score, address } = req.body;

  if (!mapId || !runId || !score || !address) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // 1. Validate Run (Mock)
  console.log(`[Registry Claim] User ${address} claiming on map ${mapId}`);

  // In production: Verify run replay, check if score beats potential cheaters, check if map exists in indexer.

  // 2. Determine Reward from Pool?
  // Phase 6: On-Chain Randomness determines amount.
  // Backend signs with amount=0 to authorize "Win Verification" only.
  const amount = 0;

  try {
    const signedData = await signRegistryReward(mapId, runId, amount, address);
    res.json({
      success: true,
      data: {
        mapId,
        runId,
        amount, // The authorized amount
        signature: signedData.signature,
        // Client doesn't need 'msg' if using Move Reconstruction,
        // but usually client needs to pass args to Move.
        publicKey: signedData.publicKey,
      },
    });
  } catch (err: any) {
    console.error("Registry Sign Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
