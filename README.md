# Walrus Dungeon (Giai đoạn 2 - Testnet)

Web3 dungeon builder: upload map/thumbnail lên Walrus, mint NFT dungeon trên Sui testnet, gallery + play từ on-chain data.

## Cài đặt
```bash
pnpm install
pnpm dev
```

## Env
Tạo file `.env` dựa trên `env.example`:
```
VITE_SUI_RPC=https://fullnode.testnet.sui.io
VITE_PACKAGE_ID=0x...            # package sau khi publish move-contract
VITE_DUNGEON_CAP=0x...           # object DungeonCap share
VITE_WALRUS_WASM_URL=https://unpkg.com/@mysten/walrus-wasm@latest/web/walrus_wasm_bg.wasm
VITE_WALRUS_GATEWAY=https://wal-aggregator-testnet.staketab.org/v1/blobs
```

Deployed testnet (hiện tại):
- PACKAGE_ID: `0xe17b6a97b54a5248e8a6f85abd67eada613e618c437de3db763d0718e8fd5dd2`
- DungeonCap (shared): `0xaa30c16da7628751897fd1d803af784b160869545f3155b7820b8754828b57c8`
Tx publish: `2g2HZYQ1RboELmia98zPndrtdWtop4psAgJ1ChXPZTve`

## Move contract (template/move-contract)
Module: `walrus_dungeon::dungeon`
- Struct `Dungeon { name, blob_id, image_blob_id, creator, likes }`
- Shared `DungeonCap` (counter)
- Entry `mint_dungeon(name, blob_id, image_blob_id, cap, recipient)`
- Optional `burn_dungeon`

Triển khai testnet (yêu cầu Sui CLI):
```bash
cd template/move-contract
sui move build
sui client publish --gas-budget 500000000
```
Ghi lại `PACKAGE_ID`, `DungeonCap` (object share) vào `.env`.

## Luồng Save & Mint (Editor)
1) Validate map: 1 player, không trống, size <= 300x100, ký tự hợp lệ.
2) Xuất JSON + thumbnail (canvas) -> Walrus `writeFilesFlow` (blob_id, image_blob_id).
3) Gọi Move `mint_dungeon` trên Sui testnet bằng ví dapp-kit.

## Gallery & Play
- Gallery ưu tiên dữ liệu on-chain (đọc objects type `Dungeon` của ví), fallback mock khi chưa cấu hình package/env.
- Play page đọc blob JSON từ Walrus, render Kaboom, thumbnail hiển thị từ Walrus gateway.

## Thư viện chính
- @mysten/dapp-kit, @mysten/sui, @tanstack/react-query
- @mysten/walrus (SDK thật)
- Kaboom (render game)

## Testing gợi ý
- Upload fail / tx bị reject / tx thành công
- Play với map lớn, có trap/enemy/coin/player
- Thumbnail fail -> fallback
- Không đủ env (PACKAGE_ID, DUNGEON_CAP) -> hiển thị lỗi rõ ràng
