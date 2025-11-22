/**
 * 🧪 PlannerAgent Test Suite
 * Comprehensive tests for plan creation and analysis
 */

const PlannerAgent = require('../agents/planner');

// Mock Google Generative AI module properly
jest.mock('@google/generative-ai');

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Setup mock implementation
const mockGenerateContent = jest.fn().mockResolvedValue({
  response: {
    text: jest.fn().mockReturnValue(JSON.stringify({
      id: 'test-plan-123',
      title: 'Test Feature',
      description: 'A test feature for testing',
      category: 'utility',
      complexity: 'medium',
      estimatedLOC: 100,
      dependencies: ['lodash'],
      files: [{
        path: 'dynamic/test-feature.js',
        type: 'main',
        purpose: 'Main feature file'
      }],
      apiEndpoints: [{
        method: 'GET',
        path: '/api/test',
        description: 'Test endpoint'
      }],
      integrationPoints: [],
      safetyConsiderations: ['Input validation'],
      testingStrategy: 'Unit tests with Jest',
      successCriteria: ['Feature works', 'Tests pass']
    }))
  }
});

GoogleGenerativeAI.mockImplementation(() => ({
  getGenerativeModel: jest.fn().mockReturnValue({
    generateContent: mockGenerateContent
  })
}));

describe('PlannerAgent', () => {
  let planner;
  let mockContext;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset GoogleGenerativeAI mock implementation
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent
      })
    }));
    
    // Reset mock implementation
    mockGenerateContent.mockResolvedValue({
      response: {
        text: jest.fn().mockReturnValue(JSON.stringify({
          id: 'test-plan-123',
          title: 'Test Feature',
          description: 'A test feature for testing',
          category: 'utility',
          complexity: 'medium',
          estimatedLOC: 100,
          dependencies: ['lodash'],
          files: [{
            path: 'dynamic/test-feature.js',
            type: 'main',
            purpose: 'Main feature file'
          }],
          apiEndpoints: [{
            method: 'GET',
            path: '/api/test',
            description: 'Test endpoint'
          }],
          integrationPoints: [],
          safetyConsiderations: ['Input validation'],
          testingStrategy: 'Unit tests with Jest',
          successCriteria: ['Feature works', 'Tests pass']
        }))
      }
    });
    
    planner = new PlannerAgent();
    await planner.initialize();

    mockContext = {
      mode: 'autonomous',
      currentFeatures: [
        { name: 'existing-feature-1', category: 'utility' },
        { name: 'existing-feature-2', category: 'api' }
      ],
      systemState: {
        cpuUsage: 45,
        memoryUsage: 60,
        diskUsage: 70
      }
    };
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const newPlanner = new PlannerAgent();
      await newPlanner.initialize();
      expect(newPlanner.model).toBeDefined();
    });

    test('should set up Google Generative AI', async () => {
      const newPlanner = new PlannerAgent();
      await newPlanner.initialize();
      expect(newPlanner.genAI).toBeDefined();
    });
  });

  describe('Plan Creation', () => {
    test('should create a plan from request', async () => {
      const request = 'Create a new utility feature';
      const plan = await planner.createPlan(request, mockContext);

      expect(plan).toBeDefined();
      expect(plan.id).toBe('test-plan-123');
      expect(plan.title).toBe('Test Feature');
      expect(plan.category).toBe('utility');
    });

    test('should handle empty request gracefully', async () => {
      const plan = await planner.createPlan('', mockContext);
      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
    });

    test('should include context in planning', async () => {
      const request = 'Add analytics';
      const plan = await planner.createPlan(request, mockContext);
      
      expect(plan).toBeDefined();
      expect(plan.dependencies).toBeDefined();
    });
  });

  describe('Prompt Building', () => {
    test('should build planning prompt with context', () => {
      const request = 'Create a new feature';
      const prompt = planner.buildPlanningPrompt(request, mockContext);

      expect(prompt).toContain(request);
      expect(prompt).toContain(mockContext.mode);
      expect(prompt).toContain('existing-feature-1');
    });

    test('should include system state in prompt', () => {
      const request = 'Add monitoring';
      const prompt = planner.buildPlanningPrompt(request, mockContext);

      expect(prompt).toContain('System State');
      expect(prompt).toContain('45'); // CPU usage
    });

    test('should include JSON format instructions', () => {
      const request = 'Build something';
      const prompt = planner.buildPlanningPrompt(request, mockContext);

      expect(prompt).toContain('OUTPUT FORMAT');
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('category');
    });

    test('should handle empty feature list', () => {
      const contextWithNoFeatures = {
        ...mockContext,
        currentFeatures: []
      };
      const prompt = planner.buildPlanningPrompt('test', contextWithNoFeatures);

      expect(prompt).toContain('None');
    });
  });

  describe('Error Handling', () => {
    test('should throw error if no JSON in response', () => {
      const invalidText = 'This is just plain text with no JSON';
      
      expect(() => planner.parsePlan(invalidText)).toThrow();
    });
  });

  describe('Plan Parsing', () => {
    test('should parse valid plan JSON', () => {
      const planText = JSON.stringify({
        id: 'parsed-plan-456',
        title: 'Parsed Feature',
        description: 'A parsed feature',
        category: 'api',
        complexity: 'low',
        estimatedLOC: 50,
        dependencies: [],
        files: [],
        apiEndpoints: [],
        integrationPoints: [],
        safetyConsiderations: [],
        testingStrategy: 'Manual testing',
        successCriteria: ['Works']
      });

      const request = 'test request';
      const plan = planner.parsePlan(planText, request, mockContext);

      expect(plan.id).toBe('parsed-plan-456');
      expect(plan.title).toBe('Parsed Feature');
      expect(plan.originalRequest).toBe(request);
    });

    test('should add metadata to parsed plan', () => {
      const planText = JSON.stringify({
        id: 'meta-plan',
        title: 'Metadata Test',
        description: 'Testing metadata',
        category: 'utility',
        complexity: 'low',
        estimatedLOC: 20,
        dependencies: [],
        files: [],
        apiEndpoints: [],
        integrationPoints: [],
        safetyConsiderations: [],
        testingStrategy: 'Test',
        successCriteria: ['Pass']
      });

      const plan = planner.parsePlan(planText, 'request', mockContext);

      expect(plan.originalRequest).toBe('request');
      expect(plan.context).toEqual(mockContext);
      expect(plan.createdAt).toBeDefined();
    });

    test('should handle malformed JSON gracefully', () => {
      const invalidJSON = '{ invalid json here }';
      
      // parsePlan returns a fallback plan instead of throwing
      const result = planner.parsePlan(invalidJSON, 'test', mockContext);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toContain('test');
    });

    test('should generate UUID if plan ID missing', () => {
      const planWithoutId = JSON.stringify({
        title: 'No ID Plan',
        description: 'Plan without ID',
        category: 'utility',
        complexity: 'low',
        estimatedLOC: 10,
        dependencies: [],
        files: [],
        apiEndpoints: [],
        integrationPoints: [],
        safetyConsiderations: [],
        testingStrategy: 'Test',
        successCriteria: ['Pass']
      });

      const plan = planner.parsePlan(planWithoutId, 'test', mockContext);
      expect(plan.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('Plan Validation', () => {
    test('should validate required plan fields', () => {
      const validPlan = {
        id: 'valid-123',
        title: 'Valid Plan',
        description: 'A valid plan',
        category: 'utility',
        complexity: 'medium',
        estimatedLOC: 100,
        files: []
      };

      const isValid = planner.validatePlan(validPlan);
      expect(isValid).toBe(true);
    });

    test('should reject plan with missing title', () => {
      const invalidPlan = {
        id: 'invalid-123',
        description: 'Missing title',
        category: 'utility'
      };

      const isValid = planner.validatePlan(invalidPlan);
      expect(isValid).toBe(false);
    });

    test('should reject plan with invalid category', () => {
      const invalidPlan = {
        id: 'invalid-456',
        title: 'Bad Category',
        description: 'Invalid category plan',
        category: 'invalid_category',
        complexity: 'low'
      };

      const isValid = planner.validatePlan(invalidPlan);
      expect(isValid).toBe(false);
    });

    test('should validate complexity levels', () => {
      const validComplexities = ['low', 'medium', 'high'];
      
      validComplexities.forEach(complexity => {
        const plan = {
          id: `plan-${complexity}`,
          title: `${complexity} Plan`,
          description: 'Test',
          category: 'utility',
          complexity
        };

        expect(planner.validatePlan(plan)).toBe(true);
      });
    });

    test('should reject invalid complexity', () => {
      const plan = {
        id: 'plan-bad-complexity',
        title: 'Bad Complexity',
        description: 'Test',
        category: 'utility',
        complexity: 'extreme'
      };

      expect(planner.validatePlan(plan)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      // Ensure planner is initialized for edge cases
      planner = new PlannerAgent();
      await planner.initialize();
    });

    test('should handle null request', async () => {
      const plan = await planner.createPlan(null, mockContext);
      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
    });

    test('should handle undefined context', async () => {
      const plan = await planner.createPlan('test', undefined);
      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
    });

    test('should handle very long requests', async () => {
      const longRequest = 'A'.repeat(10000);
      const plan = await planner.createPlan(longRequest, mockContext);
      expect(plan).toBeDefined();
      expect(plan.title).toBeDefined();
    });

    test('should handle special characters in request', async () => {
      const specialRequest = 'Test with émojis 🚀 and spëcial çhars';
      const plan = await planner.createPlan(specialRequest, mockContext);
      expect(plan).toBeDefined();
      expect(plan.title).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      // Ensure planner is initialized
      planner = new PlannerAgent();
      await planner.initialize();
    });

    test('should handle API errors gracefully', async () => {
      // Mock the error after initialization
      mockGenerateContent.mockRejectedValueOnce(new Error('API Error'));
      
      await expect(planner.createPlan('test', mockContext)).rejects.toThrow('API Error');
    });

    test('should handle timeout errors', async () => {
      // Mock the timeout after initialization
      mockGenerateContent.mockRejectedValueOnce(new Error('Timeout'));
      
      await expect(planner.createPlan('test', mockContext)).rejects.toThrow('Timeout');
    });
  });
});
