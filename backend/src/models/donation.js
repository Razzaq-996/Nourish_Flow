import mongoose from "mongoose";
import {
	DONATION_STATUSES,
	FOOD_CATEGORIES,
	UNITS
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
			message: "pickupLocation coordinates must be [longitude, latitude]"
		}
	}
}, { _id: false });

const statusHistorySchema = new Schema({
	status: {
		type: String,
		enum: enumValues(DONATION_STATUSES),
		required: true
	},
	at: {
		type: Date,
		default: Date.now
	},
	changedBy: {
		type: Schema.Types.ObjectId,
		ref: "User",
		default: null
	}
}, { _id: false });

const allocationSchema = new Schema({
	requestId: {
		type: Schema.Types.ObjectId,
		ref: "FoodRequest",
		required: true
	},
	quantity: {
		type: Number,
		required: true,
		min: [0.000001, "Allocation quantity must be positive"]
	},
	createdBy: {
		type: Schema.Types.ObjectId,
		ref: "User",
		required: true
	},
	createdAt: {
		type: Date,
		default: Date.now
	}
});

const donationSchema = new Schema({
	createdByUserId: {
		type: Schema.Types.ObjectId,
		ref: "User",
		required: true,
		immutable: true
	},
	donorOrganizationId: {
		type: Schema.Types.ObjectId,
		ref: "Organization",
		default: null
	},
	foodCategory: {
		type: String,
		enum: enumValues(FOOD_CATEGORIES),
		required: true
	},
	description: {
		type: String,
		trim: true,
		default: null
	},
	totalQuantity: {
		type: Number,
		required: true,
		min: [0.000001, "Total quantity must be positive"]
	},
	unit: {
		type: String,
		enum: enumValues(UNITS),
		required: true
	},
	allocatedQuantity: {
		type: Number,
		required: true,
		min: 0,
		default: 0
	},
	remainingQuantity: {
		type: Number,
		required: true,
		min: 0
	},
	allocations: {
		type: [allocationSchema],
		default: []
	},
	pickupLocation: {
		type: pointSchema,
		required: true
	},
	availableFrom: {
		type: Date,
		required: true
	},
	availableUntil: {
		type: Date,
		required: true
	},
	preparedAt: {
		type: Date,
		default: null
	},
	expiresAt: {
		type: Date,
		required: true
	},
	status: {
		type: String,
		enum: enumValues(DONATION_STATUSES),
		required: true,
		default: DONATION_STATUSES.DRAFT
	},
	publishedAt: {
		type: Date,
		default: null
	},
	withdrawnAt: {
		type: Date,
		default: null
	},
	statusHistory: {
		type: [statusHistorySchema],
		default: []
	}
}, { timestamps: true });

donationSchema.index({ pickupLocation: "2dsphere" });
donationSchema.index({ status: 1 });
donationSchema.index({ foodCategory: 1 });
donationSchema.index({ expiresAt: 1 });
donationSchema.index({ availableUntil: 1 });
donationSchema.index({ createdByUserId: 1 });
donationSchema.index({ donorOrganizationId: 1 });
donationSchema.index({ "allocations.requestId": 1 });
donationSchema.index({ status: 1, foodCategory: 1, expiresAt: 1 });

donationSchema.pre("validate", function validateDonation() {
	const allocatedFromEntries = this.allocations.reduce(
		(total, allocation) => total + allocation.quantity,
		0
	);
	const requestIds = this.allocations.map((allocation) => allocation.requestId.toString());
	const uniqueRequestIds = new Set(requestIds);

	if (uniqueRequestIds.size !== requestIds.length) {
		this.invalidate("allocations", "A donation can have only one allocation per request");
	}

	if (Math.abs(allocatedFromEntries - this.allocatedQuantity) > 0.000001) {
		this.invalidate("allocatedQuantity", "Allocated quantity must equal the sum of allocations");
	}

	if (Math.abs(this.allocatedQuantity + this.remainingQuantity - this.totalQuantity) > 0.000001) {
		this.invalidate("remainingQuantity", "Allocated and remaining quantities must equal total quantity");
	}

	if (this.availableFrom >= this.availableUntil) {
		this.invalidate("availableUntil", "availableUntil must be after availableFrom");
	}

	if (this.preparedAt && this.expiresAt <= this.preparedAt) {
		this.invalidate("expiresAt", "expiresAt must be after preparedAt");
	}

	if (this.expiresAt <= this.availableFrom) {
		this.invalidate("expiresAt", "expiresAt must be after availableFrom");
	}

});

export default mongoose.model("Donation", donationSchema);
