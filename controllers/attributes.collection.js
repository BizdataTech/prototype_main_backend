import AttributeCollectionModel from "../models/attributes.model.js";

export const getCollectionData = async (req, res) => {
  try {
    let data = await AttributeCollectionModel.findOne({
      _id: req.params.id,
    }).select("-__v -createdAt -updatedAt");
    return res.json({ data });
  } catch (error) {
    console.log("failed to fetch attribute collection data :", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const getCollections = async (req, res) => {
  try {
    let collections = await AttributeCollectionModel.aggregate([
      {
        $addFields: {
          count: { $size: "$attributes" },
        },
      },
      {
        $project: {
          collection_name: 1,
          count: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);
    return res.json({ collections });
  } catch (error) {
    console.log("failed to fetch attribute collections :", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const getCollectionsForCategory = async (req, res) => {
  try {
    let collections =
      await AttributeCollectionModel.find().select("collection_name");

    return res.json({ collections });
  } catch (error) {
    console.log(
      "failed to fetch attribute collections for categories:",
      error.message,
    );
    return res.status(500).json({ message: error.message });
  }
};

export const createAttributeCollection = async (req, res) => {
  let { collection_name } = req.body;
  try {
    let collection = await AttributeCollectionModel.create({ collection_name });
    return res
      .status(201)
      .json({ message: "Attribute Collection Created", id: collection._id });
  } catch (error) {
    console.log("failed to create attribute collection :", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const deleteAttributeCollection = async (req, res) => {
  try {
    await AttributeCollectionModel.deleteOne({ _id: req.params.coll_id });
    return res.json({ message: "Attribute Collection Deleted" });
  } catch (error) {
    console.log("Failed to delete attribute collection :", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const addAttributes = async (req, res) => {
  try {
    await AttributeCollectionModel.updateOne(
      { _id: req.params.id },
      { $push: { attributes: req.body.attribute } },
    );
    return res.status(201).json({ message: "Attribute Added" });
  } catch (error) {
    console.log("failed to create attributes:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const updateAttribute = async (req, res) => {
  try {
    let { coll_id, att_id } = req.params;

    let updateFields = {};

    for (let key in req.body) {
      updateFields[`attributes.$.${key}`] = req.body[key];
    }

    await AttributeCollectionModel.updateOne(
      {
        _id: coll_id,
        "attributes._id": att_id,
      },
      {
        $set: updateFields,
      },
    );
    return res.status(200).json({ message: "Attribute Updated" });
  } catch (error) {
    console.log("failed to update attribute:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const deleteAttribute = async (req, res) => {
  try {
    let { coll_id, att_id } = req.params;
    let collection = await AttributeCollectionModel.updateOne(
      { _id: coll_id },
      { $pull: { attributes: { _id: att_id } } },
    );
    return res.json({ message: "Attribute Deleted" });
  } catch (error) {
    console.log("failed to delete the attribute:", error.message);
    return res.status(500).json({ message: error.message });
  }
};
