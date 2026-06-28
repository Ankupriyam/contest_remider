import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { PLATFORMS } from "@/types";

const userSchema = new Schema(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    image: { type: String, default: null },
    refreshToken: { type: String, required: true },
    accessToken: { type: String, required: true },
    tokenExpiry: { type: Date, required: true },
    reminderMinutes: { type: Number, default: 15 },
    selectedPlatforms: {
      type: [String],
      enum: PLATFORMS,
      default: ["leetcode", "codeforces"],
    },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>("User", userSchema);
