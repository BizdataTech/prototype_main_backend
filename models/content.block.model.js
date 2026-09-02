import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    title: String,
    slug: String,
    block_type: {
      type: String,
      enum: ["new_arrivals", "featured", "trending", "custom"],
      default: "custom",
    },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "category" },
    products: [mongoose.Schema.Types.ObjectId],
  },
  { timestamps: true },
);

const ContentBlock = mongoose.model("content-blocks", Schema);

export default ContentBlock;
