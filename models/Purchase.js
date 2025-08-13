const mongoose = require("mongoose")

const purchaseItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
  },
  unitCost: {
    type: Number,
    required: true,
    min: [0, "Unit cost cannot be negative"],
  },
  totalCost: {
    type: Number,
    required: true,
    min: [0, "Total cost cannot be negative"],
  },
})

const purchaseSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    items: [purchaseItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, "Paid amount cannot be negative"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "check", "credit"],
      default: "cash",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
    notes: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

// Update payment status based on paid amount
purchaseSchema.pre("save", function (next) {
  if (this.paidAmount === 0) {
    this.paymentStatus = "pending"
  } else if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = "paid"
  } else {
    this.paymentStatus = "partial"
  }
  next()
})

// Virtual for due amount
purchaseSchema.virtual("dueAmount").get(function () {
  return this.totalAmount - this.paidAmount
})

// Ensure virtual fields are serialized
purchaseSchema.set("toJSON", { virtuals: true })

const Purchase = mongoose.model("Purchase", purchaseSchema)

module.exports = Purchase
