const express = require("express")
const router = express.Router()
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notification.controller")
const { protect } = require("../middleware/auth.middleware")

router.use(protect)

router.get("/", getNotifications)
router.put("/read-all", markAllAsRead)
router.put("/:id/read", markAsRead)
router.delete("/:id", deleteNotification)

module.exports = router
