import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, GAME_REGISTRY, MODULE } from "../config/sui";
import { useSuiClient } from "@mysten/dapp-kit";

export function useDungeonRegistry() {
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  const getRegistryTableId = async () => {
    const obj = await suiClient.getObject({
      id: GAME_REGISTRY,
      options: { showContent: true },
    });
    if (obj.data?.content?.fields?.games?.fields?.id?.id) {
      return obj.data.content.fields.games.fields.id.id;
    }
    return null;
  };

  const getGameInfo = async (mapId) => {
    try {
      const tableId = await getRegistryTableId();
      if (!tableId) return null;

      const field = await suiClient.getDynamicFieldObject({
        parentId: tableId,
        name: {
          type: "0x2::object::ID",
          value: mapId,
        },
      });

      if (field.data?.content?.fields) {
        const f = field.data.content.fields;
        // GameInfo { fee: u64, reward_pool: Balance<SUI>, creator: address }
        return {
          fee: f.value.fields.fee,
          creator: f.value.fields.creator,
          rewardPool: f.value.fields.reward_pool,
        };
      }
    } catch (e) {
      // Not found or error
      return null;
    }
    return null;
  };

  const registerMap = async (dungeonId, feeInMist) => {
    const tx = new Transaction();

    // public entry fun register_map(registry: &mut GameRegistry, dungeon: &Dungeon, fee: u64, ctx: &mut TxContext)
    // Note: Dungeon must be passed as object or reference.
    // Since it's an OWNED object, only the owner can call this.
    // However, entry functions dealing with owned objects usually take them by value or reference if owned by sender.
    // In Move 2024, if we pass object ID, it attempts to resolve.
    // But `&Dungeon` means we need to pass the object reference.
    // If we own the object, we can pass it as input.

    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE}::register_map`,
      arguments: [
        tx.object(GAME_REGISTRY),
        tx.object(dungeonId),
        tx.pure.u64(feeInMist),
      ],
    });

    const res = await signAndExecute({
      transaction: tx,
    });

    // Wait for effect?
    return res;
  };

  const playChallenge = async (mapId, feeAmount) => {
    const tx = new Transaction();

    // Split coin for payment
    const [coin] = tx.splitCoins(tx.gas, [feeAmount]);

    // public entry fun play_challenge(registry: &mut GameRegistry, map_id: ID, payment: Coin<SUI>, ctx: &mut TxContext)
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE}::play_challenge`,
      arguments: [tx.object(GAME_REGISTRY), tx.pure.id(mapId), coin],
    });

    return await signAndExecute({ transaction: tx });
  };

  return { registerMap, playChallenge, getGameInfo };
}
