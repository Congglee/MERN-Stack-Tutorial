const Blog = require("../models/blog");
const asyncHandle = require("express-async-handler");

const createNewBlog = asyncHandle(async (req, res) => {
  const { title, description, category } = req.body;
  if (!title || !description || !category) throw new Error("Missing inputs");
  const response = await Blog.create(req.body);

  return res.json({
    success: response ? true : false,
    createdBlog: response ? response : "Cannot create new blog",
  });
});

const updateBlog = asyncHandle(async (req, res) => {
  const { bid } = req.params;
  if (Object.keys(req.body).length === 0) throw new Error("Missing inputs");
  const response = await Blog.findByIdAndUpdate(bid, req.body, { new: true });

  return res.json({
    success: response ? true : false,
    updatedBlog: response ? response : "Cannot update new blog",
  });
});

const getBlogs = asyncHandle(async (req, res) => {
  const response = await Blog.find();

  return res.json({
    success: response ? true : false,
    blogs: response ? response : "Cannot get blogs",
  });
});

// Like & Dislike
/*
  Khi người dùng like một bài blog sẽ có 2 trường hợp:

  TH1: Check xem người dùng trước đó có dislike hay không => nếu có thì bỏ dislike
  TH2: Check xem người dùng trước đó có like hay không => nếu có (đã like) thì bỏ like, nếu không (chưa có like bài blog) thì thêm like 
*/
const likeBlog = asyncHandle(async (req, res) => {
  const { _id } = req.user;
  const { bid } = req.params;

  if (!bid) throw new Error("Missing inputs");
  const blog = await Blog.findById(bid);

  const alreadyDisliked = blog?.dislikes?.find((el) => el.toString() === _id);
  if (alreadyDisliked) {
    const response = await Blog.findByIdAndUpdate(
      bid,
      {
        // Toán tử $pull trong MongoDB được sử dụng để xóa tất cả các trường hợp của một giá trị đã chỉ định hoặc một tập hợp các giá trị khỏi một trường mảng trong document

        // Toán tử $pull lấy một đối tượng làm đối số của nó, với key là tên của trường mảng và giá trị là một biểu thức chỉ định các giá trị cần xóa. Biểu thức có thể là một giá trị đơn hoặc một mảng các giá trị.
        $pull: { dislikes: _id },
      },
      { new: true }
    );

    return res.json({
      success: response ? true : false,
      rs: response,
    });
  }

  const isLiked = blog?.likes?.find((el) => el.toString() === _id);
  if (isLiked) {
    const response = await Blog.findByIdAndUpdate(
      bid,
      {
        $pull: { likes: _id },
      },
      { new: true }
    );

    return res.json({
      success: response ? true : false,
      rs: response,
    });
  } else {
    const response = await Blog.findByIdAndUpdate(
      bid,
      {
        // Toán tử $push trong MongoDB được sử dụng để thêm phần tử vào cuối trường mảng trong document

        // Toán tử $push lấy một đối tượng làm đối số của nó, với key là tên của trường mảng và giá trị là phần tử sẽ được thêm vào.
        $push: { likes: _id },
      },
      { new: true }
    );
    return res.json({
      success: response ? true : false,
      rs: response,
    });
  }
});

const dislikeBlog = asyncHandle(async (req, res) => {
  const { _id } = req.user;
  const { bid } = req.params;

  if (!bid) throw new Error("Missing inputs");
  const blog = await Blog.findById(bid);

  const alreadyLiked = blog?.likes?.find((el) => el.toString() === _id);
  if (alreadyLiked) {
    const response = await Blog.findByIdAndUpdate(
      bid,
      {
        $pull: { likes: _id },
      },
      { new: true }
    );

    return res.json({
      success: response ? true : false,
      rs: response,
    });
  }

  const isDisliked = blog?.dislikes?.find((el) => el.toString() === _id);
  if (isDisliked) {
    const response = await Blog.findByIdAndUpdate(
      bid,
      {
        $pull: { dislikes: _id },
      },
      { new: true }
    );

    return res.json({
      success: response ? true : false,
      rs: response,
    });
  } else {
    const response = await Blog.findByIdAndUpdate(
      bid,
      {
        $push: { dislikes: _id },
      },
      { new: true }
    );
    return res.json({
      success: response ? true : false,
      rs: response,
    });
  }
});

const getBlog = asyncHandle(async (req, res) => {
  const { bid } = req.params;
  const blog = await Blog.findByIdAndUpdate(
    bid,
    { $inc: { numberViews: 1 } },
    { new: true }
  )
    .populate("likes", "firstname lastname")
    .populate("dislikes", "firstname lastname");

  return res.json({
    success: blog ? true : false,
    rs: blog,
  });
});

const deleteBlog = asyncHandle(async (req, res) => {
  const { bid } = req.params;
  const blog = await Blog.findByIdAndDelete(bid);

  return res.json({
    success: blog ? true : false,
    deletedBlog: blog || "Something went wrong",
  });
});

const uploadImagesBlog = asyncHandle(async (req, res) => {
  const { bid } = req.params;
  if (!req.file) throw new Error("Missing inputs");
  const response = await Blog.findByIdAndUpdate(
    bid,
    { image: req.file.path },
    { new: true }
  );

  return res.status(200).json({
    status: response ? true : false,
    updatedBlog: response ? response : "Cannot upload image blog",
  });
});

module.exports = {
  createNewBlog,
  updateBlog,
  getBlogs,
  likeBlog,
  dislikeBlog,
  getBlog,
  deleteBlog,
  uploadImagesBlog,
};
