# Lộ trình dự án (tiếng Việt)

Tài liệu này tóm tắt các giai đoạn phát triển khả thi cho game builder onchain, ưu tiên bước nhỏ, dễ triển khai, và để dành tính năng phức tạp cho tương lai.

## Phase 0 — Ổn định MVP hiện tại
- Giữ luồng hiện tại: upload map/thumbnail lên Walrus, mint NFT dungeon trên Sui testnet, gallery/play đọc metadata onchain và blob offchain.
- Chuẩn hóa **version/hồ sơ map**: lưu và hiển thị hash + version trong UI để đóng băng trải nghiệm chơi theo từng mint.
- Thêm event/contract tối thiểu cho `run_submitted` để phục vụ kiểm chứng sau này.

**Nhiệm vụ có thể bắt đầu ngay**
- [ ] Bổ sung hiển thị hash/version map trên gallery và play page.
- [ ] Viết và triển khai event `run_submitted` tối thiểu trong Move module hiện có.
- [ ] Thêm tài liệu hướng dẫn cách kiểm tra hash/version map trong môi trường dev/testnet.

## Phase 1 — Vault thưởng cơ bản (claim theo từng run)
- Move module **Reward Vault**: khóa pool token hữu hạn cho từng season/map version.
- Gameplay vẫn offchain; client gửi 1 giao dịch `claim_base_reward` sau run với hash log (map hash, seed, score, treasures, time_ms).
- Giới hạn payout mỗi run và giới hạn lượt/ngày; dừng chi trả khi vault hết.
- Backend/indexer nhẹ: cấp `run_id` + seed, lưu log, trả KPI cơ bản.

**Nhiệm vụ có thể bắt đầu ngay**
- [ ] Thiết kế struct/object cho Reward Vault (cap, token type, season_id, map_version) và hàm `create_vault`.
- [ ] Thêm hàm `claim_base_reward(run_id, run_hash, payload)` với kiểm tra vault cap + rate limit.
- [ ] Xây dựng endpoint backend phát `run_id` + seed và lưu log rút gọn (score, treasures, time_ms).
- [ ] Viết kịch bản testnet: nạp vault, thực hiện một run giả, kiểm tra payout bị chặn bởi cap.

## Phase 2 — Pool thưởng leaderboard
- Mở rộng vault với **Leaderboard Pool** cho top speedrun hoặc top nhặt kho báu.
- Emit `run_submitted` với trường chuẩn; indexer tính leaderboard offchain.
- Cuối mùa trả thưởng top N bằng giao dịch Merkle proof.
- Chống replay: `run_id` gắn với ví + map version, dùng một lần.

**Nhiệm vụ có thể bắt đầu khi Phase 1 ổn định**
- [ ] Chuẩn hóa schema event `run_submitted` (map_version, run_id, score, treasures, time_ms, player).
- [ ] Xây pipeline indexer tính leaderboard và xuất Merkle root; lưu snapshot vào Walrus/IPFS.
- [ ] Triển khai hàm `distribute_leaderboard_bonus(season_id, merkle_root, proof)` trong Move module.
- [ ] Viết tài liệu vận hành chốt mùa: xuất leaderboard, xác minh Merkle, gửi giao dịch thưởng.

## Phase 3 — Tích hợp nhà tài trợ (Sponsor)
- Tạo **Sponsor Vault**: sponsor khóa token cho map/version được chọn.
- Quy trình chọn: committee/DAO duyệt dựa trên KPI (lượt chơi, clear rate, doanh thu, báo lỗi).
- Chia phí mỗi run: tỷ lệ cho creator / DAO / sponsor vault (hoàn trả phần chưa dùng sau mùa).
- Gallery hiển thị badge “Sponsored”; form “Apply for sponsorship” vào hàng duyệt.

**Nhiệm vụ có thể bắt đầu khi Phase 2 chạy thử**
- [ ] Thêm hàm `lock_sponsor_funds` và `refund_sponsor_vault` với quyền curator/DAO.
- [ ] UI “Apply for sponsorship” (form + API) và dashboard duyệt (role curator).
- [ ] Tính toán và hiển thị split phí trên UI play page & gallery (creator/DAO/sponsor).
- [ ] Badge “Sponsored” trên gallery + play, kèm đường link đến thông tin sponsor.

## Phase 4 — Chest ngẫu nhiên (RNG) & Pass
- Hàm `open_chest` dùng randomness Sui (VRF hoặc gas-object RNG), payout không vượt sponsor vault.
- Rate-limit số chest/run/ngày; ghi event seed + outcome để audit.
- **Map Pass / Sponsor Pass** NFT: multiplier/badge theo season; metadata động cho chỉ số cosmetic (số lần clear, best score), gameplay vẫn đóng băng theo version.

**Nhiệm vụ có thể bắt đầu song song khi Phase 3 ổn định**
- [ ] Tích hợp RNG Sui vào `open_chest`; giới hạn payout không vượt vault và cap mở chest mỗi ví/ngày.
- [ ] Thiết kế NFT Pass động: metadata (season, version, badge, best score); hàm cập nhật chỉ số cosmetic sau run.
- [ ] Cập nhật client để hiển thị Pass và chest outcome; thêm audit log (seed, payout) trên UI/endpoint.

## Phase 5 — Monetization qua Kiosk
- Dùng **Kiosk** để bán/thuê: Map NFT (quyền doanh thu), Pass NFT, và Sponsor Slot.
- Luồng thuê: khóa Pass trong thời hạn, tự trả sau khi hết hạn.
- Dòng doanh thu qua Kiosk tuân theo công thức chia phí ở Phase 3.

**Nhiệm vụ có thể bắt đầu khi Phase 4 có phiên bản thử nghiệm**
- [ ] Triển khai listing template cho Map NFT, Pass, Sponsor Slot trên Kiosk; xác định phí và quyền rút doanh thu.
- [ ] Luồng thuê/trả Pass tự động: contract giữ ký quỹ và giải phóng đúng hạn.
- [ ] Kết nối UI gallery với dữ liệu Kiosk (giá, trạng thái thuê, doanh thu đã trả).

## Phase 6 — Chống gian lận & cải thiện UX
- Gộp end-run + claim trong một giao dịch; giữ chế độ chơi thử miễn phí (không thưởng).
- Backend kiểm tra sanity: mô phỏng nhẹ từ log + seed; giới hạn số hành động/thời gian.
- Công khai API/endpoint: sự kiện run, số dư vault, snapshot leaderboard.

**Nhiệm vụ có thể bắt đầu sau khi các phase trước hoạt động ổn định**
- [ ] Batch giao dịch end-run + claim, giảm số lần ký của người chơi.
- [ ] Thêm sanity replay nhẹ server-side (kiểm tra bước/seed/coin trong map) trước khi cho claim.
- [ ] Rate limit số run có thưởng mỗi ví/ngày; API công khai số dư vault + leaderboard snapshot.
- [ ] Viết checklist vận hành/giám sát: alert hết vault, tỷ lệ run bị từ chối, thời gian xử lý claim.

## Hướng triển khai chi tiết (ưu tiên)
1. **Triển khai nhanh (Phase 0–1)**: thêm hash/version UI, event `run_submitted`, module Reward Vault, backend cấp `run_id` + seed và API KPI cơ bản. 
2. **Cạnh tranh & sponsor (Phase 2–3)**: bổ sung Leaderboard Pool + Merkle payout; form apply & dashboard duyệt; fee split và refund sponsor vault.
3. **Tăng hấp dẫn (Phase 4–5)**: chest RNG an toàn, Pass NFT động (chỉ cosmetic), bán/thuê Pass/Map/Sponsor Slot qua Kiosk.
4. **Niềm tin & chất lượng (Phase 6)**: batch giao dịch claim, sanity replay, rate limit, công khai số liệu để audit.

## Lưu ý kỹ thuật
- Gameplay phải xác định được từ **map hash + seed** để có thể kiểm chứng/offline replay.
- Không claim theo từng nhặt; luôn claim một lần sau run, payout bị chặn bởi vault hữu hạn và giới hạn tốc độ.
- Ưu tiên thử nghiệm trên testnet, chỉ mở season có sponsor trên mainnet sau khi telemetry ổn.
