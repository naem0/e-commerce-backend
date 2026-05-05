const express = require("express")
const router = express.Router()
const {
  getPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase,
} = require("../controllers/purchase.controller")
const { protect, admin, authorize } = require("../middleware/auth.middleware")

// @route   GET /api/purchases
// @desc    Get all purchases
// @access  Private/Admin
router.get("/", protect, authorize("admin", "manager"), getPurchases)

// @route   GET /api/purchases/:id
// @desc    Get single purchase
// @access  Private/Admin
router.get("/:id", protect, authorize("admin", "manager"), getPurchase)

// @route   POST /api/purchases
// @desc    Create purchase
// @access  Private/Admin
router.post("/", protect, authorize("admin", "manager"), createPurchase)

// @route   PUT /api/purchases/:id
// @desc    Update purchase
// @access  Private/Admin
router.put("/:id", protect, authorize("admin", "manager"), updatePurchase)

// @route   DELETE /api/purchases/:id
// @desc    Delete purchase
// @access  Private/Admin
router.delete("/:id", protect, authorize("admin", "manager"), deletePurchase)

module.exports = router
