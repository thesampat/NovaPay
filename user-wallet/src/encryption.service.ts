import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

@Injectable()
export class EncryptionService {
  // In production, this Master Key (KEK) would come from AWS KMS or a Vault
  // Here we use a deterministic "Safe Key" derived from a secret string
  private readonly MASTER_KEY = createHash('sha256').update('your-ultra-secret-vault-key').digest();
  private readonly ALGORITHM = 'aes-256-gcm';

  encrypt(plaintext: string) {
    // 1. Generate a fresh DEK (Data Encryption Key) for THIS specific record
    const dek = randomBytes(32);
    const iv = randomBytes(16);

    // 2. Encrypt the actual data using the DEK
    const cipher = createCipheriv(this.ALGORITHM, dek, iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // 3. ENVELOPE: Encrypt the DEK itself using the MASTER_KEY (KEK)
    const keyCipher = createCipheriv(this.ALGORITHM, this.MASTER_KEY, iv);
    let encryptedDek = keyCipher.update(dek.toString('hex'), 'utf8', 'hex');
    encryptedDek += keyCipher.final('hex');
    const keyAuthTag = keyCipher.getAuthTag().toString('hex');

    return {
      ciphertext,
      authTag,
      encryptedDek,
      keyAuthTag,
      iv: iv.toString('hex'),
    };
  }

  decrypt(data: { ciphertext: string, authTag: string, encryptedDek: string, keyAuthTag: string, iv: string }) {
    const iv = Buffer.from(data.iv, 'hex');

    // 1. UNWRAP: Decrypt the DEK using the MASTER_KEY
    const keyDecipher = createDecipheriv(this.ALGORITHM, this.MASTER_KEY, iv);
    keyDecipher.setAuthTag(Buffer.from(data.keyAuthTag, 'hex'));
    let decryptedDekHex = keyDecipher.update(data.encryptedDek, 'hex', 'utf8');
    decryptedDekHex += keyDecipher.final('utf8');
    const dek = Buffer.from(decryptedDekHex, 'hex');

    // 2. DECRYPT: Decrypt the actual data using the recovered DEK
    const decipher = createDecipheriv(this.ALGORITHM, dek, iv);
    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
    let plaintext = decipher.update(data.ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }
}
