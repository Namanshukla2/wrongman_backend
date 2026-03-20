import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import Product from './models/Product.js';
import Order from './models/Order.js';
import cloudinary from './cloudinary.js';
import authRoutes from './routes/auth.js';
import paymentRoutes from './routes/payment.js';

dotenv.config();

console.log('Razorpay env check:', {
  keyId: process.env.RAZORPAY_KEY_ID,
  keySecretPresent: !!process.env.RAZORPAY_KEY_SECRET,
});

const app = express();

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is missing in .env');
  process.exit(1);
}

app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'https://wrongman-cloting-web.vercel.app', // Add your frontend URL
    ],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Multer: in-memory storage for uploaded files
const upload = multer({ storage: multer.memoryStorage() });

// ───────── CONNECT TO MONGODB ─────────
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, { dbName: 'wrongman' });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
}


// ───────── CLOUDINARY UPLOAD HELPER ─────────
function uploadBufferToCloudinary(buffer, filename) {
  return new Promise((resolve, reject) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const nameWithoutExt = filename ? filename.split('.')[0] : 'image';
    const publicId = `${nameWithoutExt}-${uniqueSuffix}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'wrongman/products',
        resource_type: 'image',
        public_id: publicId,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// ───────── UPLOAD API ─────────
app.post('/api/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const uploads = await Promise.all(
      req.files.map((file) => uploadBufferToCloudinary(file.buffer, file.originalname))
    );

    const response = uploads.map((u) => ({
      url: u.secure_url,
      publicId: u.public_id,
    }));

    res.status(201).json(response);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Failed to upload images' });
  }
});

// ───────── PRODUCTS API ─────────

// GET /api/products
app.get('/api/products', async (_req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('GET /api/products error:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// POST /api/products
app.post('/api/products', async (req, res) => {
  try {
    const body = req.body;
    const newProduct = {
      ...body,
      id: body.id || Date.now(),
    };

    const created = await Product.create(newProduct);
    res.status(201).json(created);
  } catch (error) {
    console.error('POST /api/products error:', error);
    res.status(500).json({ message: 'Failed to add product' });
  }
});

// PATCH /api/products/:id
app.patch('/api/products/:id', async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const updated = await Product.findOneAndUpdate({ id: productId }, req.body, { new: true });

    if (!updated) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('PATCH /api/products/:id error:', error);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

// DELETE /api/products/:id
app.delete('/api/products/:id', async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const deleted = await Product.findOneAndDelete({ id: productId });
    if (!deleted) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete CDN images if present
    if (deleted.cdnPublicIds && deleted.cdnPublicIds.length) {
      try {
        await Promise.all(deleted.cdnPublicIds.map((publicId) => cloudinary.uploader.destroy(publicId)));
      } catch (err) {
        console.warn('Cloudinary delete failed for product', productId, err.message);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/products/:id error:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

// ───────── ORDERS API ─────────

// GET /api/orders
app.get('/api/orders', async (_req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('GET /api/orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// POST /api/orders
app.post('/api/orders', async (req, res) => {
  try {
    const incoming = req.body;

    const orderData = {
      ...incoming,
      id: incoming.id || `WM${Date.now()}`,
      status: incoming.status || 'pending',
      createdAt: incoming.createdAt ? new Date(incoming.createdAt) : new Date(),
    };

    const created = await Order.create(orderData);
    res.status(201).json(created);
  } catch (error) {
    console.error('POST /api/orders error:', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
});
// ───────── AUTH API ─────────
app.use('/api/auth', authRoutes);

// ───────── PAYMENT API ─────────
app.use('/api/payment', paymentRoutes);

// PATCH /api/orders/:id
app.patch('/api/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;

    const updated = await Order.findOneAndUpdate({ id: orderId }, req.body, { new: true });

    if (!updated) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('PATCH /api/orders/:id error:', error);
    res.status(500).json({ message: 'Failed to update order' });
  }
});

// ───────── HEALTH CHECK ─────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Wrong Man API is running with MongoDB & Cloudinary! ☠️',
  });
});

// ───────── START SERVER ─────────
let isConnected = false;

async function startServer() {
  try {
    if (!isConnected) {
      await connectDB();
      isConnected = true;
    }

    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`
☠️  Wrong Man API running on http://localhost:${PORT}
   - Auth:     http://localhost:${PORT}/api/auth
   - Products: http://localhost:${PORT}/api/products
   - Orders:   http://localhost:${PORT}/api/orders
   - Upload:   http://localhost:${PORT}/api/upload
   - Health:   http://localhost:${PORT}/api/health
`);
      });
    }
  } catch (err) {
    console.error('❌ Failed to start server:', err);
  }
}

await startServer();

export default app;