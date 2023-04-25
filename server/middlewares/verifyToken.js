const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

// kiểm tra tính hợp lệ của JWT access token.
const verifyAccessToken = asyncHandler(async (req, res, next) => {
  // access token đặc biệt dùng để đăng nhập có dạng là: "Bearer token (hqjwhqkwhqjqwqwq)"

  // kiểm tra headers trong request gửi lên từ client có tồn tạo không và authorization trong headers có tồn tại và bắt đầu bằng chuỗi "Bearer"
  if (req?.headers?.authorization?.startsWith("Bearer")) {
    // headers: {authorization: Bearer token}
    // Nếu authorization header bắt đầu bằng Bearer, tách token từ headers.authorization thành một 1 mảng và lấy phần tử thứ hai (token)
    const token = req.headers.authorization.split(" ")[1];

    // Xác minh token bằng phương thức jwt.verify()
    jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
      // Nếu token không hợp lệ, nó sẽ trả về phản hồi lỗi 401 trái phép với thông báo "Invalid access token".
      if (err)
        return res.status(401).json({
          success: false,
          message: "Invalid access token",
        });

      // Nếu token hợp lệ, giải mã (decode) payloads (gói) => decode = const accessToken = generateAccessToken(response._id, role)
      // console.log(decode);
      /*
      Example:
          {
            _id: '6413df08854965a641ac1f35',
            role: 'user',
            iat: 1679222167,
            exp: 1679481367
          }
        */

      // Đặt làm thuộc tính user của req object để các middleware functions hoặc route handlers khác có thể truy cập vào nó
      req.user = decode;

      // Cuối cùng nếu mọi thứ chạy ổn định, gọi next() để chuyển quyền điều khiển cho middleware function tiếp theo hoặc route handler
      next();
    });
  } else {
    return res.status(401).json({
      success: false,
      message: "Require authentication!!!",
    });
  }
});

// Kiểm tra quyền
const isAdmin = asyncHandler((req, res, next) => {
  // Lấy ra role từ user được tạo khi login thành công trong req
  const { role } = req.user;
  if (role !== "admin")
    return res.status(401).json({
      success: false,
      mes: "REQUIRE ADMIN ROLE",
    });

  next();
});

module.exports = {
  verifyAccessToken,
  isAdmin,
};
