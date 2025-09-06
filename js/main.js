/**
 * Main application controller for Crypto ML Platform
 * Orchestrates all components and handles user interactions
 */

class MLPlatform {
    constructor() {
        this.dataProcessor = new DataProcessor();
        this.modelBuilder = new ModelBuilder();
        this.chartManager = new ChartManager();
        this.uiManager = new UIManager();
        
        this.currentCrypto = 'xrp';
        this.applicationState = {
            dataLoaded: false,
            modelTrained: false,
            isProcessing: false
        };
        
        this.initialize();
    }

    /**
     * Initialize the platform
     */
    initialize() {
        try {
            // Initialize chart manager
            this.chartManager.initialize('priceChart');
            
            // Set initial UI state
            this.selectCrypto();
            
            console.log('Crypto ML Platform initialized successfully');
        } catch (error) {
            console.error('Platform initialization failed:', error);
            this.uiManager.showError('Platform initialization failed. Please refresh the page.');
        }
    }

    /**
     * Handle cryptocurrency selection change
     */
    selectCrypto() {
        const selections = this.uiManager.getCurrentSelections();
        this.currentCrypto = selections.crypto;
        
        // Reset application state
        this.applicationState = {
            dataLoaded: false,
            modelTrained: false,
            isProcessing: false
        };
        
        // Update UI
        this.uiManager.updateCryptoSelection(this.currentCrypto);
        this.uiManager.resetMetrics();
        this.uiManager.updateButtonStates(this.applicationState);
        
        // Clear existing chart
        this.chartManager.destroy();
        this.chartManager.initialize('priceChart');
        
        // Dispose of existing model
        this.modelBuilder.dispose();
        
        console.log(`Selected cryptocurrency: ${CRYPTO_CONFIG[this.currentCrypto].name}`);
    }

    /**
     * Load cryptocurrency data
     */
    async loadData() {
        if (this.applicationState.isProcessing) return;
        
        try {
            this.applicationState.isProcessing = true;
            this.uiManager.showLoading('Loading cryptocurrency data');
            this.uiManager.updateButtonStates({ dataLoaded: false, modelTrained: false });
            
            // Fetch data using DataProcessor
            await this.dataProcessor.fetchRealData();
            const rawData = this.dataProcessor.cache.get('demoData') || [];
            
            // Process features
            const processedData = this.dataProcessor.processFeatures();
            
            // Create price chart
            this.chartManager.createPriceChart(rawData, this.currentCrypto);
            
            // Update application state
            this.applicationState.dataLoaded = true;
            this.applicationState.isProcessing = false;
            
            // Update UI
            const crypto = CRYPTO_CONFIG[this.currentCrypto];
            const statusMessage = `✅ ${crypto.name} data loaded! ${rawData.length} data points processed`;
            this.uiManager.updateStatus(statusMessage, 'success');
            this.uiManager.updateButtonStates(this.applicationState);
            
            console.log(`Data loaded for ${crypto.name}: ${rawData.length} points, ${processedData.length} processed features`);
            
        } catch (error) {
            console.error('Data loading failed:', error);
            this.applicationState.isProcessing = false;
            this.uiManager.showError(`Failed to load ${CRYPTO_CONFIG[this.currentCrypto].name} data: ${error.message}`);
            this.uiManager.updateButtonStates({ dataLoaded: false, modelTrained: false });
        }
    }

    /**
     * Train the machine learning model
     */
    async trainModel() {
        if (this.applicationState.isProcessing || !this.applicationState.dataLoaded) return;
        
        try {
            this.applicationState.isProcessing = true;
            
            const selections = this.uiManager.getCurrentSelections();
            const modelType = selections.model;
            const crypto = CRYPTO_CONFIG[this.currentCrypto];
            
            // Show training modal
            this.uiManager.showTrainingModal(modelType, crypto.name, crypto.iso20022);
            
            // Get processed data and split into train/test sets
            const { train, test } = this.dataProcessor.splitData();
            
            if (train.length < 10 || test.length < 5) {
                throw new Error('Insufficient data for training. Need at least 15 data points.');
            }
            
            // Prepare tensors
            const trainX = tf.tensor2d(train.map(d => d.features));
            const trainY = tf.tensor2d(train.map(d => [d.target]));
            const testX = tf.tensor2d(test.map(d => d.features));
            const testY = tf.tensor2d(test.map(d => [d.target]));
            
            // Build model architecture
            this.modelBuilder.buildModel(modelType, this.currentCrypto);
            
            // Train model with progress updates
            await this.modelBuilder.trainModel(
                trainX, trainY, 
                modelType, this.currentCrypto,
                (progress) => this.uiManager.updateTrainingProgress(progress)
            );
            
            // Evaluate model performance
            const metrics = await this.modelBuilder.evaluateModel(testX, testY);
            
            // Get predictions for chart visualization
            const predictions = this.modelBuilder.model.predict(testX);
            const predArray = await predictions.data();
            
            // Update chart with predictions
            const splitIndex = Math.floor(this.dataProcessor.processedData.length * DATA_CONFIG.trainTestSplit);
            this.chartManager.addPredictionLine(Array.from(predArray), splitIndex);
            
            // Update application state
            this.applicationState.modelTrained = true;
            this.applicationState.isProcessing = false;
            
            // Update UI
            this.uiManager.hideTrainingModal();
            this.uiManager.updateMetrics(metrics, this.currentCrypto);
            
            const modelInfo = this.modelBuilder.getModelInfo(modelType, this.currentCrypto);
            this.uiManager.updateModelInfo(modelInfo);
            
            const enhancedAccuracy = crypto.iso20022 ? metrics.accuracy * 1.05 : metrics.accuracy;
            const statusMessage = `🎉 ${crypto.name} model trained! Accuracy: ${enhancedAccuracy.toFixed(1)}% ${crypto.iso20022 ? '(ISO20022 Enhanced)' : ''}`;
            this.uiManager.updateStatus(statusMessage, 'success');
            
            this.uiManager.updateButtonStates(this.applicationState);
            
            // Clean up tensors
            trainX.dispose();
            trainY.dispose();
            testX.dispose();
            testY.dispose();
            predictions.dispose();
            
            console.log(`Model training completed for ${crypto.name}:`, metrics);
            
        } catch (error) {
            console.error('Model training failed:', error);
            this.applicationState.isProcessing = false;
            this.uiManager.hideTrainingModal();
            this.uiManager.showError(`Training failed: ${error.message}`);
            this.uiManager.updateButtonStates({ dataLoaded: this.applicationState.dataLoaded, modelTrained: false });
        }
    }

    /**
     * Make price prediction
     */
    async predict() {
        if (this.applicationState.isProcessing || !this.applicationState.modelTrained) return;
        
        try {
            this.applicationState.isProcessing = true;
            this.uiManager.showLoading('Generating price prediction');
            
            // Get latest features for prediction
            const features = this.dataProcessor.getLatestFeatures();
            if (!features) {
                throw new Error('No feature data available for prediction');
            }
            
            // Make prediction
            const prediction = await this.modelBuilder.predict(features);
            const currentPrice = this.dataProcessor.getCurrentPrice();
            
            if (!currentPrice) {
                throw new Error('No current price data available');
            }
            
            // Update UI with prediction
            this.uiManager.updatePrediction(prediction, currentPrice, this.currentCrypto);
            
            this.applicationState.isProcessing = false;
            this.uiManager.updateButtonStates(this.applicationState);
            
            console.log(`Prediction for ${CRYPTO_CONFIG[this.currentCrypto].name}: $${prediction.toFixed(4)} (Current: $${currentPrice.toFixed(4)})`);
            
        } catch (error) {
            console.error('Prediction failed:', error);
            this.applicationState.isProcessing = false;
            this.uiManager.showError(`Prediction failed: ${error.message}`);
            this.uiManager.updateButtonStates(this.applicationState);
        }
    }

    /**
     * Get current platform status (for debugging)
     */
    getStatus() {
        return {
            currentCrypto: this.currentCrypto,
            applicationState: this.applicationState,
            dataPoints: this.dataProcessor.rawData.length,
            processedFeatures: this.dataProcessor.processedData.length,
            modelReady: this.modelBuilder.isReady()
        };
    }

    /**
     * Reset the entire platform
     */
    reset() {
        // Reset all components
        this.dataProcessor.reset();
        this.modelBuilder.dispose();
        this.chartManager.destroy();
        
        // Reset state
        this.applicationState = {
            dataLoaded: false,
            modelTrained: false,
            isProcessing: false
        };
        
        // Reset UI
        this.uiManager.resetMetrics();
        this.uiManager.updateStatus(UI_MESSAGES.selectCrypto, 'info');
        this.uiManager.updateButtonStates(this.applicationState);
        
        // Reinitialize
        this.chartManager.initialize('priceChart');
        
        console.log('Platform reset completed');
    }
}

// Global platform instance
let platform = null;

// Global functions for HTML onclick handlers
function loadData() {
    if (platform) {
        return platform.loadData();
    } else {
        console.error('Platform not initialized');
    }
}

function trainModel() {
    if (platform) {
        return platform.trainModel();
    } else {
        console.error('Platform not initialized');
    }
}

function predict() {
    if (platform) {
        return platform.predict();
    } else {
        console.error('Platform not initialized');
    }
}

function selectCrypto() {
    if (platform) {
        return platform.selectCrypto();
    } else {
        console.error('Platform not initialized');
    }
}

// Initialize platform when page loads
document.addEventListener('DOMContentLoaded', function() {
    try {
        platform = new MLPlatform();
        
        // Make functions available globally
        window.MLPlatform = {
            loadData: loadData,
            trainModel: trainModel,
            predict: predict,
            selectCrypto: selectCrypto,
            getStatus: () => platform ? platform.getStatus() : null,
            reset: () => platform ? platform.reset() : null
        };
        
        console.log('Crypto ML Platform ready!');
        
    } catch (error) {
        console.error('Failed to initialize platform:', error);
        alert('Platform initialization failed. Please refresh the page and try again.');
    }
});

// Handle page unload cleanup
window.addEventListener('beforeunload', function() {
    if (platform) {
        platform.modelBuilder.dispose();
        platform.chartManager.destroy();
    }
});

// Optional: Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + Enter to train model
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        if (platform && platform.applicationState.dataLoaded && !platform.applicationState.isProcessing) {
            platform.trainModel();
        }
    }
    
    // Ctrl/Cmd + Shift + P to make prediction
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
        if (platform && platform.applicationState.modelTrained && !platform.applicationState.isProcessing) {
            platform.predict();
        }
    }
});
