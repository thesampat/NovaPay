export interface IEncryptedField {
    ciphertext: string,
    authTag: string,
    encryptedDek: string,
    keyAuthTag: string,
    iv: string
}

export interface IUSER {
    account_id: number,
    balance: number,
    currency: string,
    processed_transactions: string[],
    name?: IEncryptedField,
    age?: IEncryptedField,
    gender?: IEncryptedField
}