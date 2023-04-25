const jwt = require("jsonwebtoken");

// Tạo access token cho người dùng
const generateAccessToken = (uid, role) =>
  // Hàm nhận hai tham số uid và role tương ứng cho user ID và user role

  // jwt.sign() lấy user ID và role làm payload (gói) và mã hóa nó bằng secret key (JWT_SECRET), expressIn cũng được được thêm vào phương thức jwt.sign() để chỉ định khoảng thời gian token này sẽ hợp lệ. Trong trường hợp này, access token sẽ hết hạn sau 3 ngày.
  jwt.sign({ _id: uid, role }, process.env.JWT_SECRET, { expiresIn: "2d" });

// Tạo refresh token cho người dùng
const generateRefreshToken = (uid) =>
  jwt.sign({ _id: uid }, process.env.JWT_SECRET, { expiresIn: "7d" });

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
