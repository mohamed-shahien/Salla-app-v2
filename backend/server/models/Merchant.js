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

const MerchantSchema = new Schema({
  sallaId: { type: String, index: true, unique: true, sparse: true },
  profile: { type: Schema.Types.Mixed },
  tokens: TokenSchema,

  // توافق قديم + جديد
  passwordHash: String,          // legacy compat
  passwordPlain: String,         // legacy compat (للديف)
  app_password_plain: String,    // الجديد (للديف)
  app_password_hash: String,     // الجديد (هاش)

  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
});

MerchantSchema.index({ 'profile.email': 1 }, { sparse: true });
MerchantSchema.index({ 'profile.data.email': 1 }, { sparse: true });
MerchantSchema.pre('save', function (next) { this.updatedAt = new Date(); next(); });

export default mongoose.models.Merchant || mongoose.model("Merchant", MerchantSchema);
