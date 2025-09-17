/**
 * 🎯 Example Feature: Weather Service
 * Demonstrates a complete AI-generated feature with API integration
 */

const featureMetadata = {
  id: 'example-weather-001',
  name: 'Weather Service',
  description: 'Get current weather information for any city using OpenWeatherMap API',
  category: 'api',
  version: '1.0.0',
  created: new Date(),
  agent: 'example'
};

const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

/**
 * Main execution function for the weather service
 * @param {Object} input - Input parameters
 * @param {string} input.city - City name to get weather for
 * @returns {Object} Weather information
 */
async function execute(input = {}) {
  try {
    const { city = 'San Francisco' } = input;
    
    logger.info(`Getting weather for: ${city}`);
    
    // Simulate API call (in real implementation, would call OpenWeatherMap)
    const weatherData = generateMockWeatherData(city);
    
    logger.info(`Weather data retrieved for ${city}`);
    
    return {
      success: true,
      city,
      weather: weatherData,
      timestamp: new Date(),
      source: 'mock-api'
    };
    
  } catch (error) {
    logger.error('Weather service error:', error);
    throw new Error(`Weather service failed: ${error.message}`);
  }
}

/**
 * Generate mock weather data for demonstration
 * @param {string} city - City name
 * @returns {Object} Mock weather data
 */
function generateMockWeatherData(city) {
  const conditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'foggy'];
  const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
  const temperature = Math.floor(Math.random() * 40) + 10; // 10-50°C
  const humidity = Math.floor(Math.random() * 100);
  
  return {
    condition: randomCondition,
    temperature: temperature,
    humidity: humidity,
    windSpeed: Math.floor(Math.random() * 20),
    description: `${randomCondition.charAt(0).toUpperCase() + randomCondition.slice(1)} skies in ${city}`,
    icon: getWeatherIcon(randomCondition)
  };
}

/**
 * Get weather icon based on condition
 * @param {string} condition - Weather condition
 * @returns {string} Weather emoji
 */
function getWeatherIcon(condition) {
  const icons = {
    sunny: '☀️',
    cloudy: '☁️',
    rainy: '🌧️',
    snowy: '❄️',
    foggy: '🌫️'
  };
  
  return icons[condition] || '🌡️';
}

/**
 * Health check for the weather service
 * @returns {Object} Health status
 */
function health() {
  return {
    status: 'healthy',
    name: featureMetadata.name,
    uptime: process.uptime(),
    lastCheck: new Date()
  };
}

/**
 * Get service information
 * @returns {Object} Service info
 */
function info() {
  return {
    ...featureMetadata,
    capabilities: ['weather-lookup', 'city-search', 'mock-data'],
    endpoints: [
      {
        method: 'POST',
        path: '/api/weather',
        description: 'Get weather for a city'
      }
    ],
    examples: [
      {
        input: { city: 'London' },
        description: 'Get weather for London'
      },
      {
        input: { city: 'Tokyo' },
        description: 'Get weather for Tokyo'
      }
    ]
  };
}

// Define API routes for this feature
const routes = [
  {
    method: 'GET',
    path: '/api/weather',
    handler: 'execute',
    description: 'Get weather information'
  },
  {
    method: 'POST',
    path: '/api/weather',
    handler: 'execute',
    description: 'Get weather information with parameters'
  },
  {
    method: 'GET',
    path: '/api/weather/health',
    handler: 'health',
    description: 'Weather service health check'
  },
  {
    method: 'GET',
    path: '/api/weather/info',
    handler: 'info',
    description: 'Weather service information'
  }
];

module.exports = {
  execute,
  health,
  info,
  routes,
  metadata: featureMetadata
};