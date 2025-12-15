import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import dotenv from "dotenv";

dotenv.config();

const REGISTRY_ID =
  "0x3bb526281530c2c9b943ca92fa25749c838bf71c33ba0e5b4fb91b0918f61f30";
const NETWORK = process.env.NETWORK || "testnet";

async function main() {
  const client = new SuiClient({
    url: getFullnodeUrl(NETWORK as "testnet" | "mainnet"),
  });

  console.log(`--- CHECKING TREASURY & POOLS [${NETWORK}] ---`);
  console.log(`Registry ID: ${REGISTRY_ID}`);

  // 1. Get Registry Object (for Protocol Balance & Table ID)
  const registry = await client.getObject({
    id: REGISTRY_ID,
    options: { showContent: true },
  });

  if (!registry.data || !registry.data.content) {
    console.error("Registry not found!");
    return;
  }

  const fields = (registry.data.content as any).fields;
  const protocolBalance = fields.protocol_balance;
  const gamesTableId = fields.games.fields.id.id;

  console.log(
    `\n💰 PROTOCOL TREASURY: ${(
      Number(protocolBalance) / 1_000_000_000
    ).toFixed(4)} SUI`
  );
  console.log(`Games Table ID: ${gamesTableId}`);

  // 2. Scan Games Table (Dynamic Fields) to find pools
  // Note: To list all games, we query dynamic fields. This is paginated.
  let cursor = null;
  let hasNextPage = true;

  console.log("\n--- ACTIVE GAME POOLS ---");

  while (hasNextPage) {
    const dfs = await client.getDynamicFields({
      parentId: gamesTableId,
      cursor,
    });

    for (const item of dfs.data) {
      // Get details of each game
      const gameObj = await client.getDynamicFieldObject({
        parentId: gamesTableId,
        name: item.name,
      });

      if (gameObj.data?.content) {
        const gFields = (gameObj.data.content as any).fields.value.fields;
        const mapId = item.name.value;
        const fee = Number(gFields.fee) / 1_000_000_000;
        const pool = Number(gFields.reward_pool) / 1_000_000_000;

        console.log(`Map: ${mapId}`);
        console.log(`   - Creator: ${gFields.creator}`);
        console.log(`   - Entry Fee: ${fee} SUI`);
        console.log(`   - Reward Pool: ${pool} SUI`);
        console.log("-----------------------------------");
      }
    }

    if (dfs.hasNextPage) {
      cursor = dfs.nextCursor;
    } else {
      hasNextPage = false;
    }
  }
}

main().catch(console.error);
