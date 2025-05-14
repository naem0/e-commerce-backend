const Category = require("../models/Category")

// Helper function to create slug from name
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-")
}

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const { status, parent } = req.query

    // Build query
    const query = {}

    // Filter by status
    if (status) {
      query.status = status
    }

    // Filter by parent
    if (parent === "null") {
      query.parent = null
    } else if (parent) {
      query.parent = parent
    }

    const categories = await Category.find(query).populate("parent", "name slug").sort({ name: 1 })

    res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    })
  } catch (error) {
    console.error("Get categories error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate("parent", "name slug")
      .populate("subcategories", "name slug image")

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    res.status(200).json({
      success: true,
      category,
    })
  } catch (error) {
    console.error("Get category error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
  try {
    const { name, description, parent, status } = req.body

    // Create slug from name
    const slug = createSlug(name)

    // Check if category with this slug already exists
    const existingCategory = await Category.findOne({ slug })
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      })
    }

    // Check if parent category exists if provided
    if (parent) {
      const parentCategory = await Category.findById(parent)
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: "Parent category not found",
        })
      }
    }

    // Handle image
    let image = ""
    if (req.file) {
      image = `/uploads/${req.file.filename}`
    } else if (req.body.image) {
      image = req.body.image
    }

    // Create category
    const category = await Category.create({
      name,
      slug,
      description,
      image,
      parent: parent || null,
      status: status || "active",
    })

    res.status(201).json({
      success: true,
      category,
    })
  } catch (error) {
    console.error("Create category error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
  try {
    const { name, description, parent, status } = req.body

    // Find category
    let category = await Category.findById(req.params.id)
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    // Update slug if name is changed
    let slug = category.slug
    if (name && name !== category.name) {
      slug = createSlug(name)

      // Check if another category with this slug already exists
      const existingCategory = await Category.findOne({ slug, _id: { $ne: req.params.id } })
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category with this name already exists",
        })
      }
    }

    // Check if parent category exists if it's being updated
    if (parent && parent !== category.parent?.toString()) {
      // Prevent circular reference (category can't be its own parent)
      if (parent === req.params.id) {
        return res.status(400).json({
          success: false,
          message: "Category cannot be its own parent",
        })
      }

      const parentCategory = await Category.findById(parent)
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: "Parent category not found",
        })
      }
    }

    // Handle image
    let image = category.image
    if (req.file) {
      image = `/uploads/${req.file.filename}`
    } else if (req.body.image) {
      image = req.body.image
    }

    // Update category
    category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name: name || category.name,
        slug,
        description: description || category.description,
        image,
        parent: parent === "null" ? null : parent || category.parent,
        status: status || category.status,
      },
      { new: true },
    ).populate("parent", "name slug")

    res.status(200).json({
      success: true,
      category,
    })
  } catch (error) {
    console.error("Update category error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    // Check if category has subcategories
    const subcategories = await Category.find({ parent: req.params.id })
    if (subcategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category with subcategories. Please delete or reassign subcategories first.",
      })
    }

    await category.deleteOne()

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    })
  } catch (error) {
    console.error("Delete category error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}
