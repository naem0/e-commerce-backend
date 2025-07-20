const mongoose = require("mongoose")

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    comment: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    images: [String], // Array of image paths
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    helpful: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false, // True if user actually purchased the product
    },
    adminResponse: {
      message: String,
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      respondedAt: Date,
    },
  },
  {
    timestamps: true,
  },
)

// Ensure one review per user per product per order
reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true })

const Review = mongoose.model("Review", reviewSchema)

module.exports = Review
