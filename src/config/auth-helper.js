import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
// Derive a stable 32-byte key from the ADMIN_PASSWORD (fallback to admin123 if not set)
const ENCRYPTION_KEY = crypto.scryptSync(
  process.env.ADMIN_PASSWORD || "admin123",
  "cruzdev-salt-session",
  32
);
const IV_LENGTH = 16;

export function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decrypt(text) {
  try {
    const textParts = text.split(":");
    if (textParts.length < 2) return null;
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    return null;
  }
}

/**
 * Creates an encrypted session token string.
 */
export function createSessionToken(email) {
  const sessionData = {
    email,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 Hours duration
  };
  return encrypt(JSON.stringify(sessionData));
}

/**
 * Validates a session cookie string and returns the session payload if valid.
 */
export function validateSessionToken(token) {
  if (!token) return null;
  const decrypted = decrypt(token);
  if (!decrypted) return null;

  try {
    const session = JSON.parse(decrypted);
    if (!session || !session.email || !session.exp) return null;

    // Check if session has expired
    if (Date.now() > session.exp) return null;

    return session;
  } catch (err) {
    return null;
  }
}

/**
 * Helper to verify requests (from middleware or API routes).
 * Returns true if authenticated, false otherwise.
 */
export function verifyAdminSession(request) {
  // Check if Microsoft Entra ID is configured. If not, fallback to false (to force password login checks)
  const azureAdEnabled = !!process.env.AZURE_AD_CLIENT_ID;
  if (!azureAdEnabled) return false;

  const cookieHeader = request.cookies.get("cruzdev_admin_session")?.value;
  if (!cookieHeader) return false;

  const session = validateSessionToken(cookieHeader);
  if (!session) return false;

  const allowedEmail = process.env.ADMIN_EMAIL || "";
  // In multitenant / bypass mode, if ADMIN_EMAIL is empty, let it pass, otherwise enforce email match
  if (allowedEmail && session.email.toLowerCase() !== allowedEmail.toLowerCase()) {
    return false;
  }

  return true;
}
