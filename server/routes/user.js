const router = require("express").Router();
const ctrls = require("../controllers/user");
const { verifyAccessToken, isAdmin } = require("../middlewares/verifyToken");

router.post("/register", ctrls.register);
router.post("/login", ctrls.login);

// verifyAccessToken: phải đã đăng nhập thành công và xác thực đúng access token thì mới lấy được thông tin user hiện tại
router.get("/current", verifyAccessToken, ctrls.getCurrent);
router.post("/refreshToken", ctrls.refreshAccessToken);
router.get("/logout", ctrls.logout);
router.get("/forgotpassword", ctrls.forgotPassword);
router.put("/resetpassword", ctrls.resetPassword);

// Phải đăng nhập và xác thực thành công bằng verifyAccessToken và kiểm tra role là admin bằng isAdmin thì mới thực thi các hàm sau
router.get("/", [verifyAccessToken, isAdmin], ctrls.getUsers);
router.delete("/", [verifyAccessToken, isAdmin], ctrls.deleteUser);
router.put("/current", [verifyAccessToken], ctrls.updateUser);
router.put("/address", [verifyAccessToken], ctrls.updateUserAddress);
router.put("/cart", [verifyAccessToken], ctrls.updateCart);
router.put("/:uid", [verifyAccessToken, isAdmin], ctrls.updateUserByAdmin);

module.exports = router;

// CRUD | Create - Read - Update - Delete | POST - GET - PUT - DELETE

// Create (POST) + Update (PUT): sẽ thường lấy trong phần body = req.body dữ liệu trong phần body thường ẩn đi khi gửi lên
// Read (GET) + Delete (DELETE): sẽ thường lấy trong phần query = req.query : ?wewew dữ liệu trong phần query sẽ hiển thị ra
