const express = require("express")
const router = express.Router()
const { getSales, getSale, createSale, getSalesAnalytics } = require("../controllers/sale.controller")
const { protect, admin } = require("../middleware/auth.middleware")

// @route   GET /api/sales
// @desc    Get all sales
// @access  Private/Admin
router.get("/", protect, admin, getSales)

// @route   GET /api/sales/analytics
// @desc    Get sales analytics
// @access  Private/Admin
router.get("/analytics", protect, admin, getSalesAnalytics)

// @route   GET /api/sales/:id
// @desc    Get single sale
// @access  Private/Admin
router.get("/:id", protect, admin, getSale)

// @route   POST /api/sales
// @desc    Create sale (POS)
// @access  Private
router.post("/", protect, createSale)

module.exports = router
