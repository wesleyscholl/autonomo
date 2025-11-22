/**
 * Tests for Coder Agent
 */

const CoderAgent = require('../agents/coder');

// Mock Google Generative AI
jest.mock('@google/generative-ai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const mockGenerateContent = jest.fn();

describe('CoderAgent', () => {
  let coder;

  beforeEach(async () => {
    // Setup mock
    mockGenerateContent.mockResolvedValue({
      response: {
        text: jest.fn().mockReturnValue('module.exports = { name: "test" };')
      }
    });

    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent
      })
    }));

    coder = new CoderAgent();
    await coder.initialize();
  });

  test('should initialize successfully', async () => {
    const newCoder = new CoderAgent();
    await newCoder.initialize();
    expect(newCoder.model).toBeDefined();
  });

  test('should generate code from plan', async () => {
    const plan = {
      id: 'test-1',
      title: 'Test Feature',
      description: 'A test feature',
      category: 'utility',
      files: [{
        path: 'dynamic/test.js',
        purpose: 'Main file'
      }]
    };

    const code = await coder.generateCode(plan);
    
    expect(code).toContain('module.exports');
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  test('should build coding prompt', () => {
    const plan = {
      title: 'Test',
      description: 'Test feature',
      category: 'api'
    };

    const prompt = coder.buildCodingPrompt(plan);
    
    expect(prompt).toContain('Test');
    expect(prompt).toContain('Test feature');
    expect(prompt).toContain('api');
  });

  test('should extract and validate code from response', () => {
    const response = '```javascript\nmodule.exports = { name: "test", execute: async () => {} };\n```';
    const plan = { id: 'test', title: 'Test' };
    const code = coder.extractAndValidateCode(response, plan);
    
    expect(code).toContain('module.exports');
  });

  test('should validate generated code structure', () => {
    const validCode = 'module.exports = { name: "test", execute: async () => {} };';
    const plan = { id: 'test', title: 'Test Feature' };
    expect(() => coder.validateGeneratedCode(validCode, plan)).not.toThrow();
  });

  test('should add metadata to code', () => {
    const code = 'module.exports = {};';
    const plan = {
      id: 'test-1',
      title: 'Test',
      description: 'Test desc',
      category: 'api',
      created: new Date().toISOString()
    };

    const withMetadata = coder.addMetadata(code, plan);
    expect(withMetadata).toContain('featureMetadata');
    expect(withMetadata).toContain(plan.id);
  });

  test('should process input for collaboration', async () => {
    const input = {
      result: {
        id: 'collab-plan',
        title: 'Collab',
        description: 'Test',
        category: 'api'
      }
    };
    const context = { iterations: [] };

    const code = await coder.process(input, context);
    expect(code).toBeDefined();
  });

  test('should handle plan without explicit category', async () => {
    const plan = {
      id: 'test-no-cat',
      title: 'No Category Test',
      description: 'Testing without category'
    };

    const code = await coder.generateCode(plan);
    expect(code).toBeDefined();
  });
});
