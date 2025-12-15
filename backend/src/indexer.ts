import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import dotenv from "dotenv";

dotenv.config();

const PACKAGE_ID = process.env.PACKAGE_ID;
const NETWORK = process.env.NETWORK || "testnet";
const POLL_INTERVAL = 5000; // 5 seconds

// Simple in-memory storage for MVP. In prod, use DB.
export const indexedLeaderboard: {
  player: string;
  score: number;
  run_id: string;
  timestamp: number;
}[] = [];

// Map Statistics: MapID -> Run Count
export const mapStats: Record<string, { runCount: number; lastRunAt: number }> =
  {};

// Store all discovered maps
export const allGames: {
  id: string;
  name: string;
  blob_id: string;
  creator: string;
  patch_map_id: string;
  image_url: string; // [NEW] Added
  timestamp: number; // Approximate from event
}[] = [];

export async function startIndexer() {
  if (!PACKAGE_ID) {
    console.warn("Indexer: PACKAGE_ID not set. Indexing disabled.");
    return;
  }

  const client = new SuiClient({
    url: getFullnodeUrl(NETWORK as "testnet" | "mainnet"),
  });

  // Events to track
  const RUN_SUBMITTED = `${PACKAGE_ID}::dungeon::RunSubmitted`;
  const MAP_CREATED = `${PACKAGE_ID}::dungeon::MapCreated`;

  console.log(`Indexer: Started for events on ${NETWORK}`);

  let cursor: any = null;

  setInterval(async () => {
    try {
      const events = await client.queryEvents({
        query: { MoveModule: { package: PACKAGE_ID, module: "dungeon" } },
        cursor,
        limit: 50,
      });

      if (events.data.length > 0) {
        console.log(`Indexer: Found ${events.data.length} new events`);

        events.data.forEach((event) => {
          const parsed = event.parsedJson as any;
          const timestamp = Number(event.timestampMs) || Date.now();

          // 1. Handle RunSubmitted
          if (event.type === RUN_SUBMITTED) {
            // Deduplicate
            const exists = indexedLeaderboard.find(
              (e) => e.run_id === parsed.run_id
            );
            if (!exists) {
              indexedLeaderboard.push({
                player: parsed.player,
                score: Number(parsed.score),
                run_id: parsed.run_id,
                timestamp: Number(parsed.time_ms),
              });

              const mapId = parsed.map_id;
              if (!mapStats[mapId]) {
                mapStats[mapId] = { runCount: 0, lastRunAt: 0 };
              }
              mapStats[mapId].runCount += 1;
              mapStats[mapId].lastRunAt = Math.max(
                mapStats[mapId].lastRunAt,
                Number(parsed.time_ms)
              );
            }
          }

          // 2. Handle MapCreated
          if (event.type === MAP_CREATED) {
            const exists = allGames.find((g) => g.id === parsed.id);
            if (!exists) {
              allGames.push({
                id: parsed.id,
                name: parsed.name,
                blob_id: parsed.blob_id,
                creator: parsed.creator,
                patch_map_id: parsed.patch_map_id,
                image_url: parsed.image_url, // [NEW] Catch it
                timestamp,
              });
              console.log(
                `Indexer: Discovered new map "${parsed.name}" (${parsed.id})`
              );
            }
          }
        });

        if (events.nextCursor) {
          cursor = events.nextCursor;
        }

        indexedLeaderboard.sort((a, b) => b.score - a.score);
      }
    } catch (err) {
      console.error("Indexer polling error:", err);
    }
  }, POLL_INTERVAL);
}
