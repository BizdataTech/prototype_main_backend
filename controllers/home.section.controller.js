import ContentBlock from "../models/content.block.model.js";
import Category from "../models/categoryModel.js";
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
        references = await Category.find({ parent: { $eq: null } });
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
