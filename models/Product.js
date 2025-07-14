const mongoose = require("mongoose")
const mongoosePaginate = require("mongoose-paginate-v2")

// Helper function to create slug from name
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-")
}

// Variation Option Schema (e.g. "Red", "Blue" for color)
const variationOptionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: String, required: true },
  additionalPrice: { type: Number, default: 0 },
  image: { type: String },
})

// Variation Type Schema (e.g. "Color", "Size")
const variationTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  options: [variationOptionSchema],
})

// Variant Schema (specific combination like "Red, XL")
const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  price: { type: Number, required: true },
  comparePrice: { type: Number },
  stock: { type: Number, default: 0 },
  options: [
    {
      type: { type: String, required: true },
      value: { type: String, required: true },
    },
  ],
  images: [{ type: String }],
  isDefault: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["active", "inactive", "draft"],
    default: "active",
  },
})

// Review Schema
const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

// Product Schema
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
    },
    shortDescription: {
      type: String,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      default: 0,
    },
    comparePrice: {
      type: Number,
      default: 0,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Category",
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
    },
    stock: {
      type: Number,
      required: [true, "Product stock is required"],
      default: 0,
    },
    images: [
      {
        type: String,
      },
    ],
    reviews: [reviewSchema],
    rating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    sku: {
      type: String,
    },
    weight: {
      type: Number,
    },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
    tags: [{ type: String }],
    // New fields for variations
    hasVariations: {
      type: Boolean,
      default: false,
    },
    variationTypes: [variationTypeSchema],
    variants: [variantSchema],
    // SEO fields
    seo: {
      title: { type: String },
      description: { type: String },
      keywords: [{ type: String }],
    },
    // Shipping information
    shipping: {
      weight: { type: Number },
      dimensions: {
        length: { type: Number },
        width: { type: Number },
        height: { type: Number },
      },
      freeShipping: { type: Boolean, default: false },
      shippingClass: { type: String },
    },
    views: {
      type: Number,
      default: 0,
    },
    // Add createdBy field
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
)

// Pre-save middleware to generate slug
productSchema.pre("save", function (next) {
  if (this.isModified("name") || this.isNew) {
    this.slug = createSlug(this.name)
  }
  next()
})

// Add pagination plugin
productSchema.plugin(mongoosePaginate)

// Create index for search
productSchema.index({ name: "text", description: "text", tags: "text" })
productSchema.index({ slug: 1 })
productSchema.index({ status: 1 })
productSchema.index({ featured: 1 })
productSchema.index({ category: 1 })
productSchema.index({ brand: 1 })

const Product = mongoose.model("Product", productSchema)

module.exports = Product
