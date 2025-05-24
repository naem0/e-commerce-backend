const mongoose = require("mongoose")

const testimonialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, "Comment is required"],
      trim: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    designation: {
      type: String,
      trim: true,
      default: "",
    },
    company: {
      type: String,
      trim: true,
      default: "",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

const Testimonial = mongoose.model("Testimonial", testimonialSchema)

module.exports = Testimonial
