import mongoose from "mongoose";

const SectionSchema = new mongoose.Schema(
  {
    section_type: {
      type: {
        type: String,
        enum: ["hero_banner", "product_listing", "mid_page_banner"],
      },
    },
    order: Number,
    active: { type: Boolean, default: true },
  },
  { discriminatorKey: "section_type" },
);

export const Section = mongoose.model("section", SectionSchema);

const ReferenceSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["content-block", "category"] },
    slug: String,
    id: mongoose.Schema.Types.ObjectId,
  },
  { _id: false },
);

const BannerItemSchema = new mongoose.Schema(
  {
    image: { url: String, public_id: String },
    heading: String,
    subtitle: String,
    button_text: String,
    redirection: Boolean,
    reference: ReferenceSchema,
  },
  { _id: false },
);

export const HeroBanner = Section.discriminator(
  "hero_banner",
  new mongoose.Schema({
    banner_type: { type: String, enum: ["single", "carousel"] },
    banners: [BannerItemSchema],
  }),
);

export const ProductListing = Section.discriminator(
  "product_listing",
  new mongoose.Schema({
    title: String,
    limit: Number,
    layout: { type: String, enum: ["horizontal", "grid"] },
    reference: ReferenceSchema,
  }),
);

export const MidPageBanner = Section.discriminator(
  "mid_page_banner",
  new mongoose.Schema({
    banner_type: { type: String, enum: ["single", "carousel"] },
    column_count: Number,
    banners: [BannerItemSchema],
  }),
);
