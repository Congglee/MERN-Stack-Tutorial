const mongoose = require("mongoose"); // Erase if already required
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Declare the Schema of the Mongo model

// Định nghĩa cấu hình dữ liệu một model user sẽ bao gồm có trường và kiểu dữ liệu, ...
var userSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "user",
    },
    // Giỏ hàng
    cart: [
      {
        product: { type: mongoose.Types.ObjectId, ref: "Product" },
        quantity: Number,
        color: String,
      },
    ],
    address: String,

    // Tương tự như khóa ngoại và liên kết đến bảng khác thông qua id trong MySql

    // `ref`: chỉ định tên của model mà ObjectId đề cập đến. Tương tự như việc chỉ định tên của bảng  khác trong mối quan hệ khóa ngoại của MySQL
    // `type: mongoose.Types.ObjectId`: chỉ định loại cột là ObjectId, là mã định danh duy nhất do MongoDB tạo ra. Nó tương tự như kiểu int hoặc varchar của một cột trong MySQL.
    wishlist: [{ type: mongoose.Types.ObjectId, ref: "Product" }],
    isBlocked: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
    },
    passwordChangeAt: {
      type: String,
    },
    // Sử dụng để lưu token thay đổi password
    passwordResetToken: {
      type: String,
    },
    // Thời gian còn hạn của token thay đổi password
    passwordResetExpires: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Moogoose middleware function

// userSchema.pre(): được sử dụng để khởi tạo 1 middleware function pre-hook chạy trước khi document được lưu.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    // Nếu mật khẩu chưa được sửa đổi, gọi next() để tiếp tục save
    // Áp dụng cho update, cập nhật password thì không cần phải hash lại password
    next();
  }
  // Nếu mật khẩu đã bị sửa đổi
  const salt = bcrypt.genSaltSync(10); // Hàm tạo ra một loại salt ngẫu nhiên có hệ số là 10
  this.password = await bcrypt.hash(this.password, salt); // hash password input thuần túy của user bằng phương thức bcrypt.hash() và salt được tạo
});

// `userSchema.methods` object được sử dụng để khởi tạo các phương thức instance trên User model.
// phương thức instance: một hàm có thể được gọi trên một đối tượng được tạo từ một class và hoạt động trên các thuộc tính và phương thức của đối tượng đó.
userSchema.methods = {
  isCorrectPassword: async function (password) {
    // so sánh mật khẩu được cung cấp / mật khẩu người dùng nhập vào (password) với mật khẩu hash được lưu trong document (this.password)
    return await bcrypt.compare(password, this.password); // trả về 1 promise
  },

  // tạo token thông báo bảo mật bằng mật mã để đặt lại mật khẩu của người dùng.
  createPasswordChangedToken: function () {
    // Khởi tạo reset token bằng phương thức randomBytes để tạo dữ liệu giả ngẫu nhiên mạnh bằng mật mã. Đối số kích thước là một số cho biết số lượng byte cần tạo và chuyển sang kiểu chuỗi hex (thập lục phân)
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Tạo passwordResetToken cho user
    this.passwordResetToken = crypto
      // Tạo và trả về đối tượng hash sử dụng các thuật toán có sẵn: sha256, sha512, ...
      .createHash("sha256")
      // Cập nhật nội dung hash cho resetToken
      .update(resetToken)
      // sử dụng để tính toán digest (giá trị hash) của dữ liệu đã được cập nhật với update() và trả về kết quả ở định dạng chuỗi thập lục phân.
      .digest("hex");

    // Tạo passwordResetExpires cho user, passwordResetExpires tồn tại trong 15 phút
    this.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    return resetToken;
  },
};

// mongoose.model(model, schemaDefinition): tạo một model với tên được chỉ định và định nghĩa cấu hình schema, đồng thời cung cấp model đó để sử dụng trong phần còn lại của ứng dụng Node.js.
//  - model: tên của model (documents / table)
//  - schemaDefinition: hàm định nghĩa cấu hình schema cho model

//Export một Mongoose model có tên User dựa trên cấu hình đã được định nghĩa trong userSchema
module.exports = mongoose.model("User", userSchema);
