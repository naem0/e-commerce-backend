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
    console.log("Site settings retrieved successfully", settings)
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
    const {
      siteName,
      primaryColor,
      secondaryColor,
      heroDesign,
      featuredDesign,
      categoriesDesign,
      testimonialsDesign,
      productListDesign,
      productDetailDesign,
      cartDesign,
      checkoutDesign,
      footerDesign,
      socialLinks,
      contactInfo,
      metaTags,
    } = req.body

    // Get current settings
    let settings = await SiteSettings.getSiteSettings()

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

    // Update settings
    settings = await SiteSettings.findByIdAndUpdate(
      settings._id,
      {
        siteName: siteName || settings.siteName,
        logo,
        favicon,
        primaryColor: primaryColor || settings.primaryColor,
        secondaryColor: secondaryColor || settings.secondaryColor,
        heroDesign: heroDesign || settings.heroDesign,
        featuredDesign: featuredDesign || settings.featuredDesign,
        categoriesDesign: categoriesDesign || settings.categoriesDesign,
        testimonialsDesign: testimonialsDesign || settings.testimonialsDesign,
        productListDesign: productListDesign || settings.productListDesign,
        productDetailDesign: productDetailDesign || settings.productDetailDesign,
        cartDesign: cartDesign || settings.cartDesign,
        checkoutDesign: checkoutDesign || settings.checkoutDesign,
        footerDesign: footerDesign || settings.footerDesign,
        socialLinks: socialLinks || settings.socialLinks,
        contactInfo: contactInfo || settings.contactInfo,
        metaTags: metaTags || settings.metaTags,
      },
      { new: true },
    )

    res.status(200).json({
      success: true,
      settings,
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
