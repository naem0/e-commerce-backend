const express = require("express")
const router = express.Router()
const { protect, admin } = require("../middleware/auth.middleware")

// Import controllers
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateProfile,
  getUserProfile,
} = require("../controllers/user.controller")

// User profile routes (must come before /:id routes)
router.get("/profile", protect, getUserProfile)
router.put("/profile", protect, updateProfile)

// Admin routes
router.get("/", protect, admin, getUsers)
router.get("/:id", protect, admin, getUser)
router.put("/:id", protect, admin, updateUser)
router.delete("/:id", protect, admin, deleteUser)

module.exports = router
