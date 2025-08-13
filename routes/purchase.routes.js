const express = require("express")
const router = express.Router()
const {
  getPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase,
} = require("../controllers/purchase.controller")
const { protect, admin } = require("../middleware/auth.middleware")

// All routes require admin access
router.use(protect, admin)

router.route("/").get(getPurchases).post(createPurchase)
router.route("/:id").get(getPurchase).put(updatePurchase).delete(deletePurchase)

module.exports = router
