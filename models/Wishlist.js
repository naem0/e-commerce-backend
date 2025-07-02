const mongoose = require("mongoose")

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Ensure one wishlist per user
wishlistSchema.index({ user: 1 }, { unique: true })

const Wishlist = mongoose.model("Wishlist", wishlistSchema)

module.exports = Wishlist
