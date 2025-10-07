const express = require("express")
const router = express.Router()
const {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  getRoleUsers,
  seedRoles,
} = require("../controllers/role.controller")
const { protect, authorize } = require("../middleware/auth.middleware")

// Protect all routes
router.use(protect)

// Public routes (for authenticated users)
router.get("/", authorize("admin", "super_admin"), getRoles)
router.get("/:id", authorize("admin", "super_admin"), getRole)
router.get("/:id/users", authorize("admin", "super_admin"), getRoleUsers)

// Admin only routes
router.post("/", authorize("admin", "super_admin"), createRole)
router.put("/:id", authorize("admin", "super_admin"), updateRole)
router.delete("/:id", authorize("super_admin"), deleteRole)

// Super admin only routes
router.post("/seed", authorize("super_admin"), seedRoles)

module.exports = router
