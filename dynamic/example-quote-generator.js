/**
 * 🎲 Example Feature: Random Quote Generator
 * Demonstrates a utility feature with local data
 */

const featureMetadata = {
  id: 'example-quotes-001',
  name: 'Inspirational Quote Generator',
  description: 'Generate random inspirational quotes from famous personalities',
  category: 'utility',
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

// Sample quotes database
const quotes = [
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    category: "motivation"
  },
  {
    text: "Innovation distinguishes between a leader and a follower.",
    author: "Steve Jobs",
    category: "innovation"
  },
  {
    text: "Life is what happens to you while you're busy making other plans.",
    author: "John Lennon",
    category: "life"
  },
  {
    text: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
    category: "dreams"
  },
  {
    text: "It is during our darkest moments that we must focus to see the light.",
    author: "Aristotle",
    category: "motivation"
  },
  {
    text: "The only impossible journey is the one you never begin.",
    author: "Tony Robbins",
    category: "motivation"
  },
  {
    text: "In the end, we will remember not the words of our enemies, but the silence of our friends.",
    author: "Martin Luther King Jr.",
    category: "friendship"
  },
  {
    text: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
    category: "action"
  },
  {
    text: "Don't let yesterday take up too much of today.",
    author: "Will Rogers",
    category: "time"
  },
  {
    text: "Whether you think you can or you think you can't, you're right.",
    author: "Henry Ford",
    category: "mindset"
  }
];

/**
 * Main execution function for the quote generator
 * @param {Object} input - Input parameters
 * @param {string} input.category - Optional category filter
 * @param {string} input.author - Optional author filter
 * @returns {Object} Random quote
 */
async function execute(input = {}) {
  try {
    const { category, author } = input;
    
    logger.info('Generating random quote', { category, author });
    
    let filteredQuotes = quotes;
    
    // Filter by category if specified
    if (category) {
      filteredQuotes = filteredQuotes.filter(q => 
        q.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Filter by author if specified
    if (author) {
      filteredQuotes = filteredQuotes.filter(q => 
        q.author.toLowerCase().includes(author.toLowerCase())
      );
    }
    
    if (filteredQuotes.length === 0) {
      return {
        success: false,
        error: 'No quotes found matching the criteria',
        criteria: { category, author },
        availableCategories: getAvailableCategories(),
        availableAuthors: getAvailableAuthors()
      };
    }
    
    // Select random quote
    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    const selectedQuote = filteredQuotes[randomIndex];
    
    logger.info(`Quote selected: "${selectedQuote.text}" - ${selectedQuote.author}`);
    
    return {
      success: true,
      quote: selectedQuote,
      totalQuotes: quotes.length,
      filteredCount: filteredQuotes.length,
      timestamp: new Date(),
      id: generateQuoteId()
    };
    
  } catch (error) {
    logger.error('Quote generator error:', error);
    throw new Error(`Quote generation failed: ${error.message}`);
  }
}

/**
 * Get all available categories
 * @returns {Array} List of categories
 */
function getAvailableCategories() {
  const categories = [...new Set(quotes.map(q => q.category))];
  return categories.sort();
}

/**
 * Get all available authors
 * @returns {Array} List of authors
 */
function getAvailableAuthors() {
  const authors = [...new Set(quotes.map(q => q.author))];
  return authors.sort();
}

/**
 * Generate a unique quote ID
 * @returns {string} Quote ID
 */
function generateQuoteId() {
  return `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get quote by specific criteria
 * @param {Object} criteria - Search criteria
 * @returns {Array} Matching quotes
 */
function search(criteria = {}) {
  const { text, author, category } = criteria;
  
  let results = quotes;
  
  if (text) {
    results = results.filter(q => 
      q.text.toLowerCase().includes(text.toLowerCase())
    );
  }
  
  if (author) {
    results = results.filter(q => 
      q.author.toLowerCase().includes(author.toLowerCase())
    );
  }
  
  if (category) {
    results = results.filter(q => 
      q.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  return results;
}

/**
 * Get quote statistics
 * @returns {Object} Statistics
 */
function getStats() {
  const categoryStats = quotes.reduce((acc, quote) => {
    acc[quote.category] = (acc[quote.category] || 0) + 1;
    return acc;
  }, {});
  
  const authorStats = quotes.reduce((acc, quote) => {
    acc[quote.author] = (acc[quote.author] || 0) + 1;
    return acc;
  }, {});
  
  return {
    totalQuotes: quotes.length,
    categories: Object.keys(categoryStats).length,
    authors: Object.keys(authorStats).length,
    categoryBreakdown: categoryStats,
    topAuthors: Object.entries(authorStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([author, count]) => ({ author, count }))
  };
}

/**
 * Health check for the quote service
 * @returns {Object} Health status
 */
function health() {
  return {
    status: 'healthy',
    name: featureMetadata.name,
    quotesLoaded: quotes.length,
    categories: getAvailableCategories().length,
    authors: getAvailableAuthors().length,
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
    capabilities: ['random-quote', 'category-filter', 'author-filter', 'search', 'statistics'],
    availableCategories: getAvailableCategories(),
    availableAuthors: getAvailableAuthors(),
    statistics: getStats(),
    examples: [
      {
        input: {},
        description: 'Get random quote'
      },
      {
        input: { category: 'motivation' },
        description: 'Get motivational quote'
      },
      {
        input: { author: 'Steve Jobs' },
        description: 'Get quote by Steve Jobs'
      }
    ]
  };
}

// Define API routes for this feature
const routes = [
  {
    method: 'GET',
    path: '/api/quotes',
    handler: 'execute',
    description: 'Get a random quote'
  },
  {
    method: 'POST',
    path: '/api/quotes',
    handler: 'execute',
    description: 'Get a random quote with filters'
  },
  {
    method: 'GET',
    path: '/api/quotes/search',
    handler: 'search',
    description: 'Search quotes'
  },
  {
    method: 'GET',
    path: '/api/quotes/stats',
    handler: 'getStats',
    description: 'Get quote statistics'
  },
  {
    method: 'GET',
    path: '/api/quotes/categories',
    handler: 'getAvailableCategories',
    description: 'Get available categories'
  },
  {
    method: 'GET',
    path: '/api/quotes/authors',
    handler: 'getAvailableAuthors',
    description: 'Get available authors'
  }
];

module.exports = {
  execute,
  search,
  getStats,
  getAvailableCategories,
  getAvailableAuthors,
  health,
  info,
  routes,
  metadata: featureMetadata
};