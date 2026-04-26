const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

/**
 * Resizes and compresses an image to stay under 1MB if possible
 * @param {string} filePath - Path to the original file
 * @returns {Promise<string>} - Path to the processed file
 */
const processImage = async (filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath, ext);
    const dir = path.dirname(filePath);
    const outPath = path.join(dir, `processed-${fileName}.webp`);

    // We convert to webp as it has better compression
    await sharp(filePath)
      .resize(1200, 1200, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(outPath);

    // Delete the original file to save space
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Return the relative path for database storage
    return `/uploads/${path.basename(outPath)}`;
  } catch (error) {
    console.error("Image processing error:", error);
    // If processing fails, return original path (relative to uploads)
    return `/uploads/${path.basename(filePath)}`;
  }
};

module.exports = { processImage };
