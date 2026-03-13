import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    collection_name: String,
    attributes: [
      {
        label: String,
        input_type: {
          type: String,
          enum: ["text", "select", "multi-select"],
          default: "text",
        },
        options: [String],
      },
    ],
  },
  { timestamps: true },
);

const AttributeCollectionModel = mongoose.model("attributeCollection", Schema);

export default AttributeCollectionModel;
