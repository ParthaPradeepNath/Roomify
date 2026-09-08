import jwt from "jsonwebtoken";
import { config } from "./config";

export type JwtPayload = {
  sub: string;
};

export const signToken = (userId: string) =>
  jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);

export const verifyToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, config.jwtSecret);

  if (typeof decoded === "object" && decoded !== null && typeof decoded.sub === "string") {
    return { sub: decoded.sub };
  }

  throw new Error("Invalid token payload");
};
