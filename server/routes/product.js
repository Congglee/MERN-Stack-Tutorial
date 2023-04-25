const router = require("express").Router();
const ctrls = require("../controllers/product");
const { verifyAccessToken, isAdmin } = require("../middlewares/verifyToken");
const uploader = require("../config/cloudinary.config");

router.post("/", [verifyAccessToken, isAdmin], ctrls.createProduct);
router.get("/", ctrls.getProducts);
router.put("/ratings", verifyAccessToken, ctrls.ratings);

router.get("/:pid", ctrls.getProduct);

// Thư viện multer cung cấp 3 phương thức upload ảnh: signle, array, fields
// - single: upload 1 file lên 1 trường
// - arrays: upload nhiều file lên 1 trường
// - fields: upload nhiều file lên nhiều trường

// * Để upload ảnh lên server (cloudinary) sẽ sử dụng form-data
router.put(
  "/uploadimage/:pid",
  [verifyAccessToken, isAdmin],
  uploader.array("images", 10), // key trong form-data upload - số lượng ảnh được upload
  ctrls.uploadImagesProduct
);

router.put("/:pid", [verifyAccessToken, isAdmin], ctrls.updateProduct);
router.delete("/:pid", [verifyAccessToken, isAdmin], ctrls.deleteProduct);

module.exports = router;
