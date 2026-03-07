import Product from "../models/productModel.js";
import cloudinary from "../utils/cloudinary.js";

export const createProduct = async (req, res) => {
  try {
    let data = req.body;
    data.part_number = data.part_number.toUpperCase();
    data.oem_number = data.oem_number.toUpperCase();
    data.fitments = JSON.parse(data.fitments);
    let files = req.files;

    let cloudinary_results = await Promise.all(
      files.map((file) => {
        return new Promise((resolve, reject) => {
          let stream = cloudinary.uploader.upload_stream(
            { folder: "auto_products" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          );
          stream.end(file.buffer);
        });
      }),
    );
    let images = cloudinary_results.map((image) => image.secure_url);
    await Product.create({ ...data, images });
    res.json({ message: "product created" });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getProducts = async (req, res) => {
  try {
    let { filter, current_page, category } = req.query;
    switch (filter) {
      case "admin-products":
        let limit = 10;
        let total_products = await Product.find().countDocuments();
        let products = await Product.find()
          .populate("brand")
          .populate("category");
        return res.json({
          products,
          total_pages: Math.ceil(total_products / limit),
        });
      default:
        break;
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
