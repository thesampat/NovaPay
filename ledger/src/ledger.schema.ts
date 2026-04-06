import mongoose from "mongoose";
import { ILedgerEntry } from "./ledger.types";

const LedgerSchema = new mongoose.Schema<ILedgerEntry>({
  account_id: { type: Number, required: true, index: true },
  transaction_id: { type: String, required: true, index: true },
  type: { type: String, enum: ['DEBIT', 'CREDIT'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  fx_rate: { type: Number, required: true },
  description: { type: String },
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false }
});

LedgerSchema.index({ account_id: 1, timestamp: -1 });

export const LedgerModel = mongoose.model<ILedgerEntry>("Ledger", LedgerSchema);
