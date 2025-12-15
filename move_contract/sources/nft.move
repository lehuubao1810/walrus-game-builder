module walrus_dungeon::dungeon {
    use std::string::String;
    use sui::package;
    use sui::display;
    use sui::event;

    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::ed25519;
    use sui::random::{Self, Random};

    use sui::table::{Self, Table};

    /// NFT đại diện cho dungeon map, trỏ tới blob Walrus
    public struct Dungeon has key, store {
        id: UID,
        name: String,
        blob_id: String,
        patch_map_id: String,
        image_url: String, // Keep this
        creator: address,
        likes: u64,
    }

    public struct DungeonCap has key {
        id: UID,
        count: u64,
    }

    /// Game Registry: Shared Object to manage community maps and fees
    public struct GameRegistry has key {
        id: UID,
        // Map ID -> Game Config & Pool
        games: Table<ID, GameInfo>, 
        // Platform fees collected
        protocol_balance: Balance<SUI>,
    }

    public struct GameInfo has store {
        fee: u64,
        reward_pool: Balance<SUI>,
        creator: address,
    }

    /// Challenge Ticket (Hot Potato) - Not strictly needed if we execute logic in one transaction
    /// But sticking to direct entry functions for simplicity first.

    /// Reward Vault: Hold funds for payouts (Legacy/Simple P2E)
    public struct RewardVault has key {
        id: UID,
        balance: Balance<SUI>,
        owner: address,
        public_key: vector<u8>,
    }

    // Events
    public struct MapCreated has copy, drop {
        id: ID,
        creator: address,
        name: String,
        blob_id: String,
        patch_map_id: String,
        image_url: String, // [NEW] Added for Discovery
    }

    public struct RunSubmitted has copy, drop {
        map_id: ID,
        player: address,
        score: u64,
        run_id: String,
        time_ms: u64,
    }

    public struct RewardClaimed has copy, drop {
        vault_id: ID,
        player: address,
        amount: u64,
        run_id: String,
    }

    public struct GameRegistered has copy, drop {
        map_id: ID,
        fee: u64,
        creator: address,
    }

    public struct ChallengeStarted has copy, drop {
        map_id: ID,
        player: address,
        fee_paid: u64,
    }

    /// One-time witness (module name upper-case)
    public struct DUNGEON has drop {}

    fun init(otw: DUNGEON, ctx: &mut TxContext) {
        let cap = DungeonCap { id: object::new(ctx), count: 0 };
        transfer::share_object(cap);
        
        // Initialize Registry
        let registry = GameRegistry {
            id: object::new(ctx),
            games: table::new(ctx),
            protocol_balance: balance::zero(),
        };
        transfer::share_object(registry);

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
        
        event::emit(MapCreated {
            id: object::uid_to_inner(&dungeon.id),
            creator: dungeon.creator,
            name: dungeon.name,
            blob_id: dungeon.blob_id,
            patch_map_id: dungeon.patch_map_id,
            image_url: dungeon.image_url, // [NEW]
        });

        dungeon
    }

    /// Submit a run result (MVP)
    public entry fun submit_run(
        map_id: ID,
        run_id: vector<u8>,
        score: u64,
        time_ms: u64,
        ctx: &mut TxContext
    ) {
        event::emit(RunSubmitted {
            map_id,
            player: tx_context::sender(ctx),
            score,
            run_id: std::string::utf8(run_id),
            time_ms,
        });
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
    
    // --- Registry Logic ---

    // Register a map to enable Challenge Mode
    public entry fun register_map(
        registry: &mut GameRegistry,
        dungeon: &Dungeon,
        fee: u64,
        ctx: &mut TxContext
    ) {
        let id = object::id(dungeon);
        // Ensure only creator can register (since they hold the &Dungeon reference, usually implies ownership or approved reference)
        // But to be safe, check sender == creator? 
        // If the dungeon is owned, only owner can pass &Dungeon.
        assert!(!table::contains(&registry.games, id), 0); // Already registered
        
        let info = GameInfo {
            fee,
            reward_pool: balance::zero(),
            creator: dungeon.creator
        };
        
        table::add(&mut registry.games, id, info);
        
        event::emit(GameRegistered {
            map_id: id,
            fee,
            creator: dungeon.creator
        });
    }
    
    // Play with fee (Challenge Mode)
    public entry fun play_challenge(
        registry: &mut GameRegistry,
        map_id: ID,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // 1. Get Game Info
        assert!(table::contains(&registry.games, map_id), 1); // Not registered
        let game = table::borrow_mut(&mut registry.games, map_id);
        
        let paid = coin::value(&payment);
        assert!(paid >= game.fee, 2); // Insufficient fee
        
        // 2. Split Payment
        let mut balance = coin::into_balance(payment);
        
        // 10% Protocol Fee
        let protocol_fee = (paid * 10) / 100;
        let p_bal = balance::split(&mut balance, protocol_fee);
        balance::join(&mut registry.protocol_balance, p_bal);
        
        // 20% Creator Fee
        let creator_fee = (paid * 20) / 100;
        let c_bal = balance::split(&mut balance, creator_fee);
        let c_coin = coin::from_balance(c_bal, ctx);
        transfer::public_transfer(c_coin, game.creator);
        
        // 70% Reward Pool
        balance::join(&mut game.reward_pool, balance);
        
        event::emit(ChallengeStarted {
            map_id,
            player: tx_context::sender(ctx),
            fee_paid: paid
        });
    }

    // --- Reward Vault Logic (Legacy & Mixed) ---

    public entry fun create_vault(
        payment: Coin<SUI>, 
        public_key: vector<u8>,
        ctx: &mut TxContext
    ) {
        let balance = coin::into_balance(payment);
        let vault = RewardVault {
            id: object::new(ctx),
            balance,
            owner: tx_context::sender(ctx),
            public_key,
        };
        transfer::share_object(vault);
    }

    public entry fun top_up_vault(vault: &mut RewardVault, payment: Coin<SUI>) {
        let balance = coin::into_balance(payment);
        balance::join(&mut vault.balance, balance);
    }

    public entry fun claim_reward(
        vault: &mut RewardVault,
        signature: vector<u8>,
        msg: vector<u8>, // Expect: run_id | amount | recipient_address
        amount: u64,
        run_id: vector<u8>,
        ctx: &mut TxContext
    ) {
        // 1. Verify signature
        assert!(ed25519::ed25519_verify(&signature, &vault.public_key, &msg), 0);
        // [WARNING]: In a real production system, we must ensure 'msg' encodes 'amount' and 'run_id'
        // For Phase 1 Legacy Vault, we accepted this simplicity.
        // For Phase 5 Registry, we use robust BCS check below.

        // 2. Check balance
        assert!(balance::value(&vault.balance) >= amount, 1);

        // 3. Payout
        let payout = coin::take(&mut vault.balance, amount, ctx);
        transfer::public_transfer(payout, tx_context::sender(ctx));

        event::emit(RewardClaimed {
            vault_id: object::uid_to_inner(&vault.id),
            player: tx_context::sender(ctx),
            amount,
            run_id: std::string::utf8(run_id),
        });
    }

    /// Claim reward from Registry Pool with Secure Verification + ON-CHAIN RANDOMNESS
    public entry fun claim_registry_reward(
        registry: &mut GameRegistry,
        map_id: ID,
        signature: vector<u8>,
        _signed_amount: u64, // Input 0 here, used for signature verification only
        run_id: vector<u8>,
        r: &Random, 
        ctx: &mut TxContext
    ) {
        // Hardcoded Public Key (Phase 5 MVP)
        let verifier_key = x"0e2e282b6de38930e772ea9c97ed8007fc37f99f165a42eea30dafc48dcd6745";
        
        let recipient = tx_context::sender(ctx);
        
        // 1. Verify Signature (Backend signs with amount=0 to delegate authority)
        let mut msg = std::vector::empty<u8>();
        std::vector::append(&mut msg, object::id_to_bytes(&map_id));
        std::vector::append(&mut msg, run_id); 
        std::vector::append(&mut msg, sui::bcs::to_bytes(&_signed_amount)); // Should be 0
        std::vector::append(&mut msg, sui::bcs::to_bytes(&recipient));
        
        assert!(ed25519::ed25519_verify(&signature, &verifier_key, &msg), 0);

        // 2. Locate Pool
        let game_info = table::borrow_mut(&mut registry.games, map_id);
        let pool_value = balance::value(&game_info.reward_pool);
        
        // Ensure pool has funds
        assert!(pool_value > 0, 1);

        // 3. Randomize Reward (1% to 10% of Pool)
        let mut generator = random::new_generator(r, ctx);
        let percent = random::generate_u8_in_range(&mut generator, 1, 10); // 1-10 inclusive
        
        let reward_amount = (((pool_value as u128) * (percent as u128) / 100) as u64);
        
        // Safety check (min 1 MIST if > 0)
        let final_amount = if (reward_amount == 0) { 1 } else { reward_amount };

        // 4. Payout
        let payout = coin::take(&mut game_info.reward_pool, final_amount, ctx);
        transfer::public_transfer(payout, recipient);

        // 5. Emit Event
        event::emit(RewardClaimed {
            vault_id: object::id(registry), 
            player: recipient,
            amount: final_amount,
            run_id: std::string::utf8(run_id),
        });
    }
}
