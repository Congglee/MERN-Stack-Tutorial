const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var orderSchema = new mongoose.Schema({
  products: [
    {
      product: { type: mongoose.Types.ObjectId, ref: "Product" },
      count: Number,
      color: String,
    },
  ],
  // Trạng thái đơn hàng
  status: {
    type: String,
    default: "Proccessing",
    enum: ["Cancelled", "Proccessing", "Succeed"],
  },
  // Tổng số tiền đơn hàng
  total: Number,
  // Mã giảm giá áp dụng cho đơn hàng
  coupon: {
    type: mongoose.Types.ObjectId,
    ref: "Coupon",
  },
  // Người đặt
  orderBy: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
});

//Export the model
module.exports = mongoose.model("Order", orderSchema);
