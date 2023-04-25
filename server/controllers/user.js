const User = require("../models/user");
const asyncHandler = require("express-async-handler");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../middlewares/jwt");
const jwt = require("jsonwebtoken");
const sendMail = require("../ultils/sendMail");
const crypto = require("crypto");

// Chức năng đăng ký
const register = asyncHandler(async (req, res) => {
  const { email, password, firstname, lastname } = req.body;
  if (!email || !password || !lastname || !firstname)
    return res.status(400).json({
      success: false,
      mes: "Missing inputs",
    });

  // findOne(conditions, [projection], [options], [callback]): được sử dụng để tìm một document trong cơ sở dữ liệu MongoDB dựa trên tiêu chí truy vấn đã chỉ định. Nó trả về document phù hợp đầu tiên mà nó tìm thấy trong cơ sở dữ liệu, theo các tùy chọn truy vấn đã chỉ định

  //  - conditions: một đối tượng chỉ định tiêu chí truy vấn để chọn document. Nó có thể bao gồm các thuộc tính như giá trị trường, biểu thức chính quy, toán tử logic, v.v.
  //  - projection: một đối tượng tùy chọn chỉ định các trường sẽ được trả về trong document phù hợp. Nó có thể được sử dụng để bao gồm hoặc loại trừ các trường khỏi kết quả.
  //  - options: một đối tượng tùy chọn chỉ định các tùy chọn truy vấn bổ sung như sắp xếp, giới hạn, bỏ qua, v.v
  //  - callback: một callback function tùy chọn sẽ được gọi khi truy vấn hoàn tất. Nó nhận vào hai đối số: một error object (nếu có) và document phù hợp.

  const user = await User.findOne({ email: email });
  // lỗi tự chủ động tạo ra để errHandler bắt được lỗi
  if (user) throw new Error("User has existed!"); // = return error
  else {
    // create: tạo ra 1 hàng record / document trong bảng / documents
    const newUser = await User.create(req.body);
    return res.status(200).json({
      success: newUser ? true : false,
      mes: newUser
        ? "Register is successfully. Please go login~"
        : "Something went wrong",
    });
  }
});

// Chức năng đăng nhập
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({
      success: false,
      mes: "Missing inputs",
    });

  const response = await User.findOne({ email });
  // response.isCorrectPassword(password): lấy từ ../models/user
  if (response && (await response.isCorrectPassword(password))) {
    // isCorrectPassword(): là async function trả về 1 promise nên phải sử dụng await để chờ hàm xử lý xong và trả về true hoặc false

    // lấy ra thông tin của user ngoại trừ password và role, refreshToken
    const { password, role, refreshToken, ...userData } = response.toObject(); // do response phản hồi về là 1 object trong mongoose bao gồm các functions và thuộc tính khác của dữ liệu thực tế trợ giúp bên ngoài được lưu trữ trong tài liệu, sử dụng toObject để tạo 1 đối tượng JavaScript thuần chỉ có dữ liệu của document mà không bao gồm các thông tin khác của document như những thông tin nhạy cảm, bảo mật, ...

    // Tạo access token
    const accessToken = generateAccessToken(response._id, role);
    // Tạo refresh token
    const newRefreshToken = generateRefreshToken(response._id);

    // Lưu refresh token vào mongoDB
    await User.findByIdAndUpdate(
      response._id,
      { refreshToken: newRefreshToken },
      { new: true }
    ); // {new: true}: trả về data đã được update, ngược lại nếu là false sẽ trả về data cũ chưa update

    // Lưu refresh token vào cookie có key = "refreshToken", value = refreshToken, chỉ cho phép đầu http có quyền được truy cập vào cookie, có thời hạn hết hạn là 7 ngày tính bằng mili giây
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.status(200).json({
      success: true,
      accessToken,
      userData,
    });
  } else {
    throw new Error("Invalid credentials");
  }
});

// Lấy ra thông tin user hiện tại
const getCurrent = asyncHandler(async (req, res) => {
  const { _id } = req.user;

  // select: Chỉ định những trường document nào sẽ được lấy hoặc loại trừ
  const user = await User.findById(_id).select("-refreshToken -password -role");
  return res.status(200).json({
    success: user ? true : false,
    result: user ? user : "User not found",
  });
});

// Lấy lại mới access token khi bị hết hạn bằng refresh token còn hạn
const refreshAccessToken = asyncHandler(async (req, res) => {
  // Lấy ra cookie đang lưu trong trình duyệt
  const cookie = req.cookies;

  // Check xem có refreshToken đang lưu trong cookie hay không
  if (!cookie && !cookie.refreshToken)
    throw new Error("No refresh token in cookie");

  // `jwt.verify()`: nhận hai tham số: tham số đầu tiên là mã token cần xác minh, trong trường hợp này là cookie.refreshToken và tham số thứ hai là secret key được sử dụng để sign mã token.
  // Khi mã token được xác minh, payload đã giải mã của mã token được lưu trữ trong biến rs.
  // Payload đã giải mã của refresh token chứa ID người dùng _id và các thông tin khác được bao gồm trong refresh token khi nó được tạo. Trong trường hợp này, rs._id được sử dụng để truy vấn cơ sở dữ liệu nhằm tìm người dùng có refresh token làm mới này.

  // Check xem refreshToken có hợp lệ không (có còn hạn hay không)
  const rs = await jwt.verify(cookie.refreshToken, process.env.JWT_SECRET); // = user đã đăng nhập
  const response = await User.findOne({
    _id: rs._id,
    refreshToken: cookie.refreshToken,
  });

  return res.status(200).json({
    success: response ? true : false,
    newAccessToken: response
      ? generateAccessToken(response._id, response.role)
      : "Refresh token invalid",
  });
});

// Chức năng đăng xuất (khi đăng xuất ra sẽ xóa hết refreshToken đang lưu trong cookie / trình duyệt)
const logout = asyncHandler(async (req, res) => {
  // Lấy ra cookie đang lưu trong trình duyệt
  const cookie = req.cookies;

  // Kiểm tra xem cookie và refreshToken trong cookie (còn hạn hay không) có tồn tại không
  if (!cookie || !cookie.refreshToken)
    throw new Error("No refresh token in cookies");

  // Xóa refresh token ở db
  await User.findOneAndUpdate(
    { refreshToken: cookie.refreshToken },
    { refreshToken: "" },
    { new: true }
  );

  // Xóa refresh token ở cookie trình duyệt
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });

  return res.status(200).json({
    success: true,
    mes: "Logout is done",
  });
});

// Luồng để code api reset password
// 1. Client gửi email đã đăng ký
// 2. Server check mail có hợp lệ hay không -> Hợp lệ -> Gửi mail + kèm theo link (password change token)
// 3. Client check mail -> Click link
// 4. Khi client click vào link sẽ gửi một api kèm theo token
// 5. Check xem token có giống token mà server gửi mail hay không
// 6. Thay đổi mật khẩu

// Xác nhận quên mật khẩu và gửi mail đổi mật khẩu
const forgotPassword = asyncHandler(async (req, res) => {
  // Lấy ra email trong query của request gửi lên
  const { email } = req.query;
  if (!email) throw new Error("Missing email");

  // Lấy ra thông tin user trong db dựa vào email
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  // Tạo password change token (thêm passwordResetToken, passwordResetExpires cho user) bằng phương thức createPasswordChangedToken() trong user model
  const resetToken = user.createPasswordChangedToken();
  // Lưu user vào db sau khi được thêm passwordResetToken, passwordResetExpires
  await user.save();

  // Tạo nội dung cho mail gửi đến client dưới dạng html
  // Khi người dùng click vào thẻ a, sẽ chuyển sang đường dẫn của server chứa resetToken để đổi mật khẩu
  const html = `Xin vui lòng click vào link dưới đây để thay đổi mật khẩu của bạn. Link này sẽ hết hạn sau 15 phút kể từ bây giờ. <a href=${process.env.URL_SERVER}/api/user/reset-password/${resetToken}>Click here</a>`;

  // Khởi tạo đối tượng data chứa email của user, nội dung mail html
  // email: email của user được gửi mail tới
  // html: nội dụng mail
  const data = {
    email,
    html,
  };

  // Thực thi việc gửi mail thông báo xác nhận đổi mật khẩu bằng sendMail()
  // Lưu thông tin hàm sendMail trả về trong rs
  const rs = await sendMail(data);

  return res.status(200).json({
    success: true,
    rs,
  });
});

// Thay đổi mật khẩu
const resetPassword = asyncHandler(async (req, res) => {
  // Lấy ra password, token trong phần body gửi lên
  const { password, token } = req.body;
  if (!password || !token) throw new Error("Missing inputs");

  // Tạo mã token đổi password bằng phương thức trong thư viện crypto
  const passwordResetToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // Lấy ra user trong db dựa vào passwordResetToken vừa tạo và passwordResetExpires trong user lớn hơn thời gian thực (tức lớn hơn thời gian thực nhưng dưới 15 phút)
  const user = await User.findOne({
    passwordResetToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // Nếu không tồn tại user (reset token quá hạn 15p), chủ động ném lỗi
  if (!user) throw new Error("Invalid reset token");

  // Thay đổi giá trị các trường trong user
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordChangeAt = Date.now();
  user.passwordResetExpires = undefined;

  // Lưu thay đổi vào db
  await user.save();

  return res.status(200).json({
    success: user ? true : false,
    mes: user ? "Updated password" : "Something went wrong",
  });
});

// Lấy ra toàn bộ users trong db
const getUsers = asyncHandler(async (req, res) => {
  const response = await User.find().select("-refreshToken -password -role");
  return res.status(200).json({
    success: response ? true : false,
    users: response,
  });
});

// Xóa user trong db
const deleteUser = asyncHandler(async (req, res) => {
  // Lấy ra _id từ query trong req
  const { _id } = req.query;
  if (!_id) throw new Error("Missing inputs");

  const response = await User.findByIdAndDelete(_id);
  return res.status(200).json({
    success: response ? true : false,
    deletedUser: response
      ? `User with email ${response.email} deleted`
      : "No user delete",
  });
});

// Update user của tài khoản chính chủ (khách)
const updateUser = asyncHandler(async (req, res) => {
  // Lấy ra _id từ user được tạo khi login thành công trong req
  const { _id } = req.user;

  // Kiểm tra _id và dữ liệu nhập vào
  // Do req.body trả về là một object kể cả không nhập gì thì cũng là empty object: {}, do dó khi sử dụng !req.body sẽ trả về true
  // Sử dụng Object.keys lấy ra các key trong body và chuyển sang array để kiểm tra
  if (!_id || Object.keys(req.body).length === 0)
    throw new Error("Missing inputs");

  // Lấy ra user và update dựa vào _id
  const response = await User.findByIdAndUpdate(_id, req.body, {
    new: true,
  }).select("-password -role");
  return res.status(200).json({
    success: response ? true : false,
    updatedUser: response ? response : "Some thing went wrong",
  });
});

// Update user bằng quyền admin
const updateUserByAdmin = asyncHandler(async (req, res) => {
  // Lấy ra uid từ đường dẫn trong params từ req: /:uid
  const { uid } = req.params;
  // Kiểm tra dữ liệu nhập vào có rỗng không
  if (Object.keys(req.body).length === 0) throw new Error("Missing inputs");

  const response = await User.findByIdAndUpdate(uid, req.body, {
    new: true,
  }).select("-password -role -refreshToken");
  return res.status(200).json({
    success: response ? true : false,
    updatedUser: response ? response : "Some thing went wrong",
  });
});

// Updat địa chỉ user
const updateUserAddress = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  // Kiểm tra dữ liệu nhập vào có rỗng không
  if (!req.body.address) throw new Error("Missing inputs");

  const response = await User.findByIdAndUpdate(
    _id,
    { $push: { address: req.body.address } },
    {
      new: true,
    }
  ).select("-password -role -refreshToken");
  return res.status(200).json({
    success: response ? true : false,
    updatedUser: response ? response : "Some thing went wrong",
  });
});

// Thêm sản phẩm vào giỏ hàng và update giỏ hàng của user
const updateCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { pid, quantity, color } = req.body;
  if (!pid || !quantity || !color) throw new Error("Missing inputs");

  const user = await User.findById(_id).select("cart");

  // Có 2 trường hợp xảy ra khi thêm sản phẩm vào giỏ hàng
  // - TH1: Nếu sản phẩm đã có trong giỏ hàng
  //   Kiểm tra xem color của sản phẩm đã có trong giỏ hàng có trùng với color được thêm từ req.body không:
  //      -> Nếu có thì update lại số lượng quantity của sản phẩm đấy
  //      -> Nếu không thì thêm sản phẩm mới đấy vào giỏ hàng

  // - TH2: Nếu sản phẩm chưa có trong giỏ hàng -> thì thêm sản phẩm mới vào giỏ hàng
  const alreadyProduct = user.cart.find((el) => el.product.toString() === pid);
  if (alreadyProduct) {
    if (alreadyProduct.color === color) {
      const response = await User.updateOne(
        { cart: { $elemMatch: alreadyProduct } },
        { $set: { "cart.$.quantity": quantity } },
        { new: true }
      );
      return res.status(200).json({
        success: response ? true : false,
        updatedUser: response ? response : "Some thing went wrong",
      });
    } else {
      const response = await User.findByIdAndUpdate(
        _id,
        {
          $push: { cart: { product: pid, quantity, color } },
        },
        { new: true }
      );
      return res.status(200).json({
        success: response ? true : false,
        updatedUser: response ? response : "Some thing went wrong",
      });
    }
  } else {
    const response = await User.findByIdAndUpdate(
      _id,
      {
        $push: { cart: { product: pid, quantity, color } },
      },
      { new: true }
    );
    return res.status(200).json({
      success: response ? true : false,
      updatedUser: response ? response : "Some thing went wrong",
    });
  }
});

module.exports = {
  register,
  login,
  getCurrent,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
  getUsers,
  deleteUser,
  updateUser,
  updateUserByAdmin,
  updateUserAddress,
  updateCart,
};
