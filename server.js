import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
// Import admin user model and password hashing utility for automatic seeding
import AdminUser from "./models/adminUserModel.js";
import { getHashedPassword } from "./utils/bcrypt.js";

const PORT = process.env.PORT || 1000;
const CONNECTION_STRING = process.env.CONNECTION_STRING || "samplestring";

/**
 * Automatically seeds a default administrator account into the database 
 * if one does not already exist with the configured email address.
 */
const seedAdmin = async () => {
  try {
    // Read the target admin email from environment variables, fallback to arathyh8@gmail.com
    const adminEmail = process.env.email || "arathyh8@gmail.com";
    const existingAdmin = await AdminUser.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      console.log(`Seeding default admin account: ${adminEmail}`);
      // Hash the default password (123456) using bcrypt
      const hashedPassword = await getHashedPassword("123456");
      await AdminUser.create({
        username: "admin",
        email: adminEmail,
        password: hashedPassword
      });
      console.log("Admin account seeded successfully.");
    } else {
      console.log(`Admin account ${adminEmail} already exists.`);
    }
  } catch (err) {
    console.error("Failed to seed admin user:", err.message);
  }
};

/**
 * Establishes a database connection, performs automatic database seeding, 
 * and starts the Express web server listener.
 */
const connectDB = async () => {
  try {
    await mongoose.connect(CONNECTION_STRING);
    console.log("Database connected");
    
    // Automatically seed/verify the default admin user account on server start
    await seedAdmin();

    app.listen(PORT, () =>
      console.log(
        `Server listening for request via port ${PORT}`,
      ),
    );
  } catch (error) {
    console.error(
      "database connection failed. server not listening for request\n",
      error,
    );
  }
};

connectDB();
