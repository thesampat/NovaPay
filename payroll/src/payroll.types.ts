export interface IPayrollBulk {
    sender: number,
    paylist: {
        receiver: number,
        amount: number
    }[]
}

export interface ISinglePayroll {
    sender: number,
    receiver: number,
    amount: number
}