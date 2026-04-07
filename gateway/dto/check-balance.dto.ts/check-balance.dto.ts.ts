import { IsDefined, isNumber, IsNumber, IsString } from "class-validator";

export class CheckBalanceDtoTs {
    @IsNumber()
    userId: number
}


export class PayDtoTs {
    @IsNumber()
    sender: number

    @IsNumber()
    receiver: number

    @IsNumber()
    amount: number

    @IsString()
    transactionId: string
}