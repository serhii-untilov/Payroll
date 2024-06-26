import { ILogger } from './logger.interface';
import { IPaymentType } from './paymentType.interface';
import { IPosition } from './position.interface';

export interface IPayroll extends ILogger {
    id: number;
    position?: IPosition;
    positionId: number;
    payPeriod: Date;
    accPeriod: Date;
    paymentType?: IPaymentType;
    paymentTypeId: number;
    dateFrom: Date; // Between accPeriod.dateFrom and accPeriod.dateTo
    dateTo: Date; // Between accPeriod.dateFrom and accPeriod.dateTo
    sourceType?: string; // See enum ResourceType
    sourceId?: number; // Depends on sourceType
    dateBegin?: Date; // Start date of Vacation, Sick, etc.
    dateEnd?: Date; // Finish date of Vacation, Sick, etc.
    planDays?: number;
    planHours?: number;
    planSum?: number;
    rate?: number;
    factDays?: number;
    factHours?: number;
    factSum?: number;
    mask1?: number;
    mask2?: number;
    recordFlags?: number;
    fixedFlags?: number;
    planHoursByDay?: HoursByDay;
    factHoursByDay?: HoursByDay;
    parentId?: number; // Link to fully or partially cancelled record, etc.
}

export type ICreatePayroll = Omit<
    IPayroll,
    | 'id'
    | 'createdDate'
    | 'createdUserId'
    | 'updatedDate'
    | 'updatedUserId'
    | 'deletedDate'
    | 'deletedUserId'
    | 'version'
>;

export type IUpdatePayroll = Partial<
    Omit<
        IPayroll,
        | 'id'
        | 'createdDate'
        | 'createdUserId'
        | 'updatedDate'
        | 'updatedUserId'
        | 'deletedDate'
        | 'deletedUserId'
    >
>;

export type IFindPayroll = Partial<IPayroll> & {
    companyId?: number;
    relations?: boolean;
};

export const enum RecordFlags {
    AUTO = 0x00001,
    HAND = 0x00002,
    IMPORT = 0x00004,
    CANCEL = 0x00008, // Сторно
}

export type HoursByDay = {
    1?: number;
    2?: number;
    3?: number;
    4?: number;
    5?: number;
    6?: number;
    7?: number;
    8?: number;
    9?: number;
    10?: number;
    11?: number;
    12?: number;
    13?: number;
    14?: number;
    15?: number;
    16?: number;
    17?: number;
    18?: number;
    19?: number;
    20?: number;
    21?: number;
    22?: number;
    23?: number;
    24?: number;
    25?: number;
    26?: number;
    27?: number;
    28?: number;
    29?: number;
    30?: number;
    31?: number;
};
