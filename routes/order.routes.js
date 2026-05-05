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
  createOrderByAdmin,
  updateOrderNotes,
} = require("../controllers/order.controller")
const { protect, admin, authorize } = require("../middleware/auth.middleware")
const upload = require("../middleware/upload.middleware")

// Protected routes
router.get("/", protect, authorize("admin", "manager"), getOrders)
router.get("/my-orders", protect, getMyOrders)
router.get("/:id", protect, getOrder)
router.post("/", protect, createOrder)
router.post("/:id/payments", protect, upload.single("screenshot"), addPartialPayment)
router.patch("/:id/payments/:paymentId/confirm", protect, authorize("admin", "manager"), confirmPayment)
router.patch("/:id/status", protect, authorize("admin", "manager"), updateOrderStatus)
router.patch("/:id/payment", protect, authorize("admin", "manager"), updatePaymentStatus)
router.patch("/:id/notes", protect, authorize("admin", "manager"), updateOrderNotes)
router.post("/admin", protect, authorize("admin", "manager"), createOrderByAdmin)

module.exports = router
