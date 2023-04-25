const Product = require("../models/product");
const asyncHandle = require("express-async-handler");
const slugify = require("slugify");

const createProduct = asyncHandle(async (req, res) => {
  // Do req.body trả về là một object kể cả không nhập gì thì cũng là empty object: {}, do dó khi sử dụng !req.body sẽ trả về true
  // Sử dụng Object.keys lấy ra các key trong body và chuyển sang array để kiểm tra
  if (Object.keys(req.body).length === 0) throw new Error("Missing inputs");

  // Phương thức slugify nhận hai tham số:
  // - chuỗi văn bản cần slugify
  // - một đối tượng tùy chọn.
  // Đối tượng tùy chọn có thể được sử dụng để tùy chỉnh quy trình slugification.Ví dụ: bạn có thể chỉ định ký tự thay thế tùy chỉnh cho khoảng trắng: const slug = slugify(text, { replacement: '_' }); // Output: hello_world
  // Kiểm req.body và req.body.title có tồn tại không
  // Nếu có tạo slugs cho req.body.title(tên sản phẩm) bằng phương thức slugify
  if (req.body && req.body.title) req.body.slug = slugify(req.body.title);

  const newProduct = await Product.create(req.body);
  return res.status(200).json({
    success: newProduct ? true : false,
    createdProduct: newProduct ? newProduct : "Cannot create new product",
  });
});

const getProduct = asyncHandle(async (req, res) => {
  const { pid } = req.params;
  const product = await Product.findById(pid);

  return res.status(200).json({
    success: product ? true : false,
    productData: product ? product : "Cannot get product",
  });
});

// Filtering, Sorting & Pagination
const getProducts = asyncHandle(async (req, res) => {
  // Clone object req.query bằng spread operator (tham trị & tham chiếu)
  const queries = { ...req.query }; // Lấy ra tất cả các tham số query từ url

  // Tách các trường (cột - fields) đặc biệt ra khỏi query
  // limit - page: giới hạn dữ liệu muốn lấy, được sử dụng làm phân trang
  // sort: sắp xếp dữ liệu
  // fields: các trường mà người dùng muốn lấy, ví dụ người dùng muốn lấy trường title, price, ... thì sẽ trả đúng dữ liệu cho các trường đấy thay vì gửi tất cả các trường dữ liệu điều này sẽ làm tăng hiệu năng, giảm thời gian
  const exculdeFields = ["limit", "sort", "page", "fields"];
  // Sau mỗi lần lặp xóa các trường trong exculdeFields ra khỏi object queries clone
  exculdeFields.forEach((el) => delete queries[el]);

  // Format lại các operators (toán tử) cho đúng cú pháp của mongoose
  let queryString = JSON.stringify(queries); // chuyển đổi tham số object query thành chuỗi, để có sử dụng có thể sử dụng phương thức String.replace và biểu thức chính quy để thay thế một số toán tử đặc biệt như gte: Greater or Equal Than, gt: Greater Than, lte: Less or Equal Than, lt: Less Than

  // Cần chuyển đổi sang format này để MongoDb có thể hiểu các toán tử này
  // {durations:{gte: '5' }} map into => {durations:{$gte: '5' }}

  // regex /\b(gte|gt|lt|lte)\b/g: chọn những chuỗi là gte, gt, lt, lte
  // thay thế bằng $gte, $gt, $lt, $lte sử dụng replace lấy ra những matchedEl  thóa mãn regex /\b(gte|gt|lt|lte)\b/g (gte, gt, lt, lte) và thêm $ vào trước những matchedEl đấy
  queryString = queryString.replace(
    /\b(gte|gt|lt|lte)\b/g,
    (matchedEl) => `$${matchedEl}`
  );
  // Chuyển đổi ngược lại kiểu dữ liệu query từ chuỗi thành object bằng cách sử dụng JSON.parse
  const formatedQueries = JSON.parse(queryString); // 1 object chứa các toán tử

  // Filtering

  // Kiểm tra nếu title trong queries có tồn tại
  if (queries?.title)
    // Nếu có (điều đó có nghĩa là người dùng đã gửi tham số query có tên title trong URL)
    // Trong trường hợp đó, code sẽ tạo thuộc tính mới formattedQueries.title trong đối tượng formattedQueries, thuộc tính mới này sẽ được sử dụng sau này để lọc các sản phẩm dựa trên giá trị tiêu đề.
    // Thuộc tính formattedQueries.title được đặt thành một đối tượng chứa toán tử $regex và toán tử $options
    // - Toán tử $regex được sử dụng để khớp các chuỗi với một mẫu biểu thức chính quy. Nó lấy một biểu thức chính quy làm đối số và trả về các document chứa các chuỗi khớp với mẫu.
    // - Toán tử $options được sử dụng để chỉ định các tùy chọn cho toán tử $regex. Nó có thể được sử dụng để kiểm soát độ nhạy trường hợp, khớp nhiều dòng và các tùy chọn khác.
    formatedQueries.title = { $regex: queries.title, $options: "i" }; // Trong truy vấn này, tùy chọn "i" được sử dụng để làm cho tìm kiếm không phân biệt chữ hoa chữ thường.

  // Câu lệnh query dùng để thực thi việc lấy sản phẩm theo object formatedQueries
  let queryCommand = Product.find(formatedQueries); // Không cần sử dụng await ở đây vì có thể viết nhiều câu lệnh nữa để thực thi việc lấy dữ liệu (filter, sort, ...), -> một promise dưới dạng pending
  // Sử dụng exec để thực thi tất cả chúng thay vì thực thi từng câu lệnh một

  // price[gt]=5000&[gte]=3000
  // price: { gt: 5000, gte: 3000 }

  // Sorting
  if (req.query.sort) {
    // sort trong query sẽ nhận vào một chuỗi các trường "price,title,brand"
    const sortBy = req.query.sort.split(",").join(" ");
    // sort("field1 field2 ..."): được sử dụng để sắp xếp kết quả của truy vấn theo thứ tự tăng dần (field) hoặc giảm dần(-field) dựa trên một hoặc nhiều trường
    queryCommand = queryCommand.sort(sortBy);
  }

  // Fields limiting
  if (req.query.fields) {
    // .select("firstParam secondParam"), nó sẽ chỉ hiển thị trường đã chọn, thêm dấu trừ để loại trừ (bao gồm mọi thứ trừ các thông số đã cho)
    const fields = req.query.fields.split(",").join(" ");
    queryCommand = queryCommand.select(fields); // trả về trường đã chọn
  } else {
    // Loại trừ trường phiên bản mongo '__v' bằng cách chỉ cần đặt dấu âm (-) trước
    queryCommand = queryCommand.select("-__v");
  }

  // Pagination
  // Pagination (phân trang) là cách triển khai rất hữu ích khi bạn đang xử lý một tập dữ liệu rất lớn.
  // limit: số document lấy về 1 lần gọi api
  // skip (giống offset bên mysql): bỏ qua số document để bắt đầu lấy dữ liệu từ document cuối cùng bỏ qua
  // VD: Có tổng 10 document trong collections, để skip là 2
  // 1 2 3 4 5 ... 10 -> sẽ bỏ qua 2 cái đầu tiên và bắt đầu lấy từ cái thứ 3

  const page = +req.query.page * 1 || 1;
  const limit = +req.query.limit * 1 || process.env.LIMIT_PRODUCTS;
  const skip = (page - 1) * limit; // Điều này sẽ cho chúng ta biết có bao nhiêu bản ghi mà chúng ta phải bỏ qua và phân trang đến số trang mong muốn
  // VD: - page: 1 limit 2 -> (1 - 1) * 2 = 0 -> Trang 1 bỏ qua 0 document
  //     - page: 2 limit 2 -> (2 - 1) * 2 = 2 -> Trang 2 bỏ qua 2 document
  //     - page: 3 limit 2 -> (3 - 1) * 2 = 4 -> Trang 3 bỏ qua 4 document

  // skip(): tổng số bản ghi (records) chúng ta muốn bỏ qua từ truy vấn
  // limit(): tổng số bản ghi (records) mà chúng ta muốn hiển thị từ truy vấn
  queryCommand = queryCommand.skip(skip).limit(limit);

  // Execute query
  queryCommand.exec(async (err, response) => {
    if (err) throw new Error(err.message);

    // Số lượng dữ liệu thỏa mãn điều kiện
    const counts = await Product.find(formatedQueries).countDocuments();
    return res.status(200).json({
      success: response ? true : false,
      counts,
      products: response ? response : "Cannot get products",
    });
  });

  // Test Case
  // http://localhost:5000/api/product/?price[gt]=5000, Query the data which price is greater than than 5000
});

const updateProduct = asyncHandle(async (req, res) => {
  const { pid } = req.params;
  if (req.body && req.body.title) req.body.slug = slugify(req.body.title);
  const updatedProduct = await Product.findByIdAndUpdate(pid, req.body, {
    new: true,
  });

  return res.status(200).json({
    success: updatedProduct ? true : false,
    updatedProduct: updatedProduct ? updatedProduct : "Cannot update product",
  });
});

const deleteProduct = asyncHandle(async (req, res) => {
  const { pid } = req.params;
  const deletedProduct = await Product.findByIdAndDelete(pid);

  return res.status(200).json({
    success: deletedProduct ? true : false,
    deletedProduct: deletedProduct ? deletedProduct : "Cannot delete product",
  });
});

const ratings = asyncHandle(async (req, res) => {
  const { _id } = req.user;
  const { star, comment, pid } = req.body;
  if (!star || !pid) throw new Error("Missing inputs");

  // 2 trường hợp:
  // - TH1: user chưa đánh giá sản phẩm sẽ thêm star, comment, pid vào ratings trong product model
  // - TH2: user đã đánh giá sản phẩm sẽ chỉ cần update lại số sao, comment của ratings trong product model

  const ratingProduct = await Product.findById(pid);
  const alreadyRating = ratingProduct?.ratings?.find(
    (el) => el.postedBy.toString() === _id
  );

  if (alreadyRating) {
    // Update star & comment
    // updateOne(filter, update, options): là phương thức trong MongoDB cho phép cập nhật một document khớp với một bộ lọc filter đã chỉ định trong một collection nhất định. Phương thức updateOne cập nhật document đầu tiên mà nó tìm thấy phù hợp với tiêu chí lọc đã chỉ định.
    await Product.updateOne(
      {
        // Toán tử $elemMatch: sử dụng để truy vấn các document có chứa các mảng và để so khớp các phần tử trong các mảng đáp ứng các tiêu chí cụ thể.
        // ratings: tên của trường mảng trong collection
        // alreadyRating: tiêu chí phải phù hợp với một hoặc nhiều phần tử trong mảng
        ratings: { $elemMatch: alreadyRating },
      },
      {
        // Toán tử $set: được sử dụng để cập nhật giá trị của một trường trong document. Nó có thể được sử dụng kết hợp với các toán tử cập nhật khác để sửa đổi các trường cụ thể trong document

        // Dấu $ trong "ratings.$.star" và "ratings.$.comment" đại diện cho toán tử vị trí trong mongodb
        // Trong MongoDB, toán tử vị trí $ được sử dụng để cập nhật phần tử đầu tiên khớp với điều kiện truy vấn trong một mảng.
        // Toán tử $ trong chuỗi "ratings.$.star" và "ratings.$.comment" đề cập đến phần tử phù hợp trong mảng "ratings". Toán tử vị trí $ được sử dụng để cập nhật các trường "star" và "comment" của phần tử được so khớp với các giá trị được lưu trữ trong biến star và biến comment tương ứng.
        $set: { "ratings.$.star": star, "ratings.$.comment": comment },
      },
      { new: true }
    );

    // --> Sử dụng toán tử $ kết hợp với toán tử $elemMatch và toán tử $set cho phép chúng ta cập nhật các phần tử cụ thể trong một trường mảng trong document MongoDB phù hợp với các tiêu chí nhất định.
  } else {
    // Add star & comment
    // $push: được sử dụng để thêm phần tử vào trường mảng trong document. Nó thường được sử dụng để thêm các giá trị mới vào một mảng đã có trong document, db.collection.updateOne({<query>}, {$push: {<array>: <value>}})
    await Product.findByIdAndUpdate(
      pid,
      {
        $push: { ratings: { star, comment, postedBy: _id } },
      },
      { new: true }
    );
  }

  // Sum ratings
  const updatedProduct = await Product.findById(pid);
  const ratingCount = updatedProduct.ratings.length;
  const sumRatings = updatedProduct.ratings.reduce(
    (sum, el) => sum + +el.star,
    0
  );
  updatedProduct.totalRatings =
    Math.round((sumRatings * 10) / ratingCount) / 10;

  await updatedProduct.save();

  return res.status(200).json({
    status: true,
    updatedProduct,
  });
});

const uploadImagesProduct = asyncHandle(async (req, res) => {
  // Trước khi chạy vào hàm này thì sẽ chạy qua trước hàm uploadCloud bên file/files config cloudinary nên sau khi chạy xong hàm uploadCloud sẽ gắn vào req một thuộc tính là file/files
  // console.log(req.files);

  const { pid } = req.params;
  if (!req.files) throw new Error("Missing inputs");
  const response = await Product.findByIdAndUpdate(
    pid,
    // Lấy ra path của tất cả phần tử trong req.files bằng map

    // Toán tử $push trong MongoDB được sử dụng để thêm phần tử vào trường mảng. Toán tử $push có thể được sử dụng kết hợp với công cụ sửa đổi $each để thêm nhiều phần tử vào một trường mảng
    { $push: { images: { $each: req.files.map((el) => el.path) } } },
    { new: true }
  );

  return res.status(200).json({
    status: response ? true : false,
    updatedProduct: response ? response : "Cannot upload images product",
  });
});

module.exports = {
  createProduct,
  getProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  ratings,
  uploadImagesProduct,
};
