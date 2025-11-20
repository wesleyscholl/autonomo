const { parseCommand, executeTask } = require('./index');

describe('Autonomo Tests', () => {
    describe('parseCommand', () => {
        test('should parse simple commands', () => {
            const result = parseCommand('run tests');
            expect(result).toBeDefined();
            expect(result.action).toBe('run');
        });

        test('should handle empty commands', () => {
            const result = parseCommand('');
            expect(result).toBeDefined();
        });

        test('should parse complex commands', () => {
            const result = parseCommand('deploy to production');
            expect(result).toBeDefined();
        });
    });

    describe('executeTask', () => {
        test('should execute basic tasks', async () => {
            const task = { action: 'test', params: [] };
            const result = await executeTask(task);
            expect(result).toBeDefined();
        });

        test('should handle task errors gracefully', async () => {
            const task = { action: 'invalid', params: [] };
            await expect(executeTask(task)).rejects.toThrow();
        });
    });

    describe('Integration', () => {
        test('should process command end-to-end', async () => {
            const command = 'status';
            const parsed = parseCommand(command);
            expect(parsed).toBeDefined();
        });
    });
});
