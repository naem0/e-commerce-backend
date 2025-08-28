const Order = require("../models/Order")
const Product = require("../models/Product")
const User = require("../models/User")
const mongoose = require("mongoose")

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
    // Validate ObjectId
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }

    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone")
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

      let price = product.price
      let stock = product.stock
      let selectedVariant = null

      if (item.variation) {
        selectedVariant = product.variants.find(
          (v) => v._id.toString() === item.variation._id.toString()
        )
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

      if (stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.name}. Available: ${stock}`,
        })
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        price,
        quantity: item.quantity,
        image: selectedVariant?.image || product.images?.[0] || "",
        variation: selectedVariant,
      })

      subtotal += price * item.quantity

      // Update product stock
      if (selectedVariant) {
        const variantIndex = product.variants.findIndex(
          (v) => v._id.toString() === item.variation._id.toString()
        )
        product.variants[variantIndex].stock -= item.quantity
      } else {
        product.stock -= item.quantity
      }
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
      paidAmount: paymentMethod === "cod" ? 0 : 0, // COD starts with 0 paid
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

// @desc    Add partial payment
// @route   POST /api/orders/:id/payments
// @access  Private/Admin
exports.addPartialPayment = async (req, res) => {
  try {
    const { amount, method, transactionId, phoneNumber, notes } = req.body
    // Validate ObjectId
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      })
    }

    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Check if payment amount exceeds due amount
    if (amount > order.dueAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount cannot exceed due amount of $${order.dueAmount}`,
      })
    }

    // Add payment to payments array
    order.payments.push({
      amount,
      method,
      transactionId,
      phoneNumber,
      notes,
      status: "confirmed",
    })

    // Update paid amount
    order.paidAmount += amount

    await order.save()

    res.status(200).json({
      success: true,
      message: "Payment added successfully",
      order,
    })
  } catch (error) {
    console.error("Add partial payment error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Confirm payment (Admin only)
// @route   PATCH /api/orders/:orderId/payments/:paymentId/confirm
// @access  Private/Admin
exports.confirmPayment = async (req, res) => {
  try {
    const { orderId, paymentId } = req.params
    const { status, adminNote } = req.body

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      })
    }

    const order = await Order.findById(orderId)
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    const payment = order.payments.id(paymentId)
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      })
    }

    payment.status = status
    payment.adminNote = adminNote
    payment.confirmedAt = new Date()
    payment.confirmedBy = req.user.id

    // Recalculate payment status
    const confirmedPayments = order.payments.filter((p) => p.status === "confirmed")
    const totalPaid = confirmedPayments.reduce((sum, p) => sum + p.amount, 0)

    if (totalPaid >= order.total) {
      order.paymentStatus = "paid"
    } else if (totalPaid > 0) {
      order.paymentStatus = "partial"
    } else {
      order.paymentStatus = "pending"
    }

    await order.save()

    res.status(200).json({
      success: true,
      message: `Payment ${status} successfully`,
      order,
    })
  } catch (error) {
    console.error("Confirm payment error:", error)
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

    // Validate ObjectId
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }

    if (!status || !["pending", "processing", "shipped", "delivered", "cancelled", "returned"].includes(status)) {
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
      order.cancelledAt = new Date()
    }

    // If order is delivered
    if (status === "delivered") {
      order.deliveredAt = new Date()
    }

    // Update order status
    order.status = status

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

    // Validate ObjectId
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      })
    }

    if (!paymentStatus || !["pending", "partial", "paid", "failed"].includes(paymentStatus)) {
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
    console.log(order)
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


// @desc    Create a new order by admin
// @route   POST /api/orders/admin
// @access  Private/Admin
exports.createOrderByAdmin = async (req, res) => { 
  try {
    const { user, items, status, total } = req.body

    if (!user || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide user, items, status and total",
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

      let price = product.price
      let stock = product.stock

      if (stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.name}. Available: ${stock}`,
        })
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        price,
        quantity: item.quantity,
        image: product.images?.[0] || "",
      })

      subtotal += price * item.quantity

      // Update product stock
      product.stock -= item.quantity
      await product.save()
    }

    // Create order
    const order = await Order.create({
      user,
      items: orderItems,
      status,
      total,
      subtotal,
      tax: 0,
      shippingCost: 0,
      paidAmount: 0,
    })

    res.status(201).json({
      success: true,
      order,
    })
  } catch (error) {
    console.error("Create order by admin error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}