import crypto from "crypto";

// Server-side encryption secret (derived from ENCRYPTION_SECRET env var or fallback server key)
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || process.env.CLERK_SECRET_KEY || "startup_map_production_secure_encryption_key_2501";
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  return crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest();
}

/**
 * Encrypts a sensitive string (phone number, email, etc.) using AES-256-GCM.
 * Returns payload formatted as `iv:authTag:encryptedData`
 */
export function encryptData(text: string): string {
  if (!text) return "";
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error("Encryption error:", err);
    return text;
  }
}

/**
 * Decrypts an AES-256-GCM encrypted payload (`iv:authTag:encryptedData`).
 * Returns plain text, or original text if not encrypted format.
 */
export function decryptData(encryptedPayload: string): string {
  if (!encryptedPayload) return "";
  if (!encryptedPayload.includes(":")) return encryptedPayload; // return raw if unencrypted legacy format

  try {
    const parts = encryptedPayload.split(":");
    if (parts.length !== 3) return encryptedPayload;

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("Decryption error:", err);
    return encryptedPayload;
  }
}

/**
 * Masks a phone number for public display (e.g., "+91 98765 43210" -> "+91 98*** **210")
 * Keeps country code and last 3 digits, masking middle digits.
 */
export function maskPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return "";
  const cleaned = phone.trim();
  if (cleaned.length <= 4) return "****";

  const visibleEnd = cleaned.slice(-3);
  const prefix = cleaned.startsWith("+") ? cleaned.slice(0, 4) : "";
  const maskedMiddle = "*****";

  return prefix ? `${prefix} ${maskedMiddle} ${visibleEnd}` : `***** ${visibleEnd}`;
}

/**
 * Masks an email address for public display (e.g., "john.doe@example.com" -> "j***e@example.com")
 */
export function maskEmail(email: string | undefined | null): string {
  if (!email) return "";
  const parts = email.split("@");
  if (parts.length !== 2) return "****";

  const [name, domain] = parts;
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`;
  }

  const maskedName = `${name[0]}***${name[name.length - 1]}`;
  return `${maskedName}@${domain}`;
}
