import mongoose from "mongoose";

const { Schema } = mongoose;


const TokenSchema = new Schema({
        access_token: String,
        refresh_token: String,
        token_type: String,
        scope: String,
        expires_at: Date
}, { _id: false });



const MerchantSchema = new Schema({
        sallaid: { type: String, index: true, unique: true, sparse: true },
        Profile: { type: Schema.Types.Mixed },
        token: TokenSchema,
        createdAt: { type: Date, default: () => new Date() },
        updatedAt: { type: Date, default: () => new Date() }
});


MerchantSchema.pre('save', function (next) {
        this.updatedAt = new Date();
        next();
});

export default mongoose.model("Merchant", MerchantSchema);