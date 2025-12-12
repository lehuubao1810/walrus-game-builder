module walrus_dungeon::dungeon {
    use std::string::String;
    use sui::package;
    use sui::display;

    /// NFT đại diện cho dungeon map, trỏ tới blob Walrus
    public struct Dungeon has key, store {
        id: UID,
        name: String,
        blob_id: String,
        patch_map_id: String,
        image_url: String,
        creator: address,
        likes: u64,
    }

    public struct DungeonCap has key {
        id: UID,
        count: u64,
    }

    /// One-time witness (module name upper-case)
    public struct DUNGEON has drop {}

    fun init(otw: DUNGEON, ctx: &mut TxContext) {
        let cap = DungeonCap { id: object::new(ctx), count: 0 };
        transfer::share_object(cap);

        let publisher = package::claim(otw, ctx);
        let mut disp = display::new<Dungeon>(&publisher, ctx);
        disp.add(b"name".to_string(), b"{name}".to_string());
        disp.add(b"blob_id".to_string(), b"{blob_id}".to_string());
        disp.add(b"patch_map_id".to_string(), b"{patch_map_id}".to_string());
        disp.add(b"image_url".to_string(), b"{image_url}".to_string());
        disp.add(b"creator".to_string(), b"{creator}".to_string());
        disp.add(b"likes".to_string(), b"{likes}".to_string());
        disp.update_version();

        transfer::public_transfer(disp, ctx.sender());
        transfer::public_transfer(publisher, ctx.sender());
    }

    fun mint(
        name: vector<u8>,
        blob_id: vector<u8>,
        patch_map_id: vector<u8>,
        image_url: vector<u8>,
        cap: &mut DungeonCap,
        ctx: &mut TxContext,
    ): Dungeon {
        let dungeon = Dungeon {
            id: object::new(ctx),
            name: std::string::utf8(name),
            blob_id: std::string::utf8(blob_id),
            patch_map_id: std::string::utf8(patch_map_id),
            image_url: std::string::utf8(image_url),
            creator: tx_context::sender(ctx),
            likes: 0,
        };
        cap.count = cap.count + 1;
        dungeon
    }

    /// Mint và chuyển cho recipient
    public entry fun mint_dungeon(
        name: vector<u8>,
        blob_id: vector<u8>,
        patch_map_id: vector<u8>,
        image_url: vector<u8>,
        cap: &mut DungeonCap,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        let dungeon = mint(name, blob_id, patch_map_id, image_url, cap, ctx);
        transfer::transfer(dungeon, recipient);
    }

    /// (Optional) Burn dungeon nếu người gọi là owner
    public entry fun burn_dungeon(dungeon: Dungeon, ctx: &mut TxContext) {
        let Dungeon { id, creator, .. } = dungeon;
        assert!(creator == tx_context::sender(ctx), 1);
        object::delete(id);
    }

    public fun get_blob_id(d: &Dungeon): String { d.blob_id }
    public fun get_patch_map_id(d: &Dungeon): String { d.patch_map_id }
    public fun get_image_url(d: &Dungeon): String { d.image_url }
    public fun get_name(d: &Dungeon): String { d.name }
    public fun get_creator(d: &Dungeon): address { d.creator }
    public fun get_likes(d: &Dungeon): u64 { d.likes }
    public fun get_count(cap: &DungeonCap): u64 { cap.count }
}
