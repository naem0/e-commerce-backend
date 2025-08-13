const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Order = require("../models/Order");
const axios = require("axios");

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/text-bison-001:generateText";
const GOOGLE_API_KEY = "AIzaSyBQP2IkK2DkPAUmPrjnmSyChDo6gzYCJZM";

async function getGeminiResponse(prompt) {
  try {
    const body = {
      prompt: { text: prompt },
      temperature: 0.5,
      maxOutputTokens: 512,
    };

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GOOGLE_API_KEY}`,
      body,
      { headers: { "Content-Type": "application/json" } }
    );

    return response.data?.candidates?.[0]?.output || "দুঃখিত, উত্তর পাওয়া যায়নি।";
  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);
    return "AI সার্ভারে সমস্যা, পরে চেষ্টা করুন।";
  }
}

router.post("/", async (req, res) => {
  const { message, userId } = req.body;

  try {
    // ১. প্রথমে AI কে শুধু message পাঠাও
    const firstReply = await getGeminiResponse(
      `User message: "${message}"\n\nTell me if I need product data or order data to answer this question. Reply only with one of: "NEED_PRODUCT", "NEED_ORDER", "NEED_BOTH", "NO_DATA".`
    );

    let matchedProducts = [];
    let recentOrdersSummary = "";

    // ২. AI এর instruction অনুযায়ী MongoDB query করো
    if (firstReply.includes("NEED_PRODUCT") || firstReply.includes("NEED_BOTH")) {
      matchedProducts = await Product.find({
        $or: [
          { name: { $regex: message, $options: "i" } },
          { shortDescription: { $regex: message, $options: "i" } }
        ],
        status: "published",
      })
      .limit(3)
      .select("name shortDescription price slug");
    }

    if ((firstReply.includes("NEED_ORDER") || firstReply.includes("NEED_BOTH")) && userId) {
      const recentOrders = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .select("orderNumber status total createdAt");

      recentOrdersSummary = recentOrders
        .map(o => `Order#: ${o.orderNumber}, Status: ${o.status}, Total: ${o.total}৳, Date: ${o.createdAt.toDateString()}`)
        .join("\n");
    }

    // ৩. এবার final context সহ AI কে পাঠাও
    let prompt = `User asked: "${message}"\n\n`;

    if (matchedProducts.length > 0) {
      const productText = matchedProducts
        .map(p => `Product: ${p.name}, Description: ${p.shortDescription}, Price: ${p.price}৳, Link: /product/${p.slug}`)
        .join("\n");
      prompt += `Matching products:\n${productText}\n\n`;
    }

    if (recentOrdersSummary) {
      prompt += `User's recent orders:\n${recentOrdersSummary}\n\n`;
    }

    prompt += `Please answer in Bangla politely and helpfully.`;

    const finalReply = await getGeminiResponse(prompt);

    res.json({ reply: finalReply });
  } catch (error) {
    console.error("Chatbot API error:", error);
    res.status(500).json({ reply: "সার্ভারে সমস্যা হয়েছে, পরে চেষ্টা করুন।" });
  }
});

module.exports = router;
