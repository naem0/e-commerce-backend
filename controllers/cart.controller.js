const Cart = require("../models/Cart")
const Product = require("../models/Product")
const mongoose = require("mongoose")

// Get user's cart
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id

    // Find or create cart
    let cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      select: "name price salePrice images stock variants", // Add variants
    })

    if (!cart) {
      cart = new Cart({ user: userId, items: [] })
      await cart.save()
    }

    // Manually construct the items array to ensure correct format
    const items = cart.items.map(item => ({
        _id: item._id,
        product: item.product,
        quantity: item.quantity,
        variation: item.variation,
        price: item.price,
    }));


    // Calculate totals
    const totals = await cart.calculateTotals()

    return res.status(200).json({
      success: true,
      cart: {
        _id: cart._id,
        items: items, // Use the manually constructed array
        subtotal: totals.subtotal,
        total: totals.total,
        totalItems: totals.totalItems,
      },
    })
  } catch (error) {
    console.error("Error getting cart:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to get cart",
      error: error.message,
    })
  }
}

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.id
    const { productId, quantity = 1, variation = null } = req.body

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      })
    }

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer",
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

    let price = product.price
    let stock = product.stock
    let selectedVariant = null

    if (variation) {
      selectedVariant = product.variants.find(v => v._id.toString() === variation)
      if (selectedVariant) {
        price = selectedVariant.price
        stock = selectedVariant.stock
      } else {
        return res.status(404).json({
          success: false,
          message: "Variation not found",
        })
      }
    }

    if (stock < quantity) {
      return res.status(400).json({
        success: false,
        message: "Not enough stock available",
      })
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: userId })
    if (!cart) {
      cart = new Cart({ user: userId, items: [] })
    }

    // Check if product already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId && item.variation?._id.toString() === variation,
    )

    if (existingItemIndex !== -1) {
      // Update quantity if product exists
      cart.items[existingItemIndex].quantity += quantity
    } else {
      // Add new item if product doesn't exist
      cart.items.push({
        product: productId,
        quantity,
        variation: selectedVariant,
        price,
      })
    }

    // Save cart
    await cart.save()

    // Populate product details
    await cart.populate({
      path: "items.product",
      select: "name price salePrice images stock",
    })

    // Calculate totals
    const totals = await cart.calculateTotals()

    return res.status(200).json({
      success: true,
      message: "Item added to cart",
      cart: {
        _id: cart._id,
        items: cart.items,
        subtotal: totals.subtotal,
        total: totals.total,
        totalItems: totals.totalItems,
      },
    })
  } catch (error) {
    console.error("Error adding to cart:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to add item to cart",
      error: error.message,
    })
  }
}

// Update cart item
exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id
    const { productId, quantity, variationId } = req.body

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer",
      })
    }

    // Find cart
    const cart = await Cart.findOne({ user: userId })
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      })
    }

    // Find item in cart
    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        (item.variation ? item.variation._id.toString() : null) === variationId
    )

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      })
    }

    const item = cart.items[itemIndex]

    // Check if product is in stock
    const product = await Product.findById(item.product)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    let stock = product.stock
    if (variationId) {
      const variation = product.variants.id(variationId)
      if (variation) {
        stock = variation.stock
      }
    }

    if (stock < quantity) {
      return res.status(400).json({
        success: false,
        message: "Not enough stock available",
      })
    }

    // Update quantity
    item.quantity = quantity

    // Save cart
    await cart.save()

    // Populate product details
    await cart.populate({
      path: "items.product",
      select: "name price salePrice images stock variants",
    })

    // Calculate totals
    const totals = await cart.calculateTotals()

    return res.status(200).json({
      success: true,
      message: "Cart updated",
      cart: {
        _id: cart._id,
        items: cart.items,
        subtotal: totals.subtotal,
        total: totals.total,
        totalItems: totals.totalItems,
      },
    })
  } catch (error) {
    console.error("Error updating cart:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to update cart",
      error: error.message,
    })
  }
}

// Remove item from cart
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id
    const { productId, variationId } = req.body

    // Find cart
    const cart = await Cart.findOne({ user: userId })
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      })
    }

    // Find item index in cart
    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        (item.variation ? item.variation._id.toString() : null) === variationId
    )

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      })
    }

    // Remove item from cart
    cart.items.splice(itemIndex, 1)

    // Save cart
    await cart.save()

    // Populate product details
    await cart.populate({
      path: "items.product",
      select: "name price salePrice images stock variants",
    })

    // Calculate totals
    const totals = await cart.calculateTotals()

    return res.status(200).json({
      success: true,
      message: "Item removed from cart",
      cart: {
        _id: cart._id,
        items: cart.items,
        subtotal: totals.subtotal,
        total: totals.total,
        totalItems: totals.totalItems,
      },
    })
  } catch (error) {
    console.error("Error removing from cart:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to remove item from cart",
      error: error.message,
    })
  }
}

// Clear cart
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.id

    // Find cart
    const cart = await Cart.findOne({ user: userId })
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      })
    }

    // Clear items
    cart.items = []

    // Save cart
    await cart.save()

    return res.status(200).json({
      success: true,
      message: "Cart cleared",
      cart: {
        _id: cart._id,
        items: [],
        subtotal: 0,
        total: 0,
        totalItems: 0,
      },
    })
  } catch (error) {
    console.error("Error clearing cart:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to clear cart",
      error: error.message,
    })
  }
}

// Sync local cart with server
exports.syncCart = async (req, res) => {
  try {
    const userId = req.user.id
    const { items } = req.body

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "Items must be an array",
      })
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: userId })
    if (!cart) {
      cart = new Cart({ user: userId, items: [] })
    }

    // Process each item
    for (const item of items) {
      const { product, quantity, variation } = item

      // Validate product ID
      if (!mongoose.Types.ObjectId.isValid(product._id)) {
        continue
      }

      // Check if product exists and is in stock
      const productDoc = await Product.findById(product._id)
      if (!productDoc) {
        continue
      }

      const variationId = variation ? variation._id : null

      // Check if product already exists in cart
      const existingItemIndex = cart.items.findIndex(
        (cartItem) =>
          cartItem.product.toString() === product._id &&
          (cartItem.variation ? cartItem.variation._id.toString() : null) === variationId
      )

      if (existingItemIndex !== -1) {
        // Update quantity if product exists
        cart.items[existingItemIndex].quantity += quantity
      } else {
        // Add new item if product doesn't exist
        cart.items.push({
          product: product._id,
          quantity,
          variation,
        })
      }
    }

    // Save cart
    await cart.save()

    // Populate product details
    await cart.populate({
      path: "items.product",
      select: "name price salePrice images stock",
    })

    // Calculate totals
    const totals = await cart.calculateTotals()

    return res.status(200).json({
      success: true,
      message: "Cart synced",
      cart: {
        _id: cart._id,
        items: cart.items,
        subtotal: totals.subtotal,
        total: totals.total,
        totalItems: totals.totalItems,
      },
    })
  } catch (error) {
    console.error("Error syncing cart:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to sync cart",
      error: error.message,
    })
  }
}
