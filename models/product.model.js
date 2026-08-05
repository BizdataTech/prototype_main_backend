import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    product_title: { type: String },
    product_type: { type: String },
    sku: { type: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "category" },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "brand" },
    description: { type: String },
    price: { type: Number },
    sale_price: { type: Number },
    stock: { type: Number },
    images: [{ url: String, public_id: String }],
    status: { type: String, enum: ["Active", "Draft", "Inactive"], default: "Active" },
    variantOptions: [
      {
        variantId: { type: mongoose.Schema.Types.ObjectId, ref: "variant" },
        values: [{ type: String }],
      },
    ],
    attributes: [
      {
        attributeId: { type: mongoose.Schema.Types.ObjectId, ref: "attribute" },
        value: mongoose.Schema.Types.Mixed,
      },
    ],
    variants: [
      {
        sku: { type: String },
        price: { type: Number },
        sale_price: { type: Number },
        stock: { type: Number },
        status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
        weight: { type: String },
        image: { url: String, public_id: String },
        combination: mongoose.Schema.Types.Mixed,
      }
    ],
  },
  { timestamps: true },
);

const Product = mongoose.model("product", Schema);

export default Product;
