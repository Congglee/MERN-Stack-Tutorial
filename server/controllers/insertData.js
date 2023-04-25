const Product = require("../models/product");
const ProductCategory = require("../models/productCategory");
const asyncHandle = require("express-async-handler");

// Dữ liệu sản phẩm sẽ được chèn vào db sau khi cào xong (scraper)
const data = require("../../data/data2.json");
const slugify = require("slugify");

// Dữ liệu danh mục sản phẩm sẽ được chèn vào db sau khi cào xong (scraper)
const categoryData = require("../../data/cate_brand");

//  Đây là một helper function giúp lấy một đối tượng sản phẩm làm đối số và tạo một document mới trong collections Product bằng cách sử dụng phương thức create() của Mongoose. Các thuộc tính của document được bắt nguồn từ đối tượng product.
const fn = async (product) => {
  await Product.create({
    title: product?.name,
    slug: slugify(product?.name) + Math.round(Math.random() * 100) + "",
    description: product?.description,
    brand: product?.brand,
    price: Math.round(Number(product?.price.match(/\d/g).join("")) / 100),
    category: product?.category[1],
    quantity: Math.round(Math.random() * 1000),
    sold: Math.round(Math.random() * 100),
    images: product?.images,
    color: product?.variants.find((el) => el.label === "Color")?.variants[0],
  });
};

// Đây là function xử lý route chèn dữ liệu sản phẩm vào collection Product.  Nó lặp qua mảng dữ liệu sản phẩm và gọi helper function fn cho từng đối tượng product, push promises trả về vào một mảng. Sau đó, nó chờ (await) tất cả các promises giải quyết (resolve) bằng cách sử dụng phương thức Promise.all() trước khi gửi phản hồi (response) cho client
const insertProduct = asyncHandle(async (req, res) => {
  const promises = [];
  for (let product of data) promises.push(fn(product));
  await Promise.all(promises);
  return res.json("Done");
});

// Đây là một helper function khác lấy một đối tượng category làm đối số và tạo một document mới trong collection ProductCategory bằng cách sử dụng phương thức create() của Mongoose. Các thuộc tính của document được bắt nguồn từ đối tượng category.
const fn2 = async (cate) => {
  await ProductCategory.create({
    title: cate?.cate,
    brand: cate?.brand,
  });
};

// Đây là function xử lý route chèn dữ liệu category vào collection ProductCategory. Nó hoạt động tương tự như hàm insertProduct, lặp qua mảng dữ liệu category và gọi helper function fn2 cho từng đối tượng category, push promises trả về vào một mảng. Sau đó, nó chờ (await) tất cả các promises giải quyết bằng cách sử dụng phương thức Promise.all() trước khi gửi phản hồi cho client.
const insertCategory = asyncHandle(async (req, res) => {
  const promises = [];
  for (let cate of categoryData) promises.push(fn2(cate));
  await Promise.all(promises);

  return res.json("Done");
});

module.exports = {
  insertProduct,
  insertCategory,
};
