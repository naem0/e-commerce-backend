const mongoose = require("mongoose")

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
    heroDesign: {
      type: String,
      default: "hero-1",
    },
    featuredDesign: {
      type: String,
      default: "featured-1",
    },
    categoriesDesign: {
      type: String,
      default: "categories-1",
    },
    testimonialsDesign: {
      type: String,
      default: "testimonials-1",
    },
    productListDesign: {
      type: String,
      default: "product-list-1",
    },
    productDetailDesign: {
      type: String,
      default: "product-detail-1",
    },
    cartDesign: {
      type: String,
      default: "cart-1",
    },
    checkoutDesign: {
      type: String,
      default: "checkout-1",
    },
    footerDesign: {
      type: String,
      default: "footer-1",
    },
    socialLinks: {
      facebook: {
        type: String,
        default: "",
      },
      twitter: {
        type: String,
        default: "",
      },
      instagram: {
        type: String,
        default: "",
      },
      youtube: {
        type: String,
        default: "",
      },
    },
    contactInfo: {
      email: {
        type: String,
        default: "",
      },
      phone: {
        type: String,
        default: "",
      },
      address: {
        type: String,
        default: "",
      },
    },
    metaTags: {
      title: {
        type: String,
        default: "",
      },
      description: {
        type: String,
        default: "",
      },
      keywords: {
        type: String,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  },
)

// Create a singleton pattern - only one settings document
siteSettingsSchema.statics.getSiteSettings = async function () {
  const settings = await this.findOne()
  if (settings) {
    return settings
  }
  return this.create({})
}

const SiteSettings = mongoose.model("SiteSettings", siteSettingsSchema)

module.exports = SiteSettings
