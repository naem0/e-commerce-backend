const mongoose = require("mongoose")

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    permissions: [
      {
        type: String,
        required: true,
      },
    ],
    isSystem: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: "#6B7280",
    },
    priority: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
)

// Index for faster queries
roleSchema.index({ name: 1 })
roleSchema.index({ isSystem: 1 })
roleSchema.index({ isActive: 1 })

// Virtual for user count
roleSchema.virtual("userCount", {
  ref: "User",
  localField: "_id",
  foreignField: "role",
  count: true,
})

// Ensure virtual fields are serialized
roleSchema.set("toJSON", { virtuals: true })
roleSchema.set("toObject", { virtuals: true })

// Prevent deletion of system roles
roleSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
  if (this.isSystem) {
    throw new Error("System roles cannot be deleted")
  }
  next()
})

const Role = mongoose.model("Role", roleSchema)

module.exports = Role
