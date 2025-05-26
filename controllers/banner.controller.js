const Banner = require("../models/Banner")

// @desc    Get all banners
// @route   GET /api/banners
// @access  Public
exports.getBanners = async (req, res) => {
  try {
    const { enabled } = req.query

    const query = {}
    if (enabled !== undefined) {
      query.enabled = enabled === "true"
    }

    // Only show banners that are currently active (within date range)
    const now = new Date()
    query.startDate = { $lte: now }
    query.$or = [{ endDate: { $exists: false } }, { endDate: { $gte: now } }]

    const banners = await Banner.find(query).sort({ order: 1, createdAt: -1 })

    res.status(200).json({
      success: true,
      count: banners.length,
      banners,
    })
  } catch (error) {
    console.error("Get banners error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get single banner
// @route   GET /api/banners/:id
// @access  Public
exports.getBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      })
    }

    res.status(200).json({
      success: true,
      banner,
    })
  } catch (error) {
    console.error("Get banner error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Create a banner
// @route   POST /api/banners
// @access  Private/Admin
exports.createBanner = async (req, res) => {
  try {
    const {
      title,
      subtitle,
      description,
      buttonText,
      buttonLink,
      backgroundColor,
      textColor,
      enabled,
      order,
      startDate,
      endDate,
    } = req.body

    // Handle image
    let image = ""
    if (req.file) {
      image = `/uploads/${req.file.filename}`
    } else if (req.body.image) {
      image = req.body.image
    }

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "Banner image is required",
      })
    }

    const banner = await Banner.create({
      title,
      subtitle,
      description,
      image,
      buttonText: buttonText || "Shop Now",
      buttonLink: buttonLink || "/products",
      backgroundColor: backgroundColor || "#f8fafc",
      textColor: textColor || "#1e293b",
      enabled: enabled !== undefined ? enabled : true,
      order: order || 1,
      startDate: startDate || Date.now(),
      endDate,
    })

    res.status(201).json({
      success: true,
      banner,
    })
  } catch (error) {
    console.error("Create banner error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Update a banner
// @route   PUT /api/banners/:id
// @access  Private/Admin
exports.updateBanner = async (req, res) => {
  try {
    const {
      title,
      subtitle,
      description,
      buttonText,
      buttonLink,
      backgroundColor,
      textColor,
      enabled,
      order,
      startDate,
      endDate,
    } = req.body

    let banner = await Banner.findById(req.params.id)
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      })
    }

    // Handle image
    let image = banner.image
    if (req.file) {
      image = `/uploads/${req.file.filename}`
    } else if (req.body.image) {
      image = req.body.image
    }

    banner = await Banner.findByIdAndUpdate(
      req.params.id,
      {
        title: title || banner.title,
        subtitle: subtitle || banner.subtitle,
        description: description || banner.description,
        image,
        buttonText: buttonText || banner.buttonText,
        buttonLink: buttonLink || banner.buttonLink,
        backgroundColor: backgroundColor || banner.backgroundColor,
        textColor: textColor || banner.textColor,
        enabled: enabled !== undefined ? enabled : banner.enabled,
        order: order || banner.order,
        startDate: startDate || banner.startDate,
        endDate,
      },
      { new: true },
    )

    res.status(200).json({
      success: true,
      banner,
    })
  } catch (error) {
    console.error("Update banner error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Delete a banner
// @route   DELETE /api/banners/:id
// @access  Private/Admin
exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      })
    }

    await banner.deleteOne()

    res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    })
  } catch (error) {
    console.error("Delete banner error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}
