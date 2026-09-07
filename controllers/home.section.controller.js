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
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
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

const parseBannersFromBody = (body, files = []) => {
  let bannersBody = [];
  if (Array.isArray(body.banners)) {
    bannersBody = [...body.banners];
  } else if (body.banners && typeof body.banners === "object") {
    const keys = Object.keys(body.banners).sort((a, b) => parseInt(a) - parseInt(b));
    keys.forEach(k => {
      const idx = parseInt(k);
      bannersBody[idx] = body.banners[k];
    });
  } else {
    Object.keys(body).forEach(key => {
      let match = key.match(/^banners\[(\d+)\]\[([^\]]+)\]$/);
      if (match) {
        let index = parseInt(match[1]);
        let field = match[2];
        if (!bannersBody[index]) bannersBody[index] = {};
        bannersBody[index][field] = body[key];
      }
    });
  }

  (files || []).forEach(file => {
    let match = file.fieldname?.match(/^banners\[(\d+)\]/);
    if (match) {
      let index = parseInt(match[1]);
      if (!bannersBody[index]) bannersBody[index] = {};
    }
  });

  return bannersBody;
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
      case "mid_page_banner":
        let bannersBody = parseBannersFromBody(req.body, req.files);

        // Map uploaded files by their banner index (from fieldname: banners[0][image])
        let fileMap = {};
        (req.files || []).forEach(file => {
          let match = file.fieldname?.match(/^banners\[(\d+)\]/);
          if (match) fileMap[parseInt(match[1])] = file;
        });

        // Upload images to Cloudinary, keyed by banner index
        let uploadedMap = {};
        await Promise.all(
          Object.entries(fileMap).map(async ([index, file]) => {
            try {
              const result = await uploadToCloudinary(file.buffer, "hero_banners");
              uploadedMap[parseInt(index)] = { url: `${result.secure_url}?t=${Date.now()}`, public_id: result.public_id };
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
            } else if (obj.existing_image_url || obj.existingImageUrl) {
              data.image = {
                url: obj.existing_image_url || obj.existingImageUrl,
                public_id: obj.existing_public_id || obj.existingPublicId || "",
              };
            }
            data.heading = obj.heading || "";
            data.subtitle = obj.subtitle || "";
            data.button_text = obj.button_text || "";
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
          .filter(b => b && b.image?.url);

        let { banner_type } = req.body;
        let count = await Section.countDocuments();

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
      slug = block?.title ? block.title.toLowerCase().replace(/\s+/g, "_") : "";
      break;
    case "category":
      let category = await Category.findOne({ _id: id }).select("title");
      slug = category?.title ? category.title.toLowerCase().replace(/\s+/g, "_") : "";
      break;
    default:
      break;
  }
  return slug;
};

export const updateSection = async (req, res) => {
  try {
    let { id } = req.params;
    let updateData = { ...req.body };
    if (typeof updateData.reference === "string") {
      try {
        updateData.reference = JSON.parse(updateData.reference);
      } catch (e) {}
    }
    await Section.findByIdAndUpdate(id, updateData, { new: true, strict: false });
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

    let bannersBody = parseBannersFromBody(req.body, req.files);

    // Map uploaded files by fieldname index
    let fileMap = {};
    (req.files || []).forEach(file => {
      let match = file.fieldname?.match(/^banners\[(\d+)\]/);
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
          data.image = { url: `${uploaded.secure_url}?t=${Date.now()}`, public_id: uploaded.public_id };
        } else if (obj.existing_image_url || obj.existingImageUrl) {
          // Keep existing
          const url = obj.existing_image_url || obj.existingImageUrl;
          const public_id = obj.existing_public_id || obj.existingPublicId || "";
          data.image = { url, public_id };
        }
        data.heading = obj.heading || "";
        data.subtitle = obj.subtitle || "";
        data.button_text = obj.button_text || "";
        data.redirection = obj.redirection === "true" || obj.redirection === true;
        if (data.redirection && obj.id) {
          const slug = obj.id ? await getSlugs(obj.type, obj.id).catch(() => "") : "";
          data.reference = { type: obj.type, slug, id: obj.id };
        }
        return data;
      })
    );
    banners = banners.filter(b => b && b.image?.url);

    // Delete Cloudinary images that were replaced or removed
    const oldPublicIds = (section.banners || []).map(b => b.image?.public_id).filter(Boolean);
    const newPublicIds = banners.map(b => b.image?.public_id).filter(Boolean);
    const toDelete = oldPublicIds.filter(pid => !newPublicIds.includes(pid));
    if (toDelete.length > 0) {
      await Promise.allSettled(toDelete.map(pid => deleteFromCloudinary(pid)));
    }

    const { banner_type } = req.body;
    await Section.findByIdAndUpdate(id, { banner_type, banners }, { new: true, strict: false });
    return res.json({ message: "Section updated successfully" });
  } catch (error) {
    console.log("failed to update banners:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const deleteSingleBanner = async (req, res) => {
  try {
    let { id, index } = req.params;
    let idx = parseInt(index);
    let section = await Section.findById(id);
    if (!section) return res.status(404).json({ message: "Section not found" });

    if (!section.banners || idx < 0 || idx >= section.banners.length) {
      return res.status(400).json({ message: "Invalid banner index" });
    }

    let targetBanner = section.banners[idx];
    if (targetBanner?.image?.public_id) {
      await deleteFromCloudinary(targetBanner.image.public_id).catch((err) => {
        console.log("Cloudinary single banner delete error:", err.message);
      });
    }

    section.banners.splice(idx, 1);
    await section.save();

    return res.json({ message: "Banner deleted successfully", banners: section.banners });
  } catch (error) {
    console.log("failed to delete single banner:", error.message);
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
