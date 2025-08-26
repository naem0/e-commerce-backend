const mongoose = require("mongoose")
const mongoosePaginate = require("mongoose-paginate-v2")

// Helper function to create slug from name
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-")
}

// Generate barcode
const generateBarcode = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 5).toUpperCase()
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
  barcode: { type: String, unique: true, sparse: true },
  price: { type: Number, required: true, min: [0, "Variant price cannot be negative"] },
  comparePrice: { type: Number, min: [0, "Variant compare price cannot be negative"] },
  stock: { type: Number, required: true, min: [0, "Variant stock cannot be negative"], default: 0 },
  options: [
    {
      type: { type: String, required: true }, // e.g., "Color", "Size"
      value: { type: String, required: true }, // e.g., "Red", "Large"
    },
  ],
  images: [{ type: String }],
  isDefault: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
})

// Product Schema
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
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
      maxlength: [500, "Short description cannot exceed 500 characters"],
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
      default: 0,
    },
    comparePrice: {
      type: Number,
      min: [0, "Compare price cannot be negative"],
      default: 0,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Product category is required"],
      ref: "Category",
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
    },
    stock: {
      type: Number,
      required: [true, "Product stock is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    images: [
      {
        type: String,
        required: true,
      },
    ],
    videoUrl: {
      type: String,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
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
    weight: {
      type: Number,
      min: [0, "Weight cannot be negative"],
    },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
    tags: [{ type: String }],
    // Flash Sale fields
    isFlashSale: {
      type: Boolean,
      default: false,
    },
    flashSalePrice: {
      type: Number,
      min: [0, "Flash sale price cannot be negative"],
    },
    flashSaleStartDate: {
      type: Date,
    },
    flashSaleEndDate: {
      type: Date,
    },
    flashSaleStock: {
      type: Number,
      min: [0, "Flash sale stock cannot be negative"],
      default: 0,
    },
    // Best Sale field
    isBestSale: {
      type: Boolean,
      default: false,
    },
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
    specification: { type: String },
    // Shipping information
    shipping: {
      free: {
        type: Boolean,
        default: false,
      },
      weight: { type: Number },
      dimensions: {
        length: { type: Number },
        width: { type: Number },
        height: { type: Number },
      },
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
    // Rating will be calculated from Review collection
    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be less than 0"],
      max: [5, "Rating cannot be more than 5"],
    },
    numReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

// Pre-save middleware to generate slug and barcode
productSchema.pre("save", function (next) {
  if (this.isModified("name") || this.isNew) {
    this.slug = createSlug(this.name)
  }

  // Generate barcode if not provided
  if (!this.barcode && this.isNew) {
    this.barcode = generateBarcode()
  }

  // Generate barcodes for variants if not provided
  if (this.hasVariations && this.variants) {
    this.variants.forEach((variant) => {
      if (!variant.barcode) {
        variant.barcode = generateBarcode()
      }
    })
  }

  next()
})

// Add pagination plugin
productSchema.plugin(mongoosePaginate)

// Create index for search
productSchema.index({
  name: "text",
  description: "text",
  shortDescription: "text",
  tags: "text",
  sku: "text",
  barcode: "text",
})

// Add compound indexes for better query performance
productSchema.index({ category: 1, status: 1 })
productSchema.index({ brand: 1, status: 1 })
productSchema.index({ featured: 1, status: 1 })
productSchema.index({ price: 1, status: 1 })
productSchema.index({ createdAt: -1, status: 1 })
productSchema.index({ isFlashSale: 1, flashSaleStartDate: 1, flashSaleEndDate: 1 })
productSchema.index({ isBestSale: 1, status: 1 })
productSchema.index({ barcode: 1 })
productSchema.index({ sku: 1 })

const Product = mongoose.model("Product", productSchema)

module.exports = Product
