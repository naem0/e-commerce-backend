const mongoose = require("mongoose")

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderNumber: {
      type: String,
      unique: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: String,
        price: Number,
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity cannot be less than 1"],
        },
        image: String,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    shippingAddress: {
      name: String,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      phone: String,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentDetails: {
      transactionId: String,
      paymentDate: Date,
      method: String,
      phoneNumber: String,
    },
    // Partial Payment System
    payments: [
      {
        amount: {
          type: Number,
          required: true,
        },
        method: {
          type: String,
          required: true,
        },
        transactionId: String,
        phoneNumber: String,
        date: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["pending", "confirmed", "failed"],
          default: "pending",
        },
        notes: String,
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      default: 0,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
    },
    notes: String,
    trackingNumber: String,
    estimatedDelivery: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
  },
  {
    timestamps: true,
  },
)

// Generate order number before saving
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model("Order").countDocuments()
    this.orderNumber = `ORD-${Date.now()}-${(count + 1).toString().padStart(4, "0")}`
  }

  // Calculate due amount
  this.dueAmount = this.total - this.paidAmount

  // Update payment status based on paid amount
  if (this.paidAmount === 0) {
    this.paymentStatus = "pending"
  } else if (this.paidAmount >= this.total) {
    this.paymentStatus = "paid"
    this.dueAmount = 0
  } else {
    this.paymentStatus = "partial"
  }

  next()
})

const Order = mongoose.model("Order", orderSchema)

module.exports = Order
