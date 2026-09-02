import ContentBlock from "../models/content.block.model.js";
import Product from "../models/product.model.js";
import Category from "../models/categoryModel.js";
import { HeroBanner, MidPageBanner, ProductListing, Section } from "../models/home.section.model.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import deleteFromCloudinary from "../utils/deleteFromCloudinary.js";

/**
 * Retrieves all section types defined in the database.
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response with the sections.
 */
export const getSections = async (req, res) => {
  try {
    // Don't populate reference.id — keep it as raw ObjectId string
    // so the frontend can use it directly to call /api/content-blocks/:id
    let sections = await Section.find().sort("order");
    return res.json({ sections });
  } catch (err) {
    console.log("failed to fetch sections:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

export const getSection = async (req, res) => {
  try {
    let { id } = req.params;
    let section = await Section.findById(id);
    if (!section) return res.status(404).json({ message: "Section not found" });
    return res.json({ section });
  } catch (err) {
    console.log("failed to fetch section:", err.message);
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

    // DEBUG: Log exactly what multer received
    console.log("=== createSection DEBUG ===");
    console.log("section_type:", section_type);
    console.log("req.body keys:", Object.keys(req.body));
    console.log("req.files count:", req.files?.length);
    if (req.files) {
      req.files.forEach((f, i) => console.log(`  file[${i}]: fieldname=${f.fieldname}, size=${f.size}, mimetype=${f.mimetype}`));
    }
    console.log("req.body:", JSON.stringify(req.body, null, 2));
    console.log("=== END DEBUG ===");
    switch (section_type) {
      case "hero_banner":
      case "mid_page_banner":
        // Multer v2 auto-parses banners[0][heading] into req.body.banners as a nested array.
        // Handle both: already-parsed array OR flat keys (banners[0][field]).
        let bannersBody = [];
        if (Array.isArray(req.body.banners)) {
          // Multer v2: already parsed into array of objects
          bannersBody = req.body.banners;
        } else {
          // Fallback: flat keys like banners[0][heading]
          Object.keys(req.body).forEach(key => {
            let match = key.match(/^banners\[(\d+)\]\[([^\]]+)\]$/);
            if (match) {
              let index = parseInt(match[1]);
              let field = match[2];
              if (!bannersBody[index]) bannersBody[index] = {};
              bannersBody[index][field] = req.body[key];
            }
          });
        }

        console.log("Parsed bannersBody:", JSON.stringify(bannersBody, null, 2));

        // Map uploaded files by their banner index (from fieldname: banners[0][image])
        let fileMap = {};
        (req.files || []).forEach(file => {
          let match = file.fieldname.match(/^banners\[(\d+)\]/);
          if (match) fileMap[parseInt(match[1])] = file;
        });

        // Upload images to Cloudinary, keyed by banner index
        let uploadedMap = {};
        await Promise.all(
          Object.entries(fileMap).map(async ([index, file]) => {
            try {
              const result = await uploadToCloudinary(file.buffer, "hero_banners");
              uploadedMap[index] = { url: result.secure_url, public_id: result.public_id };
            } catch (err) {
              console.log(`Failed to upload banner[${index}] image:`, err.message);
            }
          })
        );

        // Fetch slugs for banners with redirection
        let slugs = await Promise.all(
          bannersBody.map((obj) => {
            if (obj && (obj.redirection === "true" || obj.redirection === true) && obj.id) {
              return getSlugs(obj.type, obj.id);
            }
            return Promise.resolve("");
          }),
        );

        // Build the banners array
        let banners = bannersBody
          .map((obj, i) => {
            if (!obj) return null;
            let data = {};
            if (uploadedMap[i]) {
              data.image = uploadedMap[i];
            }
            if (obj.heading) data.heading = obj.heading;
            if (obj.subtitle) data.subtitle = obj.subtitle;
            if (obj.button_text) data.button_text = obj.button_text;
            data.redirection = obj.redirection === "true" || obj.redirection === true;
            if (data.redirection && obj.id) {
              data.reference = {
                type: obj.type,
                slug: slugs[i],
                id: obj.id,
              };
            }
            return data;
          })
          .filter(Boolean);

        let { banner_type } = req.body;
        let count = await Section.countDocuments();

        console.log("Creating section:", section_type, "banners:", JSON.stringify(banners, null, 2));

        if (section_type === "mid_page_banner") {
          await MidPageBanner.create({ section_type: "mid_page_banner", banner_type, banners, order: count });
          return res.status(201).json({ message: "Promotional Banner Section Created" });
        }
        await HeroBanner.create({ section_type: "hero_banner", banner_type, banners, order: count });
        return res.status(201).json({ message: "Hero Banner Section Created" });
      case "product_listing":
        let pl_count = await Section.countDocuments();
        let { title, limit, layout, reference } = req.body;
        await ProductListing.create({ section_type: "product_listing", title, limit, layout, reference: JSON.parse(reference), order: pl_count });
        return res.status(201).json({ message: "Product Listing Section Created" });
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

export const updateSection = async (req, res) => {
  try {
    let { id } = req.params;
    await Section.findByIdAndUpdate(id, req.body);
    return res.json({ message: "Section updated successfully" });
  } catch (error) {
    console.log("failed to update section:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Updates the full banners array of a banner section, uploading new images and removing old ones.
 */
export const updateBanners = async (req, res) => {
  try {
    let { id } = req.params;
    let section = await Section.findById(id);
    if (!section) return res.status(404).json({ message: "Section not found" });

    // Parse banners from formData — handle Multer v2 auto-parsed array
    let bannersBody = [];
    if (Array.isArray(req.body.banners)) {
      bannersBody = req.body.banners;
    } else {
      Object.keys(req.body).forEach(key => {
        let match = key.match(/^banners\[(\d+)\]\[([^\]]+)\]$/);
        if (match) {
          let index = parseInt(match[1]);
          let field = match[2];
          if (!bannersBody[index]) bannersBody[index] = {};
          bannersBody[index][field] = req.body[key];
        }
      });
    }

    // Map uploaded files by fieldname index
    let fileMap = {};
    (req.files || []).forEach(file => {
      let match = file.fieldname.match(/^banners\[(\d+)\]/);
      if (match) fileMap[parseInt(match[1])] = file;
    });

    // Upload new images
    let banners = await Promise.all(
      bannersBody.map(async (obj, i) => {
        if (!obj) return null;
        let data = {};
        if (fileMap[i]) {
          // New file — upload it
          const uploaded = await uploadToCloudinary(fileMap[i].buffer, "hero_banners");
          data.image = { url: uploaded.secure_url, public_id: uploaded.public_id };
        } else if (obj.existing_image_url) {
          // Keep existing
          data.image = { url: obj.existing_image_url, public_id: obj.existing_public_id || "" };
        }
        if (obj.heading) data.heading = obj.heading;
        if (obj.subtitle) data.subtitle = obj.subtitle;
        if (obj.button_text) data.button_text = obj.button_text;
        data.redirection = obj.redirection === "true" || obj.redirection === true;
        if (data.redirection && obj.id) {
          const slug = obj.id ? await getSlugs(obj.type, obj.id).catch(() => "") : "";
          data.reference = { type: obj.type, slug, id: obj.id };
        }
        return data;
      })
    );

    // Delete Cloudinary images that were removed
    const oldPublicIds = (section.banners || []).map(b => b.image?.public_id).filter(Boolean);
    const newPublicIds = banners.map(b => b.image?.public_id).filter(Boolean);
    const toDelete = oldPublicIds.filter(pid => !newPublicIds.includes(pid));
    await Promise.allSettled(toDelete.map(pid => deleteFromCloudinary(pid)));

    const { banner_type } = req.body;
    await Section.findByIdAndUpdate(id, { banner_type, banners });
    return res.json({ message: "Section updated successfully" });
  } catch (error) {
    console.log("failed to update banners:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const deleteSection = async (req, res) => {
  try {
    let { id } = req.params;
    // Fetch section first so we can delete Cloudinary images
    let section = await Section.findById(id);
    if (!section) return res.status(404).json({ message: "Section not found" });

    // Delete all banner images from Cloudinary
    if (section.banners && section.banners.length > 0) {
      await Promise.allSettled(
        section.banners
          .filter(b => b.image?.public_id)
          .map(b => deleteFromCloudinary(b.image.public_id))
      );
    }

    await Section.findByIdAndDelete(id);
    return res.json({ message: "Section deleted successfully" });
  } catch (error) {
    console.log("failed to delete section:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const reorderSections = async (req, res) => {
  try {
    let { orderedIds } = req.body; // Array of section IDs in the new order
    if (!orderedIds || !Array.isArray(orderedIds)) {
      return res.status(400).json({ message: "Invalid order data provided" });
    }
    
    let bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { order: index },
      }
    }));
    
    await Section.bulkWrite(bulkOps);
    return res.json({ message: "Sections reordered successfully" });
  } catch (error) {
    console.log("failed to reorder sections:", error.message);
    return res.status(500).json({ message: error.message });
  }
};
