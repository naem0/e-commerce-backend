const Supplier = require("../models/Supplier")
const Purchase = require("../models/Purchase")

// Get all suppliers
const getSuppliers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query
    const query = {}

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ]
    }

    // Add status filter
    if (status && status !== "all") {
      query.status = status
    }

    const suppliers = await Supplier.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("createdBy", "name email")

    const total = await Supplier.countDocuments(query)

    res.json({
      success: true,
      data: suppliers,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching suppliers",
      error: error.message,
    })
  }
}

// Get supplier by ID
const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id).populate("createdBy", "name email")

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      })
    }

    res.json({
      success: true,
      data: supplier,
    })
  } catch (error) {
    console.error("Error fetching supplier:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching supplier",
      error: error.message,
    })
  }
}

// Create new supplier
const createSupplier = async (req, res) => {
  try {
    const supplierData = {
      ...req.body,
      createdBy: req.user.id,
    }

    const supplier = new Supplier(supplierData)
    await supplier.save()

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: supplier,
    })
  } catch (error) {
    console.error("Error creating supplier:", error)

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Supplier with this email already exists",
      })
    }

    res.status(500).json({
      success: false,
      message: "Error creating supplier",
      error: error.message,
    })
  }
}

// Update supplier
const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      })
    }

    res.json({
      success: true,
      message: "Supplier updated successfully",
      data: supplier,
    })
  } catch (error) {
    console.error("Error updating supplier:", error)

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Supplier with this email already exists",
      })
    }

    res.status(500).json({
      success: false,
      message: "Error updating supplier",
      error: error.message,
    })
  }
}

// Delete supplier
const deleteSupplier = async (req, res) => {
  try {
    // Check if supplier has any purchases
    const purchaseCount = await Purchase.countDocuments({
      supplier: req.params.id,
    })

    if (purchaseCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete supplier with existing purchases",
      })
    }

    const supplier = await Supplier.findByIdAndDelete(req.params.id)

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      })
    }

    res.json({
      success: true,
      message: "Supplier deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting supplier:", error)
    res.status(500).json({
      success: false,
      message: "Error deleting supplier",
      error: error.message,
    })
  }
}

// Get supplier statistics
const getSupplierStats = async (req, res) => {
  try {
    const supplierId = req.params.id

    if (supplierId) {
      // Get stats for specific supplier
      const purchases = await Purchase.find({ supplier: supplierId })

      const stats = {
        totalPurchases: purchases.length,
        totalAmount: purchases.reduce((sum, purchase) => sum + (purchase.totalAmount || 0), 0),
        pendingAmount: purchases
          .filter((purchase) => purchase.paymentStatus !== "paid")
          .reduce((sum, purchase) => sum + (purchase.totalAmount || 0), 0),
        lastPurchase: purchases.length > 0 ? purchases[purchases.length - 1].createdAt : null,
      }

      res.json({
        success: true,
        data: stats,
      })
    } else {
      // Get general supplier statistics
      const totalSuppliers = await Supplier.countDocuments()
      const activeSuppliers = await Supplier.countDocuments({ status: "active" })
      const inactiveSuppliers = await Supplier.countDocuments({ status: "inactive" })
      const totalPurchases = await Purchase.countDocuments()

      const stats = {
        total: totalSuppliers,
        active: activeSuppliers,
        inactive: inactiveSuppliers,
        totalPurchases: totalPurchases,
      }

      res.json({
        success: true,
        data: stats,
      })
    }
  } catch (error) {
    console.error("Error fetching supplier stats:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching supplier statistics",
      error: error.message,
    })
  }
}

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierStats,
}
