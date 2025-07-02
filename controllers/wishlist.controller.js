const Wishlist = require("../models/Wishlist")
const Product = require("../models/Product")

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
exports.getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user.id }).populate({
      path: "products.product",
      populate: {
        path: "category brand",
        select: "name",
      },
    })

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user.id,
        products: [],
      })
    }

    res.status(200).json({
      success: true,
      wishlist,
    })
  } catch (error) {
    console.error("Get wishlist error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Add product to wishlist
// @route   POST /api/wishlist
// @access  Private
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      })
    }

    // Check if product exists
    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ user: req.user.id })

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user.id,
        products: [{ product: productId }],
      })
    } else {
      // Check if product already in wishlist
      const existingProduct = wishlist.products.find((item) => item.product.toString() === productId)

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Product already in wishlist",
        })
      }

      // Add product to wishlist
      wishlist.products.push({ product: productId })
      await wishlist.save()
    }

    // Populate and return updated wishlist
    await wishlist.populate({
      path: "products.product",
      populate: {
        path: "category brand",
        select: "name",
      },
    })

    res.status(200).json({
      success: true,
      message: "Product added to wishlist",
      wishlist,
    })
  } catch (error) {
    console.error("Add to wishlist error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params

    const wishlist = await Wishlist.findOne({ user: req.user.id })

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      })
    }

    // Remove product from wishlist
    wishlist.products = wishlist.products.filter((item) => item.product.toString() !== productId)

    await wishlist.save()

    // Populate and return updated wishlist
    await wishlist.populate({
      path: "products.product",
      populate: {
        path: "category brand",
        select: "name",
      },
    })

    res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      wishlist,
    })
  } catch (error) {
    console.error("Remove from wishlist error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Check if product is in wishlist
// @route   GET /api/wishlist/check/:productId
// @access  Private
exports.checkWishlist = async (req, res) => {
  try {
    const { productId } = req.params

    const wishlist = await Wishlist.findOne({ user: req.user.id })

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        inWishlist: false,
      })
    }

    const inWishlist = wishlist.products.some((item) => item.product.toString() === productId)

    res.status(200).json({
      success: true,
      inWishlist,
    })
  } catch (error) {
    console.error("Check wishlist error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Clear wishlist
// @route   DELETE /api/wishlist
// @access  Private
exports.clearWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id })

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      })
    }

    wishlist.products = []
    await wishlist.save()

    res.status(200).json({
      success: true,
      message: "Wishlist cleared",
      wishlist,
    })
  } catch (error) {
    console.error("Clear wishlist error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}
