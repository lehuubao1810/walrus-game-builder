import { useCallback, useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { WalrusFile } from "@mysten/walrus";
import { SuiClient } from "@mysten/sui/client";
import { SUI_NETWORK, SUI_RPC, WALRUS_WASM_URL } from "../config/sui";

const WALRUS_EPOCHS = 3;

const createWalrusClient = async () => {
  const { walrus } = await import("@mysten/walrus");
  const client = new SuiClient({ url: SUI_RPC });
  return client.$extend(
    walrus({
      wasmUrl: WALRUS_WASM_URL,
      network: SUI_NETWORK,
    })
  );
};

const walrusFileFromBytes = (name, bytes, contentType) =>
  WalrusFile.from({
    contents: bytes,
    identifier: name,
    tags: {
      "content-type": contentType,
      "file-name": name,
    },
  });

export function useWalrusUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const account = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const executeTransaction = useCallback(
    (tx) =>
      new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          { transaction: tx },
          {
            onSuccess: (result) => resolve(result.digest),
            onError: (err) => reject(err),
          }
        );
      }),
    [signAndExecuteTransaction]
  );

  const uploadFiles = useCallback(
    async ({ mapJson, thumbnailBlob }) => {
      if (!account) throw new Error("Chưa kết nối ví");
      setIsUploading(true);
      try {
        const client = await createWalrusClient();
        const files = [];

        // Map JSON
        const jsonBytes = new TextEncoder().encode(
          JSON.stringify(mapJson, null, 2)
        );
        files.push(
          walrusFileFromBytes(
            `dungeon-map-${Date.now()}.json`,
            jsonBytes,
            "application/json"
          )
        );

        // Thumbnail (optional)
        if (thumbnailBlob) {
          const buffer = await thumbnailBlob.arrayBuffer();
          files.push(
            walrusFileFromBytes(
              `dungeon-thumb-${Date.now()}.png`,
              new Uint8Array(buffer),
              thumbnailBlob.type || "image/png"
            )
          );
        }

        const flow = client.walrus.writeFilesFlow({ files });
        await flow.encode();

        const registerTx = flow.register({
          epochs: WALRUS_EPOCHS,
          owner: account.address,
          deletable: true,
        });
        const registerDigest = await executeTransaction(registerTx);

        await flow.upload({ digest: registerDigest });

        const certifyTx = flow.certify();
        await executeTransaction(certifyTx);

        const uploaded = await flow.listFiles();
        if (!uploaded.length) throw new Error("Upload thất bại: không có file");

        const jsonFile =
          uploaded.find((f) => f.identifier.endsWith(".json")) || uploaded[0];
        const imageFile = uploaded.find(
          (f) => f.identifier !== jsonFile.identifier
        );

        return {
          map: { blobId: jsonFile.blobId, patchId: jsonFile.id },
          image: imageFile
            ? { blobId: imageFile.blobId, patchId: imageFile.id }
            : null,
        };
      } finally {
        setIsUploading(false);
      }
    },
    [account, executeTransaction]
  );

  return { uploadFiles, isUploading };
}

