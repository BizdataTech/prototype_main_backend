import mongoose from "mongoose";

const Schema = new mongoose.Schema({
  product_title: { type: String },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "category" },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: "brand" },
  description: { type: String },
  part_number: { type: String },
  oem_number: { type: String },
  price: { type: Number },
  stock: { type: Number },
  images: { type: [String] },
  data_attributes: [{ label: String, value: String }],
  fitments: [mongoose.Schema.Types.ObjectId],
  after_market_product: [],
});

const Product = mongoose.model("product", Schema);

export default Product;
