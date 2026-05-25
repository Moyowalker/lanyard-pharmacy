import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SCRYPT_KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');

  if (!salt || !hash) {
    return false;
  }

  const expectedHash = Buffer.from(hash, 'hex');
  const providedHash = scryptSync(password, salt, SCRYPT_KEY_LENGTH);

  if (expectedHash.length !== providedHash.length) {
    return false;
  }

  return timingSafeEqual(expectedHash, providedHash);
}
