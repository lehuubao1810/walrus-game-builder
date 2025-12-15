# Lộ trình dự án (tiếng Việt)

Tài liệu này tóm tắt các giai đoạn phát triển khả thi cho game builder onchain, ưu tiên bước nhỏ, dễ triển khai, và để dành tính năng phức tạp cho tương lai.

## Phase 0 — Ổn định MVP hiện tại
- Giữ luồng hiện tại: upload map/thumbnail lên Walrus, mint NFT dungeon trên Sui testnet, gallery/play đọc metadata onchain và blob offchain.
- Chuẩn hóa **version/hồ sơ map**: lưu và hiển thị hash + version trong UI để đóng băng trải nghiệm chơi theo từng mint.
- Thêm event/contract tối thiểu cho `run_submitted` để phục vụ kiểm chứng sau này.

**Nhiệm vụ có thể bắt đầu ngay (check để khởi động, đã thêm tiêu chí bàn giao)**
- [ ] 🟢 Bắt đầu: Hiển thị hash/version map trên gallery và play page.
  - Đầu ra: UI hiển thị hash rút gọn + version; link đến blob Walrus/tx onchain.
  - Checklist: lấy hash từ metadata NFT; thêm component trên gallery & play; QA với 1 map mẫu.
- [ ] 🟢 Bắt đầu: Viết & triển khai event `run_submitted` tối thiểu trong Move module hiện có.
  - Đầu ra: event phát với map_version, run_id, player, score/treasures/time_ms.
  - Checklist: thêm type Event, unit test Move, publish testnet, log event bằng txn mô phỏng.
- [ ] 🟢 Bắt đầu: Thêm tài liệu hướng dẫn cách kiểm tra hash/version map trong môi trường dev/testnet.
  - Đầu ra: mục README/ROADMAP kèm lệnh `sui client` hoặc UI screenshot; hướng dẫn so khớp hash.
  - Checklist: mô tả lấy hash từ onchain + từ blob; bước xác minh thủ công; cập nhật env vars nếu cần.

## Phase 1 — Vault thưởng cơ bản (claim theo từng run)
- Move module **Reward Vault**: khóa pool token hữu hạn cho từng season/map version.
- Gameplay vẫn offchain; client gửi 1 giao dịch `claim_base_reward` sau run với hash log (map hash, seed, score, treasures, time_ms).
- Giới hạn payout mỗi run và giới hạn lượt/ngày; dừng chi trả khi vault hết.
- Backend/indexer nhẹ: cấp `run_id` + seed, lưu log, trả KPI cơ bản.

**Nhiệm vụ có thể bắt đầu ngay (check để khởi động, đã thêm tiêu chí bàn giao)**
- [ ] 🟢 Bắt đầu: Thiết kế struct/object cho Reward Vault (cap, token type, season_id, map_version) và hàm `create_vault`.
  - Đầu ra: module Move mới/cập nhật với struct vault; test tạo vault thành công.
  - Checklist: trường cap, token type, season_id, map_version; chức năng nạp/rút bị giới hạn; test Move.
- [ ] 🟢 Bắt đầu: Thêm hàm `claim_base_reward(run_id, run_hash, payload)` với kiểm tra vault cap + rate limit.
  - Đầu ra: hàm claim trả phần thưởng <= cap, không vượt limit/ngày; sự kiện claim.
  - Checklist: validate run_id duy nhất; kiểm tra số coin còn trong vault; unit test cap/rate limit.
- [ ] 🟢 Bắt đầu: Xây dựng endpoint backend phát `run_id` + seed và lưu log rút gọn (score, treasures, time_ms).
  - Đầu ra: API `/runs/start` trả run_id + seed; `/runs/submit` lưu log; lưu trữ tối thiểu.
  - Checklist: middleware auth nhẹ (ví); lưu log vào DB/file; test với request giả.
- [ ] 🟢 Bắt đầu: Viết kịch bản testnet: nạp vault, thực hiện một run giả, kiểm tra payout bị chặn bởi cap.
  - Đầu ra: script CLI mô phỏng 1 run và verify payout < cap; hướng dẫn chạy.
  - Checklist: tạo vault, gọi claim, quan sát sự kiện; chụp log kết quả.

## Phase 2 — Pool thưởng leaderboard
- Mở rộng vault với **Leaderboard Pool** cho top speedrun hoặc top nhặt kho báu.
- Emit `run_submitted` với trường chuẩn; indexer tính leaderboard offchain.
- Cuối mùa trả thưởng top N bằng giao dịch Merkle proof.
- Chống replay: `run_id` gắn với ví + map version, dùng một lần.

**Nhiệm vụ có thể bắt đầu khi Phase 1 ổn định (check để khởi động, đã thêm tiêu chí bàn giao)**
- [ ] 🟢 Bắt đầu: Chuẩn hóa schema event `run_submitted` (map_version, run_id, score, treasures, time_ms, player).
  - Đầu ra: schema event thống nhất; tài liệu field; unit test event emit.
  - Checklist: cập nhật Move; đảm bảo tương thích Phase 0 event; test event format.
- [ ] 🟢 Bắt đầu: Xây pipeline indexer tính leaderboard và xuất Merkle root; lưu snapshot vào Walrus/IPFS.
  - Đầu ra: service đọc event, tạo bảng điểm, xuất Merkle + CID Walrus/IPFS.
  - Checklist: cron/worker tính top N; verify Merkle; script tải snapshot.
- [ ] 🟢 Bắt đầu: Triển khai hàm `distribute_leaderboard_bonus(season_id, merkle_root, proof)` trong Move module.
  - Đầu ra: hàm nhận Merkle proof và trả thưởng; log event payout.
  - Checklist: kiểm tra proof; cap payout; unit test claim hợp lệ/không hợp lệ.
- [ ] 🟢 Bắt đầu: Viết tài liệu vận hành chốt mùa: xuất leaderboard, xác minh Merkle, gửi giao dịch thưởng.
  - Đầu ra: SOP cuối mùa; hướng dẫn ký giao dịch; check-list xác thực Merkle.
  - Checklist: bước lấy snapshot, kiểm proof, gửi tx, lưu hash.

## Phase 3 — Tích hợp nhà tài trợ (Sponsor)
- Tạo **Sponsor Vault**: sponsor khóa token cho map/version được chọn.
- Quy trình chọn: committee/DAO duyệt dựa trên KPI (lượt chơi, clear rate, doanh thu, báo lỗi).
- Chia phí mỗi run: tỷ lệ cho creator / DAO / sponsor vault (hoàn trả phần chưa dùng sau mùa).
- Gallery hiển thị badge “Sponsored”; form “Apply for sponsorship” vào hàng duyệt.

**Nhiệm vụ có thể bắt đầu khi Phase 2 chạy thử (check để khởi động, đã thêm tiêu chí bàn giao)**
- [ ] 🟢 Bắt đầu: Thêm hàm `lock_sponsor_funds` và `refund_sponsor_vault` với quyền curator/DAO.
  - Đầu ra: sponsor vault khóa token; refund phần dư; event ghi nhận.
  - Checklist: role-based access; unit test lock/refund; giới hạn hoàn trả sau mùa.
- [ ] 🟢 Bắt đầu: UI “Apply for sponsorship” (form + API) và dashboard duyệt (role curator).
  - Đầu ra: form gửi map_id + KPI; backend lưu trạng thái; dashboard duyệt/từ chối.
  - Checklist: auth curator; email/webhook thông báo; test flow end-to-end.
- [ ] 🟢 Bắt đầu: Tính toán và hiển thị split phí trên UI play page & gallery (creator/DAO/sponsor).
  - Đầu ra: bảng/tip hiển thị % split; logic tính tổng phí/run; số liệu lấy từ onchain config.
  - Checklist: đồng bộ với module Move; test hiển thị với sample data.
- [ ] 🟢 Bắt đầu: Badge “Sponsored” trên gallery + play, kèm đường link đến thông tin sponsor.
  - Đầu ra: badge + tooltip/link đến profile sponsor/vault.
  - Checklist: chỉ hiển thị khi map có sponsor vault; QA UI desktop/mobile.

## Phase 4 — Chest ngẫu nhiên (RNG) & Pass
- Hàm `open_chest` dùng randomness Sui (VRF hoặc gas-object RNG), payout không vượt sponsor vault.
- Rate-limit số chest/run/ngày; ghi event seed + outcome để audit.
- **Map Pass / Sponsor Pass** NFT: multiplier/badge theo season; metadata động cho chỉ số cosmetic (số lần clear, best score), gameplay vẫn đóng băng theo version.

**Nhiệm vụ có thể bắt đầu song song khi Phase 3 ổn định (check để khởi động, đã thêm tiêu chí bàn giao)**
- [ ] 🟢 Bắt đầu: Tích hợp RNG Sui vào `open_chest`; giới hạn payout không vượt vault và cap mở chest mỗi ví/ngày.
  - Đầu ra: hàm open_chest dùng VRF/gas RNG; event seed + outcome; cap payout.
  - Checklist: test RNG path; cap số chest/địa chỉ/ngày; unit test vault cap.
- [ ] 🟢 Bắt đầu: Thiết kế NFT Pass động: metadata (season, version, badge, best score); hàm cập nhật chỉ số cosmetic sau run.
  - Đầu ra: struct Pass với metadata động; hàm update cosmetic; không ảnh hưởng logic reward.
  - Checklist: test update; giới hạn quyền update; hiển thị trên UI.
- [ ] 🟢 Bắt đầu: Cập nhật client để hiển thị Pass và chest outcome; thêm audit log (seed, payout) trên UI/endpoint.
  - Đầu ra: UI hiển thị Pass, chest mở + payout; endpoint trả log audit.
  - Checklist: demo với dữ liệu giả; liên kết event onchain; QA responsive.

## Phase 5 — Monetization qua Kiosk
- Dùng **Kiosk** để bán/thuê: Map NFT (quyền doanh thu), Pass NFT, và Sponsor Slot.
- Luồng thuê: khóa Pass trong thời hạn, tự trả sau khi hết hạn.
- Dòng doanh thu qua Kiosk tuân theo công thức chia phí ở Phase 3.

**Nhiệm vụ có thể bắt đầu khi Phase 4 có phiên bản thử nghiệm (check để khởi động, đã thêm tiêu chí bàn giao)**
- [ ] 🟢 Bắt đầu: Triển khai listing template cho Map NFT, Pass, Sponsor Slot trên Kiosk; xác định phí và quyền rút doanh thu.
  - Đầu ra: listing template với metadata phí/split; quyền rút doanh thu rõ ràng.
  - Checklist: test mua/bán; kiểm tra doanh thu chuyển đúng địa chỉ; doc phí.
- [ ] 🟢 Bắt đầu: Luồng thuê/trả Pass tự động: contract giữ ký quỹ và giải phóng đúng hạn.
  - Đầu ra: hàm thuê với thời hạn; auto trả Pass; hoàn quỹ ký gửi.
  - Checklist: test hết hạn; test hủy sớm; event ghi log thuê/trả.
- [ ] 🟢 Bắt đầu: Kết nối UI gallery với dữ liệu Kiosk (giá, trạng thái thuê, doanh thu đã trả).
  - Đầu ra: UI đọc dữ liệu listing, giá hiện tại, trạng thái thuê, doanh thu.
  - Checklist: mock API/Kiosk; hiển thị cảnh báo hết hạn thuê; QA mobile/desktop.

## Phase 6 — Chống gian lận & cải thiện UX
- Gộp end-run + claim trong một giao dịch; giữ chế độ chơi thử miễn phí (không thưởng).
- Backend kiểm tra sanity: mô phỏng nhẹ từ log + seed; giới hạn số hành động/thời gian.
- Công khai API/endpoint: sự kiện run, số dư vault, snapshot leaderboard.

**Nhiệm vụ có thể bắt đầu sau khi các phase trước hoạt động ổn định (check để khởi động, đã thêm tiêu chí bàn giao)**
- [ ] 🟢 Bắt đầu: Batch giao dịch end-run + claim, giảm số lần ký của người chơi.
  - Đầu ra: một txn xử lý end-run + claim; UX ký một lần.
  - Checklist: kiểm tra gas; bảo đảm vẫn chống replay; unit test happy/fail path.
- [ ] 🟢 Bắt đầu: Thêm sanity replay nhẹ server-side (kiểm tra bước/seed/coin trong map) trước khi cho claim.
  - Đầu ra: service mô phỏng nhẹ để chặn log bất thường; webhook/flag run nghi vấn.
  - Checklist: mô phỏng 10% run; cảnh báo nếu lệch; log đầy đủ để audit.
- [ ] 🟢 Bắt đầu: Rate limit số run có thưởng mỗi ví/ngày; API công khai số dư vault + leaderboard snapshot.
  - Đầu ra: rate limiter + API REST/GraphQL công khai số dư vault, leaderboard snapshot.
  - Checklist: test limit reset hàng ngày; cache snapshot; doc endpoint.
- [ ] 🟢 Bắt đầu: Viết checklist vận hành/giám sát: alert hết vault, tỷ lệ run bị từ chối, thời gian xử lý claim.
  - Đầu ra: SOP/Runbook vận hành + cảnh báo; dashboard metric.
  - Checklist: cấu hình alert (Prometheus/3rd party); cập nhật link dashboard.

## Hướng triển khai chi tiết (ưu tiên)
1. **Triển khai nhanh (Phase 0–1)**: thêm hash/version UI, event `run_submitted`, module Reward Vault, backend cấp `run_id` + seed và API KPI cơ bản. 
2. **Cạnh tranh & sponsor (Phase 2–3)**: bổ sung Leaderboard Pool + Merkle payout; form apply & dashboard duyệt; fee split và refund sponsor vault.
3. **Tăng hấp dẫn (Phase 4–5)**: chest RNG an toàn, Pass NFT động (chỉ cosmetic), bán/thuê Pass/Map/Sponsor Slot qua Kiosk.
4. **Niềm tin & chất lượng (Phase 6)**: batch giao dịch claim, sanity replay, rate limit, công khai số liệu để audit.

## Lưu ý kỹ thuật
- Gameplay phải xác định được từ **map hash + seed** để có thể kiểm chứng/offline replay.
- Không claim theo từng nhặt; luôn claim một lần sau run, payout bị chặn bởi vault hữu hạn và giới hạn tốc độ.
- Ưu tiên thử nghiệm trên testnet, chỉ mở season có sponsor trên mainnet sau khi telemetry ổn.