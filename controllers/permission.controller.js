const Permission = require("../models/Permission")
const Role = require("../models/Role")

// @desc    Get all permissions
// @route   GET /api/permissions
// @access  Private/Admin
exports.getPermissions = async (req, res) => {
  try {
    const { search, category, isActive } = req.query

    // Build query
    const query = {}

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { displayName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ]
    }

    if (category) {
      query.category = category
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true"
    }

    const permissions = await Permission.find(query).sort({ category: 1, name: 1 })

    // Group by category
    const groupedPermissions = permissions.reduce((acc, permission) => {
      const category = permission.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(permission)
      return acc
    }, {})

    res.status(200).json({
      success: true,
      count: permissions.length,
      permissions,
      groupedPermissions,
    })
  } catch (error) {
    console.error("Get permissions error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get single permission
// @route   GET /api/permissions/:id
// @access  Private/Admin
exports.getPermission = async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id)

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: "Permission not found",
      })
    }

    // Count roles using this permission
    const roleCount = await Role.countDocuments({ permissions: permission.name })

    res.status(200).json({
      success: true,
      permission: {
        ...permission.toObject(),
        roleCount,
      },
    })
  } catch (error) {
    console.error("Get permission error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Create new permission
// @route   POST /api/permissions
// @access  Private/Super Admin
exports.createPermission = async (req, res) => {
  try {
    const { name, displayName, description, category } = req.body

    // Check if permission already exists
    const existingPermission = await Permission.findOne({ name: name.toLowerCase().replace(/\s+/g, "_") })
    if (existingPermission) {
      return res.status(400).json({
        success: false,
        message: "Permission with this name already exists",
      })
    }

    // Create permission
    const permission = await Permission.create({
      name: name.toLowerCase().replace(/\s+/g, "_"),
      displayName,
      description,
      category,
      isSystem: false,
    })

    res.status(201).json({
      success: true,
      message: "Permission created successfully",
      permission,
    })
  } catch (error) {
    console.error("Create permission error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Update permission
// @route   PUT /api/permissions/:id
// @access  Private/Super Admin
exports.updatePermission = async (req, res) => {
  try {
    const { displayName, description, category, isActive } = req.body

    const permission = await Permission.findById(req.params.id)

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: "Permission not found",
      })
    }

    // Prevent modification of system permissions
    if (permission.isSystem) {
      return res.status(403).json({
        success: false,
        message: "System permissions cannot be modified",
      })
    }

    // Update permission
    const updatedPermission = await Permission.findByIdAndUpdate(
      req.params.id,
      {
        displayName: displayName || permission.displayName,
        description: description || permission.description,
        category: category || permission.category,
        isActive: isActive !== undefined ? isActive : permission.isActive,
      },
      { new: true },
    )

    res.status(200).json({
      success: true,
      message: "Permission updated successfully",
      permission: updatedPermission,
    })
  } catch (error) {
    console.error("Update permission error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Delete permission
// @route   DELETE /api/permissions/:id
// @access  Private/Super Admin
exports.deletePermission = async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id)

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: "Permission not found",
      })
    }

    // Prevent deletion of system permissions
    if (permission.isSystem) {
      return res.status(403).json({
        success: false,
        message: "System permissions cannot be deleted",
      })
    }

    // Check if any roles use this permission
    const roleCount = await Role.countDocuments({ permissions: permission.name })
    if (roleCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete permission. ${roleCount} role(s) use this permission.`,
      })
    }

    await permission.deleteOne()

    res.status(200).json({
      success: true,
      message: "Permission deleted successfully",
    })
  } catch (error) {
    console.error("Delete permission error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Seed default permissions
// @route   POST /api/permissions/seed
// @access  Private/Super Admin
exports.seedPermissions = async (req, res) => {
  try {
    // Check if permissions already exist
    const existingPermissions = await Permission.countDocuments()
    if (existingPermissions > 0) {
      return res.status(400).json({
        success: false,
        message: "Permissions already exist. Cannot seed.",
      })
    }

    // Define default permissions
    const defaultPermissions = [
      // Dashboard & Analytics
      {
        name: "view_dashboard",
        displayName: "View Dashboard",
        description: "Access to main dashboard",
        category: "Dashboard",
        isSystem: true,
      },
      {
        name: "view_reports",
        displayName: "View Reports",
        description: "Access to view reports",
        category: "Reports",
        isSystem: true,
      },
      {
        name: "view_analytics",
        displayName: "View Analytics",
        description: "Access to analytics and insights",
        category: "Dashboard",
        isSystem: true,
      },
      {
        name: "export_data",
        displayName: "Export Data",
        description: "Export data to CSV/Excel",
        category: "Reports",
        isSystem: true,
      },

      // Product Management
      {
        name: "view_products",
        displayName: "View Products",
        description: "View product listings",
        category: "Products",
        isSystem: true,
      },
      {
        name: "create_products",
        displayName: "Create Products",
        description: "Create new products",
        category: "Products",
        isSystem: true,
      },
      {
        name: "edit_products",
        displayName: "Edit Products",
        description: "Edit existing products",
        category: "Products",
        isSystem: true,
      },
      {
        name: "delete_products",
        displayName: "Delete Products",
        description: "Delete products",
        category: "Products",
        isSystem: true,
      },
      {
        name: "manage_product_categories",
        displayName: "Manage Categories",
        description: "Manage product categories",
        category: "Products",
        isSystem: true,
      },
      {
        name: "manage_product_brands",
        displayName: "Manage Brands",
        description: "Manage product brands",
        category: "Products",
        isSystem: true,
      },

      // Order Management
      {
        name: "view_orders",
        displayName: "View Orders",
        description: "View order listings",
        category: "Orders",
        isSystem: true,
      },
      {
        name: "create_orders",
        displayName: "Create Orders",
        description: "Create new orders",
        category: "Orders",
        isSystem: true,
      },
      {
        name: "edit_orders",
        displayName: "Edit Orders",
        description: "Edit existing orders",
        category: "Orders",
        isSystem: true,
      },
      {
        name: "delete_orders",
        displayName: "Delete Orders",
        description: "Delete orders",
        category: "Orders",
        isSystem: true,
      },
      {
        name: "process_orders",
        displayName: "Process Orders",
        description: "Process and fulfill orders",
        category: "Orders",
        isSystem: true,
      },

      // User Management
      {
        name: "view_users",
        displayName: "View Users",
        description: "View user listings",
        category: "Users",
        isSystem: true,
      },
      {
        name: "create_users",
        displayName: "Create Users",
        description: "Create new users",
        category: "Users",
        isSystem: true,
      },
      {
        name: "edit_users",
        displayName: "Edit Users",
        description: "Edit existing users",
        category: "Users",
        isSystem: true,
      },
      {
        name: "delete_users",
        displayName: "Delete Users",
        description: "Delete users",
        category: "Users",
        isSystem: true,
      },
      {
        name: "manage_user_roles",
        displayName: "Manage User Roles",
        description: "Assign roles to users",
        category: "Users",
        isSystem: true,
      },

      // Inventory & Suppliers
      {
        name: "view_inventory",
        displayName: "View Inventory",
        description: "View inventory levels",
        category: "Inventory",
        isSystem: true,
      },
      {
        name: "manage_inventory",
        displayName: "Manage Inventory",
        description: "Update inventory levels",
        category: "Inventory",
        isSystem: true,
      },
      {
        name: "view_suppliers",
        displayName: "View Suppliers",
        description: "View supplier listings",
        category: "Inventory",
        isSystem: true,
      },
      {
        name: "manage_suppliers",
        displayName: "Manage Suppliers",
        description: "Create and edit suppliers",
        category: "Inventory",
        isSystem: true,
      },

      // POS & Sales
      {
        name: "access_pos",
        displayName: "Access POS",
        description: "Access point of sale system",
        category: "POS",
        isSystem: true,
      },
      {
        name: "process_sales",
        displayName: "Process Sales",
        description: "Process sales transactions",
        category: "POS",
        isSystem: true,
      },
      {
        name: "manage_cash_register",
        displayName: "Manage Cash Register",
        description: "Manage cash register operations",
        category: "POS",
        isSystem: true,
      },

      // Content & Settings
      {
        name: "manage_site_settings",
        displayName: "Manage Site Settings",
        description: "Configure site settings",
        category: "Settings",
        isSystem: true,
      },
      {
        name: "manage_banners",
        displayName: "Manage Banners",
        description: "Create and edit banners",
        category: "Content",
        isSystem: true,
      },
      {
        name: "manage_home_settings",
        displayName: "Manage Home Settings",
        description: "Configure home page settings",
        category: "Content",
        isSystem: true,
      },
      {
        name: "view_reviews",
        displayName: "View Reviews",
        description: "View product reviews",
        category: "Content",
        isSystem: true,
      },
      {
        name: "moderate_reviews",
        displayName: "Moderate Reviews",
        description: "Approve or reject reviews",
        category: "Content",
        isSystem: true,
      },

      // System Administration
      {
        name: "manage_roles",
        displayName: "Manage Roles",
        description: "Create and edit roles",
        category: "System",
        isSystem: true,
      },
      {
        name: "manage_permissions",
        displayName: "Manage Permissions",
        description: "Create and edit permissions",
        category: "System",
        isSystem: true,
      },
      {
        name: "view_system_logs",
        displayName: "View System Logs",
        description: "Access system logs",
        category: "System",
        isSystem: true,
      },
    ]

    // Create permissions
    const createdPermissions = await Permission.insertMany(defaultPermissions)

    res.status(201).json({
      success: true,
      message: "Default permissions seeded successfully",
      count: createdPermissions.length,
      permissions: createdPermissions,
    })
  } catch (error) {
    console.error("Seed permissions error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}
