import Variant from "../models/variants.model.js";

/**
 * Creates a new product variant.
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} 
 */
export const createVariant = async (req, res) => {
  try {
    const { title, color, values } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Variant Title is required" });
    }

    if (!values || !Array.isArray(values) || values.length === 0) {
      return res.status(400).json({ message: "At least one variant value is required" });
    }

    const newVariant = await Variant.create({
      title: title.trim(),
      color: !!color,
      values,
    });

    return res.status(201).json({
      message: "Variant Created Successfully",
      variant: newVariant,
    });
  } catch (error) {
    console.error("Error creating variant:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Retrieves all product variants.
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>}
 */
export const getVariants = async (req, res) => {
  try {
    const variants = await Variant.find().sort({ createdAt: -1 });
    return res.json({ variants });
  } catch (error) {
    console.error("Error fetching variants:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Deletes a product variant by ID.
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>}
 */
export const deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const variant = await Variant.findById(id);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }
    await Variant.findByIdAndDelete(id);
    return res.json({ message: "Variant Deleted Successfully" });
  } catch (error) {
    console.error("Error deleting variant:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Retrieves a single product variant by ID.
 */
export const getVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const variant = await Variant.findById(id);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }
    return res.json({ variant });
  } catch (error) {
    console.error("Error fetching variant:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Updates a product variant by ID.
 */
export const updateVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, color, values } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Variant Title is required" });
    }

    if (!values || !Array.isArray(values) || values.length === 0) {
      return res.status(400).json({ message: "At least one variant value is required" });
    }

    const variant = await Variant.findByIdAndUpdate(
      id,
      { title: title.trim(), color: !!color, values },
      { new: true }
    );

    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    return res.json({ message: "Variant Updated Successfully", variant });
  } catch (error) {
    console.error("Error updating variant:", error.message);
    return res.status(500).json({ message: error.message });
  }
};
