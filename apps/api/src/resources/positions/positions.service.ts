import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    forwardRef,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { AccessType, BalanceWorkingTime, PaymentPart, ResourceType, maxDate } from '@repo/shared';
import { sub } from 'date-fns';
import {
    And,
    FindManyOptions,
    FindOneOptions,
    IsNull,
    LessThan,
    LessThanOrEqual,
    MoreThanOrEqual,
    Not,
    Repository,
} from 'typeorm';
import { AccessService } from '../access/access.service';
import { PayrollsService } from '../payrolls/payrolls.service';
import { PayPeriodsService } from './../pay-periods/pay-periods.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { FindPositionDto } from './dto/find-position.dto';
import { FindAllPositionBalanceDto, PositionBalanceExtended } from './dto/position-balance.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PositionBalance } from './entities/position-balance.entity';
import { Position } from './entities/position.entity';
import { PositionCreatedEvent } from './events/position-created.event';
import { PositionDeletedEvent } from './events/position-deleted.event';
import { PositionUpdatedEvent } from './events/position-updated.event';

@Injectable()
export class PositionsService {
    public readonly resourceType = ResourceType.POSITION;

    constructor(
        @InjectRepository(Position)
        private repositoryPosition: Repository<Position>,
        @InjectRepository(PositionBalance)
        private repositoryPositionBalance: Repository<PositionBalance>,
        @Inject(forwardRef(() => PayPeriodsService))
        private readonly payPeriodsService: PayPeriodsService,
        @Inject(forwardRef(() => AccessService))
        private accessService: AccessService,
        @Inject(forwardRef(() => PayrollsService))
        private payrollsService: PayrollsService,
        private eventEmitter: EventEmitter2,
    ) {}

    async availableFindAllOrFail(userId: number, companyId: number) {
        await this.accessService.availableForUserCompanyOrFail(
            userId,
            companyId,
            this.resourceType,
            AccessType.ACCESS,
        );
    }

    async availableFindOneOrFail(userId: number, id: number) {
        const record = await this.repositoryPosition.findOneOrFail({ where: { id } });
        await this.accessService.availableForUserCompanyOrFail(
            userId,
            record.companyId,
            this.resourceType,
            AccessType.ACCESS,
        );
    }

    async availableCreateOrFail(userId: number, companyId: number) {
        await this.accessService.availableForUserCompanyOrFail(
            userId,
            companyId,
            this.resourceType,
            AccessType.CREATE,
        );
    }

    async availableUpdateOrFail(userId: number, id: number) {
        const record = await this.repositoryPosition.findOneOrFail({ where: { id } });
        await this.accessService.availableForUserCompanyOrFail(
            userId,
            record.companyId,
            this.resourceType,
            AccessType.UPDATE,
        );
    }

    async availableDeleteOrFail(userId: number, id: number) {
        const record = await this.repositoryPosition.findOneOrFail({ where: { id } });
        await this.accessService.availableForUserCompanyOrFail(
            userId,
            record.companyId,
            this.resourceType,
            AccessType.DELETE,
        );
    }

    async create(userId: number, payload: CreatePositionDto): Promise<Position> {
        if (payload?.cardNumber) {
            const existing = payload?.cardNumber
                ? await this.repositoryPosition.findOne({
                      where: { cardNumber: payload.cardNumber },
                  })
                : null;
            if (existing) {
                throw new BadRequestException(`Position '${payload.cardNumber}' already exists.`);
            }
        }

        const cardNumber = payload?.cardNumber || (await this.getNextCardNumber(payload.companyId));
        const created = await this.repositoryPosition.save({
            ...payload,
            cardNumber,
            createdUserId: userId,
            updatedUserId: userId,
        });
        this.eventEmitter.emit('position.created', new PositionCreatedEvent(userId, created));
        return created;
    }

    async findAll(userId: number, payload: FindPositionDto): Promise<Position[]> {
        const {
            companyId,
            onDate,
            onPayPeriodDate,
            relations,
            employeesOnly,
            vacanciesOnly,
            dismissedOnly,
            deletedOnly,
            includeDeleted,
        } = payload;
        const options: FindManyOptions<Partial<Position>> = {
            relations: {
                company: !!relations,
                person: !!relations,
                history: !!relations
                    ? {
                          department: true,
                          job: true,
                          workNorm: true,
                          paymentType: true,
                      }
                    : false,
            },
            where: { companyId },
        };
        if (deletedOnly) {
            options['withDeleted'] = true;
            options.where['deletedDate'] = Not(IsNull());
        }
        if (includeDeleted) {
            options['withDeleted'] = true;
        }
        if (employeesOnly) {
            options.where['personId'] = Not(IsNull());
        }
        if (vacanciesOnly) {
            options.where['personId'] = IsNull();
        }
        if (onDate) {
            options.where['dateFrom'] = LessThanOrEqual(onDate);
            options.where['dateTo'] = MoreThanOrEqual(onDate);
            if (relations) {
                options.relations['history'] = {
                    department: true,
                    job: true,
                    workNorm: true,
                    paymentType: true,
                };
                options.where['history'] = {
                    dateTo: MoreThanOrEqual(onDate),
                    dateFrom: LessThanOrEqual(onDate),
                };
            }
        }
        if (onPayPeriodDate) {
            const payPeriod = await this.payPeriodsService.findOne(userId, {
                where: {
                    companyId,
                    dateFrom: onPayPeriodDate,
                },
            });
            options.where['dateFrom'] = LessThanOrEqual(payPeriod.dateTo);
            options.where['dateTo'] = MoreThanOrEqual(payPeriod.dateFrom);
            if (relations) {
                options.relations['history'] = {
                    department: true,
                    job: true,
                    workNorm: true,
                    paymentType: true,
                };
                options.where['history'] = {
                    dateTo: MoreThanOrEqual(payPeriod.dateFrom),
                    dateFrom: LessThanOrEqual(payPeriod.dateTo),
                };
            }
        }
        if (dismissedOnly) {
            options.where['dateTo'] = options.where['dateTo']
                ? And(LessThan(maxDate()))
                : LessThan(maxDate());
        }
        return await this.repositoryPosition.find(options);
    }

    async findOne(
        userId: number,
        id: number,
        relations?: boolean,
        onDate?: Date,
        onPayPeriodDate?: Date,
    ): Promise<Position> {
        const position = await this.repositoryPosition.findOneOrFail({
            where: { id },
            relations: {
                company: !!relations,
                person: !!relations,
                history: !!relations
                    ? {
                          department: true,
                          job: true,
                          workNorm: true,
                          paymentType: true,
                      }
                    : false,
            },
        });
        if (!(onDate || onPayPeriodDate)) {
            return position;
        }
        const options: FindOneOptions<Partial<Position>> = {
            relations: {
                company: true,
                person: !!relations,
                history: !!relations
                    ? {
                          department: true,
                          job: true,
                          workNorm: true,
                          paymentType: true,
                      }
                    : false,
            },
            where: { id },
        };
        if (onDate && relations) {
            options.where['history'] = {
                dateTo: MoreThanOrEqual(onDate),
                dateFrom: LessThanOrEqual(onDate),
            };
        }
        if (onPayPeriodDate && relations) {
            const payPeriod = await this.payPeriodsService.findOne(userId, {
                where: {
                    companyId: position.companyId,
                    dateFrom: onPayPeriodDate,
                },
            });
            options.where['history'] = {
                dateTo: MoreThanOrEqual(payPeriod.dateFrom),
                dateFrom: LessThanOrEqual(payPeriod.dateTo),
            };
        }
        return await this.repositoryPosition.findOneOrFail(options);
    }

    async update(userId: number, id: number, payload: UpdatePositionDto): Promise<Position> {
        const record = await this.repositoryPosition.findOneOrFail({ where: { id } });
        if (payload.version !== record.version) {
            throw new ConflictException(
                'The record has been updated by another user. Try to edit it after reloading.',
            );
        }
        await this.repositoryPosition.save({ ...payload, id, updatedUserId: userId });
        const updated = await this.repositoryPosition.findOneOrFail({ where: { id } });
        this.eventEmitter.emit('position.updated', new PositionUpdatedEvent(userId, updated));
        return updated;
    }

    async remove(userId: number, id: number): Promise<Position> {
        await this.repositoryPosition.save({ id, deletedUserId: userId, deletedDate: new Date() });
        const deleted = await this.repositoryPosition.findOneOrFail({
            where: { id },
            withDeleted: true,
        });
        this.eventEmitter.emit('position.deleted', new PositionDeletedEvent(userId, deleted));
        return deleted;
    }

    async getNextCardNumber(companyId: number): Promise<string> {
        const first = await this.repositoryPosition.findOneBy({ companyId, cardNumber: '1' });
        if (!first) return '1';
        const result = await this.repositoryPosition.query(
            `select coalesce(min(cast(p."cardNumber" as integer)), 0) + 1 "freeNumber"
            from position p
            where p."companyId" = $1
                and p."deletedUserId" is NULL
                and p."cardNumber" ~ '^[0-9\.]+$' is true
                and not exists (
                    select null
                    from position p2
                    where p2."companyId" = $2
                        and p2."deletedUserId" is NULL
                        and (p2."cardNumber") ~ '^[0-9\.]+$' is true
                        and cast(p2."cardNumber" as integer) = cast(p."cardNumber" as integer)  + 1
                )
            `,
            [companyId, companyId],
        );

        return result[0].freeNumber.toString();
    }

    async calculateBalance(
        positionId: number,
        payPeriod: Date,
        balanceWorkingTime: BalanceWorkingTime,
    ) {
        const position = await this.repositoryPosition.findOneByOrFail({ id: positionId });
        const prevPayPeriod = await this.payPeriodsService.find({
            where: {
                companyId: position.companyId,
                dateTo: sub(payPeriod, { days: 1 }),
            },
        });
        const prevPositionBalance = prevPayPeriod
            ? await this.repositoryPositionBalance.findOne({
                  where: { positionId, payPeriod: prevPayPeriod.dateFrom },
              })
            : null;
        const paymentParts = await this.payrollsService.payrollPositionPaymentParts(
            positionId,
            payPeriod,
        );
        const paymentGroups = await this.payrollsService.payrollPositionPaymentGroups(
            positionId,
            payPeriod,
        );
        const positionBalance =
            (await this.repositoryPositionBalance.findOne({
                where: { positionId, payPeriod },
            })) || {};
        const inBalance = prevPositionBalance?.outBalance || 0;
        return this.repositoryPositionBalance.save({
            ...positionBalance,
            positionId,
            payPeriod,
            inBalance,
            ...balanceWorkingTime,
            ...paymentParts,
            ...paymentGroups,
            outBalance:
                inBalance +
                (paymentParts[PaymentPart.ACCRUALS] || 0) -
                (paymentParts[PaymentPart.DEDUCTIONS] || 0),
        });
    }

    async findAllBalance(
        userId: number,
        params: FindAllPositionBalanceDto,
    ): Promise<PositionBalanceExtended[]> {
        const payPeriod = await this.payPeriodsService.findOne(userId, {
            where: {
                companyId: params.companyId,
                dateFrom: params.payPeriod,
            },
        });
        const result = await this.repositoryPositionBalance.query(
            `select
                pb.id, pb."positionId", p."companyId", pb."payPeriod",
                pb."inBalance",
                pb.accruals, pb.deductions,
                pb."basic", pb."adjustments", pb."bonuses", pb."vacations", pb."sicks", pb."refunds", pb."other_accruals",
                pb."taxes", pb."payments", pb."other_deductions",
                pb."outBalance",
                p."cardNumber", p."sequenceNumber",
                to_char(p."dateFrom", 'yyyy-mm-dd') "dateFrom",
                to_char(p."dateTo", 'yyyy-mm-dd') "dateTo",
                p."personId", p2."firstName", p2."lastName", p2."middleName", p2."taxId",
                ph."departmentId", d."name" "departmentName",
                ph."jobId", j."name" "jobName",
                ph."workNormId", wn."name" "workNormName",
                ph."paymentTypeId", pt."name" "paymentTypeName", pt."calcMethod",
                ph.wage, ph.rate,
                pb."planDays", pb."planHours",
                pb."factDays", pb."factHours",
                t1."paySum" "paySumECB"
            from position_balance pb
            inner join "position" p on p.id = pb."positionId" and p."companyId" = $1
            inner join person p2 on p2.id = p."personId"
            inner join position_history ph on ph."positionId" = p.id and ph.id =
            (	select max(ph2.id)
                from position_history ph2
                where ph2."positionId" = p.id
                and ph2."dateFrom" =
                (	select max(ph3."dateFrom")
                    from position_history ph3
                    where ph3."positionId" = p.id
                    and ph3."dateFrom" <= $2
                )
            )
            left join department d on d.id = ph."departmentId"
            left join job j on j.id = ph."jobId"
            left join work_norm wn on wn.id = ph."workNormId"
            left join payment_type pt on pt.id = ph."paymentTypeId"
            left join (
            	select ppf.id, sum(pf."paySum") "paySum"
            	from pay_fund pf
            	inner join "position" ppf on ppf.id = pf."positionId"
            	inner join pay_fund_type pft on pft.id = pf."payFundTypeId"
            	where ppf."companyId" = $1
            		and pf."payPeriod" = $3
            		and pft."group" = 'ECB'
            	group by ppf.id
            ) t1 on pb."positionId" = t1.id
            where p."companyId" = $1
                and pb."payPeriod" = $3`,
            [params.companyId, payPeriod.dateTo, payPeriod.dateFrom],
        );
        const calcMethodBalance = await this.payrollsService.payrollCompanyCalcMethodsByPositions(
            params.companyId,
            payPeriod.dateFrom,
        );
        result.forEach((o) => {
            o.dateFrom = new Date(o.dateFrom);
            o.dateTo = new Date(o.dateTo);
            o.accruals = Number(o.accruals);
            o.adjustments = Number(o.adjustments);
            o.basic = Number(o.basic);
            o.bonuses = Number(o.bonuses);
            o.deductions = Number(o.deductions);
            o.inBalance = Number(o.inBalance);
            o.other_accruals = Number(o.other_accruals);
            o.other_deductions = Number(o.other_deductions);
            o.outBalance = Number(o.outBalance);
            o.payments = Number(o.payments);
            o.rate = Number(o.rate);
            o.refunds = Number(o.refunds);
            o.sicks = Number(o.sicks);
            o.taxes = Number(o.taxes);
            o.vacations = Number(o.vacations);
            o.wage = Number(o.wage);
            o.planDays = Number(o.planDays);
            o.planHours = Number(o.planHours);
            o.factDays = Number(o.factDays);
            o.factHours = Number(o.factHours);
            o.paySumECB = Number(o.paySumECB);
            o.calcMethodBalance = calcMethodBalance
                .filter((b) => b.positionId === o.positionId)
                .map((b) => {
                    return { calcMethod: b.calcMethod, factSum: Number(b.factSum) };
                });
        });
        return result;
    }

    async calcCompanyDebt(companyId: number, payPeriod: Date): Promise<number> {
        const result = await this.repositoryPositionBalance
            .createQueryBuilder('balance')
            .select('SUM(balance.outBalance)', 'companyDebt')
            .innerJoin('balance.position', 'position')
            .where('position.companyId = :companyId', { companyId })
            .andWhere('balance.payPeriod = :payPeriod', { payPeriod })
            .andWhere('balance.outBalance > 0')
            .getRawOne();
        return Number(result?.companyDebt);
    }

    async calcEmployeeDebt(companyId: number, payPeriod: Date): Promise<number> {
        const result = await this.repositoryPositionBalance
            .createQueryBuilder('balance')
            .select('SUM(balance.outBalance)', 'employeeDebt')
            .innerJoin('balance.position', 'position')
            .where('position.companyId = :companyId', { companyId })
            .andWhere('balance.payPeriod = :payPeriod', { payPeriod })
            .andWhere('balance.outBalance < 0')
            .getRawOne();
        return Number(result?.employeeDebt);
    }
}
