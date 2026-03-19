import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    product_title: { type: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "category" },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "brand" },
    description: { type: String },
    price: { type: Number },
    stock: { type: Number },
    images: [{ url: String, public_id: String }],
    attributes: { type: Object, default: {} },
  },
  { timestamps: true },
);

const Product = mongoose.model("product", Schema);

export default Product;
