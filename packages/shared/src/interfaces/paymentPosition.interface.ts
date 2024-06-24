import { ILogger } from './logger.interface';
import { IPayment } from './payment.interface';
import { IPosition } from './position.interface';

export interface IPaymentPosition extends ILogger {
    id: number;
    payment?: IPayment;
    paymentId: number;
    position?: IPosition;
    positionId: number;
    grossPay?: number;
    deductions?: number;
    netPay?: number;
    funds?: number;
    status: string; // See enum PaymentStatus
    recordFlags?: number; // See enum RecordFlags
    description?: string;
}

export type ICreatePaymentPosition = Omit<
    IPaymentPosition,
    | 'id'
    | 'createdDate'
    | 'createdUserId'
    | 'updatedDate'
    | 'updatedUserId'
    | 'deletedDate'
    | 'deletedUserId'
    | 'version'
>;

export type IUpdatePaymentPosition = Partial<
    Omit<
        IPaymentPosition,
        | 'id'
        | 'createdDate'
        | 'createdUserId'
        | 'updatedDate'
        | 'updatedUserId'
        | 'deletedDate'
        | 'deletedUserId'
    >
>;
