import mongoose from "mongoose";
import ContentBlock from "../models/content.block.model.js";

/**
 * Retrieves a single content block with its associated products populated.
 * @param {Object} req - Express request containing content block ID in params.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response with the block data.
 */
export const getBlockData = async (req, res) => {
  try {
    let block = (
      await ContentBlock.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
        {
          $lookup: {
            from: "products",
            localField: "products",
            foreignField: "_id",
            as: "products",
          },
        },
        { $unwind: "$products" },
        {
          $addFields: {
            "products.image": { $arrayElemAt: ["$products.images", 0] },
          },
        },
        {
          $project: {
            title: 1,
            block_type: 1,
            category: 1,
            "products._id": 1,
            "products.product_title": 1,
            "products.image": "$products.image.url",
          },
        },
        {
          $group: {
            _id: "$_id",
            title: { $first: "$title" },
            block_type: { $first: "$block_type" },
            category: { $first: "$category" },
            products: { $push: "$products" },
          },
        },
      ])
    )[0];
    return res.json({ block });
  } catch (error) {
    console.log("failed to fetch content block data:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Retrieves all content blocks along with a count of products they contain.
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response with an array of block objects.
 */
export const getBlocks = async (req, res) => {
  try {
    let blocks = await ContentBlock.aggregate([
      {
        $project: {
          title: 1,
          block_type: 1,
          category: 1,
          products: { $size: "$products" },
        },
      },
    ]);
    return res.json({ blocks });
  } catch (error) {
    console.log("failed to fetch content blocks:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Creates a new content block.
 * @param {Object} req - Express request containing content block data in body.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response indicating success.
 */
export const createContentBlock = async (req, res) => {
  try {
    let data = req.body;
    await ContentBlock.create(data);
    return res.json({ message: "Content Block Created" });
  } catch (err) {
    console.log("failed to create content block:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Updates an existing content block.
 * @param {Object} req - Express request containing block ID in params and update payload in body.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response indicating success or failure.
 */
export const updateContentBlock = async (req, res) => {
  try {
    let { id } = req.params;
    let block = await ContentBlock.findOne({ _id: id });
    if (!block)
      return res.status(404).json({ message: "Contend Block Not Found" });
    await ContentBlock.updateOne({ _id: id }, { $set: req.body });
    return res.json({ message: "Content Block Updated" });
  } catch (error) {
    console.log("failed to update the content block:", error.message);
    return res.status(500).json({ message: error.message });
  }
};
