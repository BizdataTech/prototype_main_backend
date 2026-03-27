import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    title: String,
    slug: String,
    products: [mongoose.Schema.Types.ObjectId],
  },
  { timestamps: true },
);

const ContentBlock = mongoose.model("content-blocks", Schema);

export default ContentBlock;
