class DataProcessor {
    constructor() {
        this.apiKey = 'CG-7F3NdFPwg9hG1uAqECgLT468';
        this.rawData = [];
        this.processedData = [];
        this.currentPrice = 0.62;
        this.updateInterval = null;
        
        // ISO20022 enhanced coins
        this.iso20022Coins = {
            'xrp': { 
                id: 'ripple', 
                enhancement: 1.15,
                features: ['cross_border', 'liquidity', 'cbdc_ready']
            },
            'stellar': { 
                id: 'stellar', 
                enhancement: 1.08,
                features: ['remittance', 'anchored_assets']
            },
            'algorand': { 
                id: 'algorand', 
                enhancement: 1.12,
                features: ['cbdc', 'defi_compliance']
            }
        };
    }

    async fetchData(cryptoKey) {
        console.log(`Fetching data for: ${cryptoKey}`);
        
        try {
            // Get coin config
            const coinConfig = this.iso20022Coins[cryptoKey] || { id: cryptoKey, enhancement: 1.0 };
            
            // Fetch real price
            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${coinConfig.id}&vs_currencies=usd&x_cg_demo_api_key=${this.apiKey}`
            );
            
            if (response.ok) {
                const data = await response.json();
                this.currentPrice = data[coinConfig.id]?.usd || 0.62;
                console.log(`Real ${cryptoKey.toUpperCase()} price: $${this.currentPrice}`);
            } else {
                console.log('API failed, using demo price');
                this.currentPrice = 0.62;
            }
            
            // Generate historical data with real current price
            this.generateHistoricalData();
            
            // Start price updates
            if (!this.updateInterval) {
                this.startPriceUpdates(coinConfig.id);
            }
            
            return this.rawData;
            
        } catch (error) {
            console.error('Data fetch failed:', error);
            this.generateHistoricalData();
            return this.rawData;
        }
    }

    generateHistoricalData() {
        const data = [];
        const basePrice = this.currentPrice;
        const now = Date.now();
        
        // Generate 100 data points with realistic price movement
        for (let i = 99; i >= 0; i--) {
            const hoursAgo = i;
            const timestamp = now - (hoursAgo * 3600000);
            
            // Create realistic price variations
            const trendFactor = Math.sin(i * 0.05) * 0.01; // Long-term trend
            const volatility = (Math.random() - 0.5) * 0.015; // Short-term noise
            const momentum = Math.sin(i * 0.3) * 0.008; // Medium-term momentum
            
            const priceMultiplier = 1 + trendFactor + volatility + momentum;
            const price = Math.max(0.1, basePrice * priceMultiplier);
            
            const volume = 500000 + Math.random() * 1500000;
            const high = price * (1 + Math.random() * 0.02);
            const low = price * (1 - Math.random() * 0.02);
            
            data.push({
                timestamp: timestamp,
                date: new Date(timestamp),
                price: price,
                volume: volume,
                high: high,
                low: low,
                open: i < 99 ? data[data.length - 1]?.price || price : price,
                close: price
            });
        }
        
        this.rawData = data;
        console.log(`Generated ${data.length} historical data points`);
        return data;
    }

    processFeatures() {
        if (this.rawData.length < 10) {
            this.generateHistoricalData();
        }

        const features = [];
        
        for (let i = 10; i < this.rawData.length; i++) {
            const current = this.rawData[i];
            const prev = this.rawData[i-1];
            const prev5 = this.rawData[i-5];
            const prev10 = this.rawData[i-10];
            
            // Technical indicators
            const sma5 = this.calculateSMA(i, 5);
            const sma10 = this.calculateSMA(i, 10);
            const rsi = this.calculateRSI(i, 14);
            const macd = this.calculateMACD(i);
            const bollinger = this.calculateBollingerBands(i, 20);
            const volatility = this.calculateVolatility(i, 10);
            
            // Price features
            const priceChange1h = (current.price - prev.price) / prev.price;
            const priceChange5h = (current.price - prev5.price) / prev5.price;
            const priceChange10h = (current.price - prev10.price) / prev10.price;
            
            // Volume features
            const volumeRatio = current.volume / prev.volume;
            const avgVolume5 = this.calculateAvgVolume(i, 5);
            const volumeMA = current.volume / avgVolume5;
            
            // Advanced features
            const pricePosition = (current.price - bollinger.lower) / (bollinger.upper - bollinger.lower);
            const trendStrength = Math.abs(sma5 - sma10) / sma10;
            
            // Time-based features
            const hourOfDay = new Date(current.timestamp).getHours();
            const dayOfWeek = new Date(current.timestamp).getDay();
            
            features.push({
                features: [
                    current.price,
                    priceChange1h,
                    priceChange5h,
                    priceChange10h,
                    sma5,
                    sma10,
                    rsi,
                    macd.macd,
                    macd.signal,
                    bollinger.upper,
                    bollinger.lower,
                    pricePosition,
                    volatility,
                    volumeRatio,
                    volumeMA,
                    trendStrength,
                    Math.sin(hourOfDay * Math.PI / 12), // Time encoding
                    Math.cos(hourOfDay * Math.PI / 12),
                    Math.sin(dayOfWeek * Math.PI / 3.5),
                    Math.cos(dayOfWeek * Math.PI / 3.5)
                ],
                target: this.rawData[Math.min(i + 1, this.rawData.length - 1)].price
            });
        }
        
        this.processedData = features;
        console.log(`Processed ${features.length} feature vectors with advanced technical indicators`);
        return features;
    }

    // Technical Analysis Functions
    calculateSMA(index, period) {
        const start = Math.max(0, index - period + 1);
        const prices = this.rawData.slice(start, index + 1).map(d => d.price);
        return prices.reduce((sum, price) => sum + price, 0) / prices.length;
    }

    calculateRSI(index, period = 14) {
        if (index < period) return 50;
        
        let gains = 0, losses = 0;
        for (let i = index - period + 1; i <= index; i++) {
            const change = this.rawData[i].price - this.rawData[i-1].price;
            if (change > 0) gains += change;
            else losses += Math.abs(change);
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgGain / (avgLoss || 0.001);
        return 100 - (100 / (1 + rs));
    }

    calculateMACD(index, fast = 12, slow = 26, signal = 9) {
        const emaFast = this.calculateEMA(index, fast);
        const emaSlow = this.calculateEMA(index, slow);
        const macd = emaFast - emaSlow;
        const signalLine = this.calculateEMA(index, signal, 'macd');
        
        return {
            macd: macd,
            signal: signalLine,
            histogram: macd - signalLine
        };
    }

    calculateEMA(index, period, type = 'price') {
        if (index < period) return this.rawData[index].price;
        
        const multiplier = 2 / (period + 1);
        let ema = this.rawData[index - period].price;
        
        for (let i = index - period + 1; i <= index; i++) {
            const value = type === 'price' ? this.rawData[i].price : this.rawData[i].price; // Simplified
            ema = (value * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    calculateBollingerBands(index, period = 20, stdDev = 2) {
        const sma = this.calculateSMA(index, period);
        const start = Math.max(0, index - period + 1);
        const prices = this.rawData.slice(start, index + 1).map(d => d.price);
        
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / prices.length;
        const standardDeviation = Math.sqrt(variance);
        
        return {
            upper: sma + (standardDeviation * stdDev),
            middle: sma,
            lower: sma - (standardDeviation * stdDev)
        };
    }

    calculateVolatility(index, period = 10) {
        if (index < period) return 0;
        
        const returns = [];
        for (let i = index - period + 1; i <= index; i++) {
            const prevPrice = this.rawData[i-1].price;
            const currentPrice = this.rawData[i].price;
            returns.push(Math.log(currentPrice / prevPrice));
        }
        
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        return Math.sqrt(variance * 252); // Annualized volatility
    }

    calculateAvgVolume(index, period) {
        const start = Math.max(0, index - period + 1);
        const volumes = this.rawData.slice(start, index + 1).map(d => d.volume);
        return volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    }

    // Data splitting for ML
    splitData(trainRatio = 0.8) {
        if (this.processedData.length === 0) {
            this.processFeatures();
        }
        
        const splitIndex = Math.floor(this.processedData.length * trainRatio);
        return {
            train: this.processedData.slice(0, splitIndex),
            test: this.processedData.slice(splitIndex)
        };
    }

    getLatestFeatures() {
        if (this.processedData.length === 0) {
            this.processFeatures();
        }
        return this.processedData[this.processedData.length - 1]?.features || null;
    }

    getCurrentPrice() {
        return this.currentPrice;
    }

    startPriceUpdates(coinId) {
        this.updateInterval = setInterval(async () => {
            try {
                const response = await fetch(
                    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&x_cg_demo_api_key=${this.apiKey}`
                );
                
                if (response.ok) {
                    const data = await response.json();
                    const newPrice = data[coinId]?.usd;
                    if (newPrice) {
                        this.currentPrice = newPrice;
                        console.log(`Price updated: $${newPrice}`);
                        
                        // Update UI if elements exist
                        const priceElement = document.querySelector('[data-price]');
                        if (priceElement) {
                            priceElement.textContent = `$${newPrice.toFixed(6)}`;
                        }
                    }
                }
            } catch (error) {
                console.log('Price update failed:', error.message);
            }
        }, 300000); // 5 minutes
    }

    reset() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.rawData = [];
        this.processedData = [];
        this.currentPrice = 0.62;
    }
}

// Global initialization
window.DataProcessor = DataProcessor;
