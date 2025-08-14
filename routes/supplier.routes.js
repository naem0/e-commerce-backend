const express = require("express")
const router = express.Router()
const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierStats,
} = require("../controllers/supplier.controller")
const { protect, admin } = require("../middleware/auth.middleware")

// Apply authentication middleware to all routes
router.use(protect)
router.use(admin)

// Routes
router.get("/stats/:id?", getSupplierStats)
router.get("/", getSuppliers)
router.get("/:id", getSupplierById)
router.post("/", createSupplier)
router.put("/:id", updateSupplier)
router.delete("/:id", deleteSupplier)

module.exports = router
