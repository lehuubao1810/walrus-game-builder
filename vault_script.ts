import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { fromB64 } from "@mysten/sui/utils";

// CONFIGURATION
const PACKAGE_ID =
  process.env.VITE_PACKAGE_ID ||
  "0xe4d6484324c1fd65cb186456643985733adce183c50ac4b09067f3373e14476b";
const REWARD_VAULT =
  "0x47fe2db384faeb9daf59739a701964a21b46c277216c51c1815c2160f830bf48";
const TESTNET_URL = getFullnodeUrl("testnet");

async function main() {
  if (!PACKAGE_ID) {
    console.error("Please set VITE_PACKAGE_ID");
    return;
  }

  // 1. Setup Client & Signer (Backend Signer)
  // NOTE: In real app, load from secret key. Here we generate random for demo.
  const backendSigner = new Ed25519Keypair();
  const client = new SuiClient({ url: TESTNET_URL });

  console.log("Backend Signer Address:", backendSigner.toSuiAddress());
  console.log(
    "Backend Public Key (Hex):",
    backendSigner.getPublicKey().toHex()
  );

  // 2. Prepare Data to Sign
  const runId = "run_123456";
  const amount = 1000000; // 0.001 SUI
  const playerAddress = backendSigner.toSuiAddress(); // Self-claim for test

  // Message format must match Move: run_id | amount | recipient
  // Simple serialization for demo
  const msg = new TextEncoder().encode(`${runId}:${amount}:${playerAddress}`);
  const signature = await backendSigner.signPersonalMessage(msg);

  console.log("Signature created:", signature.signature);

  // 3. Construct Transaction to Claim (Simulation)
  const tx = new Transaction();

  // NOTE: This assumes 'vault' object ID is known.
  // In a real test, we would first create a vault, get its ID, then claim.
  // Since we haven't deployed yet, this script is a template for post-deployment verification.

  console.log("Script ready for post-deployment verification.");
  console.log("Execute this checks manually after deployment.");
}

main().catch(console.error);
