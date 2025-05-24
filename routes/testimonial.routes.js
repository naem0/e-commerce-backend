const express = require("express")
const router = express.Router()
const {
  getTestimonials,
  getTestimonial,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} = require("../controllers/testimonial.controller")
const { protect, admin } = require("../middleware/auth.middleware")

// Public routes
router.get("/", getTestimonials)
router.get("/:id", getTestimonial)

// Protected routes
router.post("/", protect, admin, createTestimonial)
router.put("/:id", protect, admin, updateTestimonial)
router.delete("/:id", protect, admin, deleteTestimonial)

module.exports = router
