const express = require("express")
const router = express.Router()
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryBySlug,
  getCategoryTree,
} = require("../controllers/category.controller")
const { protect, admin, authorize } = require("../middleware/auth.middleware")
const upload = require("../middleware/upload.middleware")

// Public routes
router.get("/", getCategories)
router.get("/tree/all", getCategoryTree)
router.get("/:id", getCategory)
router.get("/slug/:slug", getCategoryBySlug)
// Protected routes
router.post("/", protect, authorize("admin", "manager"), upload.single("image"), createCategory)
router.put("/:id", protect, authorize("admin", "manager"), upload.single("image"), updateCategory)
router.delete("/:id", protect, authorize("admin", "manager"), deleteCategory)

module.exports = router
