const nodemailer = require("nodemailer")

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

exports.sendEmail = async (options) => {
  try {
    const transporter = createTransporter()

    const mailOptions = {
      from: `"${process.env.SITE_NAME || "Equal Fashion"}" <${process.env.SMTP_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    }

    console.log(`Attempting to send email to ${options.email} with subject: ${options.subject}`)
    const info = await transporter.sendMail(mailOptions)
    console.log("Email sent successfully:", info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Nodemailer sendMail error:", error)
    throw error
  }
}
