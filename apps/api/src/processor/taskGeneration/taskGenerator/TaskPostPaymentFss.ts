import { TaskType } from '@repo/shared';
import { TaskGenerationService } from '../taskGeneration.service';
import { Task } from '../../../resources/tasks/entities/task.entity';
import { TaskGenerator } from './abstract/TaskGenerator';

export class TaskPostPaymentFss extends TaskGenerator {
    constructor(ctx: TaskGenerationService, type: TaskType) {
        super(ctx, type);
    }

    async getTaskList(): Promise<Task[]> {
        return [this.makeTask()];
    }
}
