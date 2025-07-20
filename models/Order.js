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
      email: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
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
    // Enhanced Partial Payment System
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
        accountNumber: String,
        screenshot: String, // File path for payment screenshot
        date: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["pending", "confirmed", "rejected"],
          default: "pending",
        },
        notes: String,
        paidBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        confirmedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        confirmedAt: Date,
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
    notes: String,
    trackingInfo: String,
    adminNotes: String,
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

  // Calculate paid amount from confirmed payments
  const confirmedPayments = this.payments.filter((payment) => payment.status === "confirmed")
  this.paidAmount = confirmedPayments.reduce((total, payment) => total + payment.amount, 0)

  // Update payment status based on paid amount
  if (this.paidAmount === 0) {
    this.paymentStatus = "pending"
  } else if (this.paidAmount >= this.total) {
    this.paymentStatus = "paid"
  } else {
    this.paymentStatus = "partial"
  }

  next()
})

// Virtual for due amount
orderSchema.virtual("dueAmount").get(function () {
  return this.total - this.paidAmount
})

// Ensure virtual fields are serialized
orderSchema.set("toJSON", { virtuals: true })

const Order = mongoose.model("Order", orderSchema)

module.exports = Order
