/* Dán cấu hình Firebase của bạn vào đây (Firebase console > Project settings > Your apps > Web app > SDK setup and configuration > Config).
   Để trống (null) thì app chạy ở chế độ ngoại tuyến: dữ liệu chỉ lưu trong trình duyệt đang dùng. Xem HUONG-DAN-FIREBASE.txt. */
window.NEXUS_FIREBASE_CONFIG = null;
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
