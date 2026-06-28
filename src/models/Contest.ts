import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { PLATFORMS } from "@/types";

const contestSchema = new Schema(
  {
    contestId: { type: String, required: true, unique: true, index: true },
    platform: { type: String, required: true, enum: PLATFORMS, index: true },
    title: { type: String, required: true },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    url: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export type ContestDocument = InferSchemaType<typeof contestSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Contest: Model<ContestDocument> =
  mongoose.models.Contest ?? mongoose.model<ContestDocument>("Contest", contestSchema);
