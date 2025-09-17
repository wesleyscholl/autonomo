/**
 * 🧠 Reflector Agent
 * Analyzes evolution outcomes and learns from experience
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');

class ReflectorAgent {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = null;
    this.reflectionHistory = [];
  }

  async initialize() {
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    await this.loadReflectionHistory();
  }

  async reflect(evolutionRecord) {
    const reflection = await this.analyzeEvolution(evolutionRecord);
    
    this.reflectionHistory.push(reflection);
    await this.saveReflectionHistory();
    
    return reflection;
  }

  async analyzeEvolution(evolutionRecord) {
    const prompt = this.buildReflectionPrompt(evolutionRecord);
    
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();

    return this.parseReflection(analysisText, evolutionRecord);
  }

  buildReflectionPrompt(evolutionRecord) {
    return `
You are an AI reflection agent analyzing the outcome of a self-evolution cycle in Autonomo.

EVOLUTION RECORD:
${JSON.stringify(evolutionRecord, null, 2)}

PREVIOUS LEARNINGS:
${this.reflectionHistory.slice(-5).map(r => r.insights).join('\n')}

Analyze this evolution and provide insights for future improvements.

ANALYSIS AREAS:
1. Success Assessment - Was the evolution successful? Why or why not?
2. Code Quality - How good was the generated code?
3. Plan Effectiveness - Was the planning appropriate?
4. Safety Considerations - Were there any safety issues?
5. User Value - Does this add real value to the application?
6. Integration Success - How well did it integrate with existing features?
7. Learning Opportunities - What can be learned for future evolutions?

OUTPUT FORMAT (JSON):
{
  "evolutionId": "${evolutionRecord.id}",
  "timestamp": "${new Date().toISOString()}",
  "successRating": 1-10,
  "codeQualityRating": 1-10,
  "userValueRating": 1-10,
  "insights": [
    "Specific insight about what worked well",
    "Specific insight about what could be improved"
  ],
  "recommendations": [
    "Specific recommendation for future evolutions",
    "Specific improvement suggestion"
  ],
  "patterns": {
    "successful": ["pattern1", "pattern2"],
    "problematic": ["pattern1", "pattern2"]
  },
  "learnings": {
    "technical": "Technical learning from this evolution",
    "process": "Process learning from this evolution",
    "safety": "Safety learning from this evolution"
  },
  "nextEvolutionSuggestions": [
    "Suggestion for next feature to build",
    "Suggestion for improvement to make"
  ]
}

Provide thoughtful, actionable insights that will improve future evolutions.
`;
  }

  parseReflection(analysisText, evolutionRecord) {
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in reflection response');
      }

      const reflection = JSON.parse(jsonMatch[0]);
      
      // Add metadata
      reflection.evolutionId = evolutionRecord.id;
      reflection.timestamp = new Date().toISOString();
      reflection.agent = 'reflector';

      return reflection;
    } catch (error) {
      // Fallback reflection
      return this.createFallbackReflection(evolutionRecord, analysisText);
    }
  }

  createFallbackReflection(evolutionRecord, analysisText) {
    return {
      evolutionId: evolutionRecord.id,
      timestamp: new Date().toISOString(),
      successRating: evolutionRecord.success ? 7 : 3,
      codeQualityRating: 5,
      userValueRating: 5,
      insights: [
        'Evolution completed',
        'Analysis parsing failed - need to improve reflection prompts'
      ],
      recommendations: [
        'Improve reflection prompt format',
        'Add better error handling for analysis parsing'
      ],
      patterns: {
        successful: evolutionRecord.success ? ['basic-completion'] : [],
        problematic: evolutionRecord.success ? [] : ['execution-failure']
      },
      learnings: {
        technical: 'Feature generation process needs refinement',
        process: 'Reflection parsing needs improvement',
        safety: 'Continue monitoring for safety issues'
      },
      nextEvolutionSuggestions: [
        'Improve error handling',
        'Add more comprehensive testing'
      ],
      rawResponse: analysisText,
      agent: 'reflector'
    };
  }

  async loadReflectionHistory() {
    try {
      const historyPath = path.join('./logs', 'reflections.json');
      const data = await fs.readFile(historyPath, 'utf8');
      this.reflectionHistory = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty history
      this.reflectionHistory = [];
    }
  }

  async saveReflectionHistory() {
    try {
      const historyPath = path.join('./logs', 'reflections.json');
      await fs.writeFile(
        historyPath, 
        JSON.stringify(this.reflectionHistory, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save reflection history:', error);
    }
  }

  getInsights(limit = 10) {
    return this.reflectionHistory
      .slice(-limit)
      .map(r => ({
        id: r.evolutionId,
        timestamp: r.timestamp,
        successRating: r.successRating,
        insights: r.insights,
        recommendations: r.recommendations
      }));
  }

  getSuccessPatterns() {
    const patterns = this.reflectionHistory
      .reduce((acc, reflection) => {
        if (reflection.patterns?.successful) {
          acc.push(...reflection.patterns.successful);
        }
        return acc;
      }, []);

    // Count frequency
    const frequency = {};
    patterns.forEach(pattern => {
      frequency[pattern] = (frequency[pattern] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  }

  getProblematicPatterns() {
    const patterns = this.reflectionHistory
      .reduce((acc, reflection) => {
        if (reflection.patterns?.problematic) {
          acc.push(...reflection.patterns.problematic);
        }
        return acc;
      }, []);

    const frequency = {};
    patterns.forEach(pattern => {
      frequency[pattern] = (frequency[pattern] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  }

  async process(input, collaborationContext) {
    // For agent collaboration - reflect on the execution result
    const executionResult = input.result || input;
    
    const mockEvolutionRecord = {
      id: 'collab-' + Date.now(),
      success: executionResult.success || false,
      feature: executionResult.module?.metadata || {},
      collaboration: collaborationContext,
      timestamp: new Date()
    };

    return await this.reflect(mockEvolutionRecord);
  }
}

module.exports = ReflectorAgent;