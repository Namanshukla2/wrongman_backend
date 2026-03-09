// server/models/Order.js
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    
    // Customer info
    customer: {
      name: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      pincode: String,
    },

    // User reference
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Order items
    items: [
      {
        productId: Number,
        name: String,
        image: String,
        price: Number,
        salePrice: Number,
        size: String,
        color: String,
        quantity: Number,
      },
    ],

    // Pricing
    subtotal: { type: Number, required: true },
    shipping: { type: Number, default: 0 },
    total: { type: Number, required: true },

    // Payment
    paymentMethod: { 
      type: String, 
      enum: ['cod', 'razorpay', 'bank_transfer'], 
      default: 'cod' 
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'awaiting_payment', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    
    // Razorpay details
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,

    // Order status
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },

    // Tracking
    trackingNumber: String,
    estimatedDelivery: Date,
    notes: String,
  },
  { timestamps: true }
);

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export default Order;