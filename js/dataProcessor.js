/**
 * Real Data Processor - Uses actual historical cryptocurrency data
 */

class DataProcessor {
    constructor() {
        this.rawData = [];
        this.processedData = [];
        this.scaler = null;
    }

    /**
     * Fetch real historical cryptocurrency data
     */
    async fetchData(cryptoKey) {
        const crypto = CRYPTO_CONFIG[cryptoKey];
        
        try {
            console.log(`Fetching real ${crypto.name} data from CoinGecko...`);
            
            // Fetch historical data (30 days with hourly intervals)
            const historyUrl = `https://api.coingecko.com/api/v3/coins/${crypto.apiId}/market_chart?vs_currency=usd&days=30&interval=hourly`;
            
            const response = await this.fetchWithTimeout(historyUrl, 5000);
            
            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.prices || data.prices.length === 0) {
                throw new Error('No price data received from API');
            }
            
            // Convert API data to our format
            this.rawData = data.prices.map((pricePoint, index) => {
                const [timestamp, price] = pricePoint;
                const volume = data.total_volumes[index] ? data.total_volumes[index][1] : 0;
                
                return {
                    date: new Date(timestamp),
                    price: price,
                    volume: volume,
                    source: 'coingecko_real'
                };
            });
            
            // Sort by date to ensure chronological order
            this.rawData.sort((a, b) => a.date - b.date);
            
            const currentPrice = this.rawData[this.rawData.length - 1].price;
            const oldestPrice = this.rawData[0].price;
            const totalChange = ((currentPrice / oldestPrice - 1) * 100);
            
            console.log(`✅ Real ${crypto.name} data loaded:`);
            console.log(`   • ${this.rawData.length} data points`);
            console.log(`   • Current price: $${currentPrice.toFixed(4)}`);
            console.log(`   • 30-day change: ${totalChange > 0 ? '+' : ''}${totalChange.toFixed(2)}%`);
            console.log(`   • Date range: ${this.rawData[0].date.toDateString()} to ${this.rawData[this.rawData.length - 1].date.toDateString()}`);
            
            return this.rawData;
            
        } catch (error) {
            console.error(`Failed to fetch real data for ${crypto.name}:`, error.message);
            console.log('Falling back to demo data...');
            
            // Fallback to simple demo data if API fails
            return this.generateFallbackData(cryptoKey);
        }
    }

    /**
     * Fetch with timeout
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
     * Simple fallback data if API completely fails
     */
    generateFallbackData(cryptoKey) {
        const crypto = CRYPTO_CONFIG[cryptoKey];
        console.log(`Generating fallback data for ${crypto.name} demo`);
        
        this.rawData = [];
        let price = crypto.basePrice;
        
        // Simple random walk - much more conservative
        for (let i = 0; i < 100; i++) {
            const change = (Math.random() - 0.5) * 0.02; // Max 1% daily change
            price = price * (1 + change);
            
            this.rawData.push({
                date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
                price: Math.max(price, crypto.basePrice * 0.8), // 20% floor
                volume: Math.random() * 1000000,
                source: 'fallback_demo'
            });
        }
        
        return this.rawData;
    }

    /**
     * Process features from real data
     */
    processFeatures() {
        if (this.rawData.length < 20) {
            throw new Error('Insufficient data for feature processing');
        }

        this.processedData = [];
        const prices = this.rawData.map(d => d.price);
        const volumes = this.rawData.map(d => d.volume);

        // Calculate technical indicators
        for (let i = 14; i < this.rawData.length - 1; i++) { // Start at 14 for RSI
            const features = [
                this.calculateMA(prices, i, 5),
                this.calculateMA(prices, i, 10),
                this.calculateMomentum(prices, i),
                this.calculateVolatility(prices, i, 10),
                this.calculateVolumeRatio(volumes, i, 10),
                this.calculateRSI(prices, i, 14)
            ];
            
            this.processedData.push({
                features: features,
                target: prices[i + 1], // Next price
                price: prices[i],
                date: this.rawData[i].date
            });
        }

        this.normalizeFeatures();
        console.log(`✅ Processed ${this.processedData.length} feature vectors from real data`);
        
        return this.processedData;
    }

    /**
     * Calculate Moving Average
     */
    calculateMA(prices, index, period) {
        const start = Math.max(0, index - period + 1);
        const slice = prices.slice(start, index + 1);
        return slice.reduce((sum, price) => sum + price, 0) / slice.length;
    }

    /**
     * Calculate Momentum
     */
    calculateMomentum(prices, index) {
        return index > 0 ? (prices[index] / prices[index - 1] - 1) : 0;
    }

    /**
     * Calculate Volatility
     */
    calculateVolatility(prices, index, period) {
        const start = Math.max(0, index - period + 1);
        const slice = prices.slice(start, index + 1);
        
        if (slice.length < 2) return 0;
        
        const mean = slice.reduce((sum, price) => sum + price, 0) / slice.length;
        const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / slice.length;
        return Math.sqrt(variance);
    }

    /**
     * Calculate Volume Ratio
     */
    calculateVolumeRatio(volumes, index, period) {
        const start = Math.max(0, index - period + 1);
        const slice = volumes.slice(start, index + 1);
        const avgVolume = slice.reduce((sum, vol) => sum + vol, 0) / slice.length;
        return avgVolume === 0 ? 1 : volumes[index] / avgVolume;
    }

    /**
     * Calculate RSI
     */
    calculateRSI(prices, index, period = 14) {
        if (index < period) return 50;
        
        const changes = [];
        for (let i = index - period + 1; i <= index; i++) {
            if (i > 0) {
                changes.push(prices[i] - prices[i - 1]);
            }
        }
        
        const gains = changes.filter(change => change > 0);
        const losses = changes.filter(change => change < 0).map(loss => Math.abs(loss));
        
        const avgGain = gains.length > 0 ? gains.reduce((sum, gain) => sum + gain, 0) / period : 0;
        const avgLoss = losses.length > 0 ? losses.reduce((sum, loss) => sum + loss, 0) / period : 0;
        
        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    /**
     * Normalize features
     */
    normalizeFeatures() {
        if (this.processedData.length === 0) return;
        
        const featureCount = this.processedData[0].features.length;
        const means = new Array(featureCount);
        const stds = new Array(featureCount);
        
        // Calculate means
        for (let i = 0; i < featureCount; i++) {
            means[i] = this.processedData.reduce((sum, item) => sum + item.features[i], 0) / this.processedData.length;
        }
        
        // Calculate standard deviations
        for (let i = 0; i < featureCount; i++) {
            const variance = this.processedData.reduce((sum, item) => {
                return sum + Math.pow(item.features[i] - means[i], 2);
            }, 0) / this.processedData.length;
            stds[i] = Math.sqrt(variance) || 1;
        }
        
        // Normalize
        this.processedData.forEach(item => {
            for (let i = 0; i < featureCount; i++) {
                item.features[i] = (item.features[i] - means[i]) / stds[i];
            }
        });
        
        this.scaler = { means, stds };
    }

    /**
     * Split data for training
     */
    splitData() {
        const splitIndex = Math.floor(this.processedData.length * DATA_CONFIG.trainTestSplit);
        return {
            train: this.processedData.slice(0, splitIndex),
            test: this.processedData.slice(splitIndex)
        };
    }

    /**
     * Get latest features
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
     * Reset data
     */
    reset() {
        this.rawData = [];
        this.processedData = [];
        this.scaler = null;
    }
}

// Export for global use
window.DataProcessor = DataProcessor;
