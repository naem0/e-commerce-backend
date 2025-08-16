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

const { protect, admin } = require("../middleware/auth.middleware")
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
router.route("/").post(protect, admin, upload.any(), createProduct)
router.route("/:id").put(protect, admin, upload.any(), updateProduct)
router.route("/:id").delete(protect, admin, deleteProduct)
router.route("/:id/status").patch(protect, admin, updateProductStatus)
router.route("/:id/generate-barcode").post(protect, admin, generateBarcode)
router.route("/:id/print-barcode").get(protect, admin, printBarcode)
router.route("/:id/flash-sale").patch(protect, admin, updateFlashSale)
router.route("/:id/best-sale").patch(protect, admin, updateBestSale)

// Variant management routes
router.route("/:id/variants").post(protect, admin, upload.any(), addProductVariant)
router.route("/:id/variants/:variantId").put(protect, admin, upload.any(), updateProductVariant)
router.route("/:id/variants/:variantId").delete(protect, admin, deleteProductVariant)
router.route("/:id/variation-types").put(protect, admin, updateVariationTypes)

// Bulk operations
router.route("/bulk-stock-update").put(protect, admin, bulkStockUpdate)

// Review routes (Protected - User)
router.route("/:id/reviews").post(protect, addProductReview)

module.exports = router
