export interface ILedgerEntry {
    account_id: number;
    transaction_id: string;
    type: 'DEBIT' | 'CREDIT';
    amount: number;
    currency: string;
    fx_rate: number;
    description: string;
    timestamp: Date;
}