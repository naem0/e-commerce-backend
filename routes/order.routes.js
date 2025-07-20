const express = require("express")
const router = express.Router()
const {
  getOrders,
  getMyOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  updatePaymentStatus,
  addPartialPayment,
  confirmPayment,
} = require("../controllers/order.controller")
const { protect, admin } = require("../middleware/auth.middleware")
const upload = require("../middleware/upload.middleware")

// Protected routes
router.get("/", protect, admin, getOrders)
router.get("/my-orders", protect, getMyOrders)
router.get("/:id", protect, getOrder)
router.post("/", protect, createOrder)
router.post("/:id/payments", protect, upload.array("images", 5), addPartialPayment)
router.patch("/:id/payments/:paymentId/confirm", protect, admin, confirmPayment)
router.patch("/:id/status", protect, admin, updateOrderStatus)
router.patch("/:id/payment", protect, admin, updatePaymentStatus)

module.exports = router
