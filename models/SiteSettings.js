const mongoose = require("mongoose")

const customSectionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ["best-sellers", "flash-sale", "category-best-sellers", "new-arrivals", "trending", "custom-products"],
  },
  enabled: { type: Boolean, default: true },
  design: { type: String, default: "custom-1" },
  order: { type: Number, required: true },
  settings: {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    limit: { type: Number, default: 8 },
    showTimer: { type: Boolean, default: false },
    endDate: { type: Date, default: null },
    discountPercentage: { type: Number, default: 0 },
    backgroundColor: { type: String, default: "#ffffff" },
    textColor: { type: String, default: "#000000" },
  },
})

const siteSettingsSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      default: "E-Shop",
    },
    logo: {
      type: String,
      default: "",
    },
    favicon: {
      type: String,
      default: "",
    },
    primaryColor: {
      type: String,
      default: "#3b82f6",
    },
    secondaryColor: {
      type: String,
      default: "#10b981",
    },
    // Home page sections configuration
    homePageSections: {
      banner: {
        enabled: { type: Boolean, default: true },
        design: { type: String, default: "banner-1" },
        order: { type: Number, default: 1 },
      },
      featuredProducts: {
        enabled: { type: Boolean, default: true },
        design: { type: String, default: "featured-1" },
        order: { type: Number, default: 2 },
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
        title: { type: String, default: "Featured Products" },
        limit: { type: Number, default: 8 },
      },
      categories: {
        enabled: { type: Boolean, default: true },
        design: { type: String, default: "categories-1" },
        order: { type: Number, default: 3 },
        title: { type: String, default: "Shop by Category" },
        limit: { type: Number, default: 8 },
      },
      categoryProducts: [
        {
          enabled: { type: Boolean, default: true },
          design: { type: String, default: "category-products-1" },
          order: { type: Number, default: 4 },
          categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
          title: { type: String, default: "" },
          limit: { type: Number, default: 8 },
        },
      ],
      customSections: [customSectionSchema],
      testimonials: {
        enabled: { type: Boolean, default: true },
        design: { type: String, default: "testimonials-1" },
        order: { type: Number, default: 5 },
        title: { type: String, default: "What Our Customers Say" },
        limit: { type: Number, default: 6 },
      },
      newsletter: {
        enabled: { type: Boolean, default: true },
        design: { type: String, default: "newsletter-1" },
        order: { type: Number, default: 6 },
        title: { type: String, default: "Subscribe to Our Newsletter" },
      },
    },
    // Banner configuration
    banners: [
      {
        title: { type: String, default: "Summer Sale 2024" },
        subtitle: { type: String, default: "Up to 50% off on all items" },
        description: { type: String, default: "Don't miss out on our biggest sale of the year" },
        image: { type: String, default: "" },
        buttonText: { type: String, default: "Shop Now" },
        buttonLink: { type: String, default: "/products" },
        backgroundColor: { type: String, default: "#f8fafc" },
        textColor: { type: String, default: "#1e293b" },
        enabled: { type: Boolean, default: true },
        order: { type: Number, default: 1 },
      },
    ],
    socialLinks: {
      facebook: { type: String, default: "" },
      twitter: { type: String, default: "" },
      instagram: { type: String, default: "" },
      youtube: { type: String, default: "" },
    },
    contactInfo: {
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      address: { type: String, default: "" },
    },
    metaTags: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      keywords: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
  },
)

// Create a singleton pattern - only one settings document
siteSettingsSchema.statics.getSiteSettings = async function () {
  const settings = await this.findOne().populate([
    "homePageSections.categoryProducts.categoryId",
    "homePageSections.featuredProducts.categoryId",
    "homePageSections.customSections.settings.categoryId",
    "homePageSections.customSections.settings.productIds",
  ])
  if (settings) {
    return settings
  }
  return this.create({})
}

const SiteSettings = mongoose.model("SiteSettings", siteSettingsSchema)

module.exports = SiteSettings
