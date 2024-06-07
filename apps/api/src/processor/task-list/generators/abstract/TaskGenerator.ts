import { TaskStatus, TaskType } from '@repo/shared';
import { Task } from '../../../../resources/tasks/entities/task.entity';
import { TaskListService } from './../../task-list.service';

export abstract class TaskGenerator {
    ctx: TaskListService;
    type: TaskType;

    constructor(ctx: TaskListService, type: TaskType) {
        this.ctx = ctx;
        this.type = type;
    }

    public abstract getTaskList(): Promise<Task[]>;

    public makeTask(): Task {
        return Object.assign({
            id: this.ctx.id,
            companyId: this.ctx.company.id,
            type: this.type,
            dateFrom: this.ctx.payPeriod.dateFrom,
            dateTo: this.ctx.payPeriod.dateTo,
            sequenceNumber: this.ctx.sequenceNumber,
            status: TaskStatus.TODO,
        });
    }
}
