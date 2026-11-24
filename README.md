# Nexus

Siêu ứng dụng cho học sinh, gói trong một trang web tĩnh:

- **The 7-Vault**: kho đề và bài làm lớp 9
- **CourtDraft**: tạo trận, chia đội
- **TheArena**: hai game 3D, Last Zone và Nexus City
- **SonicDeck**: nhạc synth
- **CommsHub**: chat theo kênh
- **Loopy**: video của trường

Có đủ tiếng Việt và tiếng Anh.

## Chạy

Mở `index.html`, hoặc xem bản trên GitHub Pages. Khi chưa nối Firebase, dữ liệu chỉ lưu trên trình duyệt đang dùng.

## Đăng nhập Google và lưu dữ liệu theo tài khoản

1. Làm theo `HUONG-DAN-FIREBASE.txt` để tạo dự án Firebase (miễn phí).
2. Dán cấu hình vào `firebase-config.js`.
3. Thêm `<tên-github>.github.io` vào **Authorized domains** của Firebase.

Sau đó tiến độ game, skin súng và gói thành viên đi theo tài khoản Google, đăng nhập trên máy nào cũng có.

## File

| File | Nội dung |
|---|---|
| `index.html` | Toàn bộ app |
| `city.js` | Game Nexus City |
| `lastzone.js` | Game Last Zone |
| `firebase-config.js` | Cấu hình Firebase và Cloudinary |
| `firestore.rules` | Luật bảo mật dán vào Firebase |
| `tools/` | Script hỗ trợ lúc phát triển |
