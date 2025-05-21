const express = require("express")
const router = express.Router()
const cartController = require("../controllers/cart.controller")
const { protect } = require("../middleware/auth.middleware")

// All routes require authentication
router.use(protect)

// Get user's cart
router.get("/", cartController.getCart)

// Add item to cart
router.post("/items", cartController.addToCart)

// Update cart item
router.put("/items/:itemId", cartController.updateCartItem)

// Remove item from cart
router.delete("/items/:itemId", cartController.removeFromCart)

// Clear cart
router.delete("/", cartController.clearCart)

// Sync local cart with server
router.post("/sync", cartController.syncCart)

module.exports = router
