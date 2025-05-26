const express = require("express")
const router = express.Router()
const { getBanners, getBanner, createBanner, updateBanner, deleteBanner } = require("../controllers/banner.controller")
const { protect, admin } = require("../middleware/auth.middleware")
const upload = require("../middleware/upload.middleware")

// Public routes
router.get("/", getBanners)
router.get("/:id", getBanner)

// Protected routes
router.post("/", protect, admin, upload.single("image"), createBanner)
router.put("/:id", protect, admin, upload.single("image"), updateBanner)
router.delete("/:id", protect, admin, deleteBanner)

module.exports = router
