const mongoose = require("mongoose")

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
  },
  price: {
    type: Number,
    required: true,
    min: [0, "Price cannot be negative"],
  },
  totalPrice: {
    type: Number,
    required: true,
    min: [0, "Total price cannot be negative"],
  },
})

const saleSchema = new mongoose.Schema(
  {
    saleNumber: {
      type: String,
      unique: true,
    },
    items: [saleItemSchema],
    customer: {
      name: String,
      phone: String,
      email: String,
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, "Subtotal cannot be negative"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, "Tax cannot be negative"],
    },
    total: {
      type: Number,
      required: true,
      min: [0, "Total cannot be negative"],
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "mobile_banking", "bank_transfer"],
      required: true,
    },
    amountReceived: {
      type: Number,
      required: true,
      min: [0, "Amount received cannot be negative"],
    },
    change: {
      type: Number,
      default: 0,
      min: [0, "Change cannot be negative"],
    },
    saleDate: {
      type: Date,
      default: Date.now,
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notes: String,
  },
  {
    timestamps: true,
  },
)

// Generate sale number before saving
saleSchema.pre("save", async function (next) {
  if (!this.saleNumber) {
    const count = await mongoose.model("Sale").countDocuments()
    this.saleNumber = `SALE-${Date.now()}-${(count + 1).toString().padStart(4, "0")}`
  }
  next()
})

const Sale = mongoose.model("Sale", saleSchema)

module.exports = Sale
