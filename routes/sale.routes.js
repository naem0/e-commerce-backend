const express = require("express")
const router = express.Router()
const { getSales, getSale, createSale, getSalesAnalytics } = require("../controllers/sale.controller")
const { protect, admin } = require("../middleware/auth.middleware")

// Protected routes
router.post("/", protect, createSale)
router.get("/analytics", protect, admin, getSalesAnalytics)

// Admin routes
router.get("/", protect, admin, getSales)
router.get("/:id", protect, admin, getSale)

module.exports = router
