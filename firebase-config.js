/* Dán cấu hình Firebase của bạn vào đây (Firebase console > Project settings > Your apps > Web app > SDK setup and configuration > Config).
   Để trống (null) thì app chạy ở chế độ ngoại tuyến: dữ liệu chỉ lưu trong trình duyệt đang dùng. Xem HUONG-DAN-FIREBASE.txt. */
window.NEXUS_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCzABiZ__kL-SoTBRSqm7E119AHHWiQfPk",
  authDomain: "nexus-4012e.firebaseapp.com",
  projectId: "nexus-4012e",
  storageBucket: "nexus-4012e.firebasestorage.app",
  messagingSenderId: "240483465870",
  appId: "1:240483465870:web:15559312f4d6f68344e7df"
};
/* Tài khoản quản trị: đọc được đánh giá ở trang #admin. Nhớ sửa cả danh sách trong firestore.rules (hàm isAdmin). */
window.NEXUS_ADMIN_EMAILS = ["nguyenphucvy08@gmail.com"];
/* Nơi lưu video cho Loopy (Cloudinary, miễn phí). Xem bước 7 trong HUONG-DAN-FIREBASE.txt. */
window.NEXUS_VIDEO_UPLOAD = null;   // ví dụ: { cloudName: "ten-cloud", uploadPreset: "loopy_unsigned" }
/* Chỉ cho email trường đăng video, VD "@truong.edu.vn". Để trống "" thì ai có tài khoản cũng đăng được. */
window.NEXUS_SCHOOL_EMAIL_DOMAIN = "";
/* Ví dụ:
window.NEXUS_FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "ten-du-an.firebaseapp.com",
  projectId: "ten-du-an",
  appId: "1:123456789:web:abcdef"
};
*/
