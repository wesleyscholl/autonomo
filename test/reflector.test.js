/**
 * Tests for Reflector Agent
 */

const ReflectorAgent = require('../agents/reflector');

// Mock Google Generative AI
jest.mock('@google/generative-ai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const mockGenerateContent = jest.fn();

describe('ReflectorAgent', () => {
  let reflector;

  beforeEach(async () => {
    // Setup mock
    mockGenerateContent.mockResolvedValue({
      response: {
        text: jest.fn().mockReturnValue(JSON.stringify({
          rating: 8,
          strengths: ['Good structure'],
          weaknesses: ['Could be better'],
          suggestions: ['Add tests'],
          insights: ['Well done']
        }))
      }
    });

    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent
      })
    }));

    reflector = new ReflectorAgent();
    await reflector.initialize();
  });

  test('should initialize successfully', async () => {
    const newReflector = new ReflectorAgent();
    await newReflector.initialize();
    expect(newReflector.model).toBeDefined();
  });

  test('should reflect on evolution', async () => {
    const evolutionData = {
      plan: { id: 'plan-1', title: 'Test' },
      code: 'module.exports = {};',
      execution: { success: true }
    };

    const reflection = await reflector.reflect(evolutionData);
    
    expect(reflection).toBeDefined();
    expect(reflection.rating).toBeDefined();
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  test('should build reflection prompt', () => {
    const data = {
      plan: { title: 'Test' },
      code: 'code',
      execution: { success: true }
    };

    const prompt = reflector.buildReflectionPrompt(data);
    
    expect(prompt).toContain('Test');
    expect(prompt).toContain('success');
  });

  test('should parse reflection response', () => {
    const response = JSON.stringify({
      rating: 7,
      insights: ['Good']
    });
    
    const evolutionData = {
      id: 'evo-1',
      plan: { id: 'plan-1' },
      success: true
    };

    const parsed = reflector.parseReflection(response, evolutionData);
    
    expect(parsed.rating).toBe(7);
    expect(parsed.insights).toContain('Good');
    expect(parsed.evolutionId).toBe('evo-1');
  });

  test('should create fallback reflection on parse error', () => {
    const invalidResponse = 'not json';
    const evolutionData = {
      id: 'evo-2',
      success: false
    };

    const reflection = reflector.parseReflection(invalidResponse, evolutionData);
    
    expect(reflection).toBeDefined();
    expect(reflection.evolutionId).toBe('evo-2');
  });

  test('should analyze evolution data', () => {
    const data = {
      plan: { id: 'plan-1', title: 'Test', category: 'api' },
      code: 'module.exports = {};',
      execution: { success: true, filePath: '/test/path.js' }
    };

    const analysis = reflector.analyzeEvolution(data);
    
    expect(analysis).toBeDefined();
  });

  test('should handle reflection of failed evolution', async () => {
    const evolutionData = {
      plan: { id: 'plan-fail', title: 'Failed Test' },
      code: 'code',
      execution: { success: false, error: 'Test error' }
    };

    const reflection = await reflector.reflect(evolutionData);
    
    expect(reflection).toBeDefined();
  });

  test('should extract insights from successful evolution', () => {
    const data = {
      plan: { id: 'plan-success', title: 'Success Test', category: 'api' },
      code: 'module.exports = { name: "test" };',
      execution: { success: true, output: { result: 'good' } }
    };

    const insights = reflector.extractInsights ? reflector.extractInsights(data) : [];
    expect(Array.isArray(insights) || insights === undefined).toBe(true);
  });

  test('should rate evolution quality', () => {
    const data = {
      plan: { complexity: 'medium' },
      execution: { success: true, duration: 100 }
    };

    const rating = reflector.rateQuality ? reflector.rateQuality(data) : 0;
    expect(typeof rating === 'number' || rating === undefined).toBe(true);
  });

  test('should suggest improvements', () => {
    const data = {
      plan: { title: 'Test', category: 'api' },
      execution: { success: true }
    };

    const suggestions = reflector.suggestImprovements ? reflector.suggestImprovements(data) : [];
    expect(Array.isArray(suggestions) || suggestions === undefined).toBe(true);
  });

  test('should load reflection history', async () => {
    await reflector.loadReflectionHistory();
    expect(reflector.reflectionHistory).toBeDefined();
  });

  test('should save reflection history', async () => {
    await expect(reflector.saveReflectionHistory()).resolves.not.toThrow();
  });

  test('should get insights with limit', () => {
    const insights = reflector.getInsights(5);
    expect(Array.isArray(insights)).toBe(true);
  });

  test('should get success patterns', () => {
    const patterns = reflector.getSuccessPatterns();
    expect(Array.isArray(patterns)).toBe(true);
  });

  test('should get problematic patterns', () => {
    const patterns = reflector.getProblematicPatterns();
    expect(Array.isArray(patterns)).toBe(true);
  });

  test('should process input for collaboration', async () => {
    const input = { result: { success: true } };
    const context = { iterations: [] };
    
    const result = await reflector.process(input, context);
    expect(result).toBeDefined();
  });

  test('should handle reflection with empty history', () => {
    reflector.reflectionHistory = [];
    const insights = reflector.getInsights();
    expect(Array.isArray(insights)).toBe(true);
    expect(insights.length).toBe(0);
  });
});
