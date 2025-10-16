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
        createdAt: { type: Date, default: () => new Date() },
        updatedAt: { type: Date, default: () => new Date() }
});


MerchantSchema.pre('save', function (next) {
        this.updatedAt = new Date();
        next();
});
export default mongoose.models.Merchant || mongoose.model("Merchant", MerchantSchema);