import AttributeCollectionModel from "../models/attributes.model.js";
import Category from "../models/categoryModel.js";
import Product from "../models/product.model.js";
import ContentBlock from "../models/content.block.model.js";
import { Section } from "../models/home.section.model.js";
import mongoose from "mongoose";
import cloudinary from "../utils/cloudinary.js";
import Wishlist from "../models/wishlistModel.js";
import Cart from "../models/cartModel.js";

/**
 * Helper to dynamically populate representative images for categories from products on the site
 * whenever a category's image field is not explicitly configured.
 */
async function populateCategoryImages(categories) {
  if (!categories || !categories.length) return categories;

  const needsImage = categories.some((c) => !c.image || (typeof c.image === "string" && !c.image.trim()));
  if (!needsImage) return categories;

  try {
    const allCategories = await Category.find({}, { _id: 1, parent: 1 }).lean();
    const prodsWithImages = await Product.find(
      { "images.0": { $exists: true } },
      { category: 1, images: { $slice: 1 } }
    ).lean();

    const catImageMap = new Map();
    for (const p of prodsWithImages) {
      if (p.category && p.images?.[0]?.url) {
        const catIdStr = p.category.toString();
        if (!catImageMap.has(catIdStr)) {
          catImageMap.set(catIdStr, p.images[0].url);
        }
      }
    }

    for (let c of categories) {
      const rawImage = typeof c.image === "object" && c.image !== null ? c.image.url : c.image;
      if (!rawImage || (typeof rawImage === "string" && !rawImage.trim())) {
        const cIdStr = c._id ? c._id.toString() : "";
        if (catImageMap.has(cIdStr)) {
          c.image = catImageMap.get(cIdStr);
        } else {
          // Check child categories
          const childCats = allCategories.filter(
            (child) => child.parent && child.parent.toString() === cIdStr
          );
          for (const child of childCats) {
            const childIdStr = child._id.toString();
            if (catImageMap.has(childIdStr)) {
              c.image = catImageMap.get(childIdStr);
              break;
            }
          }

          // If still no image and it has a parent, check parent's image
          if (!c.image) {
            const parentId = c.parent?._id || c.parent;
            if (parentId) {
              const pStr = parentId.toString();
              const parentCat = categories.find((cat) => cat._id?.toString() === pStr);
              if (parentCat?.image) {
                c.image = parentCat.image;
              } else if (catImageMap.has(pStr)) {
                c.image = catImageMap.get(pStr);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to populate category images from products:", err.message);
  }
  return categories;
}

/**
 * Retrieves a single category by its ID. Can return differently depending on filter type.
 * @param {Object} req - Express request containing the category ID in params and filter in query.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response with the category data.
 */
export const getCategoryById = async (req, res) => {
  const { id } = req.params;
  const { filter } = req.query;
  console.log("id", id);
  try {
    let category;
    if (mongoose.Types.ObjectId.isValid(id)) {
      category = await Category.findOne({ _id: id }).populate("parent").lean();
    } else {
      category = await Category.findOne({ slug: new RegExp(`^${id}$`, "i") }).populate("parent").lean();
    }
    if (!category) {
      return res.status(404).json({ success: false, category: null, message: "Category not found" });
    }
    await populateCategoryImages([category]);
    switch (filter) {
      case "product-list":
        return res.status(200).json({ success: true, category });
      default:
        let parents = [];
        if (category.level !== 1)
          parents = await Category.find({ level: category.level - 1 });

        return res.status(200).json({ success: true, category, parents });
    }
  } catch (error) {
    console.error(
      "error when trying to fetch the category by id.",
      error.message,
    );
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Retrieves a list of categories based on various filter criteria like 'all', 'product-category', 'parent', 'level', etc.
 * @param {Object} req - Express request containing filter and current_page in query.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response with the list of categories.
 */
export const getCategories = async (req, res) => {
  try {
    const { filter, current_page } = req.query;
    let limit = 12;
    let categories = [];
    switch (filter) {
      case "all":
        categories = await Category.find().populate("parent").lean();
        await populateCategoryImages(categories);
        let total_categories = await Category.find().countDocuments();
        return res.json({
          categories,
          total_pages: Math.ceil(total_categories / limit),
        });
      case "product-category":
        categories = await Category.find().populate("parent");
        let result = await Category.aggregate([
          {
            $lookup: {
              from: "categories",
              localField: "parent",
              foreignField: "_id",
              as: "parent",
            },
          },
          {
            $unwind: {
              path: "$parent",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              __v: 0,
              isDeleted: 0,
              isNavItem: 0,
              attribute_collection: 0,
              "parent.__v": 0,
              "parent.isDeleted": 0,
              "parent.isNavItem": 0,
              "parent.attribute_collection": 0,
            },
          },
        ]);
        return res
          .status(200)
          .json({ success: true, categories: result, result: result });
      case "parent":
        const level = parseInt(req.query.level);
        let parentCategories = [];
        if (level !== 1) {
          parentCategories = await Category.find({ level: level - 1 });
        }
        return res.status(200).json({ success: true, parentCategories });
      case "level":
        categories = await Category.find().populate("parent");
        const getLevelsCount = (categories, currentLevel = 1, levels = [1]) => {
          const matchingLevel = categories.find(
            (category) => category.level === currentLevel,
          );
          if (matchingLevel) {
            levels.push(currentLevel + 1);
            return getLevelsCount(categories, currentLevel + 1, levels);
          } else return levels;
        };
        const levels = getLevelsCount(categories);
        return res.status(200).json({ success: true, levels });
      case "title":
        const { title, actual_title } = req.query;
        let matchingCategory = null;
        if (title !== actual_title) {
          matchingCategory = await Category.findOne({ title });
        }
        console.log("mathcing category:", matchingCategory);
        return res.status(200).json({ success: true, matchingCategory });

      case "section-block":
        categories = await Category.aggregate([
          { $match: { isDeleted: false } },
          {
            $project: {
              title: 1,
              level: 1,
              parent: 1,
            },
          },
        ]);
        return res.json({ categories });
      default:
        break;
    }
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Retrieves the attribute collection associated with a specific category.
 * @param {Object} req - Express request containing the category ID in params.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response with the attributes of the category.
 */
export const getCategoryAttributeCollection = async (req, res) => {
  try {
    let attributeCollectionId = (
      await Category.findOne({
        _id: req.params.id,
      }).select("attribute_collection")
    ).attribute_collection;

    let doc = await AttributeCollectionModel.findOne({
      _id: attributeCollectionId,
    });

    let attributes = doc ? doc.attributes : [];
    return res.json({ attributes });
  } catch (error) {
    console.log(
      "failed to fetch attribute collection of the category:",
      error.message,
    );
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Retrieves the variants associated with a specific category.
 * @param {Object} req - Express request containing the category ID in params.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response with the variants of the category.
 */
export const getCategoryVariants = async (req, res) => {
  try {
    let category = await Category.findOne({ _id: req.params.id }).populate("variants");
    if (!category) return res.status(404).json({ message: "Category not found" });
    
    return res.json({ variants: category.variants || [] });
  } catch (error) {
    console.log("failed to fetch variants of the category:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Creates a new category.
 * @param {Object} req - Express request containing category data in body.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response indicating success or failure.
 */
export async function createCategory(req, res) {
  try {
    const data = { ...req.body };
    
    // Auto-generate slug if not provided by the frontend.
    // This converts the title to lowercase, removes special characters, and replaces spaces with hyphens.
    if (data.title && !data.slug) {
      data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }

    // Handle image file upload to Cloudinary
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "prototype_categories" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      data.image = uploadResult.secure_url;
    }

    if (data.variants && typeof data.variants === "string") {
      try {
        data.variants = JSON.parse(data.variants);
      } catch (e) {}
    }

    console.log("data:", data);
    const newCategory = await Category.create(data);
    res
      .status(200)
      .json({ message: "Category successfully created", data: newCategory });
  } catch (error) {
    console.log("error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Updates an existing category by its ID.
 * @param {Object} req - Express request containing category ID in params and update data in body.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response indicating success or failure.
 */
export async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    // Handle image file upload to Cloudinary
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "prototype_categories" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      data.image = uploadResult.secure_url;
    }

    if (data.variants && typeof data.variants === "string") {
      try {
        data.variants = JSON.parse(data.variants);
      } catch (e) {}
    }

    await Category.updateOne({ _id: id }, { ...data });
    res
      .status(200)
      .json({ success: true, message: "Category successfully updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Recursively retrieves all descendant category IDs (subcategories, sub-subcategories, etc.)
 * starting from an array of root category IDs.
 * @param {Array<string|mongoose.Types.ObjectId>} rootIds
 * @returns {Promise<Array<mongoose.Types.ObjectId>>} All unique category IDs including roots and all descendants.
 */
async function getAllCategoryAndDescendantIds(rootIds) {
  const allIds = new Set(rootIds.map((id) => id.toString()));
  let currentParentIds = [...allIds];

  while (currentParentIds.length > 0) {
    const children = await Category.find(
      { parent: { $in: currentParentIds } },
      { _id: 1 }
    ).lean();

    const nextParentIds = [];
    for (const child of children) {
      const childIdStr = child._id.toString();
      if (!allIds.has(childIdStr)) {
        allIds.add(childIdStr);
        nextParentIds.push(child._id);
      }
    }
    currentParentIds = nextParentIds;
  }

  return Array.from(allIds).map((id) => new mongoose.Types.ObjectId(id));
}

/**
 * Deletes a category and all of its subcategories (cascading),
 * and cleans up any references in products, content blocks, and sections.
 * @param {Object} req - Express request containing category ID in params.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response indicating success, failure, or deleted count.
 */
export async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid category ID" });
    }

    // Recursively collect the category and all its descendant subcategories
    const allIds = await getAllCategoryAndDescendantIds([id]);

    // ── 1. Cascade delete products belonging to this category and all its subcategories ──
    const productsToDelete = await Product.find({ category: { $in: allIds } });
    if (productsToDelete.length > 0) {
      const prodIds = productsToDelete.map((p) => p._id);
      
      let allPublicIds = [];
      for (const p of productsToDelete) {
        if (p.images && p.images.length > 0) {
          allPublicIds.push(...p.images.map((img) => img.public_id).filter(Boolean));
        }
        if (p.variants && p.variants.length > 0) {
          allPublicIds.push(...p.variants.map((v) => v.image?.public_id).filter(Boolean));
        }
      }
      if (allPublicIds.length > 0) {
        await Promise.allSettled(allPublicIds.map((pid) => cloudinary.uploader.destroy(pid)));
      }

      await Product.deleteMany({ _id: { $in: prodIds } });

      await Wishlist.updateMany(
        { "items.productId": { $in: prodIds } },
        { $pull: { items: { productId: { $in: prodIds } } } }
      );

      const stringProdIds = prodIds.map((i) => i.toString());
      const carts = await Cart.find({ "items.productId": { $in: prodIds } });
      for (const cart of carts) {
        cart.items = cart.items.filter(
          (item) => item.productId && !stringProdIds.includes(item.productId.toString())
        );
        cart.cartTotal = cart.items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
        await cart.save();
      }

      await ContentBlock.updateMany(
        { products: { $in: prodIds } },
        { $pull: { products: { $in: prodIds } } }
      );
    }

    // ── 2. Delete categories and all their subcategories from database ──
    await Category.deleteMany({ _id: { $in: allIds } });

    // ── 3. Clean up category references in ContentBlocks and Sections ──
    await ContentBlock.updateMany(
      { category: { $in: allIds } },
      { $unset: { category: 1 } }
    );
    await Section.updateMany(
      { "reference.id": { $in: allIds } },
      { $unset: { reference: 1 } }
    );
    await Section.updateMany(
      { "banners.reference.id": { $in: allIds } },
      { $unset: { "banners.$[].reference": 1 } }
    );

    const categories = await Category.find().populate("parent");
    const subCount = allIds.length - 1;
    const message =
      subCount > 0
        ? `Category and ${subCount} subcategory(ies) successfully deleted`
        : "Category successfully deleted";

    return res.status(200).json({
      categories,
      delete: true,
      success: true,
      deletedCount: allIds.length,
      deletedIds: allIds.map((i) => i.toString()),
      deletedProductsCount: productsToDelete.length,
      message,
    });
  } catch (error) {
    console.error("error when deleting category:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Bulk deletes categories by an array of category IDs, including all their descendant subcategories,
 * and cleans up references across products, content blocks, and home sections.
 * @param {Object} req - Express request containing { ids: Array<string> } in body.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response indicating success or error.
 */
export async function bulkDeleteCategories(req, res) {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No category IDs provided for deletion",
      });
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid category IDs provided",
      });
    }

    // Recursively collect all selected categories and all their descendant subcategories
    const allIds = await getAllCategoryAndDescendantIds(validIds);

    // ── 1. Cascade delete products belonging to these categories ──
    const productsToDelete = await Product.find({ category: { $in: allIds } });
    if (productsToDelete.length > 0) {
      const prodIds = productsToDelete.map((p) => p._id);

      let allPublicIds = [];
      for (const p of productsToDelete) {
        if (p.images && p.images.length > 0) {
          allPublicIds.push(...p.images.map((img) => img.public_id).filter(Boolean));
        }
        if (p.variants && p.variants.length > 0) {
          allPublicIds.push(...p.variants.map((v) => v.image?.public_id).filter(Boolean));
        }
      }
      if (allPublicIds.length > 0) {
        await Promise.allSettled(allPublicIds.map((pid) => cloudinary.uploader.destroy(pid)));
      }

      await Product.deleteMany({ _id: { $in: prodIds } });

      await Wishlist.updateMany(
        { "items.productId": { $in: prodIds } },
        { $pull: { items: { productId: { $in: prodIds } } } }
      );

      const stringProdIds = prodIds.map((i) => i.toString());
      const carts = await Cart.find({ "items.productId": { $in: prodIds } });
      for (const cart of carts) {
        cart.items = cart.items.filter(
          (item) => item.productId && !stringProdIds.includes(item.productId.toString())
        );
        cart.cartTotal = cart.items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
        await cart.save();
      }

      await ContentBlock.updateMany(
        { products: { $in: prodIds } },
        { $pull: { products: { $in: prodIds } } }
      );
    }

    // ── 2. Delete categories and all their subcategories ──
    await Category.deleteMany({ _id: { $in: allIds } });

    // ── 3. Clean up category references in ContentBlocks and Sections ──
    await ContentBlock.updateMany(
      { category: { $in: allIds } },
      { $unset: { category: 1 } }
    );
    await Section.updateMany(
      { "reference.id": { $in: allIds } },
      { $unset: { reference: 1 } }
    );
    await Section.updateMany(
      { "banners.reference.id": { $in: allIds } },
      { $unset: { "banners.$[].reference": 1 } }
    );

    const categories = await Category.find().populate("parent");
    const subCount = allIds.length - validIds.length;
    const message =
      subCount > 0
        ? `${validIds.length} category(ies) and ${subCount} subcategory(ies) successfully deleted`
        : `${validIds.length} category(ies) successfully deleted`;

    return res.status(200).json({
      delete: true,
      success: true,
      categories,
      deletedCount: allIds.length,
      deletedIds: allIds.map((i) => i.toString()),
      deletedProductsCount: productsToDelete.length,
      message,
    });
  } catch (error) {
    console.error("error when trying to bulk delete categories:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
