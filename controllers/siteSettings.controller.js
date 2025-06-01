const SiteSettings = require("../models/SiteSettings")

// @desc    Get site settings
// @route   GET /api/site-settings
// @access  Public
exports.getSiteSettings = async (req, res) => {
  try {
    const settings = await SiteSettings.getSiteSettings()
    res.status(200).json({
      success: true,
      settings,
    })
  } catch (error) {
    console.error("Get site settings error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Update site settings
// @route   PUT /api/site-settings
// @access  Private/Admin
exports.updateSiteSettings = async (req, res) => {
  try {
    console.log("Update site settings - User:", req.user?.email, "Role:", req.user?.role)
    console.log("Update site settings - Request body keys:", Object.keys(req.body))

    // Get current settings
    let settings = await SiteSettings.getSiteSettings()
    console.log("Current settings ID:", settings._id)

    // Handle logo and favicon uploads
    let logo = settings.logo
    let favicon = settings.favicon

    if (req.files) {
      if (req.files.logo) {
        logo = `/uploads/${req.files.logo[0].filename}`
      }
      if (req.files.favicon) {
        favicon = `/uploads/${req.files.favicon[0].filename}`
      }
    }

    // Update settings with all provided data
    const updateData = {
      ...req.body,
      logo,
      favicon,
    }

    console.log("Updating settings with data:", Object.keys(updateData))

    settings = await SiteSettings.findByIdAndUpdate(settings._id, updateData, {
      new: true,
      runValidators: true,
    })

    console.log("Settings updated successfully:", settings._id)

    res.status(200).json({
      success: true,
      settings,
      message: "Settings updated successfully",
    })
  } catch (error) {
    console.error("Update site settings error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}
