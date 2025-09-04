/**
 * Data processing utilities for the Crypto ML Platform
 * Handles data fetching, synthetic data generation, and feature engineering
 */

class DataProcessor {
    constructor() {
        this.rawData = [];
        this.processedData = [];
        this.scaler = null;
    }

    /**
     * Attempt to fetch real-time data from CoinGecko API
     * Falls back to synthetic data if API is unavailable
     */
    async fetchData(cryptoKey) {
        const crypto = CRYPTO_CONFIG[cryptoKey];
        
        try {
            const url = `${API_CONFIG.coingecko.baseUrl}${API_CONFIG.coingecko.priceEndpoint}?ids=${crypto.apiId}&vs_currencies=usd`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // For now, we'll still use synthetic data but could expand this
            // to fetch historical data for real training
            console.log('API connected successfully, generating enhanced synthetic data');
            return this.generateSyntheticData(cryptoKey, true);
            
        } catch (error) {
            console.warn('API unavailable, using synthetic data:', error.message);
            return this.generateSyntheticData(cryptoKey, false);
        }
    }

    /**
     * Generate synthetic cryptocurrency data for demonstration
     */
    generateSyntheticData(cryptoKey, isEnhanced = false) {
        const crypto = CRYPTO_CONFIG[cryptoKey];
        const dataPoints = DATA_CONFIG.syntheticDataPoints;
        
        this.rawData = [];
        let price = crypto.basePrice;
        
        // Use ISO20022 reduced volatility if applicable
        const volatility = crypto.iso20022 ? 
            DATA_CONFIG.volatility.iso20022 : 
            DATA_CONFIG.volatility.standard;

        for (let i = 0; i < dataPoints; i++) {
            // Add some trend and seasonal patterns
            const trend = Math.sin(i / 20) * 0.02;
            const seasonal = Math.cos(i / 7) * 0.01;
            const randomWalk = (Math.random() - 0.5) * volatility;
            
            price = price * (1 + trend + seasonal + randomWalk);
            
            // Ensure price doesn't go negative
            price = Math.max(price, crypto.basePrice * 0.1);
            
            this.rawData.push({
                date: new Date(Date.now() - (dataPoints - i) * 24 * 60 * 60 * 1000),
                price: price,
                volume: Math.random() * DATA_CONFIG.volumeMultiplier * (0.5 + Math.random()),
                enhanced: isEnhanced
            });
        }

        return this.rawData;
    }

    /**
     * Process raw data into features suitable for machine learning
     */
    processFeatures() {
        if (this.rawData.length < 20) {
            throw new Error('Insufficient data for feature processing');
        }

        this.processedData = [];
        const prices = this.rawData.map(d => d.price);
        const volumes = this.rawData.map(d => d.volume);

        for (let i = 10; i < this.rawData.length - 1; i++) {
            const features = this.calculateFeatures(prices, volumes, i);
            const target = prices[i + 1]; // Next day price
            
            this.processedData.push({
                features: features,
                target: target,
                price: prices[i],
                date: this.rawData[i].date
            });
        }

        // Normalize features
        this.normalizeFeatures();
        
        return this.processedData;
    }

    /**
     * Calculate technical indicators and features for a given index
     */
    calculateFeatures(prices, volumes, index) {
        const lookback = 10;
        const recentPrices = prices.slice(Math.max(0, index - lookback), index + 1);
        const recentVolumes = volumes.slice(Math.max(0, index - lookback), index + 1);
        
        // Moving averages
        const ma5 = this.calculateMovingAverage(recentPrices, 5);
        const ma10 = this.calculateMovingAverage(recentPrices, 10);
        
        // Price momentum (rate of change)
        const momentum = index > 0 ? (prices[index] / prices[index - 1] - 1) : 0;
        
        // Volatility (standard deviation of recent prices)
        const volatility = this.calculateVolatility(recentPrices);
        
        // Volume trend
        const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
        const volumeTrend = volumes[index] / avgVolume;
        
        // RSI (simplified)
        const rsi = this.calculateRSI(recentPrices);

        return [ma5, ma10, momentum, volatility, volumeTrend, rsi];
    }

    /**
     * Calculate moving average
     */
    calculateMovingAverage(prices, window) {
        if (prices.length < window) return prices[prices.length - 1];
        
        const slice = prices.slice(-window);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
    }

    /**
     * Calculate price volatility (standard deviation)
     */
    calculateVolatility(prices) {
        if (prices.length < 2) return 0;
        
        const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
        const squaredDiffs = prices.map(price => Math.pow(price - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / prices.length;
        
        return Math.sqrt(variance);
    }

    /**
     * Calculate simplified RSI
     */
    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return 50; // Neutral RSI
        
        const recentPrices = prices.slice(-period - 1);
        let gains = 0, losses = 0;
        
        for (let i = 1; i < recentPrices.length; i++) {
            const change = recentPrices[i] - recentPrices[i - 1];
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    /**
     * Normalize features using z-score normalization
     */
    normalizeFeatures() {
        if (this.processedData.length === 0) return;
        
        const featureCount = this.processedData[0].features.length;
        const means = new Array(featureCount).fill(0);
        const stds = new Array(featureCount).fill(1);
        
        // Calculate means
        for (let i = 0; i < featureCount; i++) {
            const values = this.processedData.map(d => d.features[i]);
            means[i] = values.reduce((a, b) => a + b, 0) / values.length;
        }
        
        // Calculate standard deviations
        for (let i = 0; i < featureCount; i++) {
            const values = this.processedData.map(d => d.features[i]);
            const variance = values.reduce((sum, val) => sum + Math.pow(val - means[i], 2), 0) / values.length;
            stds[i] = Math.sqrt(variance) || 1; // Prevent division by zero
        }
        
        // Normalize all features
        this.processedData.forEach(item => {
            item.features = item.features.map((feature, i) => 
                (feature - means[i]) / stds[i]
            );
        });
        
        this.scaler = { means, stds };
    }

    /**
     * Split data into training and testing sets
     */
    splitData() {
        const splitIndex = Math.floor(this.processedData.length * DATA_CONFIG.trainTestSplit);
        
        return {
            train: this.processedData.slice(0, splitIndex),
            test: this.processedData.slice(splitIndex)
        };
    }

    /**
     * Get the latest processed data point for prediction
     */
    getLatestFeatures() {
        if (this.processedData.length === 0) return null;
        return this.processedData[this.processedData.length - 1].features;
    }

    /**
     * Get current price for comparison with predictions
     */
    getCurrentPrice() {
        if (this.rawData.length === 0) return null;
        return this.rawData[this.rawData.length - 1].price;
    }

    /**
     * Clear all data
     */
    reset() {
        this.rawData = [];
        this.processedData = [];
        this.scaler = null;
    }
}

// Export for global use
window.DataProcessor = DataProcessor;
