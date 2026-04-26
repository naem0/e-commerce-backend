const User = require("../models/User")
const PasswordReset = require("../models/PasswordReset")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const { sendEmail } = require("../services/email.service")

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "fallback-jwt-secret", {
    expiresIn: "30d",
  })
}

// Remove createTransporter as it's now in email.service

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Check if user already exists
    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      })
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
    })

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Register error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      })
    }

    // Check if user exists
    const user = await User.findOne({ email }).select("+password")
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      })
    }

    // Check if password is correct
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      })
    }

    // Generate token
    const token = generateToken(user._id)

    const response = {
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }
    res.status(200).json(response)
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
      },
    })
  } catch (error) {
    console.error("Get me error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide email address",
      })
    }

    // Check if user exists
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with this email address",
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")

    // Save reset token to database
    await PasswordReset.create({
      userId: user._id,
      token: resetToken,
      email: user.email,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    })

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/reset-password/${resetToken}`

    // Email content
    const message = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #f7733b; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Equal Fashion</h1>
        </div>
        <div style="padding: 30px; line-height: 1.6; color: #333;">
          <h2 style="color: #f7733b; margin-top: 0;">Password Reset Request</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>We received a request to reset your password for your Equal Fashion account. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #f7733b; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset My Password</a>
          </div>
          <p>If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          <p style="font-size: 12px; color: #777;">This link will expire in 1 hour for security reasons.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="margin-bottom: 0;">Best regards,</p>
          <p style="margin-top: 5px;"><strong>Equal Fashion Team</strong></p>
        </div>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #999;">
          &copy; ${new Date().getFullYear()} Equal Fashion. All rights reserved.
        </div>
      </div>
    `

    // Send email
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await sendEmail({
          email: user.email,
          subject: "Password Reset Request",
          html: message,
        })

        res.status(200).json({
          success: true,
          message: "Password reset email sent successfully",
        })
      } catch (emailError) {
        console.error("Email sending error:", emailError)
        res.status(500).json({
          success: false,
          message: "Failed to send reset email. Please try again later.",
        })
      }
    } else {
      // For development - return the reset token
      res.status(200).json({
        success: true,
        message: "Password reset token generated (Email not configured)",
        resetToken: resetToken, // Only for development
        resetUrl: resetUrl, // Only for development
      })
    }
  } catch (error) {
    console.error("Forgot password error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params
    const { password } = req.body

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Please provide new password",
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      })
    }

    // Find reset token
    const resetRecord = await PasswordReset.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() },
    })

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      })
    }

    // Find user
    const user = await User.findById(resetRecord.userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Update password
    user.password = password
    await user.save()

    // Mark token as used
    resetRecord.used = true
    await resetRecord.save()

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}

// @desc    Login or Register user via Google
// @route   POST /api/auth/google-login
// @access  Public
exports.googleLogin = async (req, res) => {
  try {
    const { name, email, image, provider } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required for Google login.",
      });
    }

    let user = await User.findOne({ email });

    if (user) {
      // User exists, check provider
      if (user.provider !== 'google' && user.provider !== 'credentials') {
        return res.status(400).json({
          success: false,
          message: `You have already signed up with ${user.provider}. Please use that method to log in.`,
        });
      }
      // If user exists with google provider, just log them in
      // If user exists with credentials, we can link the account by updating the provider
      user.provider = 'google';
      user.avatar = user.avatar || image;
      await user.save();

    } else {
      // User does not exist, create a new user
      user = await User.create({
        name,
        email,
        avatar: image,
        provider,
        emailVerified: true, // Email is verified by Google
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during Google login.",
      error: error.message,
    });
  }
};

// @desc    Verify reset token
// @route   GET /api/auth/verify-reset-token/:token
// @access  Public
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params

    const resetRecord = await PasswordReset.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() },
    }).populate("userId", "name email")

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      })
    }

    res.status(200).json({
      success: true,
      message: "Token is valid",
      user: {
        name: resetRecord.userId.name,
        email: resetRecord.userId.email,
      },
    })
  } catch (error) {
    console.error("Verify reset token error:", error)
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}
