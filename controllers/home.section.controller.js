import ContentBlock from "../models/content.block.model.js";
import Product from "../models/product.model.js";
import Category from "../models/categoryModel.js";
import { HeroBanner, Section } from "../models/home.section.model.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";

/**
 * Retrieves all section types defined in the database.
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response with the sections.
 */
export const getSections = async (req, res) => {
  try {
    let sections = await Section.find().select("section_type");
    return res.json({ sections });
  } catch (err) {
    console.log("failed to fetch sections:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Retrieves reference items depending on the given section type (e.g., content-block or category).
 * @param {Object} req - Express request containing the section type in params.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response with the references list.
 */
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

/**
 * Creates a new home section (like hero_banner). Uploads image files to Cloudinary and saves configuration.
 * @param {Object} req - Express request containing section data in body and files in files.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response indicating success or failure.
 */
export const createSection = async (req, res) => {
  try {
    const { section_type } = req.body;
    switch (section_type) {
      case "hero_banner":
        // for Home Banner creation, in the document schema, i have given 'array' data type for the banners whether the bannery type chosen from the frontend is single or carousel.

        let uploadedFiles = await Promise.allSettled(
          req.files.map((file) =>
            uploadToCloudinary(file.buffer, "hero_banners"),
          ),
        );
        let fileData = uploadedFiles
          .filter((result) => result.status === "fulfilled")
          .map((result) => ({
            url: result.value.secure_url,
            public_id: result.value.public_id,
          }));

        let slugs = await Promise.all(
          req.body.banners.map((obj) => getSlugs(obj.type, obj.id)),
        );

        let banners = [];

        req.body.banners.forEach((obj, i) => {
          let data = {};
          data.image = fileData[i];
          data.redirection = obj.redirection === "true";
          if (data.redirection) {
            let reference = {};
            reference.type = obj.type;
            reference.slug = slugs[i];
            reference.id = obj.id;
            data.reference = reference;
          }
          banners.push(data);
        });

        let { section_type, banner_type } = req.body;
        await HeroBanner.create({ section_type, banner_type, banners });
        return res.status(201).json({ message: "Hero Banner Section Created" });
      case "mid_page_banners":
        break;
      case "product_listing":
        break;
      default:
        break;
    }
  } catch (error) {
    console.log("failed to create section:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

const getSlugs = async (type, id) => {
  let slug = "";
  switch (type) {
    case "content-block":
      let block = await ContentBlock.findOne({ _id: id }).select("title");
      slug = block.title.toLowerCase().replace(/\s+/g, "_");
      break;
    case "category":
      let category = await Category.findOne({ _id: id }).select("title");
      slug = category.title.toLowerCase().replace(/\s+/g, "_");
      break;
    default:
      break;
  }
  console.log("slug:", slug);
  return slug;
};
