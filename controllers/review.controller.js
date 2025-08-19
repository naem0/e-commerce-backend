const Review = require("../models/Review")
const Product = require("../models/Product")
const Order = require("../models/Order")
const mongoose = require("mongoose")

// @desc    Get all reviews (Admin)
// @route   GET /api/reviews
// @access  Private/Admin
exports.getReviews = async (req, res) => {
  try {
    const { status, product, user, page = 1, limit = 10 } = req.query

    // Build query
    const query = {}

    if (status  && status !== "all") query.status = status
    if (product) query.product = product
    if (user) query.user = user

    // Pagination
    const skip = (Number(page) - 1) * Number(limit)

    const reviews = await Review.find(query)
      .populate("user", "name email")
      .populate("product", "name slug images")
      .populate("order", "orderNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const total = await Review.countDocuments(query)

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      reviews,
    })
  } catch (error) {
    console.error("Get reviews error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get product reviews
// @route   GET /api/reviews/product/:productId
// @access  Public
exports.getProductReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = "newest" } = req.query

    // Build sort object
    let sortObj = { createdAt: -1 } // Default: newest first
    if (sort === "oldest") sortObj = { createdAt: 1 }
    if (sort === "rating_high") sortObj = { rating: -1 }
    if (sort === "rating_low") sortObj = { rating: 1 }
    if (sort === "helpful") sortObj = { helpful: -1 }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit)

    const reviews = await Review.find({
      product: req.params.productId,
      status: "approved",
    })
      .populate("user", "name")
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit))

    const total = await Review.countDocuments({
      product: req.params.productId,
      status: "approved",
    })

    // Calculate rating statistics
    const ratingStats = await Review.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(req.params.productId),
          status: "approved",
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: "$rating",
          },
        },
      },
    ])

    // Calculate rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    if (ratingStats.length > 0) {
      ratingStats[0].ratingDistribution.forEach((rating) => {
        distribution[rating]++
      })
    }

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      reviews,
      statistics: {
        averageRating: ratingStats.length > 0 ? ratingStats[0].averageRating : 0,
        totalReviews: ratingStats.length > 0 ? ratingStats[0].totalReviews : 0,
        distribution,
      },
    })
  } catch (error) {
    console.error("Get product reviews error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const { productId: product, orderId: order, rating, title, comment } = req.body

    // Validate required fields
    if (!rating || !title) {
      return res.status(400).json({
        success: false,
        message: "Rating and title are required",
      })
    }

    // Check if order exists and belongs to user
    const orderDoc = await Order.findById(order)
    if (!orderDoc) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    if (orderDoc.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to review this order",
      })
    }

    // Check if order contains the product
    const orderItem = orderDoc.items.find((item) => item.product.toString() === product)
    if (!orderItem) {
      return res.status(400).json({
        success: false,
        message: "Product not found in this order",
      })
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      user: req.user.id,
      product,
      order,
    })

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product for this order",
      })
    }

    // Handle image uploads
    let images = []
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => `/uploads/${file.filename}`)
    }

    // Create review
    const review = await Review.create({
      user: req.user.id,
      product,
      order,
      rating: Number(rating),
      title,
      comment,
      images,
      verified: true, // Since we verified the purchase
    })

    // Populate the review
    await review.populate("user", "name")
    await review.populate("product", "name slug")

    res.status(201).json({
      success: true,
      review,
    })
  } catch (error) {
    console.error("Create review error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Update review status (Admin)
// @route   PATCH /api/reviews/:id/status
// @access  Private/Admin
exports.updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      })
    }

    const review = await Review.findById(req.params.id)

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      })
    }

    review.status = status
    await review.save()

    // if review.status === approved, than we add product rating
    if (status === "approved") {
      const product = await Product.findById(review.product)
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        })
      }
      // Update product rating
      const totalReviews = await Review.countDocuments({ product: review.product, status: "approved" })
      const averageRating = await Review.aggregate([
        { $match: { product: review.product, status: "approved" } },
        { $group: { _id: null, averageRating: { $avg: "$rating" } } },
      ])
      product.rating = averageRating.length > 0 ? averageRating[0].averageRating : 0
      product.numReviews = totalReviews
      await product.save()
    }
    res.status(200).json({
      success: true,
      review,
    })
  } catch (error) {
    console.error("Update review status error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Add admin response to review
// @route   POST /api/reviews/:id/response
// @access  Private/Admin
exports.addAdminResponse = async (req, res) => {
  try {
    const { message } = req.body

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Response message is required",
      })
    }

    const review = await Review.findById(req.params.id)

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      })
    }

    review.adminResponse = {
      message,
      respondedBy: req.user.id,
      respondedAt: new Date(),
    }

    await review.save()

    res.status(200).json({
      success: true,
      review,
    })
  } catch (error) {
    console.error("Add admin response error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private/Admin
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      })
    }

    await review.deleteOne()

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    })
  } catch (error) {
    console.error("Delete review error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}
