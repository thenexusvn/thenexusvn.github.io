Nexus - siêu ứng dụng của trường (bản dựng lại)

Cách mở: giải nén, giữ index.html và city.js trong cùng một thư mục, rồi mở index.html bằng Chrome, Edge hoặc Safari.

- index.html: toàn bộ app (Trang chủ, The 7-Vault, CourtDraft, TheArena, SonicDeck, CommsHub, Loopy, Pro, Đăng nhập).
- city.js: game 3D Nexus City, chỉ được tải khi bấm "Vào thành phố".
- lastzone.js: game sinh tồn 3D Last Zone, chỉ được tải khi bấm "Vào sảnh" ở TheArena.

Last Zone: chơi một mình với 19 tới 49 bot. Nhảy dù từ máy bay xuống Đảo Ngọc Lam (7 khu), nhặt 6 loại súng, áo giáp, mũ, băng gạc, hộp cứu thương, lái xe địa hình, chạy bo 7 lần thu hẹp, hạ bot để giành Top 1.
- 4 chế độ: Dễ, Thường, Khó, Ác mộng. Sảnh chờ 3D, kho súng, cửa hàng 14 skin (Hiếm tới Thần thoại), trang nạp kim cương (chưa nối thanh toán, kim cương kiếm bằng cách chơi).
- Điều khiển: WASD, chuột nhìn (click vào màn hình để khoá chuột), click trái bắn, click phải ngắm, Shift chạy, Space nhảy và bung dù, C ngồi, R nạp đạn, E nhặt, F lên xuống xe, H hồi máu, 1 2 3 đổi súng, M bản đồ.
- Đồ hoạ 3 mức (Thấp, Vừa, Cao), tự hạ khi máy chạy chậm. Không có máu: trúng đạn hết máu thì bị loại khỏi trận.

Dữ liệu thật: tài liệu Vault, trận CourtDraft, tin nhắn CommsHub, số người online và lượt nghe đều là dữ liệu do người dùng tạo, không còn dữ liệu mẫu.
- Chưa có firebase-config.js: dữ liệu chỉ lưu trên trình duyệt đang dùng.
- Muốn mọi người dùng chung: làm theo HUONG-DAN-FIREBASE.txt (file firebase-config.js và firestore.rules đi kèm).

Loopy (mục mới): app video của trường. Shorts lướt dọc (video dọc dưới 60 giây) và video dài, quay bằng camera hoặc chọn file, 9 bộ lọc, 4 hiệu ứng, chữ trên video, thích (bấm đúp), bình luận, theo dõi, hồ sơ cá nhân, link chia sẻ từng video.
- Video lưu trên Cloudinary (miễn phí), cấu hình ở bước 7 của HUONG-DAN-FIREBASE.txt. Chưa cấu hình thì video chỉ lưu trên trình duyệt đang dùng.

Ngôn ngữ: chuyển Tiếng Việt / English ở thanh bên (hoặc nút EN/VI trên điện thoại). Lựa chọn được nhớ trong trình duyệt.

Nexus City:
- Bản đồ 14x14 ô phố, có sông, cầu (một cầu dây văng), phố nhà ống, trường học, sân vận động, trung tâm thương mại, cây xăng, bãi biển và vòng quay.
- Ngày và đêm (1 ngày = 12 phút), trời mưa, sấm chớp.
- Cửa hàng: đồ ăn, mart, quần áo, súng, xe (có xe máy, siêu xe), võ đường, garage. Mua được căn hộ ven biển.
- Vào được nhà (ngủ để lưu game), bệnh viện (khám bệnh), ngân hàng (cướp két ở bên trong).
- Súng không có máu: trúng đạn thì ngất. Cảnh sát từ 3 sao bắn trả.
- Phím: WASD đi/lái, Shift chạy, Space nhảy/phanh tay, J hoặc click đánh/bắn, K hoặc chuột phải đỡ/ngắm, 1-4 đổi vũ khí, F lên xe, E tương tác, R radio, H còi, M bản đồ (bấm để chỉ đường), G huỷ chỉ đường, P tạm dừng.

Cần internet cho: font chữ (Google Fonts) và thư viện 3D three.js r128 (cdnjs) khi mở Nexus City.
Tiền, kỷ lục game và tiến trình Nexus City lưu trong trình duyệt (localStorage).
