export interface ILedgerEntry {
    account_id: number | string;
    transaction_id: string;
    type: 'DEBIT' | 'CREDIT';
    amount: number;
    currency: string;
    fx_rate: number;
    description: string;
    timestamp: Date;
    current_hash: string;
    previous_hash: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
}