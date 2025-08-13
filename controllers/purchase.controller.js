const Purchase = require("../models/Purchase")
const Product = require("../models/Product")
const Supplier = require("../models/Supplier")
const mongoose = require("mongoose")

// @desc    Get all purchases
// @route   GET /api/purchases
// @access  Private/Admin
exports.getPurchases = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, supplier } = req.query

    // Build query
    const query = {}

    if (search) {
      query.$or = [{ invoiceNumber: { $regex: search, $options: "i" } }]
    }

    if (status) {
      query.status = status
    }

    if (supplier) {
      query.supplier = supplier
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit)

    const purchases = await Purchase.find(query)
      .populate("supplier", "name email phone")
      .populate("items.product", "name sku")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const total = await Purchase.countDocuments(query)

    res.status(200).json({
      success: true,
      purchases,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    })
  } catch (error) {
    console.error("Get purchases error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get single purchase
// @route   GET /api/purchases/:id
// @access  Private/Admin
exports.getPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate("supplier", "name email phone address")
      .populate("items.product", "name sku")
      .populate("createdBy", "name email")

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      })
    }

    res.status(200).json({
      success: true,
      purchase,
    })
  } catch (error) {
    console.error("Get purchase error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Create purchase
// @route   POST /api/purchases
// @access  Private/Admin
exports.createPurchase = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { invoiceNumber, supplier, purchaseDate, items, totalAmount, paidAmount, paymentMethod, notes } = req.body

    // Validate required fields
    if (!invoiceNumber || !supplier || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    // Check if invoice number already exists
    const existingPurchase = await Purchase.findOne({ invoiceNumber })
    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        message: "Invoice number already exists",
      })
    }

    // Validate supplier
    const supplierExists = await Supplier.findById(supplier)
    if (!supplierExists) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier",
      })
    }

    // Validate and process items
    const processedItems = []
    for (const item of items) {
      const product = await Product.findById(item.product)
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.product}`,
        })
      }

      processedItems.push({
        product: product._id,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
        totalCost: Number(item.quantity) * Number(item.unitCost),
      })

      // Update product stock
      product.stock += Number(item.quantity)
      await product.save({ session })
    }

    // Create purchase
    const purchase = new Purchase({
      invoiceNumber,
      supplier,
      purchaseDate: purchaseDate || Date.now(),
      items: processedItems,
      totalAmount: Number(totalAmount),
      paidAmount: Number(paidAmount) || 0,
      paymentMethod: paymentMethod || "cash",
      notes,
      createdBy: req.user.id,
    })

    await purchase.save({ session })

    await session.commitTransaction()

    // Populate the created purchase
    await purchase.populate([
      { path: "supplier", select: "name email phone" },
      { path: "items.product", select: "name sku" },
      { path: "createdBy", select: "name email" },
    ])

    res.status(201).json({
      success: true,
      message: "Purchase created successfully",
      purchase,
    })
  } catch (error) {
    await session.abortTransaction()
    console.error("Create purchase error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  } finally {
    session.endSession()
  }
}

// @desc    Update purchase
// @route   PUT /api/purchases/:id
// @access  Private/Admin
exports.updatePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      })
    }

    // Only allow updating certain fields
    const allowedUpdates = ["paidAmount", "paymentMethod", "status", "notes"]
    const updates = {}

    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key]
      }
    })

    Object.assign(purchase, updates)
    await purchase.save()

    await purchase.populate([
      { path: "supplier", select: "name email phone" },
      { path: "items.product", select: "name sku" },
      { path: "createdBy", select: "name email" },
    ])

    res.status(200).json({
      success: true,
      message: "Purchase updated successfully",
      purchase,
    })
  } catch (error) {
    console.error("Update purchase error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Delete purchase
// @route   DELETE /api/purchases/:id
// @access  Private/Admin
exports.deletePurchase = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const purchase = await Purchase.findById(req.params.id)

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      })
    }

    // Only allow deletion if purchase is pending
    if (purchase.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete completed or cancelled purchase",
      })
    }

    // Revert stock changes
    for (const item of purchase.items) {
      const product = await Product.findById(item.product)
      if (product) {
        product.stock -= item.quantity
        await product.save({ session })
      }
    }

    await Purchase.findByIdAndDelete(req.params.id, { session })

    await session.commitTransaction()

    res.status(200).json({
      success: true,
      message: "Purchase deleted successfully",
    })
  } catch (error) {
    await session.abortTransaction()
    console.error("Delete purchase error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  } finally {
    session.endSession()
  }
}
