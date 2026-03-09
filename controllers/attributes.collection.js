import AttributeCollectionModel from "../models/attributes.model.js";

export const getAttributeCollections = async (req, res) => {
  try {
    let collections = await AttributeCollectionModel.find().select(
      "_id collection_name",
    );
    return res.json({ collections });
  } catch (error) {
    console.log("failed to fetch attribute collections :", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const createAttributeCollection = async (req, res) => {};
