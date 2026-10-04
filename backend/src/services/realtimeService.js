import jwt from "jsonwebtoken";
import Assignment from "../models/assignment.js";
import Donation from "../models/donation.js";
import FoodRequest from "../models/foodrequest.js";
import User from "../models/user.js";
import { USER_ROLES, USER_STATUSES } from "../utils/constants.js";

let io;

const userRoom = (userId) => `user:${userId}`;
const organizationRoom = (organizationId) => `organization:${organizationId}`;
const assignmentRoom = (assignmentId) => `assignment:${assignmentId}`;

const isObjectIdText = (value) => /^[a-f\d]{24}$/i.test(value);

const emitToRooms = (event, payload, rooms) => {
  if (!io) {
    return;
  }

  const uniqueRooms = [...new Set(rooms.filter(Boolean))];
  if (uniqueRooms.length === 0) {
    return;
  }

  io.to(uniqueRooms).emit(event, payload);
};

const canAccessAssignment = async (user, assignmentId) => {
  const assignment = await Assignment.findById(assignmentId).select("volunteerUserId donationId requestId");
  if (!assignment) {
    return false;
  }

  if (user.role === USER_ROLES.ADMIN) {
    return true;
  }

  if (user.role === USER_ROLES.VOLUNTEER
    && assignment.volunteerUserId.toString() === user._id.toString()) {
    return true;
  }

  const [donation, request] = await Promise.all([
    Donation.findById(assignment.donationId).select("createdByUserId"),
    FoodRequest.findById(assignment.requestId).select("organizationId")
  ]);

  if (user.role === USER_ROLES.DONOR
    && donation?.createdByUserId.toString() === user._id.toString()) {
    return true;
  }

  return user.role === USER_ROLES.ORG_ADMIN
    && user.organizationId
    && request?.organizationId.toString() === user.organizationId.toString();
};

const canJoinRoom = async (user, room) => {
  const [roomType, roomId] = room.split(":");
  if (!roomType || !isObjectIdText(roomId)) {
    return false;
  }

  if (roomType === "user") {
    return user._id.toString() === roomId;
  }

  if (roomType === "organization") {
    return user.role === USER_ROLES.ADMIN
      || (user.organizationId && user.organizationId.toString() === roomId);
  }

  if (roomType === "assignment") {
    return canAccessAssignment(user, roomId);
  }

  return false;
};

export const initializeRealtime = (socketServer) => {
  io = socketServer;

  io.use(async (socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token;
      const authorization = socket.handshake.headers.authorization;
      const token = authToken || authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

      if (!token || !process.env.JWT_SECRET) {
        return next(new Error("Unauthorized"));
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (!payload.sub) {
        return next(new Error("Unauthorized"));
      }

      const user = await User.findById(payload.sub);
      if (!user || user.status !== USER_STATUSES.ACTIVE) {
        return next(new Error("Unauthorized"));
      }

      socket.data.user = user;
      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    socket.join(userRoom(user._id));

    if (user.organizationId) {
      socket.join(organizationRoom(user.organizationId));
    }

    socket.on("room:join", async (room, acknowledge) => {
      const reply = typeof acknowledge === "function" ? acknowledge : () => {};

      if (typeof room !== "string" || !(await canJoinRoom(user, room))) {
        reply({ ok: false, error: "Unauthorized room" });
        socket.emit("room:error", { room, message: "Unauthorized room" });
        return;
      }

      await socket.join(room);
      reply({ ok: true, room });
    });

    socket.on("room:leave", async (room, acknowledge) => {
      if (typeof room === "string") {
        await socket.leave(room);
      }
      if (typeof acknowledge === "function") {
        acknowledge({ ok: true, room });
      }
    });
  });

  return io;
};

export const emitEvent = (event, payload, rooms = []) => {
  emitToRooms(event, payload, rooms);
};

export const emitDonationEvent = (event, donation) => {
  emitToRooms(event, { donation }, [
    userRoom(donation.createdByUserId),
    donation.donorOrganizationId && organizationRoom(donation.donorOrganizationId)
  ]);
};

export const emitRequestEvent = (event, request) => {
  emitToRooms(event, { request }, [
    userRoom(request.createdByUserId),
    organizationRoom(request.organizationId)
  ]);
};

export const emitAllocationEvents = (allocation, donation, request) => {
  const rooms = [
    userRoom(donation.createdByUserId),
    organizationRoom(request.organizationId)
  ];

  emitToRooms("donation:allocated", { allocation }, rooms);
  emitToRooms(
    request.status === "FULFILLED" ? "request:fulfilled" : "request:partially-fulfilled",
    { request: {
      requestId: request._id,
      fulfilledQuantity: request.fulfilledQuantity,
      remainingQuantity: request.remainingQuantity,
      status: request.status
    } },
    rooms
  );
};

export const emitAssignmentEvent = async (event, assignment) => {
  try {
    const [donation, request] = await Promise.all([
      Donation.findById(assignment.donationId).select("createdByUserId donorOrganizationId"),
      FoodRequest.findById(assignment.requestId).select("createdByUserId organizationId")
    ]);

    if (!donation || !request) {
      return;
    }

    emitToRooms(event, { assignment }, [
      userRoom(assignment.volunteerUserId),
      userRoom(request.createdByUserId),
      userRoom(donation.createdByUserId),
      organizationRoom(request.organizationId),
      assignmentRoom(assignment._id)
    ]);
  } catch {
    return;
  }
};

export { assignmentRoom, organizationRoom, userRoom };
