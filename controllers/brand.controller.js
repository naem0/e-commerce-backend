const Brand = require("../models/Brand")

// Helper function to create slug from name
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-")
}

// @desc    Get all brands
// @route   GET /api/brands
// @access  Public
exports.getBrands = async (req, res) => {
  try {
    const { status } = req.query

    // Build query
    const query = {}

    // Filter by status
    if (status) {
      query.status = status
    }

    const brands = await Brand.find(query).sort({ name: 1 })

    res.status(200).json({
      success: true,
      count: brands.length,
      brands,
    })
  } catch (error) {
    console.error("Get brands error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get single brand
// @route   GET /api/brands/:id
// @access  Public
exports.getBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id)

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      })
    }

    res.status(200).json({
      success: true,
      brand,
    })
  } catch (error) {
    console.error("Get brand error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Create a brand
// @route   POST /api/brands
// @access  Private/Admin
exports.createBrand = async (req, res) => {
  try {
    const { name, description, website, status } = req.body

    // Create slug from name
    const slug = createSlug(name)

    // Check if brand with this slug already exists
    const existingBrand = await Brand.findOne({ slug })
    if (existingBrand) {
      return res.status(400).json({
        success: false,
        message: "Brand with this name already exists",
      })
    }

    // Handle logo
    let logo = ""
    if (req.file) {
      logo = `/uploads/${req.file.filename}`
    } else if (req.body.logo) {
      logo = req.body.logo
    }

    // Create brand
    const brand = await Brand.create({
      name,
      slug,
      description,
      logo,
      website,
      status: status || "active",
    })

    res.status(201).json({
      success: true,
      brand,
    })
  } catch (error) {
    console.error("Create brand error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Update a brand
// @route   PUT /api/brands/:id
// @access  Private/Admin
exports.updateBrand = async (req, res) => {
  try {
    const { name, description, website, status } = req.body

    // Find brand
    let brand = await Brand.findById(req.params.id)
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      })
    }

    // Update slug if name is changed
    let slug = brand.slug
    if (name && name !== brand.name) {
      slug = createSlug(name)

      // Check if another brand with this slug already exists
      const existingBrand = await Brand.findOne({ slug, _id: { $ne: req.params.id } })
      if (existingBrand) {
        return res.status(400).json({
          success: false,
          message: "Brand with this name already exists",
        })
      }
    }

    // Handle logo
    let logo = brand.logo
    if (req.file) {
      logo = `/uploads/${req.file.filename}`
    } else if (req.body.logo) {
      logo = req.body.logo
    }

    // Update brand
    brand = await Brand.findByIdAndUpdate(
      req.params.id,
      {
        name: name || brand.name,
        slug,
        description: description || brand.description,
        logo,
        website: website || brand.website,
        status: status || brand.status,
      },
      { new: true },
    )

    res.status(200).json({
      success: true,
      brand,
    })
  } catch (error) {
    console.error("Update brand error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Delete a brand
// @route   DELETE /api/brands/:id
// @access  Private/Admin
exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id)

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      })
    }

    await brand.deleteOne()

    res.status(200).json({
      success: true,
      message: "Brand deleted successfully",
    })
  } catch (error) {
    console.error("Delete brand error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}
