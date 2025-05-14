const Order = require("../models/Order")
const Product = require("../models/Product")

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
exports.getOrders = async (req, res) => {
  try {
    const { status, user, page = 1, limit = 10 } = req.query

    // Build query
    const query = {}

    // Filter by status
    if (status) {
      query.status = status
    }

    // Filter by user
    if (user) {
      query.user = user
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query with pagination
    const orders = await Order.find(query)
      .populate("user", "name email")
      .populate("items.product", "name slug images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    // Get total count for pagination
    const total = await Order.countDocuments(query)

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      orders,
    })
  } catch (error) {
    console.error("Get orders error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get user orders
// @route   GET /api/orders/my-orders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query

    // Build query
    const query = { user: req.user.id }

    // Filter by status
    if (status) {
      query.status = status
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit)

    // Execute query with pagination
    const orders = await Order.find(query)
      .populate("items.product", "name slug images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    // Get total count for pagination
    const total = await Order.countDocuments(query)

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      orders,
    })
  } catch (error) {
    console.error("Get my orders error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("items.product", "name slug images")

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Check if the order belongs to the logged-in user or if the user is an admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this order",
      })
    }

    res.status(200).json({
      success: true,
      order,
    })
  } catch (error) {
    console.error("Get order error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, paymentDetails, notes } = req.body

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No order items",
      })
    }

    // Verify items and calculate prices
    const orderItems = []
    let subtotal = 0

    for (const item of items) {
      const product = await Product.findById(item.product)

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`,
        })
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.name}. Available: ${product.stock}`,
        })
      }

      // Use discount price if available, otherwise use regular price
      const price = product.discountPrice || product.price

      orderItems.push({
        product: product._id,
        name: product.name,
        price,
        quantity: item.quantity,
      })

      subtotal += price * item.quantity

      // Update product stock
      product.stock -= item.quantity
      await product.save()
    }

    // Calculate tax and shipping (simplified for demo)
    const tax = subtotal * 0.05 // 5% tax
    const shippingCost = subtotal > 100 ? 0 : 10 // Free shipping over $100
    const total = subtotal + tax + shippingCost

    // Create order
    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      paymentDetails,
      subtotal,
      tax,
      shippingCost,
      total,
      notes,
    })

    res.status(201).json({
      success: true,
      order,
    })
  } catch (error) {
    console.error("Create order error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body

    if (!status || !["pending", "processing", "shipped", "delivered", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      })
    }

    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // If order is being cancelled, restore product stock
    if (status === "cancelled" && order.status !== "cancelled") {
      for (const item of order.items) {
        const product = await Product.findById(item.product)
        if (product) {
          product.stock += item.quantity
          await product.save()
        }
      }
    }

    // Update order status
    order.status = status

    // If order is delivered, update payment status to paid
    if (status === "delivered") {
      order.paymentStatus = "paid"
    }

    await order.save()

    res.status(200).json({
      success: true,
      order,
    })
  } catch (error) {
    console.error("Update order status error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Update payment status
// @route   PATCH /api/orders/:id/payment
// @access  Private/Admin
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, transactionId } = req.body

    if (!paymentStatus || !["pending", "paid", "failed"].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status value",
      })
    }

    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Update payment status
    order.paymentStatus = paymentStatus

    // Update payment details if provided
    if (transactionId) {
      order.paymentDetails = {
        ...order.paymentDetails,
        transactionId,
        paymentDate: new Date(),
      }
    }

    await order.save()

    res.status(200).json({
      success: true,
      order,
    })
  } catch (error) {
    console.error("Update payment status error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}
