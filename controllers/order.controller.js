const Order = require("../models/Order")
const Product = require("../models/Product")
const User = require("../models/User")
const mongoose = require("mongoose")
const { sendEmail } = require("../services/email.service")
const { createNotification } = require("./notification.controller")

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
exports.getOrders = async (req, res) => {
  try {
    const { status, paymentStatus, user, search, page = 1, limit = 10 } = req.query

    // Build query
    const query = {}

    // Filter by status
    if (status && status !== "all") {
      query.status = status
    }

    // Filter by paymentStatus
    if (paymentStatus && paymentStatus !== "all") {
      query.paymentStatus = paymentStatus
    }

    // Filter by user
    if (user) {
      query.user = user
    }

    // Search by orderNumber, customer name, or email
    if (search) {
      // If search is a valid ObjectId, search by _id
      if (mongoose.Types.ObjectId.isValid(search)) {
        query._id = search
      } else {
        // Search by orderNumber (if it's a number-like string) or customer details in shippingAddress
        query.$or = [
          { orderNumber: { $regex: search, $options: "i" } },
          { "shippingAddress.name": { $regex: search, $options: "i" } },
          { "shippingAddress.email": { $regex: search, $options: "i" } },
          { "shippingAddress.phone": { $regex: search, $options: "i" } },
        ]
      }
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

    // Check if the order belongs to the logged-in user or if the user is an admin/manager
    const isAuthorized = req.user.role === "admin" || req.user.role === "manager"
    if (order.user._id.toString() !== req.user.id && !isAuthorized) {
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

    if (!shippingAddress || !shippingAddress.name || !shippingAddress.phone || !shippingAddress.street || !shippingAddress.city) {
      return res.status(400).json({
        success: false,
        message: "Full shipping address (Name, Phone, Street, City) is required",
      })
    }

    if (shippingAddress.phone.length < 11) {
      return res.status(400).json({
        success: false,
        message: "Valid phone number is required",
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

    // Calculate tax and shipping
    const tax = 0 // Removed tax as per user request
    const shippingCost = shippingAddress.shippingArea === "outside_dhaka" ? 120 : 70
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
      paidAmount: 0,
      notes,
    })

    // Create notification for user
    await createNotification({
      recipient: req.user.id,
      type: "order",
      title: "Order Placed Successfully",
      message: `Your order #${order._id.toString().slice(-8).toUpperCase()} has been placed and is being processed.`,
      link: `/orders/${order._id}`,
    })

    // Create notification for admin and manager
    const adminUsers = await User.find({ role: { $in: ["admin", "manager"] } })
    for (const adminUser of adminUsers) {
      await createNotification({
        recipient: adminUser._id,
        type: "order",
        title: "New Order Received",
        message: `New order #${order._id.toString().slice(-8).toUpperCase()} received from ${shippingAddress.name}.`,
        link: `/admin/orders/${order._id}`,
      })
    }

    // Send confirmation email if user email exists
    if (shippingAddress.email) {
      try {
        const orderId = order._id.toString()
        const orderNumber = order.orderNumber
        const itemsHtml = orderItems.map(item => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name} (${item.quantity})</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">৳${item.price * item.quantity}</td>
          </tr>
        `).join("")

        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Order Confirmed!</h1>
              <p style="margin: 5px 0 0;">Thank you for shopping with us.</p>
            </div>
            <div style="padding: 20px;">
              <p>Hi ${shippingAddress.name},</p>
              <p>Your order <strong>${orderNumber}</strong> has been received and is being processed.</p>
              
              <div style="margin: 20px 0; border: 1px solid #eee; borders-radius: 4px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background-color: #f9fafb;">
                      <th style="padding: 8px; text-align: left; border-bottom: 1px solid #eee;">Item</th>
                      <th style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style="padding: 8px; font-weight: bold;">Subtotal</td>
                      <td style="padding: 8px; text-align: right; font-weight: bold;">৳${subtotal}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px;">Shipping</td>
                      <td style="padding: 8px; text-align: right;">৳${shippingCost}</td>
                    </tr>
                    <tr style="font-size: 1.2em; border-top: 2px solid #eee;">
                      <td style="padding: 8px; font-weight: bold;">Total</td>
                      <td style="padding: 8px; text-align: right; font-weight: bold; color: #3b82f6;">৳${total}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <p><strong>Shipping To:</strong><br>
              ${shippingAddress.street}, ${shippingAddress.city}<br>
              Phone: ${shippingAddress.phone}</p>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${orderId}" 
                   style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   View Order Details
                </a>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e0e0e0;">
              <p>&copy; ${new Date().getFullYear()} Equal Fashion. All rights reserved.</p>
            </div>
          </div>
        `

        await sendEmail({
          email: shippingAddress.email,
          subject: `Order Confirmation - ${orderNumber}`,
          html: emailHtml
        })
      } catch (emailError) {
        console.error("Order confirmation email failed:", emailError)
        // Don't fail the order if email fails
      }
    }

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
    const { amount, method, transactionId, accountNumber, notes } = req.body
    
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
    if (Number(amount) > order.dueAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount cannot exceed due amount of ৳${order.dueAmount}`,
      })
    }

    // Add payment to payments array
    const payment = {
      amount: Number(amount),
      method,
      transactionId,
      accountNumber,
      notes,
      status: "pending", // Payment needs admin confirmation
    }

    // Handle screenshot file
    if (req.file) {
      payment.screenshot = `/uploads/${req.file.filename}`
    }

    order.payments.push(payment)

    // Note: We don't update paidAmount yet, it's done after admin confirms in the pre-save hook 
    // OR if we want it to be automatic if it's COD/etc. But here it's Manual.
    
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
    const { id, paymentId } = req.params
    const { status, adminNote } = req.body

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id)) {
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

    const order = await Order.findById(id)
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

    // Create notification for user
    await createNotification({
      recipient: order.user,
      type: "payment",
      title: `Payment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your payment of ৳${payment.amount} for order #${order._id.toString().slice(-8).toUpperCase()} has been ${status}.`,
      link: `/orders/${order._id}`,
    })

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
      // If it's COD, it's now paid
      if (order.paymentMethod === "cash_on_delivery") {
        order.paymentStatus = "paid"
      }
    }

    // Update order status
    order.status = status

    await order.save()

    // Create notification for user
    const isDelivered = status === "delivered"
    await createNotification({
      recipient: order.user,
      type: "order",
      title: isDelivered ? "Order Delivered! 🎁" : "Order Status Updated",
      message: isDelivered 
        ? `Your order #${order._id.toString().slice(-8).toUpperCase()} has been delivered. We'd love to hear your feedback! Click here to leave a review.`
        : `Your order #${order._id.toString().slice(-8).toUpperCase()} status has been updated to ${status}.`,
      link: `/orders/${order._id}`,
    })

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
// @desc    Create a new order by admin
// @route   POST /api/orders/admin
// @access  Private/Admin
exports.createOrderByAdmin = async (req, res) => { 
  try {
    const { user, items, status, total, shippingAddress, paymentMethod } = req.body

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide order items",
      })
    }

    // If user is provided, verify it
    let userDoc = null
    let finalShippingAddress = shippingAddress

    if (user) {
      userDoc = await require("../models/User").findById(user)
      if (!userDoc) {
        return res.status(404).json({ success: false, message: "User not found" })
      }
      
      // If no shipping address provided by admin, use user's default address
      if (!finalShippingAddress && userDoc.address) {
        finalShippingAddress = {
          name: userDoc.name,
          email: userDoc.email,
          phone: userDoc.phone,
          street: userDoc.address.street || "",
          city: userDoc.address.city || "",
          state: userDoc.address.state || "",
          zipCode: userDoc.address.zipCode || "",
          country: userDoc.address.country || "Bangladesh",
        }
      }
    }

    if (!finalShippingAddress) {
      return res.status(400).json({ success: false, message: "Shipping address is required" })
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

    // Calculate shipping cost
    const shippingCost = finalShippingAddress.shippingArea === "outside_dhaka" ? 120 : 70
    const finalTotal = total || (subtotal + shippingCost)

    // Create order
    const order = await Order.create({
      user: user || null,
      items: orderItems,
      status: status || "pending",
      paymentMethod: paymentMethod || "cash_on_delivery",
      shippingAddress: finalShippingAddress,
      total: finalTotal,
      subtotal,
      tax: 0,
      shippingCost: shippingCost,
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

// @desc    Update tracking info and admin notes
// @route   PATCH /api/orders/:id/notes
// @access  Private/Admin
exports.updateOrderNotes = async (req, res) => {
  try {
    const { trackingInfo, adminNotes, shippingAddress, paymentStatus } = req.body

    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID" })
    }

    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }

    if (trackingInfo !== undefined) order.trackingInfo = trackingInfo
    if (adminNotes !== undefined) order.adminNotes = adminNotes
    if (paymentStatus !== undefined) order.paymentStatus = paymentStatus
    if (shippingAddress !== undefined) {
      const oldArea = order.shippingAddress.shippingArea
      order.shippingAddress = {
        ...order.shippingAddress,
        ...shippingAddress
      }
      
      // If shipping area changed, update shipping cost and total
      if (shippingAddress.shippingArea && shippingAddress.shippingArea !== oldArea) {
        const oldCost = order.shippingCost || 0
        const newCost = shippingAddress.shippingArea === "outside_dhaka" ? 120 : 70
        order.shippingCost = newCost
        order.total = (order.total - oldCost) + newCost
      }
    }

    await order.save()

    res.status(200).json({ success: true, order })
  } catch (error) {
    console.error("Update order notes error:", error)
    res.status(500).json({ success: false, message: "Server error", error: error.message })
  }
}