const express = require("express")
const router = express.Router()
const {addToCart, getCart, updateCartItem, removeFromCart, clearCart, syncCart} = require("../controllers/cart.controller")
const { protect } = require("../middleware/auth.middleware")

// All routes require authentication
router.use(protect)

// Get user's cart
router.get("/", getCart)

// Add item to cart
router.post("/items", addToCart)

// Update cart item
router.put("/items", updateCartItem)

// Remove item from cart
router.delete("/items", removeFromCart)

// Clear cart
router.delete("/", clearCart)

// Sync local cart with server
router.post("/sync", syncCart)

module.exports = router
