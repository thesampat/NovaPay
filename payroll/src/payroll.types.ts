export interface IPayrollBulk {
    sender: number,
    paylist: {
        receiver: number,
        amount: number
    }[],
    idempotencyKey: string
}

export interface ISinglePayroll {
    sender: number,
    receiver: number,
    amount: number,
    idempotencyKey: string
}