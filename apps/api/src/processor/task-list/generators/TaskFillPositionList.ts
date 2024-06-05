import { TaskStatus, TaskType } from '@repo/shared';
import { TaskListService } from '../task-list.service';
import { Task } from '../../../resources/tasks/entities/task.entity';
import { TaskGenerator } from './abstract/TaskGenerator';

export class TaskFillPositionList extends TaskGenerator {
    constructor(ctx: TaskListService, type: TaskType) {
        super(ctx, type);
    }

    async getTask(): Promise<Task | null> {
        const task = this.makeTask();
        const countEmployees = await this.ctx.positionsService.countEmployees(this.ctx.company.id);
        task.status = countEmployees ? TaskStatus.DONE : TaskStatus.TODO;
        if (countEmployees) {
            const countClosed = await this.ctx.payPeriodsService.countClosed(this.ctx.company.id);
            if (countClosed) {
                return null;
            }
        }
        return task;
    }
}
