// models/Merchant.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const TokenSchema = new Schema({
        access_token: String,
        refresh_token: String,
        token_type: String,
        scope: String,
        expires_at: Date,
        oauth_invalid: { type: Boolean, default: false }
}, { _id: false });

const LoginOtpSchema = new Schema({
        code_hash: String,
        expires_at: Date,
        attempts: { type: Number, default: 0 },
        locked_until: Date,
        sent_to: String
}, { _id: false });

const MerchantSchema = new Schema({
        sallaId: { type: String, index: true, unique: true, sparse: true },
        profile: { type: Schema.Types.Mixed },
        tokens: TokenSchema,
        login_otp: LoginOtpSchema,            // 👈 هنا هنخزن الـ OTP
        verified: { type: Boolean, default: false },
        createdAt: { type: Date, default: () => new Date() },
        updatedAt: { type: Date, default: () => new Date() }
});

MerchantSchema.index({ 'profile.email': 1 }, { sparse: true });
MerchantSchema.pre('save', function (next) {
        this.updatedAt = new Date();
        next();
});

export default mongoose.models.Merchant || mongoose.model("Merchant", MerchantSchema);
