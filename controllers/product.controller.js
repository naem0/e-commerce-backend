const Product = require("../models/Product")
const Category = require("../models/Category")
const Brand = require("../models/Brand")
const mongoose = require("mongoose")
const Review = require("../models/Review")
const upload = require("../middleware/upload.middleware")
const path = require("path")
const fs = require("fs")

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
      category,
      brand,
      featured,
      status,
      search,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      sortOrder = "desc",
      includeVariants = false,
      tags,
      isFlashSale,
      isBestSale,
    } = req.query

    // Build query
    const query = {}

    if (category) query.category = category
    if (brand) query.brand = brand
    if (featured !== undefined) query.featured = featured === "true"
    if (status) query.status = status

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
        { sku: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ]
    }

    if (isFlashSale !== undefined) {
      query.isFlashSale = isFlashSale === "true"
      // Only show active flash sales
      if (isFlashSale === "true") {
        query.flashSaleStartDate = { $lte: new Date() }
        query.flashSaleEndDate = { $gte: new Date() }
      }
    }

    if (isBestSale !== undefined) {
      query.isBestSale = isBestSale === "true"
    }

    if (minPrice || maxPrice) {
      query.price = {}
      if (minPrice) query.price.$gte = Number(minPrice)
      if (maxPrice) query.price.$lte = Number(maxPrice)
    }

    if (tags) {
      const tagArray = tags.split(",").map((tag) => tag.trim())
      query.tags = { $in: tagArray }
    }

    // Sort options
    const sortOptions = {}
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1

    // Pagination options
    const options = {
      page: Number(page),
      limit: Number(limit),
      sort: sortOptions,
      populate: [
        {
          path: "category",
          select: "name slug",
        },
        {
          path: "brand",
          select: "name logo",
        },
        {
          path: "createdBy",
          select: "name email",
        },
      ],
    }

    const products = await Product.paginate(query, options)

    // Add current price logic for each product
    const productsWithCurrentPrice = products.docs.map((product) => {
      const productObj = product.toObject()

      // Check if flash sale is active
      const now = new Date()
      const isFlashSaleActive =
        productObj.isFlashSale &&
        productObj.flashSaleStartDate &&
        productObj.flashSaleEndDate &&
        now >= productObj.flashSaleStartDate &&
        now <= productObj.flashSaleEndDate

      productObj.currentPrice = isFlashSaleActive ? productObj.flashSalePrice : productObj.price
      productObj.isFlashSaleActive = isFlashSaleActive

      return productObj
    })

    res.status(200).json({
      success: true,
      products: productsWithCurrentPrice,
      pagination: {
        currentPage: products.page,
        totalPages: products.totalPages,
        totalItems: products.totalDocs,
        itemsPerPage: products.limit,
        hasNextPage: products.hasNextPage,
        hasPrevPage: products.hasPrevPage,
      },
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

// @desc    Search products by barcode
// @route   GET /api/products/barcode/:barcode
// @access  Public
exports.getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params

    // First check main product barcode
    let product = await Product.findOne({ barcode }).populate("category", "name slug").populate("brand", "name logo")

    if (product) {
      return res.status(200).json({
        success: true,
        product,
        variant: null,
      })
    }

    // If not found, check variant barcodes
    product = await Product.findOne({ "variants.barcode": barcode })
      .populate("category", "name slug")
      .populate("brand", "name logo")

    if (product) {
      const variant = product.variants.find((v) => v.barcode === barcode)
      return res.status(200).json({
        success: true,
        product,
        variant,
      })
    }

    res.status(404).json({
      success: false,
      message: "Product not found with this barcode",
    })
  } catch (error) {
    console.error("Get product by barcode error:", error)
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
      .populate("brand", "name logo")
      .populate("createdBy", "name email")

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Get reviews from Review collection
    const reviews = await Review.find({
      product: req.params.id,
      status: "approved",
    })
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .limit(10)

    // Increment views
    product.views += 1
    await product.save()

    // Add current price logic
    const productObj = product.toObject()
    const now = new Date()
    const isFlashSaleActive =
      productObj.isFlashSale &&
      productObj.flashSaleStartDate &&
      productObj.flashSaleEndDate &&
      now >= productObj.flashSaleStartDate &&
      now <= productObj.flashSaleEndDate

    productObj.currentPrice = isFlashSaleActive ? productObj.flashSalePrice : productObj.price
    productObj.isFlashSaleActive = isFlashSaleActive
    productObj.reviews = reviews

    res.status(200).json({
      success: true,
      product: productObj,
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

// @desc    Get single product by slug
// @route   GET /api/products/slug/:slug
// @access  Public
exports.getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, status: "published" })
      .populate("category", "name slug")
      .populate("brand", "name logo")
      .populate("createdBy", "name email")

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Get reviews from Review collection
    const reviews = await Review.find({
      product: product._id,
      status: "approved",
    })
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .limit(10)

    // Increment views
    product.views += 1
    await product.save()

    // Add current price logic
    const productObj = product.toObject()
    const now = new Date()
    const isFlashSaleActive =
      productObj.isFlashSale &&
      productObj.flashSaleStartDate &&
      productObj.flashSaleEndDate &&
      now >= productObj.flashSaleStartDate &&
      now <= productObj.flashSaleEndDate

    productObj.currentPrice = isFlashSaleActive ? productObj.flashSalePrice : productObj.price
    productObj.isFlashSaleActive = isFlashSaleActive
    productObj.reviews = reviews

    res.status(200).json({
      success: true,
      product: productObj,
    })
  } catch (error) {
    console.error("Get product by slug error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Create product
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
      sku,
      barcode,
      featured,
      status,
      weight,
      dimensions,
      tags,
      seo,
      shipping,
      hasVariations,
      variationTypes,
      variants,
      specification,
    } = req.body

    // Check if category exists
    const categoryExists = await Category.findById(category)
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Category not found",
      })
    }

    // Check if brand exists (if provided)
    if (brand) {
      const brandExists = await Brand.findById(brand)
      if (!brandExists) {
        return res.status(400).json({
          success: false,
          message: "Brand not found",
        })
      }
    }

    // Check if SKU already exists
    if (sku) {
      const existingSKU = await Product.findOne({ sku })
      if (existingSKU) {
        return res.status(400).json({
          success: false,
          message: "SKU already exists",
        })
      }
    }

    // Check if barcode already exists (if provided)
    if (barcode) {
      const existingBarcode = await Product.findOne({ barcode })
      if (existingBarcode) {
        return res.status(400).json({
          success: false,
          message: "Barcode already exists",
        })
      }
    }

    // Handle file uploads
    const images = []
    if (req.files && req.files.images) {
      const imageFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images]
      imageFiles.forEach((file) => {
        images.push(`/uploads/products/${file.filename}`)
      })
    }

    // Process variants if hasVariations is true
    let processedVariants = []
    if (hasVariations && variants) {
      const variantsData = typeof variants === "string" ? JSON.parse(variants) : variants

      processedVariants = variantsData.map((variant, index) => {
        const variantImages = []

        // Handle variant images
        if (req.files) {
          const variantImageKey = `variantImages_${index}`
          if (req.files[variantImageKey]) {
            const variantImageFiles = Array.isArray(req.files[variantImageKey])
              ? req.files[variantImageKey]
              : [req.files[variantImageKey]]

            variantImageFiles.forEach((file) => {
              variantImages.push(`/uploads/products/${file.filename}`)
            })
          }
        }

        return {
          ...variant,
          images: variantImages,
        }
      })
    }

    const productData = {
      name,
      description,
      shortDescription,
      price: Number(price),
      comparePrice: comparePrice ? Number(comparePrice) : undefined,
      category,
      brand: brand || undefined,
      stock: Number(stock),
      images,
      sku,
      barcode: barcode || undefined, // Allow manual barcode or auto-generate
      featured: featured === "true",
      status: status || "draft",
      weight: weight ? Number(weight) : undefined,
      dimensions: dimensions ? JSON.parse(dimensions) : undefined,
      tags: tags ? JSON.parse(tags) : [],
      seo: seo ? JSON.parse(seo) : undefined,
      shipping: shipping ? JSON.parse(shipping) : undefined,
      hasVariations: hasVariations === "true",
      variationTypes: variationTypes ? JSON.parse(variationTypes) : [],
      variants: processedVariants,
      createdBy: req.user.id,
      specification,
    }

    const product = await Product.create(productData)

    // Populate the created product
    await product.populate([
      { path: "category", select: "name slug" },
      { path: "brand", select: "name logo" },
      { path: "createdBy", select: "name email" },
    ])

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    })
  } catch (error) {
    console.error("Create product error:", error)

    // Clean up uploaded files if error occurs
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const filePath = path.join(__dirname, "../uploads", file.filename)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      })
    }

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
      seo,
      shipping,
      hasVariations,
      variationTypes,
      variants,
      specification,
    } = req.body

    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Check if name is being changed and if it already exists
    if (name && name !== product.name) {
      const existingProduct = await Product.findOne({ name, _id: { $ne: req.params.id } })
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Product with this name already exists",
        })
      }
    }

    // Validate category
    if (category && category !== product.category?.toString()) {
      const categoryExists = await Category.findById(category)
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: "Invalid category",
        })
      }
    }

    // Validate brand
    if (brand && brand !== product.brand?.toString()) {
      const brandExists = await Brand.findById(brand)
      if (!brandExists) {
        return res.status(400).json({
          success: false,
          message: "Invalid brand",
        })
      }
    }

    // Update product data
    const updateData = {
      name: name || product.name,
      description: description || product.description,
      shortDescription: shortDescription || product.shortDescription,
      price: price ? Number.parseFloat(price) : product.price,
      category: category || product.category,
      brand: brand || product.brand,
      stock: stock ? Number.parseInt(stock) : product.stock,
      featured: featured !== undefined ? featured === "true" || featured === true : product.featured,
      status: status || product.status,
      sku: sku || product.sku,
      weight: weight ? Number.parseFloat(weight) : product.weight,
      updatedAt: new Date(),
      hasVariations:
        hasVariations !== undefined ? hasVariations === "true" || hasVariations === true : product.hasVariations,
      specification: specification !== undefined ? specification : product.specification,
    }

    // Add optional fields
    if (comparePrice !== undefined) {
      updateData.comparePrice = comparePrice ? Number.parseFloat(comparePrice) : null
    }

    if (dimensions) {
      try {
        updateData.dimensions = typeof dimensions === "string" ? JSON.parse(dimensions) : dimensions
      } catch (e) {
        console.error("Invalid dimensions format:", e)
      }
    }

    if (tags) {
      try {
        updateData.tags = typeof tags === "string" ? JSON.parse(tags) : tags
      } catch (e) {
        // If JSON parse fails, try splitting by comma
        updateData.tags = typeof tags === "string" ? tags.split(",").map((tag) => tag.trim()) : tags
      }
    }

    if (seo) {
      try {
        updateData.seo = typeof seo === "string" ? JSON.parse(seo) : seo
      } catch (e) {
        console.error("Invalid SEO format:", e)
      }
    }

    if (shipping) {
      try {
        let parsedShipping = shipping;
        if (typeof shipping === "string") {
          parsedShipping = JSON.parse(shipping);
        }

        if (parsedShipping.dimensions) {
          if (typeof parsedShipping.dimensions === 'string') {
            parsedShipping.dimensions = JSON.parse(parsedShipping.dimensions);
          }
        }
        updateData.shipping = parsedShipping;
      } catch (e) {
        console.error("Invalid shipping format (update):", e);
      }
    }

    // Handle images
    let existingImages = [];
    if (req.body.images) {
      try {
        existingImages = JSON.parse(req.body.images);
      } catch (e) {
        console.error("Invalid images format:", e);
      }
    }

    const newImages = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (file.fieldname === 'newImages') {
          newImages.push(`/uploads/${file.filename}`);
        }
      });
    }

    updateData.images = [...existingImages, ...newImages];

    // video url
    if (req.body.videoUrl) {
      updateData.videoUrl = req.body.videoUrl;
    }
    console.log("Updated videoUrl:", req.body.videoUrl);

    // Handle variations
    if (updateData.hasVariations) {
      if (variationTypes) {
        try {
          updateData.variationTypes = typeof variationTypes === "string" ? JSON.parse(variationTypes) : variationTypes
        } catch (e) {
          console.error("Invalid variationTypes format:", e)
        }
      }

      if (variants) {
        try {
          const parsedVariants = typeof variants === "string" ? JSON.parse(variants) : variants
          updateData.variants = parsedVariants.map((variant, index) => {
            const variantData = {
              ...variant,
              price: Number.parseFloat(variant.price),
              stock: Number.parseInt(variant.stock),
            }

            if (variant.comparePrice) {
              variantData.comparePrice = Number.parseFloat(variant.comparePrice)
            }

            // Assign variant images from the map
            if (variantImagesMap.has(index)) {
              // Delete old variant images if new ones are uploaded
              if (variant.images && variant.images.length > 0) {
                variant.images.forEach((imagePath) => {
                  const fullPath = path.join(__dirname, "..", imagePath)
                  if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath)
                  }
                })
              }
              variantData.images = variantImagesMap.get(index);
            }

            return variantData
          })
        } catch (e) {
          console.error("Invalid variants format:", e)
        }
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate([
      { path: "category", select: "name slug" },
      { path: "brand", select: "name logo" },
      { path: "createdBy", select: "name email" },
    ])

    res.json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    })
  } catch (error) {
    console.error("Update product error:", error)

    // Clean up uploaded files if error occurs
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const filePath = path.join(__dirname, "../uploads", file.filename)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      })
    }

    res.status(500).json({
      success: false,
      message: "Failed to update product",
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

    // Delete product images
    if (product.images && product.images.length > 0) {
      product.images.forEach((imagePath) => {
        const fullPath = path.join(__dirname, "..", imagePath)
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath)
        }
      })
    }

    // Delete variant images
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach((variant) => {
        if (variant.images && variant.images.length > 0) {
          variant.images.forEach((imagePath) => {
            const fullPath = path.join(__dirname, "..", imagePath)
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath)
            }
          })
        }
      })
    }

    await Product.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: "Product deleted successfully",
    })
  } catch (error) {
    console.error("Delete product error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
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

// @desc    Delete product
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

    // Delete product images
    if (product.images && product.images.length > 0) {
      product.images.forEach((image) => {
        const imagePath = path.join(__dirname, "..", "uploads", "products", path.basename(image))
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath)
        }
      })
    }

    // Delete variant images
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach((variant) => {
        if (variant.images && variant.images.length > 0) {
          variant.images.forEach((image) => {
            const imagePath = path.join(__dirname, "..", "uploads", "products", path.basename(image))
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath)
            }
          })
        }
      })
    }

    await Product.findByIdAndDelete(req.params.id)

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
    if (req.files && req.files.length > 0) {
      // Assuming variant images are sent under a field like 'variantImages_0'
      // or simply 'images' if it's a direct variant image upload
      const variantImageFiles = req.files.filter(
        (file) => file.fieldname.startsWith("variantImages_") || file.fieldname === "images",
      )
      variantImages = variantImageFiles.map((file) => `/uploads/${file.filename}`)
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
      // Assuming variant images are sent under a field like 'variantImages_X'
      // or simply 'images' if it's a direct variant image upload
      const newVariantImageFiles = req.files.filter(
        (file) => file.fieldname.startsWith("variantImages_") || file.fieldname === "images",
      )

      if (newVariantImageFiles.length > 0) {
        // Delete old images if new ones are uploaded
        if (variantImages && variantImages.length > 0) {
          variantImages.forEach((imagePath) => {
            const fullPath = path.join(__dirname, "..", imagePath)
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath)
            }
          })
        }
        variantImages = newVariantImageFiles.map((file) => `/uploads/${file.filename}`)
      }
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

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
exports.searchProducts = async (req, res) => {
  try {
    const { q, page = 1, limit = 10, category, brand, minPrice, maxPrice } = req.query

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      })
    }

    // Build search query
    const searchQuery = {
      $and: [
        {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
            { shortDescription: { $regex: q, $options: "i" } },
            { tags: { $in: [new RegExp(q, "i")] } },
            { sku: { $regex: q, $options: "i" } },
            { barcode: { $regex: q, $options: "i" } },
          ],
        },
        { status: "published" },
      ],
    }

    // Add filters
    if (category) searchQuery.$and.push({ category })
    if (brand) searchQuery.$and.push({ brand })
    if (minPrice || maxPrice) {
      const priceFilter = {}
      if (minPrice) priceFilter.$gte = Number(minPrice)
      if (maxPrice) priceFilter.$lte = Number(maxPrice)
      searchQuery.$and.push({ price: priceFilter })
    }

    const options = {
      page: Number(page),
      limit: Number(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: "category", select: "name slug" },
        { path: "brand", select: "name logo" },
      ],
    }

    const products = await Product.paginate(searchQuery, options)

    res.status(200).json({
      success: true,
      products: products.docs,
      pagination: {
        currentPage: products.page,
        totalPages: products.totalPages,
        totalItems: products.totalDocs,
        itemsPerPage: products.limit,
        hasNextPage: products.hasNextPage,
        hasPrevPage: products.hasPrevPage,
      },
    })
  } catch (error) {
    console.error("Search products error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
exports.getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query

    const products = await Product.find({ featured: true, status: "published" })
      .populate("category", "name slug")
      .populate("brand", "name logo")
      .sort({ createdAt: -1 })
      .limit(Number(limit))

    res.status(200).json({
      success: true,
      products,
    })
  } catch (error) {
    console.error("Get featured products error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Generate barcode for product
// @route   POST /api/products/:id/generate-barcode
// @access  Private/Admin
exports.generateBarcode = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Generate new barcode
    const generateBarcode = () => {
      return Date.now().toString() + Math.random().toString(36).substr(2, 5).toUpperCase()
    }

    let newBarcode
    let isUnique = false

    // Ensure barcode is unique
    while (!isUnique) {
      newBarcode = generateBarcode()
      const existingProduct = await Product.findOne({ barcode: newBarcode })
      if (!existingProduct) {
        isUnique = true
      }
    }

    product.barcode = newBarcode
    await product.save()

    res.status(200).json({
      success: true,
      message: "Barcode generated successfully",
      barcode: newBarcode,
    })
  } catch (error) {
    console.error("Generate barcode error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Print barcode for product
// @route   GET /api/products/:id/print-barcode
// @access  Private/Admin
exports.printBarcode = async (req, res) => {
  try {
    const { id } = req.params
    const { quantity = 1, format = "CODE128" } = req.query

    const product = await Product.findById(id).populate("category", "name").populate("brand", "name")

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    if (!product.barcode) {
      return res.status(400).json({
        success: false,
        message: "Product does not have a barcode",
      })
    }

    // Generate barcode print data
    const barcodeData = {
      barcode: product.barcode,
      productName: product.name,
      price: product.price,
      sku: product.sku,
      category: product.category?.name,
      brand: product.brand?.name,
      quantity: Number(quantity),
      format: format,
      printDate: new Date().toISOString(),
    }

    res.status(200).json({
      success: true,
      message: "Barcode data generated successfully",
      data: barcodeData,
    })
  } catch (error) {
    console.error("Print barcode error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get related products
// @route   GET /api/products/:id/related
// @access  Public
exports.getRelatedProducts = async (req, res) => {
  try {
    const { limit = 4 } = req.query
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      $or: [{ category: product.category }, { brand: product.brand }, { tags: { $in: product.tags || [] } }],
      status: "published",
    })
      .limit(Number.parseInt(limit))
      .populate("category", "name slug")
      .populate("brand", "name logo")
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      products: relatedProducts,
    })
  } catch (error) {
    console.error("Get related products error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch related products",
      error: error.message,
    })
  }
}

// @desc    Update flash sale status
// @route   PATCH /api/products/:id/flash-sale
// @access  Private/Admin
exports.updateFlashSale = async (req, res) => {
  try {
    const { isFlashSale, flashSalePrice, flashSaleStartDate, flashSaleEndDate, flashSaleStock } = req.body

    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Update flash sale fields
    product.isFlashSale = isFlashSale
    if (isFlashSale) {
      product.flashSalePrice = flashSalePrice
      product.flashSaleStartDate = flashSaleStartDate
      product.flashSaleEndDate = flashSaleEndDate
      product.flashSaleStock = flashSaleStock || product.stock
    } else {
      product.flashSalePrice = undefined
      product.flashSaleStartDate = undefined
      product.flashSaleEndDate = undefined
      product.flashSaleStock = 0
    }

    await product.save()

    res.json({
      success: true,
      message: "Flash sale status updated successfully",
      product,
    })
  } catch (error) {
    console.error("Update flash sale error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update flash sale status",
      error: error.message,
    })
  }
}

// @desc    Update best sale status
// @route   PATCH /api/products/:id/best-sale
// @access  Private/Admin
exports.updateBestSale = async (req, res) => {
  try {
    const { isBestSale } = req.body

    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    product.isBestSale = isBestSale
    await product.save()

    res.json({
      success: true,
      message: "Best sale status updated successfully",
      product,
    })
  } catch (error) {
    console.error("Update best sale error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update best sale status",
      error: error.message,
    })
  }
}
