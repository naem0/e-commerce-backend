const Sale = require("../models/Sale")
const Product = require("../models/Product")
const mongoose = require("mongoose")

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private/Admin
exports.getSales = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, startDate, endDate } = req.query

    // Build query
    const query = {}

    if (search) {
      query.$or = [
        { saleNumber: { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { "customer.phone": { $regex: search, $options: "i" } },
      ]
    }

    if (startDate || endDate) {
      query.saleDate = {}
      if (startDate) query.saleDate.$gte = new Date(startDate)
      if (endDate) query.saleDate.$lte = new Date(endDate)
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit)

    const sales = await Sale.find(query)
      .populate("items.product", "name sku")
      .populate("cashier", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const total = await Sale.countDocuments(query)

    res.status(200).json({
      success: true,
      sales,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    })
  } catch (error) {
    console.error("Get sales error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get single sale
// @route   GET /api/sales/:id
// @access  Private/Admin
exports.getSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate("items.product", "name sku")
      .populate("cashier", "name email")

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      })
    }

    res.status(200).json({
      success: true,
      sale,
    })
  } catch (error) {
    console.error("Get sale error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Create sale (POS)
// @route   POST /api/sales
// @access  Private
exports.createSale = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { items, customer, subtotal, discount, tax, total, paymentMethod, amountReceived, notes } = req.body

    // Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items in sale",
      })
    }

    // Validate and process items
    const processedItems = []
    for (const item of items) {
      const product = await Product.findById(item._id || item.product)
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item._id || item.product}`,
        })
      }

      // Check stock availability
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
        })
      }

      processedItems.push({
        product: product._id,
        name: product.name,
        quantity: Number(item.quantity),
        price: Number(item.price),
        totalPrice: Number(item.quantity) * Number(item.price),
      })

      // Update product stock
      product.stock -= Number(item.quantity)
      await product.save({ session })
    }

    // Calculate change
    const change = paymentMethod === "cash" ? Math.max(0, Number(amountReceived) - Number(total)) : 0

    // Create sale
    const sale = new Sale({
      items: processedItems,
      customer: customer || {},
      subtotal: Number(subtotal),
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      total: Number(total),
      paymentMethod,
      amountReceived: Number(amountReceived),
      change,
      notes,
      cashier: req.user.id,
    })

    await sale.save({ session })

    await session.commitTransaction()

    // Populate the created sale
    await sale.populate([
      { path: "items.product", select: "name sku" },
      { path: "cashier", select: "name email" },
    ])

    res.status(201).json({
      success: true,
      message: "Sale completed successfully",
      sale,
    })
  } catch (error) {
    await session.abortTransaction()
    console.error("Create sale error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  } finally {
    session.endSession()
  }
}

// @desc    Get sales analytics
// @route   GET /api/sales/analytics
// @access  Private/Admin
exports.getSalesAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    // Build date filter
    const dateFilter = {}
    if (startDate || endDate) {
      dateFilter.saleDate = {}
      if (startDate) dateFilter.saleDate.$gte = new Date(startDate)
      if (endDate) dateFilter.saleDate.$lte = new Date(endDate)
    }

    // Total sales
    const totalSales = await Sale.countDocuments(dateFilter)

    // Total revenue
    const revenueResult = await Sale.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
    ])
    const totalRevenue = revenueResult[0]?.totalRevenue || 0

    // Sales by payment method
    const paymentMethodStats = await Sale.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
        },
      },
    ])

    // Top selling products
    const topProducts = await Sale.aggregate([
      { $match: dateFilter },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          productName: { $first: "$items.name" },
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.totalPrice" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
    ])

    // Daily sales (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailySales = await Sale.aggregate([
      { $match: { saleDate: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$saleDate" },
            month: { $month: "$saleDate" },
            day: { $dayOfMonth: "$saleDate" },
          },
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ])

    res.status(200).json({
      success: true,
      analytics: {
        totalSales,
        totalRevenue,
        paymentMethodStats,
        topProducts,
        dailySales,
      },
    })
  } catch (error) {
    console.error("Get sales analytics error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}
