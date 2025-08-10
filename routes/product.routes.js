const express = require("express")
const router = express.Router()
const {
  getProducts,
  getProduct,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  addProductReview,
  getProductVariants,
  addProductVariant,
  updateProductVariant,
  deleteProductVariant,
  updateVariationTypes,
  bulkStockUpdate,
  searchProducts,
  getFeaturedProducts,
  getRelatedProducts,
} = require("../controllers/product.controller")
const { protect, admin } = require("../middleware/auth.middleware")
const upload = require("../middleware/upload.middleware")

// Public routes
router.get("/", getProducts)
router.get("/search", searchProducts)
router.get("/featured", getFeaturedProducts)
router.get("/slug/:slug", getProductBySlug)
router.get("/:id", getProduct)
router.get("/:id/variants", getProductVariants)
router.get("/:id/related", getRelatedProducts)

// Protected routes
router.post("/:id/reviews", protect, addProductReview)

// Admin routes
router.post("/", protect, admin, upload.any(), createProduct)
router.put("/:id", protect, admin, upload.any(), updateProduct)
router.delete("/:id", protect, admin, deleteProduct)
router.patch("/:id/status", protect, admin, updateProductStatus)

// Variant routes
router.post("/:id/variants", protect, admin, upload.any(), addProductVariant)
router.put("/:id/variants/:variantId", protect, admin, upload.any(), updateProductVariant)
router.delete("/:id/variants/:variantId", protect, admin, deleteProductVariant)

// Variation types routes
router.put("/:id/variation-types", protect, admin, updateVariationTypes)

// Bulk operations
router.put("/bulk-stock-update", protect, admin, bulkStockUpdate)

module.exports = router
