import mongoose from "mongoose";

const Schema = new mongoose.Schema({
  title: { type: String },
  level: { type: Number },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "category" },
  data_attributes: [
    {
      _id: false,
      label: String,
      field_type: String,
      options: { type: [String], default: null },
    },
  ],
  isNavItem: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
});

const Category = mongoose.model("category", Schema);

export default Category;
