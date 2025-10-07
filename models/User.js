const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const addressSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  addressLine1: {
    type: String,
    required: true,
  },
  addressLine2: String,
  city: {
    type: String,
    required: true,
  },
  state: String,
  postalCode: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
    default: "Bangladesh",
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
})

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    customPermissions: {
      type: [String],
      default: [],
    },
    hasCustomPermissions: {
      type: Boolean,
      default: false,
    },
    addresses: [addressSchema],
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    avatar: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: Date,
    loginCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

// Index for faster queries
userSchema.index({ email: 1 })
userSchema.index({ role: 1 })
userSchema.index({ isActive: 1 })

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next()
  }

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password)
  } catch (error) {
    throw new Error("Password comparison failed")
  }
}

// Get user permissions (from role + custom)
userSchema.methods.getPermissions = async function () {
  if (this.hasCustomPermissions) {
    return this.customPermissions
  }

  await this.populate("role")
  return this.role?.permissions || []
}

// Check if user has permission
userSchema.methods.hasPermission = async function (permission) {
  const permissions = await this.getPermissions()
  return permissions.includes(permission) || permissions.includes("*")
}

const User = mongoose.model("User", userSchema)

module.exports = User
