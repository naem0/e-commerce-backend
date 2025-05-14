const express = require("express")
const router = express.Router()
const { protect, admin } = require("../middleware/auth.middleware")

// Import controllers
const { getUsers, getUser, updateUser, deleteUser, updateProfile } = require("../controllers/user.controller")

// Admin routes
router.get("/", protect, admin, getUsers)
router.get("/:id", protect, admin, getUser)
router.put("/:id", protect, admin, updateUser)
router.delete("/:id", protect, admin, deleteUser)

// User routes
router.put("/profile/update", protect, updateProfile)

module.exports = router
