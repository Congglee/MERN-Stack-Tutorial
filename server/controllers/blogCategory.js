const BlogCategory = require("../models/blogCategory");
const asyncHandle = require("express-async-handler");

const createCategory = asyncHandle(async (req, res) => {
  const response = await BlogCategory.create(req.body);

  return res.json({
    success: response ? true : false,
    createdCategory: response ? response : "Cannot create new blog category",
  });
});

const getCategories = asyncHandle(async (req, res) => {
  const response = await BlogCategory.find().select("title _id");

  return res.json({
    success: response ? true : false,
    blogCategories: response ? response : "Cannot get blog category",
  });
});

const updateCategory = asyncHandle(async (req, res) => {
  const { bcid } = req.params;
  const response = await BlogCategory.findByIdAndUpdate(bcid, req.body, {
    new: true,
  });

  return res.json({
    success: response ? true : false,
    updatedCategory: response ? response : "Cannot update blog category",
  });
});

const deleteCategory = asyncHandle(async (req, res) => {
  const { bcid } = req.params;
  const response = await BlogCategory.findByIdAndDelete(bcid);

  return res.json({
    success: response ? true : false,
    deletedCategory: response ? response : "Cannot delete blog category",
  });
});

module.exports = {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
};
