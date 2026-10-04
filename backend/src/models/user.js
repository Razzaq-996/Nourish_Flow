import mongoose from "mongoose";
import {
	USER_ROLES,
	USER_STATUSES,
	VOLUNTEER_AVAILABILITY_STATUSES
} from "../utils/constants.js";

const { Schema } = mongoose;
const enumValues = (values) => Object.values(values);

const pointSchema = new Schema({
	type: {
		type: String,
		enum: ["Point"],
		required: true
	},
	coordinates: {
		type: [Number],
		required: true,
		validate: {
			validator: (coordinates) => (
				coordinates.length === 2
				&& coordinates[0] >= -180
				&& coordinates[0] <= 180
				&& coordinates[1] >= -90
				&& coordinates[1] <= 90
			),
			message: "currentLocation coordinates must be [longitude, latitude]"
		}
	}
}, { _id: false });

const userSchema = new Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
		trim: true
	},
	passwordHash: {
		type: String,
		required: true,
		select: false
	},
	role: {
		type: String,
		enum: enumValues(USER_ROLES),
		required: true,
		immutable: true
	},
	status: {
		type: String,
		enum: enumValues(USER_STATUSES),
		required: true,
		default: USER_STATUSES.PENDING_VERIFICATION
	},
	organizationId: {
		type: Schema.Types.ObjectId,
		ref: "Organization",
		default: null
	},
	phone: {
		type: String,
		trim: true,
		default: null
	},
	availabilityStatus: {
		type: String,
		enum: enumValues(VOLUNTEER_AVAILABILITY_STATUSES),
		default: VOLUNTEER_AVAILABILITY_STATUSES.UNAVAILABLE
	},
	currentLocation: {
		type: pointSchema,
		default: null
	},
	maxTravelDistanceKm: {
		type: Number,
		min: 0,
		default: null
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

userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ organizationId: 1 });
userSchema.index({ currentLocation: "2dsphere" }, { sparse: true });

export default mongoose.model("User", userSchema);
