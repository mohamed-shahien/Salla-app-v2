import mongoose from "mongoose";
const { Schema } = mongoose;

const EmailLogSchema = new Schema({
  merchant_id: { type: Schema.Types.ObjectId, ref: "Merchant", index: true },
  to: String,
  template: String,
  provider: String,
  provider_message_id: String,
  status: { type: String, enum: ["queued","sent","delivered","opened","bounced","complained","dropped"], default: "queued" },
  meta: Schema.Types.Mixed,
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
});
EmailLogSchema.index({ to:1, createdAt:-1 });
EmailLogSchema.pre("save", function(n){ this.updatedAt=new Date(); n(); });

export default mongoose.models.EmailLog || mongoose.model("EmailLog", EmailLogSchema);
