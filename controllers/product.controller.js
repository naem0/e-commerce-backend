const Product = require("../models/Product")
const Category = require("../models/Category")
const Brand = require("../models/Brand")
const mongoose = require("mongoose")

// Helper function to create slug from name
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-")
}

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      status,
      category,
      brand,
      featured,
      minPrice,
      maxPrice,
      search,
      tag,
    } = req.query

    // Build query
    const query = {}

    // Filter by status
    if (status && status !== "all") {
      query.status = status
    }

    // Filter by category
    if (category) {
      query.category = category
    }

    // Filter by brand
    if (brand) {
      query.brand = brand
    }

    // Filter by featured
    if (featured) {
      query.featured = featured === "true"
    }

    // Filter by price range
    if (minPrice && maxPrice) {
      query.price = { $gte: Number(minPrice), $lte: Number(maxPrice) }
    } else if (minPrice) {
      query.price = { $gte: Number(minPrice) }
    } else if (maxPrice) {
      query.price = { $lte: Number(maxPrice) }
    }

    // Filter by tag
    if (tag) {
      query.tags = tag
    }

    // Search by name or description
    if (search) {
      query.$text = { $search: search }
    }

    // Count total documents
    const total = await Product.countDocuments(query)

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)
    const totalPages = Math.ceil(total / Number(limit))

    // Sort options
    const sortOptions = {}
    sortOptions[sort] = order === "asc" ? 1 : -1

    // Execute query
    const products = await Product.find(query)
      .populate("category", "name")
      .populate("brand", "name logo")
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages,
      currentPage: Number(page),
      products,
    })
  } catch (error) {
    console.error("Get products error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name slug")
      .populate("brand", "name logo website")

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    res.status(200).json({
      success: true,
      product,
    })
  } catch (error) {
    console.error("Get product error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      shortDescription,
      price,
      comparePrice,
      category,
      brand,
      stock,
      featured,
      status,
      sku,
      weight,
      dimensions,
      tags,
      hasVariations,
      variationTypes,
      variants,
      seo,
      shipping,
    } = req.body

    // Create slug from name
    const slug = createSlug(name)

    // Check if product with this slug already exists
    const existingProduct = await Product.findOne({ slug })
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product with this name already exists",
      })
    }

    // Check if category exists
    const categoryExists = await Category.findById(category)
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Category not found",
      })
    }

    // Check if brand exists if provided
    if (brand) {
      const brandExists = await Brand.findById(brand)
      if (!brandExists) {
        return res.status(400).json({
          success: false,
          message: "Brand not found",
        })
      }
    }

    // Handle images
    let images = []
    if (req.files) {
      images = req.files.map((file) => `/uploads/${file.filename}`)
    } else if (req.body.images) {
      // Handle images sent as strings (e.g. from frontend)
      if (typeof req.body.images === "string") {
        images = [req.body.images]
      } else {
        images = req.body.images
      }
    }

    // Parse dimensions if provided
    let parsedDimensions = null
    if (dimensions) {
      if (typeof dimensions === "string") {
        parsedDimensions = JSON.parse(dimensions)
      } else {
        parsedDimensions = dimensions
      }
    }

    // Parse tags if provided
    let parsedTags = []
    if (tags) {
      if (typeof tags === "string") {
        parsedTags = tags.split(",").map((tag) => tag.trim())
      } else if (Array.isArray(tags)) {
        parsedTags = tags
      }
    }

    // Parse variation types if provided
    let parsedVariationTypes = []
    if (variationTypes && hasVariations) {
      if (typeof variationTypes === "string") {
        parsedVariationTypes = JSON.parse(variationTypes)
      } else {
        parsedVariationTypes = variationTypes
      }
    }

    // Parse variants if provided
    let parsedVariants = []
    if (variants && hasVariations) {
      if (typeof variants === "string") {
        parsedVariants = JSON.parse(variants)
      } else {
        parsedVariants = variants
      }
    }

    // Parse SEO if provided
    let parsedSeo = {}
    if (seo) {
      if (typeof seo === "string") {
        parsedSeo = JSON.parse(seo)
      } else {
        parsedSeo = seo
      }
    }

    // Parse shipping if provided
    let parsedShipping = {}
    if (shipping) {
      if (typeof shipping === "string") {
        parsedShipping = JSON.parse(shipping)
      } else {
        parsedShipping = shipping
      }
    }

    // Create product
    const product = await Product.create({
      name,
      slug,
      description,
      shortDescription: shortDescription || "",
      price: Number(price),
      comparePrice: comparePrice ? Number(comparePrice) : 0,
      category,
      brand: brand || null,
      stock: Number(stock),
      images,
      featured: featured === "true" || featured === true,
      status: status || "draft",
      sku: sku || "",
      weight: weight ? Number(weight) : null,
      dimensions: parsedDimensions,
      tags: parsedTags,
      hasVariations: hasVariations === "true" || hasVariations === true,
      variationTypes: parsedVariationTypes,
      variants: parsedVariants,
      seo: parsedSeo,
      shipping: parsedShipping,
    })

    res.status(201).json({
      success: true,
      product,
    })
  } catch (error) {
    console.error("Create product error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      shortDescription,
      price,
      comparePrice,
      category,
      brand,
      stock,
      featured,
      status,
      sku,
      weight,
      dimensions,
      tags,
      hasVariations,
      variationTypes,
      variants,
      seo,
      shipping,
    } = req.body

    // Find product
    let product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Update slug if name is changed
    let slug = product.slug
    if (name && name !== product.name) {
      slug = createSlug(name)

      // Check if another product with this slug already exists
      const existingProduct = await Product.findOne({ slug, _id: { $ne: req.params.id } })
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Product with this name already exists",
        })
      }
    }

    // Check if category exists if it's being updated
    if (category && category !== product.category.toString()) {
      const categoryExists = await Category.findById(category)
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: "Category not found",
        })
      }
    }

    // Check if brand exists if it's being updated
    if (brand && brand !== product.brand?.toString()) {
      const brandExists = await Brand.findById(brand)
      if (!brandExists) {
        return res.status(400).json({
          success: false,
          message: "Brand not found",
        })
      }
    }

    // Handle images
    let images = product.images
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => `/uploads/${file.filename}`)
    } else if (req.body.images) {
      // Handle images sent as strings (e.g. from frontend)
      if (typeof req.body.images === "string") {
        images = [req.body.images]
      } else {
        images = req.body.images
      }
    }

    // Parse dimensions if provided
    let parsedDimensions = product.dimensions
    if (dimensions) {
      if (typeof dimensions === "string") {
        parsedDimensions = JSON.parse(dimensions)
      } else {
        parsedDimensions = dimensions
      }
    }

    // Parse tags if provided
    let parsedTags = product.tags || []
    if (tags) {
      if (typeof tags === "string") {
        parsedTags = tags.split(",").map((tag) => tag.trim())
      } else if (Array.isArray(tags)) {
        parsedTags = tags
      }
    }

    // Parse variation types if provided
    let parsedVariationTypes = product.variationTypes || []
    if (variationTypes && (hasVariations === "true" || hasVariations === true)) {
      if (typeof variationTypes === "string") {
        parsedVariationTypes = JSON.parse(variationTypes)
      } else {
        parsedVariationTypes = variationTypes
      }
    }

    // Parse variants if provided
    let parsedVariants = product.variants || []
    if (variants && (hasVariations === "true" || hasVariations === true)) {
      if (typeof variants === "string") {
        parsedVariants = JSON.parse(variants)
      } else {
        parsedVariants = variants
      }
    }

    // Parse SEO if provided
    let parsedSeo = product.seo || {}
    if (seo) {
      if (typeof seo === "string") {
        parsedSeo = JSON.parse(seo)
      } else {
        parsedSeo = seo
      }
    }

    // Parse shipping if provided
    let parsedShipping = product.shipping || {}
    if (shipping) {
      if (typeof shipping === "string") {
        parsedShipping = JSON.parse(shipping)
      } else {
        parsedShipping = shipping
      }
    }

    // Update product
    product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: name || product.name,
        slug,
        description: description || product.description,
        shortDescription: shortDescription || product.shortDescription,
        price: price ? Number(price) : product.price,
        comparePrice: comparePrice ? Number(comparePrice) : product.comparePrice,
        category: category || product.category,
        brand: brand === "null" ? null : brand || product.brand,
        stock: stock ? Number(stock) : product.stock,
        images,
        featured: featured !== undefined ? featured === "true" || featured === true : product.featured,
        status: status || product.status,
        sku: sku || product.sku,
        weight: weight ? Number(weight) : product.weight,
        dimensions: parsedDimensions,
        tags: parsedTags,
        hasVariations:
          hasVariations !== undefined ? hasVariations === "true" || hasVariations === true : product.hasVariations,
        variationTypes: parsedVariationTypes,
        variants: parsedVariants,
        seo: parsedSeo,
        shipping: parsedShipping,
      },
      { new: true },
    )
      .populate("category", "name")
      .populate("brand", "name logo")

    res.status(200).json({
      success: true,
      product,
    })
  } catch (error) {
    console.error("Update product error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    await product.deleteOne()

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    })
  } catch (error) {
    console.error("Delete product error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Update product status
// @route   PATCH /api/products/:id/status
// @access  Private/Admin
exports.updateProductStatus = async (req, res) => {
  try {
    const { status } = req.body

    if (!["draft", "published", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      })
    }

    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    product.status = status
    await product.save()

    res.status(200).json({
      success: true,
      product,
    })
  } catch (error) {
    console.error("Update product status error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
exports.addProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body

    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Check if user already reviewed this product
    const alreadyReviewed = product.reviews.find((r) => r.user.toString() === req.user._id.toString())

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: "Product already reviewed",
      })
    }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    }

    product.reviews.push(review)

    product.numReviews = product.reviews.length

    product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length

    await product.save()

    res.status(201).json({
      success: true,
      message: "Review added",
    })
  } catch (error) {
    console.error("Create product review error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get product variants
// @route   GET /api/products/:id/variants
// @access  Public
exports.getProductVariants = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    if (!product.hasVariations) {
      return res.status(400).json({
        success: false,
        message: "This product does not have variations",
      })
    }

    res.status(200).json({
      success: true,
      variationTypes: product.variationTypes,
      variants: product.variants,
    })
  } catch (error) {
    console.error("Get product variants error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Add product variant
// @route   POST /api/products/:id/variants
// @access  Private/Admin
exports.addProductVariant = async (req, res) => {
  try {
    const { sku, price, comparePrice, stock, options, images, isDefault, status } = req.body

    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    if (!product.hasVariations) {
      return res.status(400).json({
        success: false,
        message: "This product does not have variations enabled",
      })
    }

    // Check if SKU already exists
    const skuExists = product.variants.some((variant) => variant.sku === sku)
    if (skuExists) {
      return res.status(400).json({
        success: false,
        message: "A variant with this SKU already exists",
      })
    }

    // Parse options if provided as string
    let parsedOptions = options
    if (typeof options === "string") {
      parsedOptions = JSON.parse(options)
    }

    // Check if all required variation types have values
    const requiredTypes = product.variationTypes.map((type) => type.name)
    const providedTypes = parsedOptions.map((option) => option.type)

    const missingTypes = requiredTypes.filter((type) => !providedTypes.includes(type))
    if (missingTypes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing options for variation types: ${missingTypes.join(", ")}`,
      })
    }

    // Check if this exact combination already exists
    const combinationExists = product.variants.some((variant) => {
      if (variant.options.length !== parsedOptions.length) return false

      return parsedOptions.every((option) => {
        return variant.options.some(
          (variantOption) => variantOption.type === option.type && variantOption.value === option.value,
        )
      })
    })

    if (combinationExists) {
      return res.status(400).json({
        success: false,
        message: "A variant with this exact combination already exists",
      })
    }

    // Handle images
    let variantImages = []
    if (req.files) {
      variantImages = req.files.map((file) => `/uploads/${file.filename}`)
    } else if (images) {
      if (typeof images === "string") {
        variantImages = [images]
      } else {
        variantImages = images
      }
    }

    // Create new variant
    const newVariant = {
      sku,
      price: Number(price),
      comparePrice: comparePrice ? Number(comparePrice) : undefined,
      stock: Number(stock),
      options: parsedOptions,
      images: variantImages,
      isDefault: isDefault === "true" || isDefault === true,
      status: status || "active",
    }

    // If this is set as default, unset any existing default
    if (newVariant.isDefault) {
      product.variants.forEach((variant) => {
        variant.isDefault = false
      })
    }

    product.variants.push(newVariant)
    await product.save()

    res.status(201).json({
      success: true,
      variant: newVariant,
      message: "Variant added successfully",
    })
  } catch (error) {
    console.error("Add product variant error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Update product variant
// @route   PUT /api/products/:id/variants/:variantId
// @access  Private/Admin
exports.updateProductVariant = async (req, res) => {
  try {
    const { sku, price, comparePrice, stock, options, images, isDefault, status } = req.body
    const { id, variantId } = req.params

    const product = await Product.findById(id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Find the variant
    const variantIndex = product.variants.findIndex((v) => v._id.toString() === variantId)

    if (variantIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      })
    }

    // Check if SKU already exists on another variant
    if (sku && sku !== product.variants[variantIndex].sku) {
      const skuExists = product.variants.some((v, i) => i !== variantIndex && v.sku === sku)
      if (skuExists) {
        return res.status(400).json({
          success: false,
          message: "A variant with this SKU already exists",
        })
      }
    }

    // Parse options if provided as string
    let parsedOptions = product.variants[variantIndex].options
    if (options) {
      if (typeof options === "string") {
        parsedOptions = JSON.parse(options)
      } else {
        parsedOptions = options
      }

      // Check if all required variation types have values
      const requiredTypes = product.variationTypes.map((type) => type.name)
      const providedTypes = parsedOptions.map((option) => option.type)

      const missingTypes = requiredTypes.filter((type) => !providedTypes.includes(type))
      if (missingTypes.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing options for variation types: ${missingTypes.join(", ")}`,
        })
      }

      // Check if this exact combination already exists on another variant
      const combinationExists = product.variants.some((v, i) => {
        if (i === variantIndex) return false
        if (v.options.length !== parsedOptions.length) return false

        return parsedOptions.every((option) => {
          return v.options.some(
            (variantOption) => variantOption.type === option.type && variantOption.value === option.value,
          )
        })
      })

      if (combinationExists) {
        return res.status(400).json({
          success: false,
          message: "A variant with this exact combination already exists",
        })
      }
    }

    // Handle images
    let variantImages = product.variants[variantIndex].images
    if (req.files && req.files.length > 0) {
      variantImages = req.files.map((file) => `/uploads/${file.filename}`)
    } else if (images) {
      if (typeof images === "string") {
        variantImages = [images]
      } else {
        variantImages = images
      }
    }

    // Update variant
    if (sku) product.variants[variantIndex].sku = sku
    if (price) product.variants[variantIndex].price = Number(price)
    if (comparePrice !== undefined)
      product.variants[variantIndex].comparePrice = comparePrice ? Number(comparePrice) : undefined
    if (stock !== undefined) product.variants[variantIndex].stock = Number(stock)
    if (options) product.variants[variantIndex].options = parsedOptions
    if (images) product.variants[variantIndex].images = variantImages
    if (status) product.variants[variantIndex].status = status

    // Handle isDefault flag
    if (isDefault === "true" || isDefault === true) {
      // Unset any existing default
      product.variants.forEach((v, i) => {
        product.variants[i].isDefault = i === variantIndex
      })
    } else if (isDefault === "false" || isDefault === false) {
      product.variants[variantIndex].isDefault = false
    }

    await product.save()

    res.status(200).json({
      success: true,
      variant: product.variants[variantIndex],
      message: "Variant updated successfully",
    })
  } catch (error) {
    console.error("Update product variant error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Delete product variant
// @route   DELETE /api/products/:id/variants/:variantId
// @access  Private/Admin
exports.deleteProductVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params

    const product = await Product.findById(id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Find the variant
    const variantIndex = product.variants.findIndex((v) => v._id.toString() === variantId)

    if (variantIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      })
    }

    // Check if this is the only variant
    if (product.variants.length === 1) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete the only variant. A product with variations must have at least one variant.",
      })
    }

    // Check if this is the default variant
    if (product.variants[variantIndex].isDefault) {
      // Set another variant as default
      const newDefaultIndex = variantIndex === 0 ? 1 : 0
      product.variants[newDefaultIndex].isDefault = true
    }

    // Remove the variant
    product.variants.splice(variantIndex, 1)

    await product.save()

    res.status(200).json({
      success: true,
      message: "Variant deleted successfully",
    })
  } catch (error) {
    console.error("Delete product variant error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Update product variation types
// @route   PUT /api/products/:id/variation-types
// @access  Private/Admin
exports.updateVariationTypes = async (req, res) => {
  try {
    const { variationTypes } = req.body
    const { id } = req.params

    const product = await Product.findById(id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Parse variation types if provided as string
    let parsedVariationTypes = variationTypes
    if (typeof variationTypes === "string") {
      parsedVariationTypes = JSON.parse(variationTypes)
    }

    // Validate variation types
    if (!Array.isArray(parsedVariationTypes) || parsedVariationTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one variation type is required",
      })
    }

    // Check for duplicate variation type names
    const typeNames = parsedVariationTypes.map((type) => type.name)
    if (new Set(typeNames).size !== typeNames.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate variation type names are not allowed",
      })
    }

    // Update variation types
    product.variationTypes = parsedVariationTypes
    product.hasVariations = true

    await product.save()

    res.status(200).json({
      success: true,
      variationTypes: product.variationTypes,
      message: "Variation types updated successfully",
    })
  } catch (error) {
    console.error("Update variation types error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Bulk update product stock
// @route   PUT /api/products/bulk-stock-update
// @access  Private/Admin
exports.bulkStockUpdate = async (req, res) => {
  try {
    const { updates } = req.body

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No updates provided",
      })
    }

    const results = {
      success: [],
      failed: [],
    }

    // Process each update
    for (const update of updates) {
      try {
        const { productId, stock, variantId } = update

        if (!productId || stock === undefined || stock < 0) {
          results.failed.push({
            productId,
            variantId,
            error: "Invalid update data",
          })
          continue
        }

        const product = await Product.findById(productId)

        if (!product) {
          results.failed.push({
            productId,
            variantId,
            error: "Product not found",
          })
          continue
        }

        // Update variant stock if variantId is provided
        if (variantId) {
          const variantIndex = product.variants.findIndex((v) => v._id.toString() === variantId)

          if (variantIndex === -1) {
            results.failed.push({
              productId,
              variantId,
              error: "Variant not found",
            })
            continue
          }

          product.variants[variantIndex].stock = Number(stock)
          await product.save()

          results.success.push({
            productId,
            variantId,
            newStock: Number(stock),
          })
        } else {
          // Update main product stock
          product.stock = Number(stock)
          await product.save()

          results.success.push({
            productId,
            newStock: Number(stock),
          })
        }
      } catch (error) {
        results.failed.push({
          productId: update.productId,
          variantId: update.variantId,
          error: error.message,
        })
      }
    }

    res.status(200).json({
      success: true,
      results,
      message: `Successfully updated ${results.success.length} items, failed to update ${results.failed.length} items`,
    })
  } catch (error) {
    console.error("Bulk stock update error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}
