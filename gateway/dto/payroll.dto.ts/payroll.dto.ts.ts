export class PayrollBulkDto {
    sender: number
    paylist: {
        receiver: number
        amount: number
    }[]
    idempotencyKey: string
}