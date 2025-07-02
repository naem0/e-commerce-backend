const express = require("express")
const router = express.Router()
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  clearWishlist,
} = require("../controllers/wishlist.controller")
const { protect } = require("../middleware/auth.middleware")

// All routes are protected
router.use(protect)

router.get("/", getWishlist)
router.post("/", addToWishlist)
router.delete("/", clearWishlist)
router.get("/check/:productId", checkWishlist)
router.delete("/:productId", removeFromWishlist)

module.exports = router
