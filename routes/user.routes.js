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
  assignUserRole,
  getUserRoles,
  updateUserPermissions,
  bulkAssignRoles,
  getUsersByRole,
} = require("../controllers/user.controller")

// User profile routes (must come before /:id routes)
router.get("/profile", protect, getUserProfile)
router.put("/profile", protect, updateProfile)

// Role management routes
router.get("/by-role", protect, admin, getUsersByRole)
router.get("/:id/roles", protect, admin, getUserRoles)
router.put("/:id/role", protect, admin, assignUserRole)
router.put("/:id/permissions", protect, admin, updateUserPermissions)
router.post("/bulk-assign-roles", protect, admin, bulkAssignRoles)

// Admin routes
router.get("/", protect, admin, getUsers)
router.get("/:id", protect, admin, getUser)
router.put("/:id", protect, admin, updateUser)
router.delete("/:id", protect, admin, deleteUser)

module.exports = router
