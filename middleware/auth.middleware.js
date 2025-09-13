const jwt = require("jsonwebtoken")
const User = require("../models/User")

// Protect routes - require authentication
exports.protect = async (req, res, next) => {
  try {
    let token

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1]
    }

    console.log("Auth middleware - Token received:", token ? "Yes" : "No")

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      })
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      console.log("Auth middleware - Decoded token:", decoded)

      // Get user from token
      const user = await User.findById(decoded.id).select("-password")

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        })
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: "User account is deactivated",
        })
      }

      console.log("Auth middleware - User found:", user.email, "Role:", user.role)

      req.user = user
      next()
    } catch (error) {
      console.error("Auth middleware - Token verification error:", error)
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      })
    }
  } catch (error) {
    console.error("Auth middleware - General error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
}

// Admin only access
exports.admin = (req, res, next) => {
  console.log("Admin middleware - User:", req.user?.email, "Role:", req.user?.role)

  if (
    req.user &&
    (req.user.role === "admin" ||
      req.user.role === "ADMIN" ||
      req.user.role === "super_admin" ||
      req.user.role === "SUPER_ADMIN")
  ) {
    next()
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Admin only.",
    })
  }
}

// Super Admin only access
exports.superAdmin = (req, res, next) => {
  console.log("Super Admin middleware - User:", req.user?.email, "Role:", req.user?.role)

  if (req.user && (req.user.role === "super_admin" || req.user.role === "SUPER_ADMIN")) {
    next()
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Super Admin only.",
    })
  }
}

// Manager or above access
exports.manager = (req, res, next) => {
  console.log("Manager middleware - User:", req.user?.email, "Role:", req.user?.role)

  const allowedRoles = ["super_admin", "SUPER_ADMIN", "admin", "ADMIN", "manager", "MANAGER"]

  if (req.user && allowedRoles.includes(req.user.role)) {
    next()
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Manager level access required.",
    })
  }
}

// Employee or above access
exports.employee = (req, res, next) => {
  console.log("Employee middleware - User:", req.user?.email, "Role:", req.user?.role)

  const allowedRoles = ["super_admin", "SUPER_ADMIN", "admin", "ADMIN", "manager", "MANAGER", "employee", "EMPLOYEE"]

  if (req.user && allowedRoles.includes(req.user.role)) {
    next()
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Employee level access required.",
    })
  }
}

// Cashier or above access
exports.cashier = (req, res, next) => {
  console.log("Cashier middleware - User:", req.user?.email, "Role:", req.user?.role)

  const allowedRoles = [
    "super_admin",
    "SUPER_ADMIN",
    "admin",
    "ADMIN",
    "manager",
    "MANAGER",
    "employee",
    "EMPLOYEE",
    "cashier",
    "CASHIER",
  ]

  if (req.user && allowedRoles.includes(req.user.role)) {
    next()
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Cashier level access required.",
    })
  }
}

// Authorize roles - flexible role checking
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Convert roles to lowercase for comparison
    const normalizedRoles = roles.map((role) => role.toLowerCase())
    const userRole = req.user.role?.toLowerCase()

    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      })
    }
    next()
  }
}

// Check specific permission
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    const user = req.user

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      })
    }

    // Role-based permissions
    const rolePermissions = {
      SUPER_ADMIN: ["*"], // All permissions
      ADMIN: [
        "view_dashboard",
        "view_products",
        "create_products",
        "edit_products",
        "delete_products",
        "manage_product_categories",
        "manage_product_brands",
        "view_orders",
        "create_orders",
        "edit_orders",
        "process_orders",
        "view_users",
        "create_users",
        "edit_users",
        "view_inventory",
        "manage_inventory",
        "view_suppliers",
        "manage_suppliers",
        "access_pos",
        "process_sales",
        "view_reports",
        "view_analytics",
        "export_data",
        "manage_site_settings",
        "manage_banners",
        "manage_home_settings",
        "view_reviews",
        "moderate_reviews",
      ],
      MANAGER: [
        "view_dashboard",
        "view_products",
        "create_products",
        "edit_products",
        "view_orders",
        "edit_orders",
        "process_orders",
        "view_users",
        "view_inventory",
        "manage_inventory",
        "view_suppliers",
        "access_pos",
        "process_sales",
        "manage_cash_register",
        "view_reports",
        "view_analytics",
        "view_reviews",
        "moderate_reviews",
      ],
      EMPLOYEE: [
        "view_dashboard",
        "view_products",
        "view_orders",
        "view_inventory",
        "access_pos",
        "process_sales",
        "view_reviews",
      ],
      CASHIER: ["access_pos", "process_sales", "view_products", "view_inventory"],
      CUSTOMER: [],
    }

    const userRole = user.role?.toUpperCase()
    const userPermissions = rolePermissions[userRole] || []

    // Check if user has the required permission
    if (userPermissions.includes("*") || userPermissions.includes(permission)) {
      next()
    } else {
      res.status(403).json({
        success: false,
        message: `Permission denied. Required permission: ${permission}`,
      })
    }
  }
}

// Check multiple permissions (user must have at least one)
exports.checkAnyPermission = (...permissions) => {
  return (req, res, next) => {
    const user = req.user

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      })
    }

    const rolePermissions = {
      SUPER_ADMIN: ["*"],
      ADMIN: [
        "view_dashboard",
        "view_products",
        "create_products",
        "edit_products",
        "delete_products",
        "manage_product_categories",
        "manage_product_brands",
        "view_orders",
        "create_orders",
        "edit_orders",
        "process_orders",
        "view_users",
        "create_users",
        "edit_users",
        "view_inventory",
        "manage_inventory",
        "view_suppliers",
        "manage_suppliers",
        "access_pos",
        "process_sales",
        "view_reports",
        "view_analytics",
        "export_data",
        "manage_site_settings",
        "manage_banners",
        "manage_home_settings",
        "view_reviews",
        "moderate_reviews",
      ],
      MANAGER: [
        "view_dashboard",
        "view_products",
        "create_products",
        "edit_products",
        "view_orders",
        "edit_orders",
        "process_orders",
        "view_users",
        "view_inventory",
        "manage_inventory",
        "view_suppliers",
        "access_pos",
        "process_sales",
        "manage_cash_register",
        "view_reports",
        "view_analytics",
        "view_reviews",
        "moderate_reviews",
      ],
      EMPLOYEE: [
        "view_dashboard",
        "view_products",
        "view_orders",
        "view_inventory",
        "access_pos",
        "process_sales",
        "view_reviews",
      ],
      CASHIER: ["access_pos", "process_sales", "view_products", "view_inventory"],
      CUSTOMER: [],
    }

    const userRole = user.role?.toUpperCase()
    const userPermissions = rolePermissions[userRole] || []

    // Check if user has any of the required permissions
    const hasPermission =
      userPermissions.includes("*") || permissions.some((permission) => userPermissions.includes(permission))

    if (hasPermission) {
      next()
    } else {
      res.status(403).json({
        success: false,
        message: `Permission denied. Required permissions: ${permissions.join(", ")}`,
      })
    }
  }
}
