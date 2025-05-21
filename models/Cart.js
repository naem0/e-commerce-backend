const mongoose = require("mongoose")

const CartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  variation: {
    type: Object,
    default: null,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
})

const CartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [CartItemSchema],
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Update lastUpdated timestamp on save
CartSchema.pre("save", function (next) {
  this.lastUpdated = Date.now()
  next()
})

// Calculate cart totals
CartSchema.methods.calculateTotals = async function () {
  await this.populate("items.product")

  let subtotal = 0
  let totalItems = 0

  this.items.forEach((item) => {
    const price = item.product.salePrice || item.product.price
    subtotal += price * item.quantity
    totalItems += item.quantity
  })

  // Apply coupon discount if available
  let discount = 0
  if (this.coupon) {
    await this.populate("coupon")

    if (this.coupon.type === "percentage") {
      discount = subtotal * (this.coupon.value / 100)
    } else if (this.coupon.type === "fixed") {
      discount = this.coupon.value
    }

    // Cap discount at subtotal
    discount = Math.min(discount, subtotal)
  }

  const total = subtotal - discount

  return {
    subtotal,
    discount,
    total,
    totalItems,
  }
}

module.exports = mongoose.model("Cart", CartSchema)
