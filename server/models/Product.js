// server/models/Product.js
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true }, // numeric id for frontend compatibility
    name: { type: String, required: true },
    brand: { type: String, default: null },
    category: { type: String, required: true },         // tshirts, pants, jackets, shirts, caps
    subCategory: { type: String, default: '' },         // e.g. Oversized, Joggers, Graphic
    price: { type: Number, required: true },
    salePrice: { type: Number, default: null },
    image: { type: String, required: true },
    images: { type: [String], default: [] },
    description: { type: String, default: '' },
    sizes: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    stock: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },

    // Cloudinary public IDs for this product's images
    cdnPublicIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Avoid recompiling model in dev/hot-reload
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;