import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    title: { type: String },
    // Auto-generated or manual URL-friendly identifier
    slug: { type: String, unique: true, sparse: true },
    // Detailed description for the category
    description: { type: String },
    // Visibility status for the storefront
    status: { type: String, default: "Active", enum: ["Active", "Inactive"] },
    // URL or path to the category's display image
    image: { type: String },
    level: { type: Number },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "category" },
    attribute_collection: { type: mongoose.Schema.Types.ObjectId },
    variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "variant" }],
    isNavItem: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Category = mongoose.model("category", Schema);

export default Category;
