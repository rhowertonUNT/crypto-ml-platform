/**
 * Configuration file for the Crypto ML Platform
 * Contains cryptocurrency definitions, model parameters, and API settings
 */

// Cryptocurrency configurations
const CRYPTO_CONFIG = {
    xrp: { 
        name: 'XRP', 
        symbol: 'XRP',
        iso20022: true, 
        color: '#00aae4', 
        basePrice: 0.65,
        apiId: 'ripple'
    },
    xlm: { 
        name: 'Stellar', 
        symbol: 'XLM',
        iso20022: true, 
        color: '#7c4dff', 
        basePrice: 0.12,
        apiId: 'stellar'
    },
    ada: { 
        name: 'Cardano', 
        symbol: 'ADA',
        iso20022: true, 
        color: '#0033ad', 
        basePrice: 0.45,
        apiId: 'cardano'
    },
    btc: { 
        name: 'Bitcoin', 
        symbol: 'BTC',
        iso20022: false, 
        color: '#f7931a', 
        basePrice: 45000,
        apiId: 'bitcoin'
    },
    eth: { 
        name: 'Ethereum', 
        symbol: 'ETH',
        iso20022: false, 
        color: '#627eea', 
        basePrice: 2500,
        apiId: 'ethereum'
    },
    sol: { 
        name: 'Solana', 
        symbol: 'SOL',
        iso20022: false, 
        color: '#9945ff', 
        basePrice: 95,
        apiId: 'solana'
    }
};

// Model architecture parameters
const MODEL_CONFIG = {
    neural: {
        standard: { hiddenUnits: 32, epochs: 100, learningRate: 0.001 },
        iso20022: { hiddenUnits: 64, epochs: 150, learningRate: 0.0008 }
    },
    deep: {
        standard: { hiddenUnits: 64, epochs: 120, learningRate: 0.0008 },
        iso20022: { hiddenUnits: 96, epochs: 180, learningRate: 0.0006 }
    },
    lstm: {
        standard: { hiddenUnits: 48, epochs: 130, learningRate: 0.0009 },
        iso20022: { hiddenUnits: 72, epochs: 200, learningRate: 0.0007 }
    }
};

// API configuration
const API_CONFIG = {
    coingecko: {
        baseUrl: 'https://api.coingecko.com/api/v3',
        priceEndpoint: '/simple/price',
        historyEndpoint: '/coins/{id}/market_chart',
        timeout: 5000
    }
};

// Data processing constants
const DATA_CONFIG = {
    syntheticDataPoints: 100,
    trainTestSplit: 0.8,
    validationSplit: 0.2,
    batchSize: 16,
    
    // Volatility settings
    volatility: {
        standard: 0.08,
        iso20022: 0.05  // Reduced volatility for regulatory compliance
    },
    
    // Feature engineering parameters
    movingAverages: [5, 10],
    rsiPeriod: 14,
    volumeMultiplier: 1000000
};

// UI messages
const UI_MESSAGES = {
    loading: 'Loading data...',
    dataLoaded: 'Data loaded successfully',
    trainingComplete: 'Model training completed',
    predictionReady: 'Price prediction ready',
    error: 'An error occurred. Please try again.',
    selectCrypto: 'Select cryptocurrency and click "Load Data" to begin'
};

// Error handling
const ERROR_TYPES = {
    API_ERROR: 'api_error',
    MODEL_ERROR: 'model_error',
    DATA_ERROR: 'data_error',
    VALIDATION_ERROR: 'validation_error'
};
