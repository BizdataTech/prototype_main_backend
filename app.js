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
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedURLs.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("request not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);

app.use(cookieParser());
app.use(express.json());

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

export default app;

