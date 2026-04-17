import mongoose from "mongoose";
import { IUSER } from "./user.types";


const EncryptedField = {
    ciphertext: String,
    authTag: String,
    encryptedDek: String,
    keyAuthTag: String,
    iv: String,
};

export const UserSchema = new mongoose.Schema<IUSER>({

    account_id: { type: Number, required: true, unique: true, index: true },
    balance: { type: Number, required: true },
    currency: { type: String, required: true },
    processed_transactions: { type: [String], default: [] },
    // Sensitive User Data (Encrypted)
    name: { type: EncryptedField },
    age: { type: EncryptedField },
    gender: { type: EncryptedField },
});



export const UserModel = mongoose.model<IUSER>("Users", UserSchema);






