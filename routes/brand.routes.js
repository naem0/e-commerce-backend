const express = require("express")
const router = express.Router()
const { getBrands, getBrand, createBrand, updateBrand, deleteBrand } = require("../controllers/brand.controller")
const { protect, admin } = require("../middleware/auth.middleware")
const upload = require("../middleware/upload.middleware")

// Public routes
router.get("/", getBrands)
router.get("/:id", getBrand)

// Protected routes
router.post("/", protect, admin, upload.single("logo"), createBrand)
router.put("/:id", protect, admin, upload.single("logo"), updateBrand)
router.delete("/:id", protect, admin, deleteBrand)

module.exports = router
