const express = require("express")
const router = express.Router()
const { getDashboardAnalytics, getSalesReport, getTopCustomers } = require("../controllers/analytics.controller")
const { protect, admin } = require("../middleware/auth.middleware")

// All routes are protected and admin only
router.use(protect, admin)

router.get("/dashboard", getDashboardAnalytics)
router.get("/sales-report", getSalesReport)
router.get("/top-customers", getTopCustomers)

module.exports = router
