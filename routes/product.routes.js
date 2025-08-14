const express = require("express")
const router = express.Router()
const {
  getProducts,
  getProduct,
  getProductBySlug,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getFeaturedProducts,
  generateBarcode,
} = require("../controllers/product.controller")
const { protect, admin } = require("../middleware/auth.middleware")
const upload = require("../middleware/upload.middleware")

// Public routes
router.get("/", getProducts)
router.get("/search", searchProducts)
router.get("/featured", getFeaturedProducts)
router.get("/slug/:slug", getProductBySlug)
router.get("/barcode/:barcode", getProductByBarcode)
router.get("/:id", getProduct)

// Protected routes (Admin only)
router.post(
  "/",
  protect,
  admin,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "variantImages_0", maxCount: 5 },
    { name: "variantImages_1", maxCount: 5 },
    { name: "variantImages_2", maxCount: 5 },
    { name: "variantImages_3", maxCount: 5 },
    { name: "variantImages_4", maxCount: 5 },
  ]),
  createProduct,
)

router.put(
  "/:id",
  protect,
  admin,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "variantImages_0", maxCount: 5 },
    { name: "variantImages_1", maxCount: 5 },
    { name: "variantImages_2", maxCount: 5 },
    { name: "variantImages_3", maxCount: 5 },
    { name: "variantImages_4", maxCount: 5 },
  ]),
  updateProduct,
)

router.delete("/:id", protect, admin, deleteProduct)
router.post("/:id/generate-barcode", protect, admin, generateBarcode)

module.exports = router
