import mongoose from "mongoose";

const Schema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
});

const AdminUser = mongoose.model("adminuser", Schema);

export default AdminUser;
