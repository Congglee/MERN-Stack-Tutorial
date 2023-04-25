const Order = require("../models/order");
const User = require("../models/user");
const Coupon = require("../models/coupon");
const asyncHandle = require("express-async-handler");

// Tạo đơn hàng dựa vào _id của user đang đăng nhập
const createOrder = asyncHandle(async (req, res) => {
  const { _id } = req.user;
  const { coupon } = req.body;

  // User model: cart: [ { product: { type: mongoose.Types.ObjectId, ref: "Product" }, quantity: Number, color: String,}, ],

  // Lấy ra giỏ hàng của user dựa vào _id trong req.user
  const userCart = await User.findById(_id)
    .select("cart")
    .populate("cart.product", "title price");

  // Lấy ra các thuộc tính product - sản phẩm trong giỏ hàng, count - số lượng sản phẩm trong giỏ hàng, color - màu sắc của sản phẩm trong userCart.cart bằng map method
  // Thông tin sản phẩm trong đơn hàng
  const products = userCart?.cart?.map((el) => ({
    product: el.product._id,
    count: el.quantity,
    color: el.color,
  }));

  // Tính tổng tiền của sản phẩm trong giỏ hàng bằng reduce method
  let total = userCart?.cart?.reduce(
    (sum, el) => el.product.price * el.quantity + sum,
    0
  );

  // Khởi tạo dữ liệu để tạo mới đơn hàng bao gồm: products - sản phẩm, total - tổng tiền, orderBy - người đặt
  const createData = { products, total, orderBy: _id };

  // Kiểm tra có mã giảm giá coupon không (người dùng có nhập vào mã giảm giá)
  if (coupon) {
    // Nếu có mã giảm giá
    // Lấy ra mã giảm giá giữa vào id của coupon
    // coupon = _id
    const selectedCoupon = await Coupon.findById(coupon);

    // Tính lại tổng giá tiền khi có mã giảm giá
    total =
      Math.round((total * (1 - +selectedCoupon?.discount / 100)) / 1000) *
        1000 || total;

    // Gán lại dữ liệu tạo mới dơn hàng
    createData.total = total;
    createData.coupon = coupon;
  }

  // Tạo mới đơn hàng
  const rs = await Order.create(createData);
  return res.json({
    success: rs ? true : false,
    rs: rs ? rs : "Something went wrong",
  });
});

// Cập nhật trạng thái đơn hàng bới Admin
const updateStatus = asyncHandle(async (req, res) => {
  const { oid } = req.params;
  const { status } = req.body;
  if (!status) throw new Error("Missing status");
  const response = await Order.findByIdAndUpdate(
    oid,
    { status },
    { new: true }
  );

  return res.json({
    success: response ? true : false,
    response: response ? response : "Something went wrong",
  });
});

// Lấy ra đơn hàng của user phía User
const getUserOrder = asyncHandle(async (req, res) => {
  const { _id } = req.user;
  const response = await Order.find({ orderBy: _id });

  return res.json({
    success: response ? true : false,
    response: response ? response : "Something went wrong",
  });
});

// Lấy ra tất cả đơn hàng phía Admin
const getOrders = asyncHandle(async (req, res) => {
  const response = await Order.find();

  return res.json({
    success: response ? true : false,
    response: response ? response : "Something went wrong",
  });
});

module.exports = { createOrder, updateStatus, getUserOrder, getOrders };
