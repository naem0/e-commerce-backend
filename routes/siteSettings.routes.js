const express = require("express")
const router = express.Router()
const { getSiteSettings, updateSiteSettings } = require("../controllers/siteSettings.controller")
const { protect, admin } = require("../middleware/auth.middleware")
const upload = require("../middleware/upload.middleware")

// @route   GET /api/site-settings
// @desc    Get site settings
// @access  Public
router.get("/", getSiteSettings)

// @route   PUT /api/site-settings
// @desc    Update site settings
// @access  Private/Admin
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
