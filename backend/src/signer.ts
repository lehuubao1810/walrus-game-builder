import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { fromB64 } from "@mysten/sui/utils";

import dotenv from "dotenv";
import path from "path";

// Load .env explicitly from current directory
dotenv.config({ path: path.join(__dirname, "../.env") });

// In production, load from environment variable
const PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;

let keypair: Ed25519Keypair;

try {
  if (PRIVATE_KEY) {
    if (PRIVATE_KEY.startsWith("suiprivkey")) {
      const { secretKey } = decodeSuiPrivateKey(PRIVATE_KEY);
      keypair = Ed25519Keypair.fromSecretKey(secretKey);
    } else {
      // Fallback for raw base64 (legacy)
      keypair = Ed25519Keypair.fromSecretKey(fromB64(PRIVATE_KEY).slice(1));
    }
  } else {
    console.warn(
      "WARNING: No SUI_PRIVATE_KEY found. Using random keypair for signer."
    );
    keypair = new Ed25519Keypair();
  }
} catch (e) {
  console.error("Error loading private key, falling back to random:", e);
  keypair = new Ed25519Keypair();
}

console.log(
  "Backend Signer Public Key:",
  keypair.getPublicKey().toSuiAddress()
);

export async function signReward(
  runId: string,
  amount: number,
  recipient: string
) {
  // Legacy (Phase 1)
  const msgString = `${runId}:${amount}:${recipient}`;
  const msgBytes = new TextEncoder().encode(msgString);

  const { signature } = await keypair.signPersonalMessage(msgBytes);

  return {
    signature: signature,
    msg: msgString,
    publicKey: keypair.getPublicKey().toSuiAddress(),
  };
}

// Phase 5: Secure Signing for Registry
import { bcs } from "@mysten/sui/bcs";

export async function signRegistryReward(
  mapId: string,
  runId: string,
  amount: number,
  recipient: string
) {
  // Must match Move reconstruction:
  // bcs::to_bytes(&map_id) + run_id_bytes + bcs::to_bytes(&amount) + bcs::to_bytes(&recipient)

  const mapIdBytes = bcs.Address.serialize(mapId).toBytes();
  const runIdBytes = bcs.String.serialize(runId).toBytes(); // Include length prefix
  const amountBytes = bcs.U64.serialize(amount).toBytes();
  const recipientBytes = bcs.Address.serialize(recipient).toBytes();

  const merged = new Uint8Array(
    mapIdBytes.length +
      runIdBytes.length +
      amountBytes.length +
      recipientBytes.length
  );

  let offset = 0;
  merged.set(mapIdBytes, offset);
  offset += mapIdBytes.length;
  merged.set(runIdBytes, offset);
  offset += runIdBytes.length;
  merged.set(amountBytes, offset);
  offset += amountBytes.length;
  merged.set(recipientBytes, offset);

  const { signature } = await keypair.signPersonalMessage(merged);

  return {
    signature,
    // msg isn't sent as one block, we send components
    publicKey: keypair.getPublicKey().toSuiAddress(),
  };
}
