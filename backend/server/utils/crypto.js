import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function hashPassword(pwd) { return bcrypt.hash(pwd, 12); }
export async function comparePassword(pwd, hash) { return bcrypt.compare(pwd, hash); }
export function randomPassword(len = 16) { return crypto.randomBytes(len).toString("base64url").slice(0, len); }
export function randomToken(len = 48) { return crypto.randomBytes(len).toString("base64url"); }
