const Order = require("../models/Order")
const Product = require("../models/Product")
const User = require("../models/User")
const Category = require("../models/Category")
const Brand = require("../models/Brand")

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private/Admin
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const { period = "30" } = req.query
    const days = Number.parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Total counts
    const totalProducts = await Product.countDocuments({ status: "published" })
    const totalOrders = await Order.countDocuments()
    const totalUsers = await User.countDocuments({ role: "user" })
    const totalCategories = await Category.countDocuments()
    const totalBrands = await Brand.countDocuments()

    // Revenue analytics
    const revenueData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: { $in: ["paid", "partial"] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          totalRevenue: { $sum: "$paidAmount" },
          totalOrders: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ])

    // Total revenue and profit
    const totalRevenue = await Order.aggregate([
      {
        $match: {
          paymentStatus: { $in: ["paid", "partial"] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$paidAmount" },
          totalDue: { $sum: "$dueAmount" },
          totalOrders: { $sum: 1 },
        },
      },
    ])

    // Best selling products
    const bestSellingProducts = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          productName: { $first: "$items.name" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    ])

    // Category wise sales
    const categoryWiseSales = await Order.aggregate([
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "categories",
          localField: "product.category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $group: {
          _id: "$category._id",
          categoryName: { $first: "$category.name" },
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ])

    // Brand wise sales
    const brandWiseSales = await Order.aggregate([
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "brands",
          localField: "product.brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$brand._id",
          brandName: { $first: "$brand.name" },
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ])

    // Recent orders
    const recentOrders = await Order.find()
      .populate("user", "name email")
      .populate("items.product", "name images")
      .sort({ createdAt: -1 })
      .limit(10)

    // Low stock products
    const lowStockProducts = await Product.find({
      stock: { $lte: 10 },
      status: "published",
    })
      .populate("category", "name")
      .populate("brand", "name")
      .sort({ stock: 1 })
      .limit(10)

    // Order status distribution
    const orderStatusDistribution = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])

    // Payment status distribution
    const paymentStatusDistribution = await Order.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
        },
      },
    ])

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalProducts,
          totalOrders,
          totalUsers,
          totalCategories,
          totalBrands,
          totalRevenue: totalRevenue[0]?.totalRevenue || 0,
          totalDue: totalRevenue[0]?.totalDue || 0,
        },
        revenueData,
        bestSellingProducts,
        categoryWiseSales,
        brandWiseSales,
        recentOrders,
        lowStockProducts,
        orderStatusDistribution,
        paymentStatusDistribution,
      },
    })
  } catch (error) {
    console.error("Get dashboard analytics error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get sales report
// @route   GET /api/analytics/sales-report
// @access  Private/Admin
exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = "day" } = req.query

    const matchCondition = {
      paymentStatus: { $in: ["paid", "partial"] },
    }

    if (startDate && endDate) {
      matchCondition.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }

    let groupByCondition
    switch (groupBy) {
      case "month":
        groupByCondition = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        }
        break
      case "week":
        groupByCondition = {
          year: { $year: "$createdAt" },
          week: { $week: "$createdAt" },
        }
        break
      default:
        groupByCondition = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        }
    }

    const salesReport = await Order.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: groupByCondition,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$paidAmount" },
          totalDue: { $sum: "$dueAmount" },
          averageOrderValue: { $avg: "$total" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ])

    res.status(200).json({
      success: true,
      data: salesReport,
    })
  } catch (error) {
    console.error("Get sales report error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get top customers
// @route   GET /api/analytics/top-customers
// @access  Private/Admin
exports.getTopCustomers = async (req, res) => {
  try {
    const topCustomers = await Order.aggregate([
      {
        $match: {
          paymentStatus: { $in: ["paid", "partial"] },
        },
      },
      {
        $group: {
          _id: "$user",
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$paidAmount" },
          averageOrderValue: { $avg: "$total" },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          totalOrders: 1,
          totalSpent: 1,
          averageOrderValue: 1,
          "user.name": 1,
          "user.email": 1,
          "user.phone": 1,
        },
      },
    ])

    res.status(200).json({
      success: true,
      data: topCustomers,
    })
  } catch (error) {
    console.error("Get top customers error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}
