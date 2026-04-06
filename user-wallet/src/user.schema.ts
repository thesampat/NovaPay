import mongoose from "mongoose";
import { IUSER } from "./user.types";


const UserSchema = new mongoose.Schema<IUSER>({
    account_id: { type: Number, required: true },
    balance: { type: Number, required: true },
    currency: { type: String, required: true },
});

export const UserModel = mongoose.model<IUSER>("Users", UserSchema);






