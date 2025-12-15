import { getFullnodeUrl } from "@mysten/sui/client";

export const SUI_NETWORK = "testnet";
export const SUI_RPC =
  import.meta.env.VITE_SUI_RPC || getFullnodeUrl(SUI_NETWORK);

export const PACKAGE_ID =
  "0xcd4803c465a26bf258d5304ed5800f02790750eda437f06261a1bd36a44a9912";
export const MODULE = "dungeon";
export const DUNGEON_TYPE = `${PACKAGE_ID}::${MODULE}::Dungeon`;
export const GAME_REGISTRY =
  "0x15845b00d422fc0097615a43ba8ac3673560fc36672bcdac3f9355d7d4ee1ceb";
export const DUNGEON_CAP =
  "0xbc947ae21fe7e8d0115718e581232a4b5f3c3df82be714b59329f81510ddcea5"; // Shared Object
export const MINT_FN = `${PACKAGE_ID}::dungeon::mint_dungeon`;

// Restore missing exports for useDungeonMint
("0xfdf71002d5e161b23fa39bd0e06805c44ba497106965cdaa58a9f6bb6570e636");
export const REWARD_VAULT = "";

export const WALRUS_WASM_URL =
  import.meta.env.VITE_WALRUS_WASM_URL ||
  "https://unpkg.com/@mysten/walrus-wasm@latest/web/walrus_wasm_bg.wasm";

export const WALRUS_GATEWAY =
  import.meta.env.VITE_WALRUS_GATEWAY ||
  "https://wal-aggregator-testnet.staketab.org/v1/blobs/by-quilt-patch-id";
