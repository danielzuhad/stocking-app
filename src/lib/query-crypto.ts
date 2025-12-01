export type EncryptedQueryParams = Partial<{
  page: number;
  pageSize: number;
  search: string;
}>;

export const QUERY_PARAM_KEY = "q";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SECRET = process.env.NEXT_PUBLIC_QUERY_SECRET ?? "stocking-app-query-secret";

const toBase64 = (bytes: Uint8Array): string => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const getCrypto = (): Crypto => {
  if (typeof globalThis.crypto === "undefined") {
    throw new Error("Crypto API is not available in this environment");
  }
  return globalThis.crypto;
};

const deriveKey = async (secret: string): Promise<CryptoKey> => {
  const cryptoObj = getCrypto();
  const secretBytes = encoder.encode(secret);
  const hash = await cryptoObj.subtle.digest("SHA-256", secretBytes);
  return cryptoObj.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
};

export const encryptQueryParams = async (params: EncryptedQueryParams): Promise<string> => {
  const cryptoObj = getCrypto();
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(SECRET);
  const payload = encoder.encode(JSON.stringify(params));
  const encrypted = await cryptoObj.subtle.encrypt({ name: "AES-GCM", iv }, key, payload);

  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.byteLength);

  return toBase64(combined);
};

export const decryptQueryParams = async (token?: string | null): Promise<EncryptedQueryParams> => {
  if (!token) return {};

  try {
    const cryptoObj = getCrypto();
    const combined = fromBase64(token);
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const key = await deriveKey(SECRET);
    const decrypted = await cryptoObj.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    const decoded = decoder.decode(decrypted);

    const parsed = JSON.parse(decoded) as EncryptedQueryParams;
    return parsed ?? {};
  } catch (error) {
    console.error("Failed to decrypt query params", error);
    return {};
  }
};
