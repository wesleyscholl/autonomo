/**
 * 🎯 Planner Agent
 * Analyzes requests and creates detailed evolution plans
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');

class PlannerAgent {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = null;
  }

  async initialize() {
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async createPlan(request, context) {
    const prompt = this.buildPlanningPrompt(request, context);
    
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const planText = response.text();

    return this.parsePlan(planText, request, context);
  }

  buildPlanningPrompt(request, context) {
    return `
You are an AI planner for a self-evolving Node.js application called Autonomo.

CURRENT CONTEXT:
- Mode: ${context.mode}
- Existing Features: ${context.currentFeatures.map(f => f.name).join(', ') || 'None'}
- System State: ${JSON.stringify(context.systemState, null, 2)}

USER REQUEST: ${request || 'Create something useful and creative'}

Your task is to create a detailed evolution plan that will add valuable functionality to the app.

PLANNING GUIDELINES:
1. Analyze the request and existing features to avoid duplication
2. Ensure the feature is safe, useful, and well-scoped
3. Consider integration with existing features
4. Plan for proper error handling and logging
5. Think about user experience and API design

OUTPUT FORMAT (JSON):
{
  "id": "unique-plan-id",
  "title": "Feature Title",
  "description": "Detailed description of what will be built",
  "category": "api|utility|ui|integration|data",
  "complexity": "low|medium|high",
  "estimatedLOC": 50,
  "dependencies": ["package1", "package2"],
  "files": [
    {
      "path": "dynamic/feature-name.js",
      "type": "main|helper|config|test",
      "purpose": "What this file does"
    }
  ],
  "apiEndpoints": [
    {
      "method": "GET|POST|PUT|DELETE",
      "path": "/api/feature",
      "description": "What this endpoint does"
    }
  ],
  "integrationPoints": ["existing-feature-1"],
  "safetyConsiderations": ["consideration1", "consideration2"],
  "testingStrategy": "How to validate this works",
  "successCriteria": ["criteria1", "criteria2"]
}

Create an innovative, well-thought-out plan that adds real value to the application.
`;
  }

  parsePlan(planText, request, context) {
    try {
      // Extract JSON from the response
      const jsonMatch = planText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in plan response');
      }

      const plan = JSON.parse(jsonMatch[0]);
      
      // Add metadata
      plan.id = plan.id || uuidv4();
      plan.created = new Date();
      plan.originalRequest = request;
      plan.context = context;
      plan.agent = 'planner';

      return plan;
    } catch (error) {
      // Fallback plan if parsing fails
      return this.createFallbackPlan(request, planText);
    }
  }

  createFallbackPlan(request, planText) {
    return {
      id: uuidv4(),
      title: `Generated Feature: ${request || 'Creative Addition'}`,
      description: 'AI-generated feature based on request',
      category: 'utility',
      complexity: 'medium',
      estimatedLOC: 100,
      dependencies: [],
      files: [
        {
          path: `dynamic/feature-${Date.now()}.js`,
          type: 'main',
          purpose: 'Main feature implementation'
        }
      ],
      apiEndpoints: [
        {
          method: 'GET',
          path: `/api/feature-${Date.now()}`,
          description: 'Feature endpoint'
        }
      ],
      integrationPoints: [],
      safetyConsiderations: ['Input validation', 'Error handling'],
      testingStrategy: 'Manual testing and logging',
      successCriteria: ['Feature loads', 'No errors'],
      created: new Date(),
      originalRequest: request,
      agent: 'planner',
      rawResponse: planText
    };
  }

  async process(input, collaborationContext) {
    // For agent collaboration
    const request = input.task || input.request;
    const context = {
      mode: 'collaborative',
      currentFeatures: [],
      systemState: {},
      collaboration: collaborationContext
    };

    return await this.createPlan(request, context);
  }
}

module.exports = PlannerAgent;