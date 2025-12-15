import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { toHex } from "@mysten/sui/utils";

const PRIV =
  "suiprivkey1qpa009pgnza5hsw2mtdfzy7ve3rrv9l6uagt2pvtf08k89j6u7tn5gn37xh";
const { secretKey } = decodeSuiPrivateKey(PRIV);
const keypair = Ed25519Keypair.fromSecretKey(secretKey);

const pubKey = keypair.getPublicKey();
const rawBytes = pubKey.toRawBytes();

console.log("Raw Public Key Hex:", toHex(rawBytes));
console.log("Address:", pubKey.toSuiAddress());
console.log("Vector<u8> (for Move):", `x"${toHex(rawBytes)}"`);
