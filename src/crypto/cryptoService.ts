import CryptoJS from 'react-native-crypto-js';

export class CryptoService {
  /**
   * Encrypts a given text using AES encryption with the provided key.
   * @param text - The plaintext to encrypt.
   * @param key - The encryption key. If longer than 32 characters, it will be truncated.
   * @returns The encrypted text as a string, or `undefined` if encryption fails.
   */
  static encryptionAES(text: string, key: string) {
    try {
      const tokenKey = key.length > 32 ? key.substring(0, 32) : key;
      const _key = CryptoJS.enc.Utf8.parse(tokenKey);
      const iv = CryptoJS.enc.Utf8.parse(tokenKey.substring(0, 16));

      const cipherText = CryptoJS.AES.encrypt(text, _key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      return cipherText.toString();
    } catch (error) {
      console.log("Error: Encryption failed", error);
      return undefined;
    }
  }

  /**
   * Decrypts a given AES-encrypted text using the provided key.
   * @param text - The encrypted text to decrypt.
   * @param key - The decryption key. If longer than 32 characters, it will be truncated.
   * @returns The decrypted plaintext as a string, or `undefined` if decryption fails.
   */
  static decryptionAES(text: string, key: string) {
    try {
      const tokenKey = key.length > 32 ? key.substring(0, 32) : key;
      const _key = CryptoJS.enc.Utf8.parse(tokenKey);
      const iv = CryptoJS.enc.Utf8.parse(tokenKey.substring(0, 16));

      const decrypted = CryptoJS.AES.decrypt(text, _key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.log("Error: Decryption failed", error);
      return undefined;
    }
  }

  /**
   * Decrypts the token from a given URL and extracts the base URL, appointment ID, and decrypted token.
   * @param url - The URL containing the `appointment_id` and `token_encrypt` parameters.
   * @returns An object containing the `baseUrl`, `appointmentId`, and decrypted `token`, or `undefined` if decryption fails.
   */
  decryptWS6Url(url: string) {
    try {
      // Extract the base URL (everything before the query parameters)
      const [baseUrl, queryString] = url.split('?');
      if (!queryString) {
        throw new Error('Invalid URL: Missing query parameters');
      }

      // Parse the query parameters
      const urlParams = new URLSearchParams(queryString);
      const appointmentId = urlParams.get('appointment_id');
      const encryptedToken = urlParams.get('token_encrypt');

      if (!appointmentId || !encryptedToken) {
        throw new Error('Missing required parameters: appointment_id or token_encrypt');
      }

      // Decrypt the token
      const decryptedToken = CryptoService.decryptionAES(decodeURIComponent(encryptedToken), appointmentId);

      if (!decryptedToken) {
        throw new Error('Failed to decrypt the token');
      }

      // Return the base URL, appointment ID, and decrypted token
      return { baseUrl, appointmentId, token: decryptedToken };
    } catch (error) {
      console.error('Error decrypting WS6 URL:', error);
      return undefined;
    }
  }
}

/**
 * Factory function to create an instance of CryptoService.
 * @returns A new instance of CryptoService.
 */
export function createCryptoService() {
  return new CryptoService();
}
