const express = require("express")
const router = express.Router()
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  googleLogin,
} = require("../controllers/auth.controller")
const { protect } = require("../middleware/auth.middleware")

// Public routes
router.post("/register", register)
router.post("/login", login)
router.post("/google-login", googleLogin)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password/:token", resetPassword)
router.get("/verify-reset-token/:token", verifyResetToken)

// Protected routes
router.get("/me", protect, getMe)

module.exports = router
