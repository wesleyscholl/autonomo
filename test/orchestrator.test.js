/**
 * Tests for Agent Orchestrator
 */

const AgentOrchestrator = require('../agents/orchestrator');

// Mock the dependencies
jest.mock('../agents/planner');
jest.mock('../agents/coder');
jest.mock('../agents/executor');
jest.mock('../agents/reflector');

const PlannerAgent = require('../agents/planner');
const CoderAgent = require('../agents/coder');
const ExecutorAgent = require('../agents/executor');
const ReflectorAgent = require('../agents/reflector');

describe('AgentOrchestrator', () => {
  let orchestrator;
  let mockPlanner, mockCoder, mockExecutor, mockReflector;

  beforeEach(() => {
    // Setup mocks
    mockPlanner = {
      initialize: jest.fn().mockResolvedValue(),
      createPlan: jest.fn().mockResolvedValue({
        id: 'plan-1',
        title: 'Test Plan',
        description: 'Test Description',
        category: 'utility'
      }),
      process: jest.fn().mockResolvedValue({ planData: 'test' })
    };

    mockCoder = {
      initialize: jest.fn().mockResolvedValue(),
      generateCode: jest.fn().mockResolvedValue('module.exports = {};'),
      process: jest.fn().mockResolvedValue('generated code')
    };

    mockExecutor = {
      initialize: jest.fn().mockResolvedValue(),
      executeCode: jest.fn().mockResolvedValue({
        success: true,
        filePath: '/test/path'
      }),
      process: jest.fn().mockResolvedValue({ executed: true })
    };

    mockReflector = {
      initialize: jest.fn().mockResolvedValue(),
      reflect: jest.fn().mockResolvedValue({
        rating: 8,
        insights: ['Good work']
      }),
      process: jest.fn().mockResolvedValue({ reflection: 'done' })
    };

    PlannerAgent.mockImplementation(() => mockPlanner);
    CoderAgent.mockImplementation(() => mockCoder);
    ExecutorAgent.mockImplementation(() => mockExecutor);
    ReflectorAgent.mockImplementation(() => mockReflector);

    orchestrator = new AgentOrchestrator();
  });

  test('should initialize successfully', async () => {
    await orchestrator.initialize();
    
    expect(mockPlanner.initialize).toHaveBeenCalled();
    expect(mockCoder.initialize).toHaveBeenCalled();
    expect(mockExecutor.initialize).toHaveBeenCalled();
    expect(mockReflector.initialize).toHaveBeenCalled();
  });

  test('should create a plan', async () => {
    const plan = await orchestrator.plan('Create a test feature');
    
    expect(plan).toBeDefined();
    expect(plan.id).toBe('plan-1');
    expect(mockPlanner.createPlan).toHaveBeenCalled();
  });

  test('should generate code', async () => {
    const code = await orchestrator.generateCode({ id: 'plan-1', title: 'Test' });
    
    expect(code).toBe('module.exports = {};');
    expect(mockCoder.generateCode).toHaveBeenCalled();
  });

  test('should execute code', async () => {
    const result = await orchestrator.execute('code', { id: 'plan-1' });
    
    expect(result.success).toBe(true);
    expect(mockExecutor.executeCode).toHaveBeenCalled();
  });

  test('should reflect on results', async () => {
    const reflection = await orchestrator.reflect({
      plan: { id: 'plan-1' },
      code: 'code',
      execution: { success: true }
    });
    
    expect(reflection.rating).toBe(8);
    expect(mockReflector.reflect).toHaveBeenCalled();
  });

  test('should collaborate between agents', async () => {
    const result = await orchestrator.collaborate('Build a feature', ['planner', 'coder']);
    
    expect(result).toBeDefined();
  });

  test('should get orchestrator status', () => {
    const status = orchestrator.getStatus();
    expect(status).toBeDefined();
  });

  test('should handle agent errors gracefully', async () => {
    mockPlanner.createPlan.mockRejectedValue(new Error('Test error'));
    
    await expect(orchestrator.plan('test')).rejects.toThrow();
  });

  test('should analyze usage patterns', async () => {
    const analysis = await orchestrator.analyzeUsagePatterns();
    
    expect(analysis).toBeDefined();
    expect(analysis).toHaveProperty('shouldEvolve');
    expect(typeof analysis.shouldEvolve).toBe('boolean');
  });

  test('should get active agents list', () => {
    const agents = orchestrator.getActiveAgents();
    expect(agents !== undefined).toBe(true);
  });

  test('should handle collaboration with multiple agents', async () => {
    const result = await orchestrator.collaborate('Multi-agent task', ['planner', 'coder']);
    
    expect(result).toBeDefined();
    expect(result.collaboration).toBeDefined();
  });

  test('should track collaboration iterations', async () => {
    const result = await orchestrator.collaborate('Track iterations', ['planner']);
    
    expect(result.collaboration.iterations).toBeDefined();
    expect(result.collaboration.iterations.length).toBeGreaterThan(0);
  });

  test('should calculate collaboration duration', async () => {
    const result = await orchestrator.collaborate('Duration test', ['planner']);
    
    expect(result.collaboration).toHaveProperty('duration');
    expect(typeof result.collaboration.duration).toBe('number');
  });

  test('should handle initialization errors', async () => {
    const newOrchestrator = new AgentOrchestrator();
    mockPlanner.initialize.mockRejectedValueOnce(new Error('Init failed'));
    
    await expect(newOrchestrator.initialize()).rejects.toThrow('Init failed');
  });

  test('should reject collaboration with unknown agent', async () => {
    await expect(
      orchestrator.collaborate('Unknown agent test', ['nonexistent-agent'])
    ).rejects.toThrow('Unknown agent');
  });
});
