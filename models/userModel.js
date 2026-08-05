import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    blocked: { type: Boolean, default: false },
    addresses: [
      {
        label: { type: String },
        street: { type: String },
        city: { type: String },
        zip: { type: String },
        country: { type: String },
        isDefault: { type: Boolean, default: false }
      }
    ]
  },
  { timestamps: true },
);

const User = mongoose.model("user", UserSchema);

export default User;
