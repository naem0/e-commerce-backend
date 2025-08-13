const mongoose = require("mongoose")

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    contactPerson: {
      name: String,
      phone: String,
      email: String,
    },
    taxId: String,
    paymentTerms: {
      type: String,
      enum: ["net_30", "net_60", "net_90", "cash_on_delivery", "advance_payment"],
      default: "net_30",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    notes: String,
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

// Create index for search
supplierSchema.index({
  name: "text",
  email: "text",
  phone: "text",
})

const Supplier = mongoose.model("Supplier", supplierSchema)

module.exports = Supplier
