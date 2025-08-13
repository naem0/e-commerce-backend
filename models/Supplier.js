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
    paymentTerms: {
      type: String,
      enum: ["cash", "net_15", "net_30", "net_60"],
      default: "net_30",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    notes: String,
  },
  {
    timestamps: true,
  },
)

const Supplier = mongoose.model("Supplier", supplierSchema)

module.exports = Supplier
