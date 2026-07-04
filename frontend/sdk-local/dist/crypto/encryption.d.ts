/**
 * Note encryption using AES-256-GCM with PBKDF2-derived keys.
 * Uses Web Crypto API (Node.js 18+ / modern browsers).
 */
export interface EncryptedData {
    ciphertext: string;
    iv: string;
    salt: string;
}
/** Encrypt a string with a password. Returns base64-encoded ciphertext + metadata. */
export declare function encrypt(data: string, password: string): Promise<EncryptedData>;
/** Decrypt encrypted data with a password. Returns the original string. */
export declare function decrypt(encrypted: EncryptedData, password: string): Promise<string>;
//# sourceMappingURL=encryption.d.ts.map