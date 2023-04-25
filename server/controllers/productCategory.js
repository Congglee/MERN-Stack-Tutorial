const ProductCategory = require("../models/productCategory");
const asyncHandle = require("express-async-handler");

const createCategory = asyncHandle(async (req, res) => {
  const response = await ProductCategory.create(req.body);

  return res.json({
    success: response ? true : false,
    createdCategory: response ? response : "Cannot create new product category",
  });
});

const getCategories = asyncHandle(async (req, res) => {
  const response = await ProductCategory.find().select("title _id");

  return res.json({
    success: response ? true : false,
    prodCategories: response ? response : "Cannot get product category",
  });
});

const updateCategory = asyncHandle(async (req, res) => {
  const { pcid } = req.params;
  const response = await ProductCategory.findByIdAndUpdate(pcid, req.body, {
    new: true,
  });

  return res.json({
    success: response ? true : false,
    updatedCategory: response ? response : "Cannot update product category",
  });
});

const deleteCategory = asyncHandle(async (req, res) => {
  const { pcid } = req.params;
  const response = await ProductCategory.findByIdAndDelete(pcid);

  return res.json({
    success: response ? true : false,
    deletedCategory: response ? response : "Cannot delete product category",
  });
});

module.exports = {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
};
