import { PayPeriodCalcMethod } from './entities/pay-period-calc-method.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockType, repositoryMockFactory } from '@repo/testing';
import { Repository } from 'typeorm';
import { PayPeriod } from './entities/pay-period.entity';
import { PayPeriodsService } from './pay-periods.service';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { createMock } from '@golevelup/ts-jest';
import { AccessService } from '../access/access.service';
import { PayrollsService } from '../payrolls/payrolls.service';
import { PositionsService } from '../positions/positions.service';

describe('PayPeriodsService', () => {
    let service: PayPeriodsService;
    let repoMock: MockType<Repository<PayPeriod>>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PayPeriodsService,
                {
                    provide: getRepositoryToken(PayPeriod),
                    useFactory: repositoryMockFactory,
                },
                {
                    provide: getRepositoryToken(PayPeriodCalcMethod),
                    useFactory: repositoryMockFactory,
                },
                { provide: UsersService, useValue: createMock<UsersService>() },
                { provide: AccessService, useValue: createMock<AccessService>() },
                { provide: CompaniesService, useValue: createMock<CompaniesService>() },
                { provide: PositionsService, useValue: createMock<PositionsService>() },
                { provide: PayrollsService, useValue: createMock<PayrollsService>() },
            ],
        }).compile();

        service = module.get<PayPeriodsService>(PayPeriodsService);
        repoMock = module.get(getRepositoryToken(PayPeriod));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
        expect(repoMock).toBeTruthy();
    });
});
