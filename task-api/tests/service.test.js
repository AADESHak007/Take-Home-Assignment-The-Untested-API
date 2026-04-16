// unit tests for task service
const taskService = require('../src/services/taskService');

describe('taskService Unit Tests', () => {
    beforeEach(() => {
        taskService._reset();
    });

    describe('getStats', () => {
        it('should handle tasks with unexpected status gracefully', () => {
            taskService.create({ title: 'Invalid Status Task', status: 'unknown' });
            
            const stats = taskService.getStats();
            expect(stats.todo).toBe(0);
            expect(stats.in_progress).toBe(0);
            expect(stats.done).toBe(0);
            expect(stats.overdue).toBe(0);
        });

        it('should handle tasks without dueDate in overdue logic', () => {
             taskService.create({ title: 'No Due Date', status: 'todo', dueDate: null });
             const stats = taskService.getStats();
             expect(stats.overdue).toBe(0);
        });
    });

    describe('findById', () => {
        it('should return undefined if task not found', () => {
            expect(taskService.findById('non-existent')).toBeUndefined();
        });
    });
});
