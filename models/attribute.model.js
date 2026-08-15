import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    // The display name of the attribute
    name: { type: String, required: true },
    
    // The input type of the attribute
    type: {
      type: String,
      enum: ["Text", "Number", "Boolean", "Select"],
      required: true,
    },
    
    // Array of string values, applicable mostly for 'Select' type attributes
    values: [{ type: String }],
    
    // Optional description
    description: { type: String },
    
    // Status to toggle visibility
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

const Attribute = mongoose.model("attribute", Schema);

export default Attribute;
