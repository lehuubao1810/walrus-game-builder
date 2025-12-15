# Phân Tích & Góp Ý Cho ROADMAP.md

Dựa trên việc xem xét mã nguồn hiện tại (`nft.move`, `src/pages`) và nội dung `ROADMAP.md`, dưới đây là những phân tích về tính khả thi và các đề xuất cụ thể để hoàn thiện lộ trình.

## 1. Đánh Giá Tổng Quan

Lộ trình (Roadmap) được xây dựng rất bài bản, chia nhỏ thành các Phase hợp lý, theo hướng "MVP trước, tính năng phức tạp sau". Điều này rất phù hợp cho phát triển dApp trên Sui kết hợp Walrus.

- **Tính khả thi**: **CAO**. Các công nghệ được chọn (Sui for logic/payment, Walrus for storage) là cặp bài trùng mạnh mẽ hiện nay.
- **Điểm mạnh**: Có checklist rõ ràng cho từng task (Đầu ra, Checklist).

## 2. Phân Tích Chi Tiết & Góp Ý Theo Phase

### Phase 0: Ổn định MVP hiện tại

**Hiện trạng**:

- `nft.move` hiện tại khá đơn giản (chỉ có struct `Dungeon` và `mint`).
- Chưa có event `RunSubmitted` hay `MapCreated`.

**Góp ý**:

- **Versioning**: Bạn đề cập đến "version/hồ sơ map". Hãy cân nhắc việc `Dungeon` NFT là đại diện cho "quyền sở hữu" map, còn `MapVersion` có thể là một **Shared Object** hoặc một trường trong NFT có thể trỏ đến Table các version. Nếu mỗi lần update map lại mint NFT mới thì sẽ loãng collection.
  -> _Đề xuất_: Tách `MapMetadata` (Shared Object) ra khỏi `MapNFT` (Ownership). Hoặc đơn giản nhất cho MVP: Mỗi version là 1 NFT cũng được nhưng sẽ khó track lịch sử.
- **Sự kiện (Event)**: Rất cần thiết. Hãy định nghĩa module `events.move` ngay từ đầu để dùng chung cho cả dự án, tránh import vòng.

### Phase 1: Reward Vault cơ bản

**Phân tích**:

- Đây là bước quan trọng liên quan đến Tokenomics.
- Backend ký xác thực (`run_id` + seed) là mô hình phổ biến và an toàn cho bắt đầu.

**Góp ý**:

- **Anticheat cơ bản**: Ngay từ bước này, backend `claim` nên yêu cầu client gửi lên cả `replay_data` (chuỗi input) chứ không chỉ log rút gọn. Dù chưa verify kỹ nhưng cứ lưu lại vào Walrus để "hậu kiểm" (Phase 6) nếu thấy user nào trúng thưởng quá nhiều.
- **Emergency Stop**: Trong `Reward Vault` contract, BẮT BUỘC phải có hàm `emergency_withdraw` hoặc `pause` do admin nắm, phòng trường hợp lỗi logic bị exploit sạch pool.

### Phase 2: Leaderboard & Indexer

**Phân tích**:

- Indexer là nút thắt cổ chai về kỹ thuật. Tự build indexer tốn công vận hành.

**Góp ý**:

- **Giải pháp Indexer**: Thay vì build pipeline phức tạp ngay, có thể dùng **Sui Indexer** (của Mysten Labs) hoặc **Enoki** (nếu có budget) để query event. Hoặc đơn giản nhất: Backend lắng nghe event từ node RPC và lưu vào database cục bộ (Postgres/Redis) để tính leaderboard.
- **Merkle Proof**: Rất hay để tiết kiệm gas distributive. Nhưng lưu ý UX: User phải vào web bấm "Claim" mới nhận thưởng cuối mùa, chứ không airdrop tự động (vì tốn phí gas). Hãy làm rõ điều này trong UI.

### Phase 3: Sponsor & DAO

**Góp ý**:

- **Cấu trúc phí**: Move cho phép split payment rất dễ. Nên define rõ struct `FeeConfig` (Share Object) để admin có thể điều chỉnh % fee mà không cần redeploy contract.

### Phase 4 & 5: RNG & Kiosk

**Góp ý**:

- **RNG**: Nên dùng `sui::random` (native) thay vì Drand (cũ) để an toàn và rẻ hơn.
- **Kiosk**: Tích hợp Kiosk là chuẩn cho thương mại hóa NFT trên Sui. Có thể tận dụng `TransferPolicy` để thu tiền bản quyền (royalty) cưỡng chế mỗi khi Map được trade.

## 3. Các Đề Xuất Bổ Sung (Technical Stack)

1.  **Testing Strategy**:

    - Roadmap nhắc nhiều đến "testnet". Khuyên dùng **Sui Test Validator** (localnet) cho dev loop nhanh hơn.
    - Viết script TypeScript (`@mysten/sui`) để automate các flow: Mint -> Create Vault -> Play -> Claim.

2.  **Code Organization**:

    - Project đang để `move_contract` và `src` cùng cấp. Nên dùng **Turborepo** hoặc setup monorepo rõ ràng nếu sau này có thêm `backend` folder.

3.  **Tài liệu**:
    - Bổ sung `ARCHITECTURE.md` vẽ sơ đồ luồng dữ liệu giữa: Client <-> Backend <-> Sui <-> Walrus.

## Tổng kết

Roadmap này **RẤT KHẢ THI**.
Bạn nên bắt đầu ngay vào **Phase 0** và **Phase 1** theo đúng kế hoạch.
Những thay đổi lớn nhất cần lưu ý là thiết kế lại struct trong Move để support versioning và pause.
