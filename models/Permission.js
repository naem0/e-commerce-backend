const mongoose = require("mongoose")

const permissionSchema = new mongoose.Schema(
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
    category: {
      type: String,
      required: true,
      enum: [
        "Dashboard",
        "Products",
        "Orders",
        "Users",
        "Inventory",
        "POS",
        "Reports",
        "Settings",
        "System",
        "Content",
      ],
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

// Index for faster queries
permissionSchema.index({ name: 1 })
permissionSchema.index({ category: 1 })
permissionSchema.index({ isActive: 1 })

const Permission = mongoose.model("Permission", permissionSchema)

module.exports = Permission
