const Brand = require("../models/brand");
const asyncHandle = require("express-async-handler");

const createNewBrand = asyncHandle(async (req, res) => {
  const response = await Brand.create(req.body);

  return res.json({
    success: response ? true : false,
    createdBrand: response ? response : "Cannot create new brand",
  });
});

const getBrands = asyncHandle(async (req, res) => {
  const response = await Brand.find();

  return res.json({
    success: response ? true : false,
    brands: response ? response : "Cannot get brand",
  });
});

const updateBrand = asyncHandle(async (req, res) => {
  const { bid } = req.params;
  const response = await Brand.findByIdAndUpdate(bid, req.body, {
    new: true,
  });

  return res.json({
    success: response ? true : false,
    updatedBrand: response ? response : "Cannot update brand",
  });
});

const deleteBrand = asyncHandle(async (req, res) => {
  const { bid } = req.params;
  const response = await Brand.findByIdAndDelete(bid);

  return res.json({
    success: response ? true : false,
    deletedBrand: response ? response : "Cannot delete brand",
  });
});

module.exports = {
  createNewBrand,
  getBrands,
  updateBrand,
  deleteBrand,
};
