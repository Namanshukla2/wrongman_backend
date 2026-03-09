// server/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true },
    passwordHash: { type: String },
    name: { type: String },
    phone: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },

    // OAuth providers
    googleId: { type: String, unique: true, sparse: true },

    // Profile picture from OAuth
    avatar: { type: String },

    // For password reset
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },

    // For phone OTP
    phoneOtp: { type: String },
    phoneOtpExpiry: { type: Date },
    phoneVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;