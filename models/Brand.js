const mongoose = require("mongoose")
const mongoosePaginate = require("mongoose-paginate-v2")

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Brand name is required"],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
    },
    website: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    seo: {
      title: { type: String },
      description: { type: String },
      keywords: [{ type: String }],
    },
  },
  {
    timestamps: true,
  },
)

// Add pagination plugin
brandSchema.plugin(mongoosePaginate)

// Create index for search
brandSchema.index({ name: "text", description: "text" })
brandSchema.index({ status: 1 })

const Brand = mongoose.model("Brand", brandSchema)

module.exports = Brand
