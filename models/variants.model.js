import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    title: String,
    color: Boolean,
    values: [{ label: String, value: String }],
  },
  { timestamps: true },
);

const Variant = mongoose.model("variant", Schema);

export default Variant;
