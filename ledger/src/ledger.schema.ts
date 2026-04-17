import mongoose from "mongoose";
import { ILedgerEntry } from "./ledger.types";

export const LedgerSchema = new mongoose.Schema<ILedgerEntry>({
  account_id: { type: String, required: true, index: true },
  transaction_id: { type: String, required: true, index: true },
  type: { type: String, enum: ['DEBIT', 'CREDIT'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  fx_rate: { type: Number, required: true },
  description: { type: String },
  current_hash: { type: String, required: true },
  previous_hash: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: true }
});



LedgerSchema.index({ timestamp: -1 });
LedgerSchema.index({ account_id: 1, timestamp: -1 });

export const LedgerModel = mongoose.model<ILedgerEntry>("Ledger", LedgerSchema);
