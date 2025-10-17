// models/AppUser.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const AppUserSchema = new Schema({
  merchant_id: { type: Schema.Types.ObjectId, ref: "Merchant", index: true },
  email: { type: String, index: true },
  password_hash: String,
  password_plain: String, // للديف فقط
  force_password_change: { type: Boolean, default: true },
  status: { type: String, enum: ["active","pending","disabled"], default: "active" },
  lastLoginAt: Date,
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
});

AppUserSchema.pre("save", function(n){ this.updatedAt=new Date(); n(); });

export default mongoose.models.AppUser || mongoose.model("AppUser", AppUserSchema);
