// server/utils/email.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(email, resetUrl) {
  const mailOptions = {
    from: `"WrongMan Store" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset Your Password - WrongMan',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">☠️ WRONGMAN</h1>
        </div>
        <div style="padding: 40px 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            You requested to reset your password. Click the button below to create a new password.
            This link will expire in <strong>1 hour</strong>.
          </p>
          <div style="text-align: center; margin: 35px 0;">
            <a href="${resetUrl}" style="background: #dc2626; color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block; font-size: 16px;">
              Reset Password
            </a>
          </div>
          <p style="color: #999; font-size: 14px;">
            If you didn't request this, please ignore this email. Your password will remain unchanged.
          </p>
        </div>
        <div style="padding: 20px; text-align: center; background: #1a1a1a; color: #999; font-size: 12px; border-radius: 0 0 12px 12px;">
          © 2025 WrongMan. All rights reserved. ☠️
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendOtpEmail(email, otp) {
  const mailOptions = {
    from: `"WrongMan Store" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your OTP Code - WrongMan',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">☠️ WRONGMAN</h1>
        </div>
        <div style="padding: 40px 30px; background: #f9f9f9; text-align: center;">
          <h2 style="color: #333; margin-top: 0;">Your Verification Code</h2>
          <div style="background: #fff; border: 2px dashed #dc2626; padding: 25px; margin: 25px 0; border-radius: 12px;">
            <span style="font-size: 42px; font-weight: bold; letter-spacing: 10px; color: #dc2626;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 16px;">This code expires in <strong>10 minutes</strong>.</p>
        </div>
        <div style="padding: 20px; text-align: center; background: #1a1a1a; color: #999; font-size: 12px; border-radius: 0 0 12px 12px;">
          © 2025 WrongMan. All rights reserved. ☠️
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}