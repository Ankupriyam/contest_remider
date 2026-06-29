import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { PLATFORMS } from "@/types";

const userSchema = new Schema(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    image: { type: String, default: null },
    refreshToken: { type: String, default: "" },
    accessToken: { type: String, default: "" },
    tokenExpiry: { type: Date, default: () => new Date(0) },
    calendarConnected: { type: Boolean, default: false },
    reminderMinutes: { type: Number, default: 15 },
    selectedPlatforms: {
      type: [String],
      enum: PLATFORMS,
      default: [],
    },
  },
  { timestamps: true },
);

export type UserDocument = mongoose.HydratedDocument<InferSchemaType<typeof userSchema>>;

export const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>("User", userSchema);
