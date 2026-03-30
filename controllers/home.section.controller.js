import ContentBlock from "../models/content.block.model.js";
import Product from "../models/product.model.js";
import { Section } from "../models/home.section.model.js";

export const getSections = async (req, res) => {
  try {
    let sections = await Section.find();
    return res.json({ sections });
  } catch (err) {
    console.log("failed to fetch sections:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

export const getReferences = async (req, res) => {
  try {
    let { type } = req.params;
    let references = [];
    switch (type) {
      case "content-block":
        references = await ContentBlock.find().select("title");
        break;
      case "category":
        references = await Product.aggregate([
          { $group: { _id: "$category" } },
          {
            $lookup: {
              from: "categories",
              localField: "_id",
              foreignField: "_id",
              as: "category",
            },
          },
          { $unwind: "$category" },
          { $replaceRoot: { newRoot: "$category" } },
          {
            $sort: { createdAt: -1 },
          },
          {
            $project: {
              title: 1,
            },
          },
        ]);
        break;
      default:
        return;
    }
    return res.json({ references });
  } catch (error) {
    console.log("failed to fetch references:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const createSection = async (req, res) => {
  try {
    const { section_type } = req.body;
    switch (section_type) {
      case "hero_banner":
        break;
      case "mid_page_banners":
        break;
      case "product_listing":
        break;
      default:
        break;
    }

    return res.json({ message: "cooking..." });
  } catch (error) {
    console.log("failed to create section:", error.message);
    return res.status(500).json({ message: error.message });
  }
};
