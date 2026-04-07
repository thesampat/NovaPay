export interface IPayrollBulk {
    sender: number,
    paylist: {
        receiver: number,
        amount: number
    }[],
    transactionId: string
}

export interface ISinglePayroll {
    sender: number,
    receiver: number,
    amount: number,
    transactionId: string
}