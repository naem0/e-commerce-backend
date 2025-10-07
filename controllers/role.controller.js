const Role = require("../models/Role")
const User = require("../models/User")
const Permission = require("../models/Permission")

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private/Admin
exports.getRoles = async (req, res) => {
  try {
    const { search, isSystem, isActive } = req.query

    // Build query
    const query = {}

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { displayName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ]
    }

    if (isSystem !== undefined) {
      query.isSystem = isSystem === "true"
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true"
    }

    // Get roles with user count
    const roles = await Role.find(query).sort({ priority: -1, name: 1 }).lean()

    // Get user count for each role
    const rolesWithCount = await Promise.all(
      roles.map(async (role) => {
        const userCount = await User.countDocuments({ role: role._id })
        return {
          ...role,
          userCount,
        }
      }),
    )

    res.status(200).json({
      success: true,
      count: rolesWithCount.length,
      roles: rolesWithCount,
    })
  } catch (error) {
    console.error("Get roles error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get single role
// @route   GET /api/roles/:id
// @access  Private/Admin
exports.getRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      })
    }

    // Get user count
    const userCount = await User.countDocuments({ role: role._id })

    res.status(200).json({
      success: true,
      role: {
        ...role.toObject(),
        userCount,
      },
    })
  } catch (error) {
    console.error("Get role error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Create new role
// @route   POST /api/roles
// @access  Private/Admin
exports.createRole = async (req, res) => {
  try {
    const { name, displayName, description, permissions, color, priority } = req.body

    // Check if role already exists
    const existingRole = await Role.findOne({ name: name.toUpperCase().replace(/\s+/g, "_") })
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: "Role with this name already exists",
      })
    }

    // Validate permissions
    const validPermissions = await Permission.find({ name: { $in: permissions } })
    if (validPermissions.length !== permissions.length) {
      return res.status(400).json({
        success: false,
        message: "Some permissions are invalid",
      })
    }

    // Create role
    const role = await Role.create({
      name: name.toUpperCase().replace(/\s+/g, "_"),
      displayName,
      description,
      permissions,
      color,
      priority,
      isSystem: false,
      createdBy: req.user.id,
    })

    res.status(201).json({
      success: true,
      message: "Role created successfully",
      role,
    })
  } catch (error) {
    console.error("Create role error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Update role
// @route   PUT /api/roles/:id
// @access  Private/Admin
exports.updateRole = async (req, res) => {
  try {
    const { displayName, description, permissions, color, priority, isActive } = req.body

    const role = await Role.findById(req.params.id)

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      })
    }

    // Prevent modification of system roles
    if (role.isSystem) {
      return res.status(403).json({
        success: false,
        message: "System roles cannot be modified",
      })
    }

    // Validate permissions if provided
    if (permissions) {
      const validPermissions = await Permission.find({ name: { $in: permissions } })
      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({
          success: false,
          message: "Some permissions are invalid",
        })
      }
    }

    // Update role
    const updatedRole = await Role.findByIdAndUpdate(
      req.params.id,
      {
        displayName: displayName || role.displayName,
        description: description || role.description,
        permissions: permissions || role.permissions,
        color: color || role.color,
        priority: priority !== undefined ? priority : role.priority,
        isActive: isActive !== undefined ? isActive : role.isActive,
        updatedBy: req.user.id,
      },
      { new: true },
    )

    res.status(200).json({
      success: true,
      message: "Role updated successfully",
      role: updatedRole,
    })
  } catch (error) {
    console.error("Update role error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Delete role
// @route   DELETE /api/roles/:id
// @access  Private/Admin
exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      })
    }

    // Prevent deletion of system roles
    if (role.isSystem) {
      return res.status(403).json({
        success: false,
        message: "System roles cannot be deleted",
      })
    }

    // Check if any users have this role
    const userCount = await User.countDocuments({ role: role._id })
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role. ${userCount} user(s) are assigned to this role.`,
      })
    }

    await role.deleteOne()

    res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    })
  } catch (error) {
    console.error("Delete role error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get role users
// @route   GET /api/roles/:id/users
// @access  Private/Admin
exports.getRoleUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query

    const role = await Role.findById(req.params.id)

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      })
    }

    const skip = (Number(page) - 1) * Number(limit)

    const users = await User.find({ role: role._id })
      .select("-password")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })

    const total = await User.countDocuments({ role: role._id })

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      users,
    })
  } catch (error) {
    console.error("Get role users error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Seed default roles
// @route   POST /api/roles/seed
// @access  Private/Super Admin
exports.seedRoles = async (req, res) => {
  try {
    // Check if roles already exist
    const existingRoles = await Role.countDocuments()
    if (existingRoles > 0) {
      return res.status(400).json({
        success: false,
        message: "Roles already exist. Cannot seed.",
      })
    }

    // Get all permissions
    const allPermissions = await Permission.find({ isActive: true }).select("name")
    const allPermissionNames = allPermissions.map((p) => p.name)

    // Define default roles
    const defaultRoles = [
      {
        name: "SUPER_ADMIN",
        displayName: "Super Admin",
        description: "Full system access with all permissions",
        permissions: allPermissionNames,
        color: "#9333EA",
        priority: 100,
        isSystem: true,
      },
      {
        name: "ADMIN",
        displayName: "Admin",
        description: "Administrative access with most permissions",
        permissions: allPermissionNames.filter((p) => !p.includes("system")),
        color: "#DC2626",
        priority: 90,
        isSystem: true,
      },
      {
        name: "MANAGER",
        displayName: "Manager",
        description: "Management level access",
        permissions: [
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
        color: "#2563EB",
        priority: 80,
        isSystem: true,
      },
      {
        name: "EMPLOYEE",
        displayName: "Employee",
        description: "Basic employee access",
        permissions: [
          "view_dashboard",
          "view_products",
          "view_orders",
          "view_inventory",
          "access_pos",
          "process_sales",
          "view_reviews",
        ],
        color: "#16A34A",
        priority: 70,
        isSystem: true,
      },
      {
        name: "CASHIER",
        displayName: "Cashier",
        description: "POS and sales access",
        permissions: ["access_pos", "process_sales", "view_products", "view_inventory"],
        color: "#CA8A04",
        priority: 60,
        isSystem: true,
      },
      {
        name: "CUSTOMER",
        displayName: "Customer",
        description: "Customer access",
        permissions: [],
        color: "#6B7280",
        priority: 50,
        isSystem: true,
      },
    ]

    // Create roles
    const createdRoles = await Role.insertMany(defaultRoles)

    res.status(201).json({
      success: true,
      message: "Default roles seeded successfully",
      count: createdRoles.length,
      roles: createdRoles,
    })
  } catch (error) {
    console.error("Seed roles error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}
