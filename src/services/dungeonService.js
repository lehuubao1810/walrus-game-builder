import { SuiClient } from "@mysten/sui/client";
import {
  PACKAGE_ID,
  MODULE,
  SUI_RPC,
  WALRUS_GATEWAY,
} from "../config/sui";

const client = new SuiClient({ url: SUI_RPC });
const DUNGEON_TYPE =
  PACKAGE_ID && MODULE ? `${PACKAGE_ID}::${MODULE}::Dungeon` : null;

export const getWalrusImageUrl = (blobId) =>
  `${WALRUS_GATEWAY}/${blobId}`;

const validateMapJson = (map) => {
  if (!map || typeof map !== "object") return false;
  if (!map.layout || !Array.isArray(map.layout) || map.layout.length === 0)
    return false;
  const { config } = map;
  if (
    !config ||
    typeof config.width !== "number" ||
    typeof config.height !== "number" ||
    config.width <= 0 ||
    config.height <= 0
  )
    return false;
  // Optional strict check: each row length matches width
  const widthOk = map.layout.every(
    (row) => typeof row === "string" && row.length === config.width
  );
  return widthOk;
};

const parseDungeonObject = (item) => {
  if (!DUNGEON_TYPE) return null;
  const content = item.data?.content;
  if (!content || content.dataType !== "moveObject") return null;
  if (content.type !== DUNGEON_TYPE) return null;
  const f = content.fields;
  return {
    id: item.data?.objectId,
    name: f.name,
    blobId: f.blob_id,
    imageBlobId: f.image_blob_id,
    creator: f.creator,
    likes: Number(f.likes || 0),
  };
};

export const fetchDungeonsByOwner = async (owner) => {
  if (!DUNGEON_TYPE || !owner) return [];
  const resp = await client.getOwnedObjects({
    owner,
    filter: { StructType: DUNGEON_TYPE },
    options: { showContent: true },
  });

  return resp.data.map(parseDungeonObject).filter(Boolean);
};

export const readDungeonMap = async (blobId) => {
  const res = await fetch(`${WALRUS_GATEWAY}/${blobId}`);
  if (!res.ok) throw new Error("Không đọc được blob từ Walrus");
  const text = await res.text();
  return JSON.parse(text);
};

export const fetchDungeonById = async (objectId) => {
  if (!DUNGEON_TYPE) return null;
  const resp = await client.getObject({
    id: objectId,
    options: { showContent: true },
  });
  const content = resp.data?.content;
  if (!content || content.dataType !== "moveObject") return null;
  if (content.type !== DUNGEON_TYPE) return null;
  const f = content.fields;
  return {
    id: resp.data.objectId,
    name: f.name,
    blobId: f.blob_id,
    imageBlobId: f.image_blob_id,
    creator: f.creator,
    likes: Number(f.likes || 0),
  };
};

export const loadDungeonsFromWallet = async (owner, { hydrate = true } = {}) => {
  const base = await fetchDungeonsByOwner(owner);
  if (!hydrate) return base;

  const enriched = await Promise.all(
    base.map(async (d) => {
      try {
        const map = await readDungeonMap(d.blobId);
        if (!validateMapJson(map)) return null;
        return {
          ...d,
          settings: map,
        };
      } catch {
        return null;
      }
    })
  );

  return enriched.filter(Boolean);
};

export const validateMapJsonSchema = validateMapJson;

