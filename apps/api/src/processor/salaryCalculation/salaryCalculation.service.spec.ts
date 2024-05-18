import { Test, TestingModule } from '@nestjs/testing';
import { SalaryCalculationService } from './salaryCalculation.service';
import { AccessService } from '../../resources/access/access.service';
import { CompaniesService } from '../../resources/companies/companies.service';
import { PayPeriodsService } from '../../resources/pay-periods/pay-periods.service';
import { createMock } from '@golevelup/ts-jest';
import { PositionsService } from '../../resources/positions/positions.service';
import { PayrollsService } from 'src/resources/payrolls/payrolls.service';

describe('ProcessorService', () => {
    let service: SalaryCalculationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SalaryCalculationService,
                { provide: AccessService, useValue: createMock<AccessService>() },
                { provide: CompaniesService, useValue: createMock<CompaniesService>() },
                { provide: PositionsService, useValue: createMock<PositionsService>() },
                { provide: PayrollsService, useValue: createMock<PayrollsService>() },
                { provide: PayPeriodsService, useValue: createMock<PayPeriodsService>() },
            ],
        }).compile();

        service = module.get<SalaryCalculationService>(SalaryCalculationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
