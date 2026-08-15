import Attribute from "../models/attribute.model.js";

/**
 * Creates a new attribute.
 */
export const createAttribute = async (req, res) => {
  try {
    const data = req.body;
    
    // Validate required fields
    if (!data.name || !data.name.trim()) {
      return res.status(400).json({ message: "Attribute name is required" });
    }
    if (!data.type) {
      return res.status(400).json({ message: "Attribute type is required" });
    }

    const newAttribute = await Attribute.create(data);
    res.status(200).json({ message: "Attribute created successfully", data: newAttribute });
  } catch (error) {
    console.error("Error creating attribute:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Retrieves all attributes.
 */
export const getAttributes = async (req, res) => {
  try {
    const attributes = await Attribute.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, attributes });
  } catch (error) {
    console.error("Error fetching attributes:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Retrieves a single attribute by its ID.
 */
export const getAttribute = async (req, res) => {
  try {
    const { id } = req.params;
    const attribute = await Attribute.findById(id);
    if (!attribute) {
      return res.status(404).json({ message: "Attribute not found" });
    }
    res.status(200).json({ success: true, attribute });
  } catch (error) {
    console.error("Error fetching attribute:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Updates an attribute by its ID.
 */
export const updateAttribute = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updatedAttribute = await Attribute.findByIdAndUpdate(id, data, { new: true });
    
    if (!updatedAttribute) {
      return res.status(404).json({ message: "Attribute not found" });
    }

    res.status(200).json({ success: true, message: "Attribute updated successfully", attribute: updatedAttribute });
  } catch (error) {
    console.error("Error updating attribute:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Deletes an attribute by its ID.
 */
export const deleteAttribute = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAttribute = await Attribute.findByIdAndDelete(id);
    
    if (!deletedAttribute) {
      return res.status(404).json({ message: "Attribute not found" });
    }

    res.status(200).json({ success: true, message: "Attribute deleted successfully" });
  } catch (error) {
    console.error("Error deleting attribute:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
