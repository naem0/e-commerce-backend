const mongoose = require("mongoose")

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Banner image is required"],
    },
    buttonText: {
      type: String,
    },
    buttonLink: {
      type: String,
    },
    backgroundColor: {
      type: String,
    },
    textColor: {
      type: String,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 1,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

const Banner = mongoose.model("Banner", bannerSchema)

module.exports = Banner
