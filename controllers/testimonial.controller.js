const Testimonial = require("../models/Testimonial")

// @desc    Get all testimonials
// @route   GET /api/testimonials
// @access  Public
exports.getTestimonials = async (req, res) => {
  try {
    const { status, featured, limit, page = 1 } = req.query

    // Build query
    const query = {}

    // Filter by status
    if (status) {
      query.status = status
    } else {
      // Default to approved testimonials for public access
      query.status = "approved"
    }

    // Filter by featured
    if (featured === "true") {
      query.featured = true
    }

    // Calculate pagination
    const limitNum = Number.parseInt(limit) || 10
    const skip = (Number.parseInt(page) - 1) * limitNum

    const testimonials = await Testimonial.find(query)
      .populate("product", "name slug")
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip)

    const total = await Testimonial.countDocuments(query)

    res.status(200).json({
      success: true,
      count: testimonials.length,
      total,
      page: Number.parseInt(page),
      pages: Math.ceil(total / limitNum),
      testimonials,
    })
  } catch (error) {
    console.error("Get testimonials error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get single testimonial
// @route   GET /api/testimonials/:id
// @access  Public
exports.getTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id).populate("product", "name slug")

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      })
    }

    res.status(200).json({
      success: true,
      testimonial,
    })
  } catch (error) {
    console.error("Get testimonial error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Create a testimonial
// @route   POST /api/testimonials
// @access  Private/Admin
exports.createTestimonial = async (req, res) => {
  try {
    const { name, email, rating, comment, designation, company, featured, status, product } = req.body

    // Create testimonial
    const testimonial = await Testimonial.create({
      name,
      email,
      rating,
      comment,
      designation: designation || "",
      company: company || "",
      featured: featured || false,
      status: status || "pending",
      product: product || null,
    })

    res.status(201).json({
      success: true,
      testimonial,
    })
  } catch (error) {
    console.error("Create testimonial error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Update a testimonial
// @route   PUT /api/testimonials/:id
// @access  Private/Admin
exports.updateTestimonial = async (req, res) => {
  try {
    const { name, email, rating, comment, designation, company, featured, status, product } = req.body

    let testimonial = await Testimonial.findById(req.params.id)

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      })
    }

    // Update testimonial
    testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      {
        name: name || testimonial.name,
        email: email || testimonial.email,
        rating: rating || testimonial.rating,
        comment: comment || testimonial.comment,
        designation: designation !== undefined ? designation : testimonial.designation,
        company: company !== undefined ? company : testimonial.company,
        featured: featured !== undefined ? featured : testimonial.featured,
        status: status || testimonial.status,
        product: product !== undefined ? product : testimonial.product,
      },
      { new: true },
    ).populate("product", "name slug")

    res.status(200).json({
      success: true,
      testimonial,
    })
  } catch (error) {
    console.error("Update testimonial error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Delete a testimonial
// @route   DELETE /api/testimonials/:id
// @access  Private/Admin
exports.deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id)

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      })
    }

    await testimonial.deleteOne()

    res.status(200).json({
      success: true,
      message: "Testimonial deleted successfully",
    })
  } catch (error) {
    console.error("Delete testimonial error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}
