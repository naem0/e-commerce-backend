const express = require("express")
const router = express.Router()
const {
  getOrders,
  getMyOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  updatePaymentStatus,
} = require("../controllers/order.controller")
const { protect, admin } = require("../middleware/auth.middleware")

// Protected routes
router.get("/", protect, admin, getOrders)
router.get("/my-orders", protect, getMyOrders)
router.get("/:id", protect, getOrder)
router.post("/", protect, createOrder)
router.patch("/:id/status", protect, admin, updateOrderStatus)
router.patch("/:id/payment", protect, admin, updatePaymentStatus)

module.exports = router
