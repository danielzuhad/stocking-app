import 'server-only';

import crypto from 'crypto';

import { env } from '@/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const TAG_LENGTH_BYTES = 16;

function getKey(): Buffer {
  return crypto.createHash('sha256').update(env.AUTH_SECRET).digest();
}

/**
 * Encrypts a JSON-serializable value into a compact base64url token.
 *
 * Note: this is meant for *opaque* URL state, not as a security boundary.
 */
export function encryptUrlState(value: unknown): string {
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const key = getKey();

  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, ciphertext]).toString('base64url');
}

/**
 * Decrypts a base64url token created by `encryptUrlState()`.
 */
export function decryptUrlState<T>(token: string): T {
  const raw = Buffer.from(token, 'base64url');
  if (raw.length < IV_LENGTH_BYTES + TAG_LENGTH_BYTES) {
    throw new Error('Invalid token');
  }

  const iv = raw.subarray(0, IV_LENGTH_BYTES);
  const tag = raw.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + TAG_LENGTH_BYTES);
  const ciphertext = raw.subarray(IV_LENGTH_BYTES + TAG_LENGTH_BYTES);

  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');

  return JSON.parse(plaintext) as T;
}

