import { Module, forwardRef } from '@nestjs/common';
import { AccessModule } from '../resources/access/access.module';
import { CompaniesModule } from '../resources/companies/companies.module';
import { PayPeriodsModule } from '../resources/pay-periods/pay-periods.module';
import { PaymentTypesModule } from '../resources/payment-types/payment-types.module';
import { PayrollsModule } from '../resources/payrolls/payrolls.module';
import { PositionsModule } from '../resources/positions/positions.module';
import { WorkNormsModule } from '../resources/work-norms/work-norms.module';
import { MinWageModule } from './../resources/min-wage/min-wage.module';
import { PayFundTypesModule } from './../resources/pay-fund-types/pay-fund-types.module';
import { PayFundsModule } from './../resources/pay-funds/pay-funds.module';
import { TasksModule } from './../resources/tasks/tasks.module';
import { CompanyListenerService } from './listeners/company-listener/company-listener.service';
import { PositionListenerService } from './listeners/position-listener/position-listener.service';
import { PayFundCalculationService } from './payFundCalculation/payFundCalculation.service';
import { PayrollCalculationService } from './payrollCalculation/payrollCalculation.service';
import { TaskListService } from './task-list/task-list.service';

@Module({
    imports: [
        forwardRef(() => AccessModule),
        forwardRef(() => PaymentTypesModule),
        forwardRef(() => PayFundTypesModule),
        forwardRef(() => CompaniesModule),
        forwardRef(() => PositionsModule),
        forwardRef(() => PayrollsModule),
        forwardRef(() => PayFundsModule),
        forwardRef(() => PayPeriodsModule),
        forwardRef(() => WorkNormsModule),
        forwardRef(() => MinWageModule),
        forwardRef(() => TasksModule),
    ],
    controllers: [],
    providers: [
        PayrollCalculationService,
        PositionListenerService,
        PayFundCalculationService,
        CompanyListenerService,
        TaskListService,
    ],
    exports: [PayrollCalculationService, PayFundCalculationService],
})
export class ProcessorModule {}
