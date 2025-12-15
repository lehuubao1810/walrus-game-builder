import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { toB64 } from "@mysten/sui/utils";

const keypair = new Ed25519Keypair();
const pubKey = keypair.getPublicKey();

console.log("SUI_PRIVATE_KEY=" + keypair.getSecretKey()); // This outputs the bech32 or base64?
// Actually getSecretKey() returns string if initialized? No, it returns string in recent SDK.
// Let's check.
// Standard format for .env usually is base64 of the secret key bytes (32 bytes or 33 with flag).
// Newer SDK `getSecretKey()` might return `suiprivkey...` (Bech32).
// `signer.ts` uses `fromB64(PRIVATE_KEY).slice(1)`. This implies we expect Base64 with flag.
// Let's output Base64.

// Export the raw bytes + flag?
// Ed25519Keypair.export() returns the `suiprivkey...` string.
// Let's use `export()` for safety and update signer.ts if needed, OR stick to the implementation in signer.ts.

// signer.ts:
// if (PRIVATE_KEY) {
//   keypair = Ed25519Keypair.fromSecretKey(fromB64(PRIVATE_KEY).slice(1));
// }
// This logic assumes `PRIVATE_KEY` is a Base64 string starting with a 1-byte flag (0x00 for Ed25519).

// Let's output that format.
const secretKey = keypair.getSecretKey(); // This returns string "suiprivkey..."
// We want the raw bytes.
// Actually, let's just use `keypair.export()` and print that.
// And update signer.ts to handle `suiprivkey` standard format if possible, or just print the manual base64.

// Manual B64:
// const bytes = keypair.keypair.secretKey; // This is 64 bytes (priv + pub)?
// Let's stick to the SDK.

console.log("--- KEY INFO ---");
console.log("Address:", keypair.toSuiAddress());
console.log("PublicKey (Base64):", pubKey.toBase64());
const bytes = Array.from(pubKey.toSuiBytes());
console.log("PublicKey (Bytes for CLI):", JSON.stringify(bytes)); // [1, 2, 3...]

console.log("Bech32 Private Key:", keypair.getSecretKey());

// We will manually format the private key for .env if needed, but `getSecretKey` returning bech32 is standard now.
// `signer.ts` logic `fromB64(PRIVATE_KEY).slice(1)` is relying on the OLD format or raw base64.
// Let's update `signer.ts` to support standard `suiprivkey` format later if we want.
// For now, let's just log the Bech32 and I will handle it.
