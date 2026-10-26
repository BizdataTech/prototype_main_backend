import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routers/userRouter.js";
import productRouter from "./routers/product.router.js";
import categoryRouter from "./routers/categoryRouter.js";
import standaloneAttributeRouter from "./routers/attribute.router.js";
import AttributeRouter from "./routers/attribute.routes.js";
import cartRouter from "./routers/cartRouter.js";
import brandRouter from "./routers/brand.router.js";
import adminUserRouter from "./routers/adminUser.router.js";
import blockRouter from "./routers/content.block.routes.js";
import homeSectionRouter from "./routers/home.sections.routes.js";
import variantRouter from "./routers/variant.router.js";
import wishlistRouter from "./routers/wishlistRouter.js";
import orderRouter from "./routers/orderRouter.js";
import path from "path";

const app = express();
const allowedURLs = [
  "https://ecom-prototype-one.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost",
  "http://127.0.0.1",
];

// Support Chrome Private Network Access preflight
app.use((req, res, next) => {
  if (req.headers["access-control-request-private-network"]) {
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow any incoming origin dynamically for development and production
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["Set-Cookie"],
  }),
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  "/sample_images",
  express.static(path.join(process.cwd(), "sample_images")),
);

app.use("/api", adminUserRouter);
app.use("/api", userRouter);
app.use("/api", productRouter);
app.use("/api", categoryRouter);
app.use("/api", standaloneAttributeRouter);
app.use("/api", AttributeRouter);
app.use("/api", variantRouter);
app.use("/api", cartRouter);
app.use("/api", wishlistRouter);
app.use("/api", orderRouter);
app.use("/api", brandRouter);
app.use("/api", blockRouter);
app.use("/api", homeSectionRouter);

app.use((err, req, res, next) => {
  console.error("Backend Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;

