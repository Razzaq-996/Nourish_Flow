import jwt from "jsonwebtoken";

export const generateToken = (userId) => {

	if (!process.env.JWT_SECRET) {
		throw new Error("JWT authentication is not configured");
	}

	return jwt.sign(
		{ sub: userId.toString() },
		process.env.JWT_SECRET,
		{ expiresIn: "1d" }
	);
};
