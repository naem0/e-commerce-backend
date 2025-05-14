const express = require("express")
const router = express.Router()
const { getSiteSettings, updateSiteSettings } = require("../controllers/siteSettings.controller")
const { protect, admin } = require("../middleware/auth.middleware")
const upload = require("../middleware/upload.middleware")

// Public routes
router.get("/", getSiteSettings)

// Admin routes
router.put(
  "/",
  protect,
  admin,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  updateSiteSettings,
)

module.exports = router
