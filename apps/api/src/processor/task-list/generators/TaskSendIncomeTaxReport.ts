import { TaskType, monthBegin } from '@repo/shared';
import { TaskListService } from '../task-list.service';
import { Task } from '../../../resources/tasks/entities/task.entity';
import { TaskGenerator } from './abstract/TaskGenerator';
import { add } from 'date-fns';
import { getWorkDayBeforeOrEqual } from 'src/processor/helpers/workingTime';

export class TaskSendIncomeTaxReport extends TaskGenerator {
    constructor(ctx: TaskListService, type: TaskType) {
        super(ctx, type);
    }

    async getTaskList(): Promise<Task[]> {
        const monthNumber = monthBegin(this.ctx.payPeriod.dateFrom).getMonth() + 1;
        if (monthNumber % 3 !== 0) {
            return [];
        }
        const countClosed = await this.ctx.payPeriodsService.countClosed(this.ctx.company.id);
        if (!countClosed) {
            return [];
        }
        const task = this.makeTask();
        task.dateFrom = monthBegin(this.ctx.payPeriod.dateFrom);
        task.dateTo = getWorkDayBeforeOrEqual(add(task.dateFrom, { days: 39 }));
        return [task];
    }
}
