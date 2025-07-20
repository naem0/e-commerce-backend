const express = require("express")
const router = express.Router()
const {
  getReviews,
  getProductReviews,
  createReview,
  updateReviewStatus,
  addAdminResponse,
  deleteReview,
} = require("../controllers/review.controller")
const { protect, admin } = require("../middleware/auth.middleware")
const upload = require("../middleware/upload.middleware")

// Public routes
router.get("/product/:productId", getProductReviews)

// Protected routes
router.post("/", protect, upload.array("images", 5), createReview)

// Admin routes
router.get("/", protect, admin, getReviews)
router.patch("/:id/status", protect, admin, updateReviewStatus)
router.post("/:id/response", protect, admin, addAdminResponse)
router.delete("/:id", protect, admin, deleteReview)

module.exports = router
