/**
 * Product Controller
 * Manages operations for products, including fetching listing with category/brand relationships,
 * uploading multiple product images to Cloudinary, and CRUD actions.
 */

import mongoose from "mongoose";
import Product from "../models/product.model.js";
import cloudinary from "../utils/cloudinary.js";
import xlsx from "xlsx";
import Category from "../models/categoryModel.js";
import Brand from "../models/brand.model.js";
import sanitizeHtml from "sanitize-html";
import Wishlist from "../models/wishlistModel.js";
import Cart from "../models/cartModel.js";
import ContentBlock from "../models/content.block.model.js";
import Variant from "../models/variants.model.js";

/**
 * Retrieves a list of products based on query filters (e.g. pagination or category matches).
 * 
 * @param {Object} req - Express request containing query params filter, current_page, and category
 * @param {Object} res - Express response
 */
export const getProducts = async (req, res) => {
  try {
    let { filter, current_page, category, query } = req.query;
    let products;
    switch (filter) {
      case "admin-products": {
        let limit = 10;
        let searchObj = {};
        if (req.query.search) {
          const searchRegex = new RegExp(req.query.search, "i");
          searchObj = {
            $or: [
              { product_title: searchRegex },
              { sku: searchRegex }
            ]
          };
        }
        let total_products = await Product.countDocuments(searchObj);
        let skip = (Math.max(1, parseInt(current_page || 1)) - 1) * limit;
        
        products = await Product.find(searchObj)
          .populate("brand")
          .populate("category")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);
          
        return res.json({
          products,
          total_pages: Math.ceil(total_products / limit),
        });
      }
      // Compact admin list filtered by a specific category ID using MongoDB aggregates
      case "admin-products-category":
        products = await Product.aggregate([
          { $match: { category: new mongoose.Types.ObjectId(category) } },
          {
            $addFields: {
              image: { $arrayElemAt: ["$images", 0] },
            },
          },
          { $sort: { createdAt: -1 } },
          {
            $project: {
              product_title: 1,
              image: "$image.url",
            },
          },
        ]);
        return res.json({ products });
      case "product-list": {
        const queryObj = {};
        if (category) {
          if (mongoose.Types.ObjectId.isValid(category)) {
            queryObj.category = category;
          } else {
            const cat = await Category.findOne({ slug: new RegExp(`^${category}$`, "i") });
            if (cat) {
              queryObj.category = cat._id;
            } else {
              return res.json({ products: [] });
            }
          }
        }
        const dbProducts = await Product.find(queryObj).populate("brand").populate("category").lean();
        const clientProducts = dbProducts.map(product => {
          const firstVariant = product.product_type === "Variable" && product.variants?.length ? product.variants[0] : null;
          return {
            _id: product._id,
            product_title: product.product_title,
            brand: product.brand ? (product.brand.brand_name || product.brand) : "",
            category: product.category ? (product.category.title || product.category) : "",
            description: product.description,
            variant: {
              _id: firstVariant ? firstVariant._id : product._id,
              price: firstVariant ? firstVariant.price : product.price,
              sale_price: firstVariant ? firstVariant.sale_price : product.sale_price,
              stock: firstVariant ? firstVariant.stock : product.stock,
              images: firstVariant && firstVariant.image?.url
                ? [firstVariant.image.url]
                : product.images.map(img => img.url),
            }
          };
        });
        return res.json({ products: clientProducts });
      }
      case "search": {
        const searchQuery = query || "";
        const searchRegex = new RegExp(searchQuery, "i");
        const searchDbProducts = await Product.find({
          $or: [
            { product_title: searchRegex },
            { description: searchRegex }
          ]
        }).populate("brand").populate("category").lean();
        const searchFormatted = searchDbProducts.map(product => {
          const firstVariant = product.product_type === "Variable" && product.variants?.length ? product.variants[0] : null;
          return {
            _id: product._id,
            product_title: product.product_title,
            brand: product.brand ? (product.brand.brand_name || product.brand) : "",
            category: product.category ? (product.category.title || product.category) : "",
            description: product.description,
            variant: {
              _id: firstVariant ? firstVariant._id : product._id,
              price: firstVariant ? firstVariant.price : product.price,
              sale_price: firstVariant ? firstVariant.sale_price : product.sale_price,
              stock: firstVariant ? firstVariant.stock : product.stock,
              images: firstVariant && firstVariant.image?.url
                ? [firstVariant.image.url]
                : product.images.map(img => img.url),
            }
          };
        });
        return res.json({ products: searchFormatted });
      }
      default:
        return res.json({ products: [] });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
    console.log(error.message);
  }
};

/**
 * Retrieves a single product by its ID, with resolved brand and category document lookups.
 * 
 * @param {Object} req - Express request containing product ID in params
 * @param {Object} res - Express response
 */
export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let parent = null;
    let variant = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      parent = await Product.findById(id)
        .populate("category", "_id title")
        .populate("brand", "_id brand_name")
        .populate("variantOptions.variantId")
        .populate("attributes.attributeId")
        .lean();
    }

    if (!parent && mongoose.Types.ObjectId.isValid(id)) {
      parent = await Product.findOne({ "variants._id": id })
        .populate("category", "_id title")
        .populate("brand", "_id brand_name")
        .populate("variantOptions.variantId")
        .populate("attributes.attributeId")
        .lean();
      if (parent) {
        variant = parent.variants.find(v => String(v._id) === String(id));
      }
    }

    if (!parent) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (req.query.admin === "true") {
      return res.json({ product: parent });
    }

    const sections = [];
    if (parent.attributes && parent.attributes.length > 0) {
      sections.push({
        title: "Specifications",
        details: parent.attributes.map(attr => ({
          label: attr.attributeId?.title || "Attribute",
          value: attr.value
        }))
      });
    }

    let clientProduct;
    if (variant) {
      clientProduct = {
        _id: variant._id,
        price: variant.price,
        stock: variant.stock,
        images: parent.images ? parent.images.map(img => img.url) : [],
        parent: {
          _id: parent._id,
          product_title: parent.product_title,
          brand: parent.brand ? (parent.brand.brand_name || parent.brand) : "",
          description: parent.description,
          sections,
          variantOptions: parent.variantOptions,
          variants: parent.variants
        }
      };
    } else {
      const isVariable = parent.product_type === "Variable";
      const repVariant = isVariable && parent.variants?.length ? parent.variants[0] : null;

      clientProduct = {
        _id: repVariant ? repVariant._id : parent._id,
        price: repVariant ? repVariant.price : parent.price,
        stock: repVariant ? repVariant.stock : parent.stock,
        images: parent.images ? parent.images.map(img => img.url) : [],
        parent: {
          _id: parent._id,
          product_title: parent.product_title,
          brand: parent.brand ? (parent.brand.brand_name || parent.brand) : "",
          description: parent.description,
          sections,
          variantOptions: parent.variantOptions,
          variants: parent.variants
        }
      };
    }

    return res.json({ product: clientProduct, products: [clientProduct] });
  } catch (error) {
    console.log("failed to get product data:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Creates a new product with multiple uploaded images.
 * Uploads all images concurrently to Cloudinary, parses schema attributes, and creates database entry.
 * 
 * @param {Object} req - Express request containing data in body and files in files
 * @param {Object} res - Express response
 */
export const createProduct = async (req, res) => {
  try {
    let data = req.body;
    let files = req.files || [];

    let generalFiles = files.filter(f => f.fieldname === "image");
    let variationFiles = files.filter(f => f.fieldname.startsWith("variation_image_"));

    // Upload all product files concurrently to Cloudinary
    let cloudinary_results = await Promise.all(
      generalFiles.map((file) => {
        return new Promise((resolve, reject) => {
          let stream = cloudinary.uploader.upload_stream(
            { folder: "prototype_products" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          );
          stream.end(file.buffer);
        });
      }),
    );
    let images = cloudinary_results.map((image) => ({
      url: image.secure_url,
      public_id: image.public_id,
    }));

    // Parse attributes object if stringified in request body
    if (data.attributes && typeof data.attributes === "string") {
      data.attributes = JSON.parse(data.attributes);
    }
    // Parse variantOptions if stringified in request body
    if (data.variantOptions && typeof data.variantOptions === "string") {
      data.variantOptions = JSON.parse(data.variantOptions);
    }
    // Parse variants (combinations) if stringified in request body
    if (data.variants && typeof data.variants === "string") {
      data.variants = JSON.parse(data.variants);
    } else if (!data.variants) {
      data.variants = [];
    }

    // Upload variation images and assign them
    for (let file of variationFiles) {
      let match = file.fieldname.match(/variation_image_(\d+)/);
      if (match) {
        let index = parseInt(match[1]);
        if (data.variants[index]) {
          let upload_res = await new Promise((resolve, reject) => {
            let stream = cloudinary.uploader.upload_stream(
              { folder: "prototype_products" },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              },
            );
            stream.end(file.buffer);
          });
          data.variants[index].image = {
            url: upload_res.secure_url,
            public_id: upload_res.public_id,
          };
        }
      }
    }

    await Product.create({ ...data, images });
    res.json({ message: "product created" });
  } catch (error) {
    console.log("error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Updates a product detail, handling replacement of old images, uploading of new images,
 * and mapping of updated attributes.
 * 
 * @param {Object} req - Express request containing product ID in params and update payload in body
 * @param {Object} res - Express response
 */
export const updateProduct = async (req, res) => {
  try {
    let data = req.body;
    let files = req.files || [];

    const generalFiles = files.filter(f => f.fieldname === "image");
    const variationFiles = files.filter(f => f.fieldname.startsWith("variation_image_"));

    const id = req.params.id;
    let query = {};

    // ── 1. Handle cancelled (deleted) images ────────────────────────────────
    let cancelledIds = [];
    if (data.cancelledPubliIds) {
      try {
        cancelledIds = JSON.parse(data.cancelledPubliIds);
      } catch (_) { cancelledIds = []; }
      if (cancelledIds.length) {
        await Promise.all(cancelledIds.map(pid => cloudinary.uploader.destroy(pid)));
      }
      delete data.cancelledPubliIds;
    }

    // ── 2. Upload newly added product images ────────────────────────────────
    let newImages = [];
    if (generalFiles.length) {
      const results = await Promise.all(
        generalFiles.map(file =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "prototype_products" },
              (err, result) => { if (err) reject(err); else resolve(result); }
            );
            stream.end(file.buffer);
          })
        )
      );
      newImages = results.map(r => ({ url: r.secure_url, public_id: r.public_id }));
    }

    // ── 3. Rebuild images array: existing (minus cancelled) + new uploads ───
    if (cancelledIds.length || newImages.length) {
      const existing = await Product.findOne({ _id: id }).select("images").lean();
      const kept = (existing?.images || []).filter(img => !cancelledIds.includes(img.public_id));
      query.images = [...kept, ...newImages];
    }

    // ── 4. Parse structured fields ──────────────────────────────────────────
    if (data.attributes) {
      query.attributes = typeof data.attributes === "string"
        ? JSON.parse(data.attributes) : data.attributes;
      delete data.attributes;
    }

    if (data.variantOptions) {
      query.variantOptions = typeof data.variantOptions === "string"
        ? JSON.parse(data.variantOptions) : data.variantOptions;
      delete data.variantOptions;
    }

    if (data.variants) {
      let variants = typeof data.variants === "string"
        ? JSON.parse(data.variants) : data.variants;

      // Upload new variation images
      for (const file of variationFiles) {
        const match = file.fieldname.match(/variation_image_(\d+)/);
        if (match) {
          const index = parseInt(match[1]);
          if (variants[index]) {
            const uploadRes = await new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                { folder: "prototype_products" },
                (err, result) => { if (err) reject(err); else resolve(result); }
              );
              stream.end(file.buffer);
            });
            variants[index].image = { url: uploadRes.secure_url, public_id: uploadRes.public_id };
          }
        }
      }
      query.variants = variants;
      delete data.variants;
    }

    // ── 5. Cast numeric fields to avoid storing strings ──────────────────────
    const numericFields = ["price", "sale_price", "stock"];
    numericFields.forEach(field => {
      if (data[field] !== undefined && data[field] !== "") {
        data[field] = Number(data[field]);
      }
    });

    // ── 6. Merge remaining scalar fields into query ──────────────────────────
    // Skip internal keys that should not be saved as-is
    const skipKeys = new Set(["cancelledPubliIds"]);
    Object.entries(data).forEach(([key, value]) => {
      if (!skipKeys.has(key)) query[key] = value;
    });

    await Product.updateOne({ _id: id }, { $set: query });

    return res.json({ message: "Product Updated" });
  } catch (error) {
    console.error("failed to update product:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Deletes a product by ID.
 * 
 * @param {Object} req - Express request containing product ID in params
 * @param {Object} res - Express response
 */
export const deleteProduct = async (req, res) => {
  try {
    const id = req.params.id;
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete main images from Cloudinary
    if (product.images && product.images.length > 0) {
      const publicIds = product.images.map(img => img.public_id).filter(Boolean);
      if (publicIds.length > 0) {
        await Promise.all(publicIds.map(public_id => cloudinary.uploader.destroy(public_id)));
      }
    }

    // Delete variant images from Cloudinary
    if (product.variants && product.variants.length > 0) {
      const variantPublicIds = product.variants.map(v => v.image?.public_id).filter(Boolean);
      if (variantPublicIds.length > 0) {
        await Promise.all(variantPublicIds.map(public_id => cloudinary.uploader.destroy(public_id)));
      }
    }

    await Product.deleteOne({ _id: id });

    // Clean up references in Wishlists
    await Wishlist.updateMany(
      { "items.productId": id },
      { $pull: { items: { productId: id } } }
    );

    // Clean up references in Carts and update totals
    const carts = await Cart.find({ "items.productId": id });
    for (const cart of carts) {
      cart.items = cart.items.filter(
        (item) => item.productId && item.productId.toString() !== id.toString()
      );
      cart.cartTotal = cart.items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
      await cart.save();
    }

    // Clean up references in ContentBlocks
    await ContentBlock.updateMany(
      { products: id },
      { $pull: { products: id } }
    );

    return res.json({ message: "Product Deleted" });
  } catch (error) {
    console.log("failed to delete product:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const bulkDeleteProducts = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No product IDs provided for deletion" });
    }
    const stringIds = ids.map(id => id.toString());

    // Fetch products to delete images
    const products = await Product.find({ _id: { $in: ids } });
    
    let allPublicIds = [];
    for (const product of products) {
      if (product.images && product.images.length > 0) {
        allPublicIds.push(...product.images.map(img => img.public_id).filter(Boolean));
      }
      if (product.variants && product.variants.length > 0) {
        allPublicIds.push(...product.variants.map(v => v.image?.public_id).filter(Boolean));
      }
    }
    
    if (allPublicIds.length > 0) {
      await Promise.all(allPublicIds.map(public_id => cloudinary.uploader.destroy(public_id)));
    }

    await Product.deleteMany({ _id: { $in: ids } });

    // Clean up references in Wishlists
    await Wishlist.updateMany(
      { "items.productId": { $in: ids } },
      { $pull: { items: { productId: { $in: ids } } } }
    );

    // Clean up references in Carts and update totals
    const carts = await Cart.find({ "items.productId": { $in: ids } });
    for (const cart of carts) {
      cart.items = cart.items.filter(
        (item) => item.productId && !stringIds.includes(item.productId.toString())
      );
      cart.cartTotal = cart.items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
      await cart.save();
    }

    // Clean up references in ContentBlocks
    await ContentBlock.updateMany(
      { products: { $in: ids } },
      { $pull: { products: { $in: ids } } }
    );

    return res.json({ message: `${ids.length} products deleted successfully` });
  } catch (error) {
    console.log("failed to bulk delete products:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Imports products from an Excel or CSV file.
 * Automatically resolves categories and brands by title/name (creating them if they don't exist).
 * Handles external image link URLs and structures Simple, Variable, and Variation types correctly.
 */
export const importProducts = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    // Check if the user wants to upload external images to Cloudinary
    const uploadImagesToCloudinary = req.body.upload_images === "true";

    const file = req.files[0];
    const workbook = xlsx.read(file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    let successCount = 0;
    let errorCount = 0;
    const results = [];
    let lastParentProduct = null;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2; // +1 for 0-index, +1 for header row
      const normalizedRow = {};
      
      Object.keys(row).forEach((key) => {
        normalizedRow[key.trim().toLowerCase()] = String(row[key]).trim();
      });

      const type = (normalizedRow["type"] || "simple").toLowerCase();
      const sku = normalizedRow["sku"] || "";
      const parentSku = normalizedRow["parent sku"] || "";
      const name = normalizedRow["name"] || normalizedRow["product title"] || "";
      const rawDescription = normalizedRow["description"] || normalizedRow["short description"] || "";
      
      try {
        // Validation
        if (type !== "variation" && !name) {
          throw new Error("Product Name is required for Simple or Variable products.");
        }
        if (type === "variation" && !sku && !parentSku) {
          throw new Error("SKU or Parent SKU is required for Variations.");
        }

        // Sanitize Description HTML
        const description = sanitizeHtml(rawDescription, {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot']),
          allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            '*': ['style', 'class'],
            'img': ['src', 'alt', 'width', 'height']
          }
        });

        const price = parseFloat(normalizedRow["regular price"] || normalizedRow["price"]) || 0;
        const sale_price = parseFloat(normalizedRow["sale price"]) || 0;
        const stock = parseInt(normalizedRow["stock"]) || 0;
        const status = normalizedRow["published"] === "0" ? "Inactive" : (normalizedRow["status"] || "Active");
        
        const categoryName = normalizedRow["categories"] || normalizedRow["category"] || "";
        const brandName = normalizedRow["brand"] || "";
        const imagesString = normalizedRow["images"] || normalizedRow["image link"] || normalizedRow["image"] || "";

        // Handle Images
        let images = [];
        if (imagesString) {
          const rawUrls = imagesString.split(",").map((url) => url.trim()).filter(Boolean);
          
          for (const url of rawUrls) {
            try {
              if (url.startsWith('http')) {
                const uploadResult = await cloudinary.uploader.upload(url, { folder: "prototype_products" });
                images.push({ url: uploadResult.secure_url, public_id: uploadResult.public_id });
              } else {
                images.push({ url: url });
              }
            } catch (imgErr) {
              console.warn(`Failed to upload image ${url} for row ${rowIndex}:`, imgErr.message);
              // Fallback to storing raw URL if upload fails
              images.push({ url: url });
            }
          }
        }

        // Handle Categories
        let categoryId = null;
        if (categoryName) {
          const mainCatStr = categoryName.split(",")[0].trim();
          const catParts = mainCatStr.split(">").map(p => p.trim()).filter(Boolean);
          
          let currentParentId = null;
          let currentLevel = 1;
          let lastCatId = null;
          let slugPrefix = "";

          for (const part of catParts) {
            let query = { title: new RegExp(`^${part}$`, "i"), level: currentLevel };
            if (currentParentId) {
              query.parent = currentParentId;
            }
            
            let cat = await Category.findOne(query);
            
            if (!cat) {
              slugPrefix = slugPrefix ? `${slugPrefix}-${part}` : part;
              let slug = slugPrefix.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, '');
              
              let existingSlug = await Category.findOne({ slug });
              if (existingSlug) {
                slug = `${slug}-${Math.floor(Math.random() * 10000)}`;
              }

              cat = await Category.create({
                title: part,
                slug,
                level: currentLevel,
                parent: currentParentId || undefined,
              });
            } else {
              slugPrefix = slugPrefix ? `${slugPrefix}-${part}` : part;
            }
            
            currentParentId = cat._id;
            lastCatId = cat._id;
            currentLevel++;
          }
          categoryId = lastCatId;
        }

        // Handle Brands
        let brandId = null;
        if (brandName) {
          let br = await Brand.findOne({ brand_name: new RegExp(`^${brandName}$`, "i") });
          if (!br) {
            br = await Brand.create({ brand_name: brandName });
          }
          brandId = br._id;
        }

        // Handle Attributes
        const combination = {};
        for (let j = 1; j <= 5; j++) {
          const nameKey = `attribute ${j} name`;
          const valKey = `attribute ${j} value`;
          const valKeyS = `attribute ${j} value(s)`;
          const val = normalizedRow[valKey] || normalizedRow[valKeyS];
          if (normalizedRow[nameKey] && val) {
            combination[normalizedRow[nameKey]] = val;
          }
        }

        // Database Operations
        if (type === "simple") {
          const query = sku ? { sku } : { product_title: name };
          await Product.findOneAndUpdate(
            query,
            {
              $set: {
                product_title: name,
                product_type: "Simple",
                sku,
                description,
                price,
                sale_price,
                stock,
                status,
                category: categoryId,
                brand: brandId,
                images,
              }
            },
            { upsert: true, new: true }
          );
          
          successCount++;
          results.push({ row: rowIndex, sku: sku || name, status: 'success', message: 'Imported successfully' });
          
        } else if (type === "variable") {
          const query = sku ? { sku } : { product_title: name };
          const newProduct = await Product.findOneAndUpdate(
            query,
            {
              $set: {
                product_title: name,
                product_type: "Variable",
                sku,
                description,
                price: price || 0,
                sale_price: sale_price || 0,
                stock: stock || 0,
                status,
                category: categoryId,
                brand: brandId,
                images,
              },
              $setOnInsert: { variants: [] }
            },
            { upsert: true, new: true }
          );
          lastParentProduct = newProduct;
          
          successCount++;
          results.push({ row: rowIndex, sku: sku || name, status: 'success', message: 'Imported successfully' });
          
        } else if (type === "variation") {
          const pSku = parentSku || (lastParentProduct ? lastParentProduct.sku : "");
          if (!pSku) {
            throw new Error("Variation must have a Parent SKU or be placed immediately below a Variable product.");
          }
          
          const parent = await Product.findOne({ sku: pSku });
          if (!parent) {
            throw new Error(`Parent product with SKU '${pSku}' not found in database.`);
          }

          // Process variantOptions to ensure frontend selection works
          if (!parent.variantOptions) parent.variantOptions = [];
          for (const [attrName, attrValue] of Object.entries(combination)) {
            let variantDoc = await Variant.findOne({ title: new RegExp(`^${attrName}$`, "i") });
            if (!variantDoc) {
              variantDoc = await Variant.create({
                title: attrName,
                color: false,
                values: [{ label: attrValue, value: attrValue }]
              });
            } else {
              const valExists = variantDoc.values.some(v => String(v.value).toLowerCase() === String(attrValue).toLowerCase());
              if (!valExists) {
                variantDoc.values.push({ label: attrValue, value: attrValue });
                await variantDoc.save();
              }
            }

            let parentOpt = parent.variantOptions.find(opt => String(opt.variantId) === String(variantDoc._id));
            if (!parentOpt) {
              parent.variantOptions.push({ variantId: variantDoc._id, values: [attrValue] });
              parent.markModified('variantOptions');
            } else {
              const valIncludes = parentOpt.values.some(v => String(v).toLowerCase() === String(attrValue).toLowerCase());
              if (!valIncludes) {
                parentOpt.values.push(attrValue);
                parent.markModified('variantOptions');
              }
            }
          }
          
          const variantObj = {
            sku,
            price,
            sale_price,
            stock,
            status: status === "Active" ? "Active" : "Inactive",
            combination,
            image: images.length > 0 ? images[0] : undefined,
          };
          
          const existingIndex = sku ? parent.variants.findIndex(v => v.sku === sku) : -1;
          if (existingIndex !== -1) {
            Object.assign(parent.variants[existingIndex], variantObj);
            parent.markModified('variants');
          } else {
            parent.variants.push(variantObj);
            parent.markModified('variants');
          }
          
          await parent.save();
          successCount++;
          results.push({ row: rowIndex, sku: sku || pSku + '-var', status: 'success', message: 'Variation imported successfully' });
        } else {
          throw new Error(`Unknown product type: '${type}'`);
        }

      } catch (rowError) {
        errorCount++;
        results.push({ row: rowIndex, sku: sku || name || "N/A", status: 'error', message: rowError.message });
      }
    }

    res.json({ 
      message: `Processed ${data.length} rows. ${successCount} successful, ${errorCount} failed.`,
      successCount,
      errorCount,
      results
    });
  } catch (error) {
    console.error("Import error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Exports all products (Simple & Variable) from MongoDB to an Excel file (.xlsx).
 * Correctly represents variations associated with their parent products.
 */
export const exportProducts = async (req, res) => {
  try {
    const { ids, type, category } = req.query;
    let query = {};
    if (ids) {
      query._id = { $in: ids.split(",") };
    }
    if (type) {
      query.product_type = type;
    }
    if (category) {
      query.category = category;
    }
    const products = await Product.find(query).populate("category").populate("brand");
    const rows = [];

    for (const prod of products) {
      const imagesStr = (prod.images || []).map((img) => img.url).join(",");
      let categoryName = "";
      if (prod.category) {
        // Build category hierarchy path
        let currentCat = prod.category;
        let pathParts = [currentCat.title];
        while (currentCat.parent) {
          // find parent category in the DB
          let pCat = await Category.findById(currentCat.parent).select("title parent");
          if (pCat) {
            pathParts.unshift(pCat.title);
            currentCat = pCat;
          } else {
            break;
          }
        }
        categoryName = pathParts.join(" > ");
      }
      
      const brandName = prod.brand ? prod.brand.brand_name : "";

      if (prod.product_type === "Simple" || !prod.product_type) {
        rows.push({
          Type: "simple",
          SKU: prod.sku || "",
          Name: prod.product_title || "",
          Published: prod.status === "Inactive" ? 0 : 1,
          "Is featured?": 0,
          "Visibility in catalog": "visible",
          "Short description": "",
          Description: prod.description || "",
          "Sale price": prod.sale_price || "",
          "Regular price": prod.price || 0,
          "In stock?": (prod.stock > 0) ? 1 : 0,
          Stock: prod.stock || 0,
          Categories: categoryName,
          Brand: brandName,
          Images: imagesStr,
          Parent: "",
          "Attribute 1 name": "",
          "Attribute 1 value(s)": "",
          "Attribute 2 name": "",
          "Attribute 2 value(s)": "",
        });
      } else if (prod.product_type === "Variable") {
        rows.push({
          Type: "variable",
          SKU: prod.sku || "",
          Name: prod.product_title || "",
          Published: prod.status === "Inactive" ? 0 : 1,
          "Is featured?": 0,
          "Visibility in catalog": "visible",
          "Short description": "",
          Description: prod.description || "",
          "Sale price": "",
          "Regular price": "",
          "In stock?": 1,
          Stock: "",
          Categories: categoryName,
          Brand: brandName,
          Images: imagesStr,
          Parent: "",
          "Attribute 1 name": "",
          "Attribute 1 value(s)": "",
          "Attribute 2 name": "",
          "Attribute 2 value(s)": "",
        });

        if (prod.variants && prod.variants.length > 0) {
          for (const variant of prod.variants) {
            const comboKeys = Object.keys(variant.combination || {});
            const attr1Name = comboKeys[0] || "";
            const attr1Val = comboKeys[0] ? variant.combination[comboKeys[0]] : "";
            const attr2Name = comboKeys[1] || "";
            const attr2Val = comboKeys[1] ? variant.combination[comboKeys[1]] : "";

            rows.push({
              Type: "variation",
              SKU: variant.sku || "",
              Name: variant.sku ? `${prod.product_title} - ${variant.sku}` : prod.product_title,
              Published: variant.status === "Inactive" ? 0 : 1,
              "Is featured?": 0,
              "Visibility in catalog": "visible",
              "Short description": "",
              Description: "",
              "Sale price": variant.sale_price || "",
              "Regular price": variant.price || 0,
              "In stock?": (variant.stock > 0) ? 1 : 0,
              Stock: variant.stock || 0,
              Categories: "",
              Brand: "",
              Images: variant.image ? variant.image.url : "",
              Parent: prod.sku || "",
              "Attribute 1 name": attr1Name,
              "Attribute 1 value(s)": attr1Val,
              "Attribute 2 name": attr2Name,
              "Attribute 2 value(s)": attr2Val,
            });
          }
        }
      }
    }

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Products");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=products_export.xlsx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    console.error("Export error:", error.message);
    res.status(500).json({ message: error.message });
  }
};
