import Category from "../models/categoryModel.js";

export const getCategoryById = async (req, res) => {
  const { id } = req.params;
  const { filter } = req.query;
  console.log("id", id);
  try {
    const category = await Category.findOne({ _id: id }).populate("parent");
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
        return res.status(200).json({ success: true, categories });
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
      default:
        break;
    }
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export async function createCategory(req, res) {
  try {
    const data = req.body;
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
