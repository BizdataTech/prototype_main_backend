import mongoose from "mongoose";
import Product from "../models/product.model.js";
import cloudinary from "../utils/cloudinary.js";

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

export const getProduct = async (req, res) => {
  try {
    let product = (
      await Product.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        {
          $lookup: {
            from: "brands",
            localField: "brand",
            foreignField: "_id",
            as: "brand",
          },
        },
        { $unwind: "$brand" },
        {
          $project: {
            product_title: 1,
            description: 1,
            price: 1,
            stock: 1,
            images: 1,
            attributes: 1,
            "category._id": 1,
            "category.title": 1,
            "brand._id": 1,
            "brand.brand_name": 1,
          },
        },
      ])
    )[0];
    return res.json({ product });
  } catch (error) {
    console.log("failed to get product data:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    let data = req.body;
    let files = req.files;

    // image uploading part
    let cloudinary_results = await Promise.all(
      files.map((file) => {
        return new Promise((resolve, reject) => {
          let stream = cloudinary.uploader.upload_stream(
            { folder: "prototype_products" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          );
          stream.end(file.buffer);
        });
      }),
    );
    let images = cloudinary_results.map((image) => ({
      url: image.secure_url,
      public_id: image.public_id,
    }));

    if (data.attributes) data.attributes = JSON.parse(data.attributes);

    await Product.create({ ...data, images });
    res.json({ message: "product created" });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    let data = req.body;
    let ids;

    if (data.cancelledPubliIds) {
      ids = JSON.parse(data.cancelledPubliIds || "[]");
      await Promise.all(
        ids.map((public_id) => cloudinary.uploader.destroy(public_id)),
      );
    }

    let newImages = [];
    if (req.files && req.files.length >= 1) {
      let cloudinary_results = await Promise.all(
        req.files.map((file) => {
          return new Promise((resolve, reject) => {
            let stream = cloudinary.uploader.upload_stream(
              { folder: "prototype_products" },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              },
            );
            stream.end(file.buffer);
          });
        }),
      );
      cloudinary_results.forEach(({ secure_url, public_id }) =>
        newImages.push({
          url: secure_url,
          public_id: public_id,
        }),
      );
    }

    let query = {};
    let id = req.params.id;

    if ((ids && ids.length) || newImages.length) {
      let filteredImages = (
        await Product.findOne({ _id: id }).select("images")
      ).images.filter((obj) => !(ids || []).includes(obj.public_id));
      query.images = [...filteredImages, ...newImages];
    }

    if (data.attributes) {
      data.attributes = JSON.parse(data.attributes);
      Object.entries(data.attributes).forEach(
        ([key, value]) => (query[`attributes.${key}`] = value),
      );
      delete data.attributes;
    }

    Object.entries(data).forEach(([key, value]) => (query[key] = value));
    console.log("query:", query);

    await Product.updateOne({ _id: req.params.id }, { $set: query });

    return res.json({ message: "Product Updated" });
  } catch (error) {
    console.log("failed to update product:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await Product.deleteOne({ _id: req.params.id });
    return res.json({ message: "Product Deleted" });
  } catch (error) {
    console.log("failed to delete product:", error.message);
    return res.status(500).json({ message: error.message });
  }
};
