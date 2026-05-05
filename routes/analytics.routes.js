const express = require("express")
const router = express.Router()
const { getDashboardAnalytics, getSalesReport, getTopCustomers } = require("../controllers/analytics.controller")
const { protect, admin, authorize } = require("../middleware/auth.middleware")

// All routes are protected
router.use(protect)

router.get("/dashboard", authorize("admin", "manager"), getDashboardAnalytics)
router.get("/sales-report", authorize("admin", "manager"), getSalesReport)
router.get("/top-customers", authorize("admin", "manager"), getTopCustomers)

module.exports = router
