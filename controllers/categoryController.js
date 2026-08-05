import AttributeCollectionModel from "../models/attributes.model.js";
import Category from "../models/categoryModel.js";
import mongoose from "mongoose";

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
      category = await Category.findOne({ _id: id }).populate("parent");
    } else {
      category = await Category.findOne({ slug: new RegExp(`^${id}$`, "i") }).populate("parent");
    }
    switch (filter) {
      case "product-list":
        res.status(200).json({ success: true, category });
        break;
      default:
        let parents = [];
        if (category.level !== 1)
          parents = await Category.find({ level: category.level - 1 });

        res.status(200).json({ success: true, category, parents });
        break;
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
        categories = await Category.find().populate("parent");
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
    const data = req.body;
    
    // Auto-generate slug if not provided by the frontend.
    // This converts the title to lowercase, removes special characters, and replaces spaces with hyphens.
    if (data.title && !data.slug) {
      data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
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
    const data = req.body;
    await Category.updateOne({ _id: id }, { ...data });
    res
      .status(200)
      .json({ success: true, message: "Category successfully updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Deletes a category by its ID, preventing deletion if it is referenced as a parent by other categories.
 * @param {Object} req - Express request containing category ID in params.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response indicating success, failure, or a dependency conflict.
 */
export async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const childrens = await Category.findOne({
      parent: id,
    });
    if (childrens) {
      return res.status(200).json({
        delete: false,
        success: true,
        message:
          "This category cannot be deleted. This category is referenced by other categories",
      });
    }
    await Category.deleteOne({ _id: id });
    const categories = await Category.find().populate("parent");

    return res.status(200).json({
      categories,
      delete: true,
      success: true,
      message: "Category successfully deleted",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
