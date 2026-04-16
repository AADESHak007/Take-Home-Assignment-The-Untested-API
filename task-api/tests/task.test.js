// integration tests for task api
const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API Tests', () => {
    beforeEach(() => {
        taskService._reset();
    });

    describe('GET /tasks', () => {
        it('should list all tasks', async () => {
            taskService.create({ title: 'Task 1' });
            taskService.create({ title: 'Task 2' });
            const res = await request(app).get('/tasks');
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
        });

        it('should filter by status', async () => {
            taskService.create({ title: 'Task 1', status: 'todo' });
            taskService.create({ title: 'Task 2', status: 'done' });
            const res = await request(app).get('/tasks?status=todo');
            expect(res.body[0].status).toBe('todo');
        });

        it('should return paginated tasks', async () => {
            for (let i = 0; i < 15; i++) taskService.create({ title: `Task ${i}` });
            const res = await request(app).get('/tasks?page=1&limit=5');
            expect(res.body.length).toBe(5);
            expect(res.body[0].title).toBe('Task 0');
        });

        it('should use default pagination values if invalid', async () => {
            for (let i = 0; i < 15; i++) taskService.create({ title: `Task ${i}` });
            const res = await request(app).get('/tasks?page=abc&limit=xyz');
            expect(res.body.length).toBe(10);
        });
    });

    describe('POST /tasks', () => {
        it('should create a task', async () => {
            const res = await request(app).post('/tasks').send({ title: 'New Task' });
            expect(res.status).toBe(201);
            expect(res.body.title).toBe('New Task');
        });

        it('should return 400 if title is missing', async () => {
            const res = await request(app).post('/tasks').send({});
            expect(res.status).toBe(400);
        });

        it('should return 400 for invalid status', async () => {
            const res = await request(app).post('/tasks').send({ title: 'Task', status: 'invalid' });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('status must be one of');
        });

        it('should return 400 for invalid priority', async () => {
            const res = await request(app).post('/tasks').send({ title: 'Task', priority: 'invalid' });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('priority must be one of');
        });

        it('should return 400 for invalid dueDate', async () => {
            const res = await request(app).post('/tasks').send({ title: 'Task', dueDate: 'invalid-date' });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('dueDate must be a valid ISO date string');
        });
    });

    describe('PUT /tasks/:id', () => {
        it('should update a task', async () => {
            const task = taskService.create({ title: 'Old Title' });
            const res = await request(app).put(`/tasks/${task.id}`).send({ title: 'New Title' });
            expect(res.status).toBe(200);
            expect(res.body.title).toBe('New Title');
        });

        it('should return 404 for non-existent task', async () => {
            const res = await request(app).put('/tasks/fake-id').send({ title: 'Title' });
            expect(res.status).toBe(404);
        });

        it('should return 400 for invalid update fields', async () => {
            const task = taskService.create({ title: 'Task' });
            
            let res = await request(app).put(`/tasks/${task.id}`).send({ status: 'invalid' });
            expect(res.status).toBe(400);

            res = await request(app).put(`/tasks/${task.id}`).send({ title: '' });
            expect(res.status).toBe(400);

            res = await request(app).put(`/tasks/${task.id}`).send({ priority: 'invalid' });
            expect(res.status).toBe(400);

            res = await request(app).put(`/tasks/${task.id}`).send({ dueDate: 'invalid' });
            expect(res.status).toBe(400);
        });
    });

    describe('DELETE /tasks/:id', () => {
        it('should delete a task', async () => {
            const task = taskService.create({ title: 'To Delete' });
            const res = await request(app).delete(`/tasks/${task.id}`);
            expect(res.status).toBe(204);
            expect(taskService.getAll().length).toBe(0);
        });

        it('should return 404 for non-existent task', async () => {
            const res = await request(app).delete('/tasks/fake-id');
            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /tasks/:id/complete', () => {
        it('should mark task as complete', async () => {
            const task = taskService.create({ title: 'Incomplete' });
            const res = await request(app).patch(`/tasks/${task.id}/complete`);
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('done');
        });

        it('should return 404 for non-existent task', async () => {
            const res = await request(app).patch('/tasks/fake-id/complete');
            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /tasks/:id/assign', () => {
        it('should assign a task to a user', async () => {
            const task = taskService.create({ title: 'Unassigned Task' });
            const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'John Doe' });
            expect(res.status).toBe(200);
            expect(res.body.assignee).toBe('John Doe');
        });

        it('should return 400 if assignee is missing or empty', async () => {
            const task = taskService.create({ title: 'Task' });
            const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '' });
            expect(res.status).toBe(400);
        });

        it('should return 404 for non-existent task', async () => {
            const res = await request(app).patch('/tasks/fake-id/assign').send({ assignee: 'John' });
            expect(res.status).toBe(404);
        });
    });

    describe('GET /tasks/stats', () => {
        it('should return task statistics', async () => {
            taskService.create({ title: 'Task 1', status: 'todo' });
            taskService.create({ title: 'Task 2', status: 'done' });
            const res = await request(app).get('/tasks/stats');
            expect(res.status).toBe(200);
            expect(res.body.todo).toBe(1);
            expect(res.body.done).toBe(1);
        });

        it('should count overdue tasks', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);
            taskService.create({ title: 'Overdue', dueDate: pastDate.toISOString(), status: 'todo' });
            const res = await request(app).get('/tasks/stats');
            expect(res.body.overdue).toBe(1);
        });
    });
});
