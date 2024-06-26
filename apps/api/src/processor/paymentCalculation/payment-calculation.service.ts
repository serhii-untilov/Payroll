import { Inject, Injectable, Logger, Scope, forwardRef } from '@nestjs/common';
import { CalcMethod, PaymentGroup, PaymentStatus, dateUTC } from '@repo/shared';
import { PayPeriod } from '../../resources/pay-periods/entities/payPeriod.entity';
import { PayPeriodsService } from '../../resources/pay-periods/payPeriods.service';
import { PayPeriodCalculationService } from '../payPeriodCalculation/payPeriodCalculation.service';
import { CompaniesService } from './../../resources/companies/companies.service';
import { Company } from './../../resources/companies/entities/company.entity';
import { PaymentType } from './../../resources/payment-types/entities/payment-type.entity';
import { PaymentTypesService } from './../../resources/payment-types/payment-types.service';
import { PaymentPosition } from '../../resources/payments/payment-positions/entities/paymentPosition.entity';
import { PaymentPositionsService } from '../../resources/payments/payment-positions/payment-positions.service';
import { PaymentsService } from './../../resources/payments/payments.service';
import { Payroll } from './../../resources/payrolls/entities/payroll.entity';
import { PayrollsService } from './../../resources/payrolls/payrolls.service';
import { Position } from './../../resources/positions/entities/position.entity';
import { PositionsService } from './../../resources/positions/positions.service';
import { PaymentCalc_Advance } from './calcMethods/PaymentCalc_Advance';
import { PaymentCalc_Fast } from './calcMethods/PaymentCalc_Fast';
import { PaymentCalc_Regular } from './calcMethods/PaymentCalc_Regular';
import { PaymentCalc } from './calcMethods/abstract/PaymentCalc';
import { Payment } from './../../resources/payments/entities/payment.entity';
import { PayFund } from './../../resources/pay-funds/entities/pay-fund.entity';
import { PayFundsService } from './../../resources/pay-funds/pay-funds.service';

@Injectable({ scope: Scope.REQUEST })
export class PaymentCalculationService {
    logger: Logger = new Logger(PaymentCalculationService.name);
    userId: number;
    company: Company;
    paymentTypes: PaymentType[];
    position: Position;
    payPeriod: PayPeriod;
    accPeriods: PayPeriod[];
    payrolls: Payroll[];
    payFunds: PayFund[];
    paymentPositions: PaymentPosition[];
    paymentPositionId: number;

    constructor(
        @Inject(forwardRef(() => CompaniesService))
        private companiesService: CompaniesService,
        @Inject(forwardRef(() => PaymentTypesService))
        private paymentTypesService: PaymentTypesService,
        @Inject(forwardRef(() => PayPeriodsService))
        private payPeriodsService: PayPeriodsService,
        @Inject(forwardRef(() => PositionsService))
        private positionsService: PositionsService,
        @Inject(forwardRef(() => PayrollsService))
        private payrollsService: PayrollsService,
        @Inject(forwardRef(() => PayFundsService))
        private payFundsService: PayFundsService,
        @Inject(forwardRef(() => PaymentsService))
        private paymentsService: PaymentsService,
        @Inject(forwardRef(() => PaymentPositionsService))
        private paymentPositionsService: PaymentPositionsService,
        @Inject(forwardRef(() => PayPeriodCalculationService))
        public payPeriodCalculationService: PayPeriodCalculationService,
    ) {}

    private initPaymentPositionId() {
        this.paymentPositionId = this.paymentPositions.reduce((a, b) => Math.max(a, b.id), 0);
    }

    public getNextPaymentPositionId(): number {
        this.paymentPositionId++;
        return this.paymentPositionId;
    }

    public async calculateCompany(userId: number, companyId: number) {
        this.logger.log(`userId: ${userId}, calculateCompany: ${companyId}`);
        this.userId = userId;
        this.company = await this.companiesService.findOne(userId, companyId);
        await this.loadResources();
        this.payPeriod = await this.payPeriodsService.findOne({
            where: { companyId: this.company.id, dateFrom: this.company.payPeriod },
        });
        const positions = await this.positionsService.findAll(userId, {
            companyId,
            onPayPeriodDate: this.company.payPeriod,
            employeesOnly: true,
            relations: true,
        });
        const changedPaymentIds: number[] = [];
        for (const position of positions) {
            this.position = position;
            changedPaymentIds.push(...(await this._calculatePosition()));
        }
        await this.paymentsService.updateTotals(
            this.userId,
            changedPaymentIds.filter(
                (id, index, array) => index === array.findIndex((o) => o === id),
            ),
        );
    }

    public async calculatePosition(userId: number, positionId: number) {
        this.logger.log(`userId: ${userId}, calculatePosition: ${positionId}`);
        this.position = await this.positionsService.findOne(positionId, true);
        this.userId = userId;
        this.company = await this.companiesService.findOne(userId, this.position.companyId);
        await this.loadResources();
        this.payPeriod = await this.payPeriodsService.findOne({
            where: { companyId: this.company.id, dateFrom: this.company.payPeriod },
        });
        const changedPaymentIds = await this._calculatePosition();
        await this.paymentsService.updateTotals(
            this.userId,
            changedPaymentIds.filter(
                (id, index, array) => index === array.findIndex((o) => o === id),
            ),
        );
    }

    private async _calculatePosition(): Promise<number[]> {
        this.payrolls = await this.getPayrolls();
        this.payFunds = await this.getPayFunds();
        this.paymentPositions = await this.getPaymentPositions();
        this.initPaymentPositionId();
        const paymentTypeList = this.paymentTypes.filter(
            (o) => o.paymentGroup === PaymentGroup.PAYMENTS,
        );
        const current: PaymentPosition[] = [];
        for (const paymentType of paymentTypeList) {
            // Pass copy of objects to prevent mutation
            const calcMethod = this.calcMethodFactory({ ...paymentType }, [...current]);
            if (calcMethod) {
                current.push(calcMethod.calculate());
            }
        }
        const { toInsert, toDelete } = this.merge(current);
        return await this.save(toInsert, toDelete);
    }

    private calcMethodFactory(paymentType: PaymentType, current: PaymentPosition[]): PaymentCalc {
        if (paymentType.calcMethod === CalcMethod.REGULAR_PAYMENT) {
            return new PaymentCalc_Regular(this, paymentType, current);
        } else if (paymentType.calcMethod === CalcMethod.ADVANCE_PAYMENT) {
            return new PaymentCalc_Advance(this, paymentType, current);
        } else if (paymentType.calcMethod === CalcMethod.FAST_PAYMENT) {
            return new PaymentCalc_Fast(this, paymentType, current);
        }
        return null;
    }

    private async save(
        toInsert: PaymentPosition[],
        toDelete: PaymentPosition[],
    ): Promise<number[]> {
        const changedPaymentIds: number[] = [];
        for (const paymentPosition of toDelete) {
            changedPaymentIds.push(paymentPosition.payment.id);
            await this.paymentPositionsService.delete([paymentPosition.id]);
        }
        for (const paymentPosition of toInsert) {
            let payment = await this.paymentsService.findOneBy({
                companyId: this.company.id,
                paymentTypeId: paymentPosition.payment.paymentTypeId,
                status: PaymentStatus.DRAFT,
            });
            if (!payment) {
                payment = await this.createPayment(paymentPosition.payment);
            }
            changedPaymentIds.push(payment.id);
            delete paymentPosition.payment;
            delete paymentPosition.id;
            paymentPosition.paymentId = payment.id;
            const created = await this.paymentPositionsService.create(this.userId, paymentPosition);
            this.logger.log(`PositionId: ${this.position.id}, Inserted: ${created.id}`);
        }
        return changedPaymentIds;
    }

    private collapse(paymentPositions: PaymentPosition[]): PaymentPosition[] {
        return paymentPositions.reduce((a, b) => {
            const found = a.find((o) => o.payment.paymentTypeId === b.payment.paymentTypeId);
            if (found) {
                found.paySum = found.paySum + b.paySum;
            } else {
                a.push(b);
            }
            return a;
        }, []);
    }

    private merge(current: PaymentPosition[]): {
        toDelete: PaymentPosition[];
        toInsert: PaymentPosition[];
    } {
        const toDelete: PaymentPosition[] = this.paymentPositions.filter(
            (p) =>
                p.payment.status === PaymentStatus.DRAFT &&
                !current.find(
                    (c) =>
                        c.payment.paymentTypeId === p.payment.paymentTypeId &&
                        c.baseSum === p.baseSum &&
                        c.deductions === p.deductions &&
                        c.funds === p.funds &&
                        c.paySum === p.paySum,
                ),
        );
        const paymentPositions = this.collapse(
            this.paymentPositions.filter((o) => !toDelete.find((d) => d.id === o.id)),
        );
        const toInsert: PaymentPosition[] = current
            .filter(
                (c) =>
                    !paymentPositions.find(
                        (p) =>
                            p.payment.paymentTypeId === c.payment.paymentTypeId &&
                            p.baseSum === c.baseSum &&
                            p.deductions === c.deductions &&
                            p.funds === c.funds &&
                            p.paySum === c.paySum,
                    ),
            )
            .map((c) => {
                const found = paymentPositions.find(
                    (p) => p.payment.paymentTypeId === c.payment.paymentTypeId,
                );
                if (found) {
                    c.baseSum = c.baseSum - found.baseSum;
                    c.deductions = c.deductions - found.deductions;
                    c.funds = c.funds - found.funds;
                    c.paySum = c.paySum - found.paySum;
                }
                return c;
            })
            .filter((o) => o.paySum > 0);
        return { toInsert, toDelete };
    }

    private async loadResources() {
        this.paymentTypes = await this.paymentTypesService.findAll(null);
    }

    private async getPayrolls(): Promise<Payroll[]> {
        return await this.payrollsService.findAll(this.userId, {
            positionId: this.position.id,
            payPeriod: this.payPeriod.dateFrom,
        });
    }

    private async getPayFunds(): Promise<PayFund[]> {
        return await this.payFundsService.findAll(this.userId, {
            positionId: this.position.id,
            payPeriod: this.payPeriod.dateFrom,
        });
    }

    private async getPaymentPositions(): Promise<PaymentPosition[]> {
        return await this.paymentPositionsService.findByPositionId(
            this.position.id,
            this.payPeriod.dateFrom,
        );
    }

    private async createPayment(payment: Payment): Promise<Payment> {
        delete payment.id;
        payment.docNumber = await this.paymentsService.getNextDocNumber(
            this.company.id,
            this.payPeriod.dateFrom,
        );
        payment.docDate = dateUTC(payment.dateFrom);
        return await this.paymentsService.create(this.userId, payment);
    }
}
