/**
 * Optimized Data Processor for Crypto ML Platform
 * Handles real-time data fetching and efficient feature engineering
 */

class DataProcessor {
    constructor() {
        this.rawData = [];
        this.processedData = [];
        this.scaler = null;
        this.cache = new Map(); // Performance cache
    }

    /**
     * Fetch real-time cryptocurrency data
     */
    async fetchData(cryptoKey) {
        const crypto = CRYPTO_CONFIG[cryptoKey];
        
        try {
            // Fetch current price first
            const priceUrl = `${API_CONFIG.coingecko.baseUrl}${API_CONFIG.coingecko.priceEndpoint}?ids=${crypto.apiId}&vs_currencies=usd&include_24hr_change=true`;
            const priceResponse = await this.fetchWithTimeout(priceUrl, 3000);
            
            if (!priceResponse.ok) throw new Error(`Price API: ${priceResponse.status}`);
            
            const priceData = await priceResponse.json();
            const currentPrice = priceData[crypto.apiId]?.usd;
            const change24h = priceData[crypto.apiId]?.usd_24h_change || 0;
            
            if (!currentPrice) throw new Error('No price data available');
            
            console.log(`Real ${crypto.name} price: $${currentPrice.toFixed(crypto.basePrice < 1 ? 4 : 2)} (${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}% 24h)`);
            
            // Generate realistic historical data based on current price
            return this.generateRealisticData(cryptoKey, currentPrice, change24h);
            
        } catch (error) {
            console.warn(`API unavailable for ${crypto.name}:`, error.message);
            console.log('Using fallback synthetic data');
            return this.generateRealisticData(cryptoKey);
        }
    }

    /**
     * Fetch with timeout for better performance
     */
    async fetchWithTimeout(url, timeout = 5000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Generate realistic price data based on current market conditions
     */
    generateRealisticData(cryptoKey, currentPrice = null, recentChange = 0) {
        const crypto = CRYPTO_CONFIG[cryptoKey];
        const dataPoints = DATA_CONFIG.syntheticDataPoints;
        
        // Use real price or fallback to config
        const latestPrice = currentPrice || crypto.basePrice;
        const volatility = crypto.iso20022 ? DATA_CONFIG.volatility.iso20022 : DATA_CONFIG.volatility.standard;
        
        this.rawData = [];
        
        // Start from 30 days ago and work forward to current price
        let price = latestPrice * (1 - (recentChange / 100) * 0.3); // Approximate 30-day ago price
        
        for (let i = 0; i < dataPoints; i++) {
            const dayProgress = i / (dataPoints - 1);
            
            // Trending toward current price
            const trendForce = (latestPrice - price) * 0.002 * dayProgress;
            
            // Market patterns: weekday/weekend effects
            const dayOfWeek = (i % 7);
            const weekendEffect = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.98 : 1.02;
            
            // Random walk with trend
            const randomWalk = (Math.random() - 0.5) * volatility;
            const trendComponent = trendForce + (Math.sin(i / 14) * 0.01);
            
            price = price * (1 + trendComponent + randomWalk) * weekendEffect;
            price = Math.max(price, latestPrice * 0.1); // Floor price
            
            // Higher volume on volatile days
            const volatilityFactor = Math.abs(randomWalk) * 10 + 0.5;
            const volume = DATA_CONFIG.volumeMultiplier * (0.5 + Math.random()) * volatilityFactor;
            
            this.rawData.push({
                date: new Date(Date.now() - (dataPoints - i - 1) * 24 * 60 * 60 * 1000),
                price: price,
                volume: volume,
                source: currentPrice ? 'enhanced' : 'synthetic'
            });
        }
        
        // Ensure final price matches current price if available
        if (currentPrice) {
            this.rawData[this.rawData.length - 1].price = currentPrice;
        }
        
        return this.rawData;
    }

    /**
     * Optimized feature processing with caching
     */
    processFeatures() {
        if (this.rawData.length < 20) {
            throw new Error('Insufficient data for feature processing');
        }

        const cacheKey = this.generateCacheKey();
        if (this.cache.has(cacheKey)) {
            this.processedData = this.cache.get(cacheKey);
            return this.processedData;
        }

        this.processedData = [];
        const prices = this.rawData.map(d => d.price);
        const volumes = this.rawData.map(d => d.volume);
        
        // Pre-calculate moving averages for better performance
        const ma5Array = this.calculateMovingAverageArray(prices, 5);
        const ma10Array = this.calculateMovingAverageArray(prices, 10);
        const rsiArray = this.calculateRSIArray(prices);

        for (let i = 10; i < this.rawData.length - 1; i++) {
            const features = [
                ma5Array[i],
                ma10Array[i],
                this.calculateMomentum(prices, i),
                this.calculateVolatility(prices.slice(Math.max(0, i - 9), i + 1)),
                this.calculateVolumeRatio(volumes, i),
                rsiArray[i]
            ];
            
            this.processedData.push({
                features: features,
                target: prices[i + 1],
                price: prices[i],
                date: this.rawData[i].date
            });
        }

        this.normalizeFeatures();
        this.cache.set(cacheKey, [...this.processedData]); // Cache results
        
        return this.processedData;
    }

    /**
     * Optimized moving average calculation for entire array
     */
    calculateMovingAverageArray(prices, window) {
        const result = new Array(prices.length);
        let sum = 0;
        
        // Initialize first window
        for (let i = 0; i < Math.min(window, prices.length); i++) {
            sum += prices[i];
            result[i] = sum / (i + 1);
        }
        
        // Rolling calculation for better performance
        for (let i = window; i < prices.length; i++) {
            sum = sum + prices[i] - prices[i - window];
            result[i] = sum / window;
        }
        
        return result;
    }

    /**
     * Optimized RSI calculation for entire array
     */
    calculateRSIArray(prices, period = 14) {
        const result = new Array(prices.length).fill(50);
        
        if (prices.length < period + 1) return result;
        
        let avgGain = 0;
        let avgLoss = 0;
        
        // Initial calculation
        for (let i = 1; i <= period; i++) {
            const change = prices[i] - prices[i - 1];
            if (change > 0) avgGain += change;
            else avgLoss += Math.abs(change);
        }
        
        avgGain /= period;
        avgLoss /= period;
        
        // Rolling RSI calculation
        for (let i = period; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            const gain = change > 0 ? change : 0;
            const loss = change < 0 ? Math.abs(change) : 0;
            
            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;
            
            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            result[i] = 100 - (100 / (1 + rs));
        }
        
        return result;
    }

    /**
     * Calculate momentum efficiently
     */
    calculateMomentum(prices, index) {
        return index > 0 ? (prices[index] / prices[index - 1] - 1) : 0;
    }

    /**
     * Calculate volatility from price slice
     */
    calculateVolatility(prices) {
        if (prices.length < 2) return 0;
        
        const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
        return Math.sqrt(variance);
    }

    /**
     * Calculate volume ratio efficiently
     */
    calculateVolumeRatio(volumes, index) {
        const start = Math.max(0, index - 9);
        const recentVolumes = volumes.slice(start, index + 1);
        const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
        return avgVolume === 0 ? 1 : volumes[index] / avgVolume;
    }

    /**
     * Optimized feature normalization
     */
    normalizeFeatures() {
        if (this.processedData.length === 0) return;
        
        const featureCount = this.processedData[0].features.length;
        const means = new Array(featureCount);
        const stds = new Array(featureCount);
        
        // Single pass for means
        for (let i = 0; i < featureCount; i++) {
            means[i] = this.processedData.reduce((sum, item) => sum + item.features[i], 0) / this.processedData.length;
        }
        
        // Single pass for standard deviations
        for (let i = 0; i < featureCount; i++) {
            const variance = this.processedData.reduce((sum, item) => {
                return sum + Math.pow(item.features[i] - means[i], 2);
            }, 0) / this.processedData.length;
            stds[i] = Math.sqrt(variance) || 1;
        }
        
        // Normalize in place
        this.processedData.forEach(item => {
            for (let i = 0; i < featureCount; i++) {
                item.features[i] = (item.features[i] - means[i]) / stds[i];
            }
        });
        
        this.scaler = { means, stds };
    }

    /**
     * Generate cache key for processed data
     */
    generateCacheKey() {
        const priceHash = this.rawData.reduce((hash, item, i) => {
            return hash + (item.price * (i + 1));
        }, 0);
        return `processed_${Math.round(priceHash * 1000)}`;
    }

    /**
     * Split data efficiently
     */
    splitData() {
        const splitIndex = Math.floor(this.processedData.length * DATA_CONFIG.trainTestSplit);
        return {
            train: this.processedData.slice(0, splitIndex),
            test: this.processedData.slice(splitIndex)
        };
    }

    /**
     * Get latest features for prediction
     */
    getLatestFeatures() {
        return this.processedData.length > 0 ? this.processedData[this.processedData.length - 1].features : null;
    }

    /**
     * Get current price
     */
    getCurrentPrice() {
        return this.rawData.length > 0 ? this.rawData[this.rawData.length - 1].price : null;
    }

    /**
     * Clear data and cache
     */
    reset() {
        this.rawData = [];
        this.processedData = [];
        this.scaler = null;
        this.cache.clear();
    }

    /**
     * Get data statistics
     */
    getStats() {
        if (this.rawData.length === 0) return null;
        
        const prices = this.rawData.map(d => d.price);
        const current = prices[prices.length - 1];
        const start = prices[0];
        const change = ((current / start - 1) * 100);
        
        return {
            dataPoints: this.rawData.length,
            currentPrice: current,
            priceChange: change,
            source: this.rawData[0].source || 'unknown'
        };
    }
}

// Export for global use
window.DataProcessor = DataProcessor;
