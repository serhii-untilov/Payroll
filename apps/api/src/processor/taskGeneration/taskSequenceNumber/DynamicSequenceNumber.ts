import { Task } from 'src/resources/tasks/entities/task.entity';
import { TaskSequenceNumber } from './abstract/TaskSequenceNumber';

export class DynamicSequenceNumber extends TaskSequenceNumber {
    private sequenceNumber: number = 0;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    get(task: Task) {
        this.sequenceNumber = this.sequenceNumber + 1;
        return this.sequenceNumber;
    }
}