const express = require("express")
const router = express.Router()
const {
  getReviews,
  getProductReviews,
  createReview,
  updateReviewStatus,
  addAdminResponse,
  deleteReview,
  markHelpful,
} = require("../controllers/review.controller")
const { protect, admin, authorize } = require("../middleware/auth.middleware")
const upload = require("../middleware/upload.middleware")

// Public routes
router.get("/product/:productId", getProductReviews)
router.patch("/:id/helpful", markHelpful)

// Protected routes
router.post("/", protect, upload.array("images", 5), createReview)

// Admin routes
router.get("/", protect, authorize("admin", "manager"), getReviews)
router.patch("/:id/status", protect, authorize("admin", "manager"), updateReviewStatus)
router.post("/:id/response", protect, authorize("admin", "manager"), addAdminResponse)
router.delete("/:id", protect, authorize("admin", "manager"), deleteReview)

module.exports = router
