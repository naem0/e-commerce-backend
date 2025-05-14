const express = require("express")
const router = express.Router()
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controller")
const { protect, admin } = require("../middleware/auth.middleware")
const upload = require("../middleware/upload.middleware")

// Public routes
router.get("/", getCategories)
router.get("/:id", getCategory)

// Protected routes
router.post("/", protect, admin, upload.single("image"), createCategory)
router.put("/:id", protect, admin, upload.single("image"), updateCategory)
router.delete("/:id", protect, admin, deleteCategory)

module.exports = router
