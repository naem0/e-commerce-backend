const Notification = require("../models/Notification")

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query

    const query = { recipient: req.user.id }
    if (unreadOnly === "true") {
      query.read = false
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number.parseInt(limit))

    const total = await Notification.countDocuments(query)
    const unreadCount = await Notification.countDocuments({ recipient: req.user.id, read: false })

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        total,
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get notifications error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { read: true },
      { new: true },
    )

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      })
    }

    res.json({
      success: true,
      notification,
    })
  } catch (error) {
    console.error("Mark as read error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true })

    res.json({
      success: true,
      message: "All notifications marked as read",
    })
  } catch (error) {
    console.error("Mark all as read error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id,
    })

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      })
    }

    res.json({
      success: true,
      message: "Notification deleted",
    })
  } catch (error) {
    console.error("Delete notification error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// Helper function to create notification (internal use)
exports.createNotification = async (data) => {
  try {
    const notification = await Notification.create(data)
    return notification
  } catch (error) {
    console.error("Create notification error:", error)
    return null
  }
}
