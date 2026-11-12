import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getMasterKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_MASTER_KEY;
  if (!keyHex) {
    throw new Error("ENCRYPTION_MASTER_KEY environment variable is not set");
  }
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error(
      "ENCRYPTION_MASTER_KEY must be a 32-byte (64 hex character) key",
    );
  }
  return key;
}

export interface EncryptedPayload {
  encrypted: string;
  iv: string;
  tag: string;
}

export function encryptToken(plainText: string): EncryptedPayload {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = "";
  cipher.on("data", (chunk) => {
    encrypted += chunk.toString("hex");
  });
  cipher.on("end", () => {});

  cipher.write(plainText, "utf8");
  cipher.final();

  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

export function decryptToken(
  encrypted: string,
  ivHex: string,
  tagHex: string,
): string {
  const key = getMasterKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid initialization vector length");
  }
  if (tag.length !== TAG_LENGTH) {
    throw new Error("Invalid authentication tag length");
  }

  const encryptedBuffer = Buffer.from(encrypted, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = "";
  decipher.on("data", (chunk) => {
    decrypted += chunk.toString("utf8");
  });
  decipher.on("end", () => {});

  decipher.write(encryptedBuffer);
  decipher.final();

  return decrypted;
}
