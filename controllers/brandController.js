import Brand from "../models/brand.model.js";
import cloudinary from "../utils/cloudinary.js";

export const createBrand = async (req, res) => {
  try {
    let { brand_name } = req.body;
    let file = req.file;

    if (!brand_name.trim() || !file) {
      return res.status(400).json({ message: "Brand Name and Image required" });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "prototype_brands" },
        (error, result) => {
          if (error) reject(error);
          resolve(result);
        },
      );
      stream.end(file.buffer);
    });

    await Brand.create({
      brand_name,
      image: { url: result.secure_url, public_id: result.public_id },
    });

    return res.json({ message: "Brand Created" });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getBrands = async (req, res) => {
  try {
    let brands = await Brand.find();
    res.json({ brands });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBrand = async (req, res) => {
  try {
    let brand = await Brand.findById(req.params.id).select(
      "brand_name image.url",
    );
    return res.json({ brand });
  } catch (error) {
    console.log("faled to fetch brand:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const updateBrand = async (req, res) => {
  try {
    let { id } = req.params;
    let brand = await Brand.findById(id);
    if (!brand) return res.status(404).json({ message: "Brand Not Found" });

    let result;
    if (req.file) {
      await cloudinary.uploader.destroy(brand.image.url);
      result = await new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
          { folder: "prototype_brands" },
          (error, result) => {
            if (error) reject(error);
            resolve(result);
          },
        );
        stream.end(req.file.buffer);
      });
    }

    let query = { ...req.body };
    if (result) {
      query.image = { url: result.secure_url, public_id: result.public_id };
    }

    await Brand.updateOne({ _id: id }, { $set: query });
    return res.json({ message: "Brand Updated" });
  } catch (error) {
    console.log("failed to update brand:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    let { id } = req.params;
    let brand = await Brand.findById(id);
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    await cloudinary.uploader.destroy(brand.image.public_id);
    await Brand.findByIdAndDelete(id);
    return res.json({ message: "Brand Deleted" });
  } catch (error) {
    console.log("failed to delete brand:", error.message);
    res.status(500).json({ message: error.message });
  }
};
