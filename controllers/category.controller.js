const Category = require("../models/Category")
const Product = require("../models/Product")
const path = require("path")
const fs = require("fs")

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
    const {
      page = 1,
      limit = 10,
      search,
      status,
      parent,
      featured,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query

    // Build query
    const query = {}

    if (search) {
      query.$or = [{ name: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }]
    }

    if (status) {
      query.status = status
    }

    if (parent !== undefined && parent !== '') {
      query.parent = parent === "null" ? null : parent
    }

    if (featured !== undefined) {
      query.featured = featured === "true"
    }

    // Execute query with pagination
    const options = {
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
      populate: {
        path: "parent",
        select: "name slug",
      },
    }

    const result = await Category.paginate(query, options)

    res.json({
      success: true,
      categories: result.docs,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalDocs,
        itemsPerPage: result.limit,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    })
  } catch (error) {
    console.error("Get categories error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    })
  }
}

// @desc    Get single category by slug
// @route   GET /api/categories/slug/:slug
// @access  Public
exports.getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug }).populate("parent", "name slug")

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    // Get subcategories
    const subcategories = await Category.find({ parent: category._id, status: "active" })

    // Get products count
    const productsCount = await Product.countDocuments({ category: category._id, status: "published" })

    res.json({
      success: true,
      category: {
        ...category.toObject(),
        subcategories,
        productsCount,
      },
    })
  } catch (error) {
    console.error("Get category by slug error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message,
    })
  }
}

// @desc    Get single category by ID
// @route   GET /api/categories/:id
// @access  Public
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate("parent", "name slug")

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    // Get subcategories
    const subcategories = await Category.find({ parent: category._id })

    res.json({
      success: true,
      category: {
        ...category.toObject(),
        subcategories,
      },
    })
  } catch (error) {
    console.error("Get category error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message,
    })
  }
}

// @desc    Get category by slug
// @route   GET /api/categories/slug/:slug
// @access  Public
exports.getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug }).populate("parent", "name slug")

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    // Get subcategories
    const subcategories = await Category.find({ parent: category._id })

    res.json({
      success: true,
      category: {
        ...category.toObject(),
        subcategories,
      },
    })
  } catch (error) {
    console.error("Get category error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message,
    })
  }
}

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
  try {
    const { name, description, parent, status, featured, sortOrder, seo } = req.body

    // Check if category already exists
    const existingCategory = await Category.findOne({ name })
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      })
    }

    // Create slug from name
    const slug = createSlug(name)

    // Check if slug already exists
    const existingSlug = await Category.findOne({ slug })
    if (existingSlug) {
      return res.status(400).json({
        success: false,
        message: "Category with this slug already exists",
      })
    }

    // Validate parent category if provided
    if (parent !== undefined && parent !== '') {
      const parentCategory = await Category.findById(parent)
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: "Parent category not found",
        })
      }
    }

    // Create category data
    const categoryData = {
      name,
      slug,
      description,
      parent: parent || null,
      status: status || "active",
      featured: featured === "true" || featured === true,
      sortOrder: sortOrder ? Number.parseInt(sortOrder) : 0,
    }

    // Handle image upload
    if (req.file) {
      categoryData.image = `/uploads/${req.file.filename}`
    }

    // Handle SEO data
    if (seo) {
      try {
        categoryData.seo = typeof seo === "string" ? JSON.parse(seo) : seo
      } catch (e) {
        console.error("Invalid SEO format:", e)
      }
    }

    const category = new Category(categoryData)
    await category.save()

    // Populate the created category
    await category.populate("parent", "name slug")

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    })
  } catch (error) {
    console.error("Create category error:", error)

    // Clean up uploaded file if error occurs
    if (req.file) {
      const filePath = path.join(__dirname, "../uploads", req.file.filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to create category",
      error: error.message,
    })
  }
}

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
  try {
    const { name, description, parent, status, featured, sortOrder, seo } = req.body

    const category = await Category.findById(req.params.id)
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    // Check if name is being changed and if it already exists
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ name, _id: { $ne: req.params.id } })
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category with this name already exists",
        })
      }
    }

    // Validate parent category if provided
    if (parent && parent !== category.parent?.toString()) {
      const parentCategory = await Category.findById(parent)
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: "Parent category not found",
        })
      }

      // Check for circular reference
      if (parent === req.params.id) {
        return res.status(400).json({
          success: false,
          message: "Category cannot be its own parent",
        })
      }
    }

    // Update category data
    const updateData = {
      name: name || category.name,
      description: description || category.description,
      parent: parent === "null" ? null : parent || category.parent,
      status: status || category.status,
      featured: featured !== undefined ? featured === "true" || featured === true : category.featured,
      sortOrder: sortOrder ? Number.parseInt(sortOrder) : category.sortOrder,
      updatedAt: new Date(),
    }

    // Update slug if name changed
    if (name && name !== category.name) {
      const newSlug = createSlug(name)
      const existingSlug = await Category.findOne({ slug: newSlug, _id: { $ne: req.params.id } })
      if (existingSlug) {
        return res.status(400).json({
          success: false,
          message: "Category with this slug already exists",
        })
      }
      updateData.slug = newSlug
    }

    // Handle image upload
    if (req.file) {
      // Delete old image
      if (category.image) {
        const oldImagePath = path.join(__dirname, "..", category.image)
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath)
        }
      }
      updateData.image = `/uploads/${req.file.filename}`
    }

    // Handle SEO data
    if (seo) {
      try {
        updateData.seo = typeof seo === "string" ? JSON.parse(seo) : seo
      } catch (e) {
        console.error("Invalid SEO format:", e)
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("parent", "name slug")

    res.json({
      success: true,
      message: "Category updated successfully",
      category: updatedCategory,
    })
  } catch (error) {
    console.error("Update category error:", error)

    // Clean up uploaded file if error occurs
    if (req.file) {
      const filePath = path.join(__dirname, "../uploads", req.file.filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to update category",
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

    // Check if category has products
    const productsCount = await Product.countDocuments({ category: req.params.id })
    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category that has products. Please move or delete products first.",
      })
    }

    // Check if category has subcategories
    const subcategoriesCount = await Category.countDocuments({ parent: req.params.id })
    if (subcategoriesCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category that has subcategories. Please delete subcategories first.",
      })
    }

    // Delete category image
    if (category.image) {
      const imagePath = path.join(__dirname, "..", category.image)
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath)
      }
    }

    await Category.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: "Category deleted successfully",
    })
  } catch (error) {
    console.error("Delete category error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message,
    })
  }
}

// @desc    Update category status
// @route   PATCH /api/categories/:id/status
// @access  Private/Admin
exports.updateCategoryStatus = async (req, res) => {
  try {
    const { status } = req.body

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      })
    }

    const category = await Category.findById(req.params.id)

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    category.status = status
    await category.save()

    res.json({
      success: true,
      message: "Category status updated successfully",
      category,
    })
  } catch (error) {
    console.error("Update category status error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update category status",
      error: error.message,
    })
  }
}

// @desc    Get category tree
// @route   GET /api/categories/tree
// @access  Public
exports.getCategoryTree = async (req, res) => {
  try {
    const { status = "active" } = req.query

    const query = { parent: null }
    if (status !== "all") {
      query.status = status
    }

    const categories = await Category.find(query).sort({ sortOrder: 1, name: 1 })

    const buildTree = async (parentId) => {
      const children = await Category.find({ parent: parentId, status: query.status }).sort({
        sortOrder: 1,
        name: 1,
      })

      const tree = []
      for (const child of children) {
        const childTree = await buildTree(child._id)
        tree.push({
          ...child.toObject(),
          children: childTree,
        })
      }
      return tree
    }

    const tree = []
    for (const category of categories) {
      const children = await buildTree(category._id)
      tree.push({
        ...category.toObject(),
        children,
      })
    }

    res.json({
      success: true,
      categories: tree,
    })
  } catch (error) {
    console.error("Get category tree error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch category tree",
      error: error.message,
    })
  }
}
