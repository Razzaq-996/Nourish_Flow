import mongoose from "mongoose";
import {
	FOOD_CATEGORIES,
	FOOD_REQUEST_STATUSES,
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
			message: "deliveryLocation coordinates must be [longitude, latitude]"
		}
	}
}, { _id: false });

const statusHistorySchema = new Schema({
	status: {
		type: String,
		enum: enumValues(FOOD_REQUEST_STATUSES),
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

const foodRequestSchema = new Schema({
	organizationId: {
		type: Schema.Types.ObjectId,
		ref: "Organization",
		required: true,
		immutable: true
	},
	createdByUserId: {
		type: Schema.Types.ObjectId,
		ref: "User",
		required: true,
		immutable: true
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
	fulfilledQuantity: {
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
	deliveryLocation: {
		type: pointSchema,
		required: true
	},
	neededBy: {
		type: Date,
		required: true
	},
	status: {
		type: String,
		enum: enumValues(FOOD_REQUEST_STATUSES),
		required: true,
		default: FOOD_REQUEST_STATUSES.DRAFT
	},
	openedAt: {
		type: Date,
		default: null
	},
	fulfilledAt: {
		type: Date,
		default: null
	},
	cancelledAt: {
		type: Date,
		default: null
	},
	statusHistory: {
		type: [statusHistorySchema],
		default: []
	}
}, { timestamps: true });

foodRequestSchema.index({ deliveryLocation: "2dsphere" });
foodRequestSchema.index({ organizationId: 1 });
foodRequestSchema.index({ status: 1 });
foodRequestSchema.index({ foodCategory: 1 });
foodRequestSchema.index({ neededBy: 1 });
foodRequestSchema.index({ status: 1, foodCategory: 1, neededBy: 1 });

foodRequestSchema.pre("validate", function validateFoodRequest() {
	if (Math.abs(this.fulfilledQuantity + this.remainingQuantity - this.totalQuantity) > 0.000001) {
		this.invalidate("remainingQuantity", "Fulfilled and remaining quantities must equal total quantity");
	}

});

export default mongoose.model("FoodRequest", foodRequestSchema);
