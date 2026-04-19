const nodemailer = require("nodemailer")

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

exports.sendEmail = async (options) => {
  const transporter = createTransporter()

  const mailOptions = {
    from: `"${process.env.SITE_NAME || "Equal Fashion"}" <${process.env.SMTP_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  }

  await transporter.sendMail(mailOptions)
}
