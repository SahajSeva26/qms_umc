import mongoose from "mongoose"
import { OTP_CHANNELS, OTP_STATUS } from "./otp.constants"

// how + where the OTP is delivered: channel type + the destination (phone/email) value
const channelSchema = new mongoose.Schema(
    {
      type: {
        type: String,
        enum: Object.values(OTP_CHANNELS),
        required: true,
      },
      value: {
        type: String,
        required: true,
      },
    },
    { _id: false },
)

// optional link back to the record this OTP was issued for, so it can be retrieved by what it belongs to
const entitySchema = new mongoose.Schema(
    {
      type: { type: String },
      relation: { type: String },
      id: { type: mongoose.Schema.Types.ObjectId },
    },
    { _id: false },
)

const otpSchema= new mongoose.Schema({
    purpose: {
      type: String,
      required: true,
      index: true,
    },
    channel: {
      type: channelSchema,
      required: true,
    },
    entity: {
      type: entitySchema,
      required: false,
    },
    code: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(OTP_STATUS),
      default: OTP_STATUS.PENDING,
      index: true,
    },
     expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    maxAttempts: {
      type: Number,
      default: 5,
    },

    verifiedAt: {
      type: Date,
    },
},{
    timestamps:true
})

// index the entity link for fast lookup; partial so OTPs without an entity aren't indexed
otpSchema.index(
    { 'entity.type': 1, 'entity.relation': 1, 'entity.id': 1 },
    { partialFilterExpression: { 'entity.id': { $exists: true } } },
)

export const OtpModel= mongoose.model('Otp',otpSchema);
export type IOtp = mongoose.InferSchemaType<typeof otpSchema>;