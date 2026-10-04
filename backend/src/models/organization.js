import mongoose from "mongoose";
import { ORGANIZATION_VERIFICATION_STATUSES } from "../utils/constants.js";

const { Schema } = mongoose;

const organizationSchema = new Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	description: {
		type: String,
		trim: true,
		default: null
	},
	contactEmail: {
		type: String,
		required: true,
		lowercase: true,
		trim: true
	},
	contactPhone: {
		type: String,
		trim: true,
		default: null
	},
	addressText: {
		type: String,
		required: true,
		trim: true
	},
	verificationStatus: {
		type: String,
		enum: Object.values(ORGANIZATION_VERIFICATION_STATUSES),
		required: true,
		default: ORGANIZATION_VERIFICATION_STATUSES.PENDING
	},
	createdBy: {
		type: Schema.Types.ObjectId,
		ref: "User",
		required: true,
		immutable: true
	},
	verifiedAt: {
		type: Date,
		default: null
	},
	verifiedBy: {
		type: Schema.Types.ObjectId,
		ref: "User",
		default: null
	}
}, { timestamps: true });

organizationSchema.index({ verificationStatus: 1 });
organizationSchema.index({ name: 1 });
organizationSchema.index({ createdAt: 1 });

export default mongoose.model("Organization", organizationSchema);
