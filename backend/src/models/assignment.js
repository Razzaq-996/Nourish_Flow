import mongoose from "mongoose";
import { ASSIGNMENT_STATUSES, UNITS } from "../utils/constants.js";

const { Schema } = mongoose;
const enumValues = (values) => Object.values(values);

const statusHistorySchema = new Schema({
	status: {
		type: String,
		enum: enumValues(ASSIGNMENT_STATUSES),
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

const assignmentSchema = new Schema({
	donationId: {
		type: Schema.Types.ObjectId,
		ref: "Donation",
		required: true,
		immutable: true
	},
	requestId: {
		type: Schema.Types.ObjectId,
		ref: "FoodRequest",
		required: true,
		immutable: true
	},
	volunteerUserId: {
		type: Schema.Types.ObjectId,
		ref: "User",
		required: true,
		immutable: true
	},
	quantity: {
		type: Number,
		required: true,
		min: [0.000001, "Assignment quantity must be positive"]
	},
	unit: {
		type: String,
		enum: enumValues(UNITS),
		required: true,
		immutable: true
	},
	status: {
		type: String,
		enum: enumValues(ASSIGNMENT_STATUSES),
		required: true,
		default: ASSIGNMENT_STATUSES.PENDING
	},
	createdByUserId: {
		type: Schema.Types.ObjectId,
		ref: "User",
		required: true,
		immutable: true
	},
	assignedAt: {
		type: Date,
		default: Date.now,
		immutable: true
	},
	acceptedAt: {
		type: Date,
		default: null
	},
	rejectedAt: {
		type: Date,
		default: null
	},
	cancelledAt: {
		type: Date,
		default: null
	},
	pickupStartedAt: {
		type: Date,
		default: null
	},
	pickedUpAt: {
		type: Date,
		default: null
	},
	deliveryStartedAt: {
		type: Date,
		default: null
	},
	deliveredAt: {
		type: Date,
		default: null
	},
	completedAt: {
		type: Date,
		default: null
	},
	failedAt: {
		type: Date,
		default: null
	},
	failureReason: {
		type: String,
		trim: true,
		default: null
	},
	statusHistory: {
		type: [statusHistorySchema],
		default: []
	}
}, { timestamps: true });

assignmentSchema.index({ donationId: 1 });
assignmentSchema.index({ requestId: 1 });
assignmentSchema.index({ volunteerUserId: 1 });
assignmentSchema.index({ status: 1 });
assignmentSchema.index({ volunteerUserId: 1, status: 1 });
assignmentSchema.index(
	{ donationId: 1, requestId: 1 },
	{
		name: "active_assignment_per_allocation",
		unique: true,
		partialFilterExpression: {
			status: {
				$in: [
					ASSIGNMENT_STATUSES.PENDING,
					ASSIGNMENT_STATUSES.ACCEPTED,
					ASSIGNMENT_STATUSES.PICKUP_STARTED,
					ASSIGNMENT_STATUSES.PICKED_UP,
					ASSIGNMENT_STATUSES.DELIVERY_STARTED,
					ASSIGNMENT_STATUSES.DELIVERED
				]
			}
		}
	}
);
assignmentSchema.index({ deliveredAt: 1 });

assignmentSchema.pre("validate", function validateAssignment() {
	const physicalStatuses = [
		ASSIGNMENT_STATUSES.PICKUP_STARTED,
		ASSIGNMENT_STATUSES.PICKED_UP,
		ASSIGNMENT_STATUSES.DELIVERY_STARTED,
		ASSIGNMENT_STATUSES.DELIVERED,
		ASSIGNMENT_STATUSES.COMPLETED,
		ASSIGNMENT_STATUSES.FAILED
	];

	if (!this.isNew && this.isModified("quantity") && physicalStatuses.includes(this.status)) {
		this.invalidate("quantity", "Assignment quantity is immutable after pickup starts");
	}

	if (this.status === ASSIGNMENT_STATUSES.FAILED && !this.failureReason) {
		this.invalidate("failureReason", "failureReason is required for failed assignments");
	}

	if (this.pickedUpAt && !this.pickupStartedAt) {
		this.invalidate("pickedUpAt", "pickedUpAt requires pickupStartedAt");
	}

	if (this.deliveryStartedAt && !this.pickedUpAt) {
		this.invalidate("deliveryStartedAt", "deliveryStartedAt requires pickedUpAt");
	}

	if (this.deliveredAt && !this.deliveryStartedAt) {
		this.invalidate("deliveredAt", "deliveredAt requires deliveryStartedAt");
	}

	if (this.completedAt && !this.deliveredAt) {
		this.invalidate("completedAt", "completedAt requires deliveredAt");
	}

});

export default mongoose.model("Assignment", assignmentSchema);
