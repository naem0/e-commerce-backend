const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const dotenv = require("dotenv")
const path = require("path")
const authRoutes = require("./routes/auth.routes")
const userRoutes = require("./routes/user.routes")
const productRoutes = require("./routes/product.routes")
const categoryRoutes = require("./routes/category.routes")
const brandRoutes = require("./routes/brand.routes")
const orderRoutes = require("./routes/order.routes")
const cartRoutes = require("./routes/cart.routes")
const siteSettingsRoutes = require("./routes/siteSettings.routes")
const testimonialRoutes = require("./routes/testimonial.routes")
const bannerRoutes = require("./routes/banner.routes")
const analyticsRoutes = require("./routes/analytics.routes")
const wishlistRoutes = require("./routes/wishlist.routes")
const reviewRoutes = require("./routes/review.routes")
const chatbotRoutes = require("./routes/routes.chatbot")

// Load env vars
dotenv.config()

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Connection Error: ", err))

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Static folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// home route
app.get("/", (req, res) => {
  res.send("API is running...")
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/products", productRoutes)
app.use("/api/categories", categoryRoutes)
app.use("/api/brands", brandRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/cart", cartRoutes)
app.use("/api/site-settings", siteSettingsRoutes)
app.use("/api/testimonials", testimonialRoutes)
app.use("/api/banners", bannerRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/wishlist", wishlistRoutes)
app.use("/api/reviews", reviewRoutes)
app.use('/api/chatbot', chatbotRoutes)


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    success: false,
    message: "Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
  })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
