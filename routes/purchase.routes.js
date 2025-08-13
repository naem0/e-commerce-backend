const express = require("express")
const router = express.Router()
const {
  getPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase,
} = require("../controllers/purchase.controller")
const { protect, admin } = require("../middleware/auth.middleware")

// @route   GET /api/purchases
// @desc    Get all purchases
// @access  Private/Admin
router.get("/", protect, admin, getPurchases)

// @route   GET /api/purchases/:id
// @desc    Get single purchase
// @access  Private/Admin
router.get("/:id", protect, admin, getPurchase)

// @route   POST /api/purchases
// @desc    Create purchase
// @access  Private/Admin
router.post("/", protect, admin, createPurchase)

// @route   PUT /api/purchases/:id
// @desc    Update purchase
// @access  Private/Admin
router.put("/:id", protect, admin, updatePurchase)

// @route   DELETE /api/purchases/:id
// @desc    Delete purchase
// @access  Private/Admin
router.delete("/:id", protect, admin, deletePurchase)

module.exports = router
