import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IUpdateJob } from '@repo/shared';
import { Job } from '../entities/job.entity';

export class UpdateJobDto
    extends PartialType(
        OmitType(Job, [
            'id',
            'createdDate',
            'createdUserId',
            'updatedDate',
            'updatedUserId',
            'deletedDate',
            'deletedUserId',
        ]),
    )
    implements IUpdateJob {}
