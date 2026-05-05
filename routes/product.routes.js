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
  generateBarcode,
  printBarcode,
  getRelatedProducts,
  updateFlashSale,
  updateBestSale,
} = require("../controllers/product.controller")

const { protect, admin, authorize } = require("../middleware/auth.middleware")
const upload = require("../middleware/upload.middleware")

// Public routes
router.route("/").get(getProducts)
router.route("/search").get(searchProducts)
router.route("/featured").get(getFeaturedProducts)
router.route("/slug/:slug").get(getProductBySlug)
router.route("/barcode/:barcode").get(getProductByBarcode)
router.route("/:id").get(getProduct)
router.route("/:id/related").get(getRelatedProducts)
router.route("/:id/variants").get(getProductVariants)

// Protected routes (Admin only)
router.route("/").post(protect, authorize("admin", "manager"), upload.any(), createProduct)
router.route("/:id").put(protect, authorize("admin", "manager"), upload.any(), updateProduct)
router.route("/:id").delete(protect, authorize("admin", "manager"), deleteProduct)
router.route("/:id/status").patch(protect, authorize("admin", "manager"), updateProductStatus)
router.route("/:id/generate-barcode").post(protect, authorize("admin", "manager"), generateBarcode)
router.route("/:id/print-barcode").get(protect, authorize("admin", "manager"), printBarcode)
router.route("/:id/flash-sale").patch(protect, authorize("admin", "manager"), updateFlashSale)
router.route("/:id/best-sale").patch(protect, authorize("admin", "manager"), updateBestSale)

// Variant management routes
router.route("/:id/variants").post(protect, authorize("admin", "manager"), upload.any(), addProductVariant)
router.route("/:id/variants/:variantId").put(protect, authorize("admin", "manager"), upload.any(), updateProductVariant)
router.route("/:id/variants/:variantId").delete(protect, authorize("admin", "manager"), deleteProductVariant)
router.route("/:id/variation-types").put(protect, authorize("admin", "manager"), updateVariationTypes)

// Bulk operations
router.route("/bulk-stock-update").put(protect, authorize("admin", "manager"), bulkStockUpdate)

// Review routes (Protected - User)
router.route("/:id/reviews").post(protect, addProductReview)

module.exports = router
