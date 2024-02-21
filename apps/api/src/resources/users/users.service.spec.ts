import * as _ from 'lodash';
import { randEmail } from '@ngneat/falso';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { Repository } from 'typeorm';
import { MockType } from '@repo/utils';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { repositoryMockFactory } from '@repo/utils';
import { createMockUser } from '@repo/utils';
import { CreateUserDto } from './dto/create-user.dto';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
    let service: UsersService;
    let repoMock: MockType<Repository<User>>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: getRepositoryToken(User),
                    useFactory: repositoryMockFactory,
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        repoMock = module.get(getRepositoryToken(User));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
        expect(repoMock).toBeTruthy();
    });

    it('should be able to create a user', async () => {
        const user = createMockUser();
        const createUser: CreateUserDto = _.omit(user, ['id']);
        repoMock.findOne?.mockReturnValue(null);
        repoMock.save?.mockReturnValue(createUser);
        const newUser = await service.create(createUser);
        expect(newUser).toStrictEqual(createUser);
        expect(repoMock.save).toHaveBeenCalled();
    });

    it('should successfully find a user', async () => {
        const user = createMockUser();
        repoMock.findOne?.mockReturnValue(user);
        const params = { where: { id: user.id } };
        expect(await service.findOne(params)).toStrictEqual(user);
        expect(repoMock.findOne).toHaveBeenCalledWith(params);
    });

    it('should throw if a user could not be found', async () => {
        repoMock.findOneBy?.mockImplementation(() => null);
        try {
            await service.findOne(-1);
        } catch (err) {
            expect(err).toBeInstanceOf(NotFoundException);
        }
    });

    it('should find a user by email', async () => {
        const user = createMockUser();
        repoMock.findOneBy?.mockReturnValue(user);
        expect(await service.findOneBy({ email: user.email })).toStrictEqual(user);
        expect(repoMock.findOneBy).toHaveBeenCalledWith({ email: user.email });
    });

    it('should throw if a user could not be found by email', async () => {
        repoMock.findOneBy?.mockImplementation(() => null);
        try {
            await service.findOneBy({ email: 'foo' });
        } catch (err) {
            expect(err).toBeInstanceOf(NotFoundException);
        }
    });

    it('should update a user if it exists', async () => {
        const user = createMockUser();
        const newEmail = randEmail();
        repoMock.findOneBy?.mockReturnValue(user);
        repoMock.save?.mockReturnValue({ ...user, email: newEmail });
        repoMock.findOneOrFail?.mockReturnValue({ ...user, email: newEmail });
        const res = await service.update(user.id, { email: newEmail });
        expect(res).toStrictEqual({ ...user, email: newEmail });
    });

    it('should throw if a user could not be found during update', async () => {
        repoMock.findOneBy?.mockImplementation(() => null);
        try {
            await service.update(0, {});
        } catch (err) {
            expect(err).toBeInstanceOf(NotFoundException);
        }
    });

    it('should remove a user if it exists', async () => {
        const user = createMockUser();
        repoMock.findOneBy?.mockReturnValue(user);
        const res = await service.remove(user.id);
        expect(res).toStrictEqual(user);
    });

    it('should throw if a user could not be found during remove', async () => {
        repoMock.findOneBy?.mockImplementation(() => null);
        try {
            await service.remove(-1);
        } catch (err) {
            expect(err).toBeInstanceOf(NotFoundException);
        }
    });
});
