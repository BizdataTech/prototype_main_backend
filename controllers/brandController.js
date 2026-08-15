/**
 * Brand Controller
 * Handles CRUD operations for product brands, including uploading logo images to Cloudinary.
 */

import Brand from "../models/brand.model.js";
import cloudinary from "../utils/cloudinary.js";

/**
 * Creates a new brand with a logo image.
 * Uploads the image to Cloudinary and saves the brand information in the database.
 * 
 * @param {Object} req - Express request object containing brand_name in body and file in req
 * @param {Object} res - Express response object
 */
export const createBrand = async (req, res) => {
  try {
    let { brand_name } = req.body;
    let file = req.file;

    // Validate request inputs
    if (!brand_name.trim() || !file) {
      return res.status(400).json({ message: "Brand Name and Image required" });
    }

    // Upload the brand logo image stream to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "prototype_brands" },
        (error, result) => {
          if (error) reject(error);
          resolve(result);
        },
      );
      stream.end(file.buffer);
    });

    // Create the brand record in the database
    await Brand.create({
      brand_name,
      image: { url: result.secure_url, public_id: result.public_id },
    });

    return res.json({ message: "Brand Created" });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Retrieves all brands from the database.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getBrands = async (req, res) => {
  try {
    let brands = await Brand.find();
    res.json({ brands });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Retrieves a single brand by its ID.
 * 
 * @param {Object} req - Express request object containing brand ID in params
 * @param {Object} res - Express response object
 */
export const getBrand = async (req, res) => {
  try {
    let brand = await Brand.findById(req.params.id).select(
      "brand_name image.url",
    );
    return res.json({ brand });
  } catch (error) {
    console.log("faled to fetch brand:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Updates an existing brand's name and/or logo image.
 * If a new image is provided, deletes the old one from Cloudinary and uploads the new one.
 * 
 * @param {Object} req - Express request object containing brand ID in params and update payload in body
 * @param {Object} res - Express response object
 */
export const updateBrand = async (req, res) => {
  try {
    let { id } = req.params;
    let brand = await Brand.findById(id);
    if (!brand) return res.status(404).json({ message: "Brand Not Found" });

    let result;
    // If a new logo file is uploaded, replace the old one on Cloudinary
    if (req.file) {
      await cloudinary.uploader.destroy(brand.image.url);
      result = await new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
          { folder: "prototype_brands" },
          (error, result) => {
            if (error) reject(error);
            resolve(result);
          },
        );
        stream.end(req.file.buffer);
      });
    }

    let query = { ...req.body };
    if (result) {
      query.image = { url: result.secure_url, public_id: result.public_id };
    }

    // Apply the updates to the brand
    await Brand.updateOne({ _id: id }, { $set: query });
    return res.json({ message: "Brand Updated" });
  } catch (error) {
    console.log("failed to update brand:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Deletes a brand from the database and removes its logo image from Cloudinary.
 * 
 * @param {Object} req - Express request object containing brand ID in params
 * @param {Object} res - Express response object
 */
export const deleteBrand = async (req, res) => {
  try {
    let { id } = req.params;
    let brand = await Brand.findById(id);
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    // Clean up image from Cloudinary
    await cloudinary.uploader.destroy(brand.image.public_id);
    
    // Delete the brand document
    await Brand.findByIdAndDelete(id);
    return res.json({ message: "Brand Deleted" });
  } catch (error) {
    console.log("failed to delete brand:", error.message);
    res.status(500).json({ message: error.message });
  }
};
