import { Section } from "../models/home.section.model.js";

export const getSections = async (req, res) => {
  try {
    let sections = await Section.find();
    return res.json({ sections });
  } catch (err) {
    console.log("failed to fetch sections:", err.message);
    return res.status(500).json({ message: err.message });
  }
};
