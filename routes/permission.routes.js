const express = require("express")
const router = express.Router()
const {
  getPermissions,
  getPermission,
  createPermission,
  updatePermission,
  deletePermission,
  seedPermissions,
} = require("../controllers/permission.controller")
const { protect, authorize } = require("../middleware/auth.middleware")

// Protect all routes
router.use(protect)

// Public routes (for authenticated admins)
router.get("/", authorize("admin", "super_admin"), getPermissions)
router.get("/:id", authorize("admin", "super_admin"), getPermission)

// Super admin only routes
router.post("/", authorize("super_admin"), createPermission)
router.put("/:id", authorize("super_admin"), updatePermission)
router.delete("/:id", authorize("super_admin"), deletePermission)
router.post("/seed", authorize("super_admin"), seedPermissions)

module.exports = router
