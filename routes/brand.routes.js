const express = require("express")
const router = express.Router()
const { getBrands, getBrand, createBrand, updateBrand, deleteBrand } = require("../controllers/brand.controller")
const { protect, admin, authorize } = require("../middleware/auth.middleware")
const upload = require("../middleware/upload.middleware")

// Public routes
router.get("/", getBrands)
router.get("/:id", getBrand)

// Protected routes
router.post("/", protect, authorize("admin", "manager"), upload.single("logo"), createBrand)
router.put("/:id", protect, authorize("admin", "manager"), upload.single("logo"), updateBrand)
router.delete("/:id", protect, authorize("admin", "manager"), deleteBrand)

module.exports = router
