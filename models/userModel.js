import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    blocked: { type: Boolean, default: false },
    addresses: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        pincode: { type: String, required: true },
        locality: { type: String },
        address: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        landmark: { type: String },
        alternatePhone: { type: String },
        addressType: { type: String, enum: ['Home', 'Work'], default: 'Home' },
        isDefault: { type: Boolean, default: false }
      }
    ]
  },
  { timestamps: true },
);

const User = mongoose.model("user", UserSchema);

export default User;
