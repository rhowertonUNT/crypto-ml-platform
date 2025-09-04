/**
 * Model Builder for TensorFlow.js neural networks
 * Handles model creation, training, and evaluation
 */

class ModelBuilder {
    constructor() {
        this.model = null;
        this.trainingHistory = null;
    }

    /**
     * Build neural network architecture based on model type and crypto configuration
     */
    buildModel(modelType, cryptoKey) {
        const crypto = CRYPTO_CONFIG[cryptoKey];
        const configType = crypto.iso20022 ? 'iso20022' : 'standard';
        const config = MODEL_CONFIG[modelType][configType];

        switch (modelType) {
            case 'neural':
                return this.buildNeuralNetwork(config);
            case 'deep':
                return this.buildDeepNetwork(config);
            case 'lstm':
                return this.buildLSTMNetwork(config);
            default:
                throw new Error(`Unknown model type: ${modelType}`);
        }
    }

    /**
     * Build standard neural network
     */
    buildNeuralNetwork(config) {
        this.model = tf.sequential({
            layers: [
                tf.layers.dense({
                    inputShape: [6], // 6 features from dataProcessor
                    units: config.hiddenUnits,
                    activation: 'relu',
                    kernelInitializer: 'glorotNormal'
                }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({
                    units: Math.floor(config.hiddenUnits / 2),
                    activation: 'relu'
                }),
                tf.layers.dense({
                    units: 1,
                    activation: 'linear'
                })
            ]
        });

        this.compileModel(config.learningRate);
        return this.model;
    }

    /**
     * Build deep neural network with batch normalization
     */
    buildDeepNetwork(config) {
        this.model = tf.sequential({
            layers: [
                tf.layers.dense({
                    inputShape: [6],
                    units: config.hiddenUnits * 2,
                    activation: 'relu'
                }),
                tf.layers.batchNormalization(),
                tf.layers.dropout({ rate: 0.3 }),
                tf.layers.dense({
                    units: config.hiddenUnits,
                    activation: 'relu'
                }),
                tf.layers.batchNormalization(),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({
                    units: Math.floor(config.hiddenUnits / 2),
                    activation: 'relu'
                }),
                tf.layers.dropout({ rate: 0.1 }),
                tf.layers.dense({
                    units: 1,
                    activation: 'linear'
                })
            ]
        });

        this.compileModel(config.learningRate);
        return this.model;
    }

    /**
     * Build LSTM network for time series prediction
     */
    buildLSTMNetwork(config) {
        this.model = tf.sequential({
            layers: [
                tf.layers.reshape({
                    inputShape: [6],
                    targetShape: [6, 1]
                }),
                tf.layers.lstm({
                    units: config.hiddenUnits,
                    returnSequences: false,
                    dropout: 0.2,
                    recurrentDropout: 0.2
                }),
                tf.layers.dense({
                    units: Math.floor(config.hiddenUnits / 2),
                    activation: 'relu'
                }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({
                    units: 1,
                    activation: 'linear'
                })
            ]
        });

        this.compileModel(config.learningRate);
        return this.model;
    }

    /**
     * Compile the model with optimizer and loss function
     */
    compileModel(learningRate) {
        this.model.compile({
            optimizer: tf.train.adam(learningRate),
            loss: 'meanSquaredError',
            metrics: ['mae']
        });
    }

    /**
     * Train the model with progress callbacks
     */
    async trainModel(trainX, trainY, modelType, cryptoKey, onProgress) {
        const crypto = CRYPTO_CONFIG[cryptoKey];
        const configType = crypto.iso20022 ? 'iso20022' : 'standard';
        const config = MODEL_CONFIG[modelType][configType];

        const callbacks = {
            onEpochEnd: (epoch, logs) => {
                const progress = ((epoch + 1) / config.epochs) * 100;
                if (onProgress) {
                    onProgress({
                        epoch: epoch + 1,
                        totalEpochs: config.epochs,
                        progress: progress,
                        loss: logs.loss,
                        valLoss: logs.val_loss || 0,
                        mae: logs.mae || 0
                    });
                }
            }
        };

        try {
            this.trainingHistory = await this.model.fit(trainX, trainY, {
                epochs: config.epochs,
                batchSize: DATA_CONFIG.batchSize,
                validationSplit: DATA_CONFIG.validationSplit,
                shuffle: true,
                verbose: 0,
                callbacks: callbacks
            });

            return this.trainingHistory;
        } catch (error) {
            console.error('Training failed:', error);
            throw new Error(`Model training failed: ${error.message}`);
        }
    }

    /**
     * Evaluate model performance on test data
     */
    async evaluateModel(testX, testY) {
        if (!this.model) {
            throw new Error('No model available for evaluation');
        }

        try {
            // Get predictions
            const predictions = this.model.predict(testX);
            const predArray = await predictions.data();
            const actualArray = await testY.data();

            // Calculate metrics
            const metrics = this.calculateMetrics(predArray, actualArray);
            
            // Clean up tensors
            predictions.dispose();
            
            return metrics;
        } catch (error) {
            console.error('Evaluation failed:', error);
            throw new Error(`Model evaluation failed: ${error.message}`);
        }
    }

    /**
     * Calculate various performance metrics
     */
    calculateMetrics(predictions, actuals) {
        const n = predictions.length;
        let mae = 0, mse = 0, totalSq = 0;
        
        // Calculate mean of actuals for R² calculation
        const meanActual = actuals.reduce((sum, val) => sum + val, 0) / n;
        
        // Calculate MAE and MSE
        for (let i = 0; i < n; i++) {
            const error = Math.abs(predictions[i] - actuals[i]);
            const squaredError = Math.pow(predictions[i] - actuals[i], 2);
            
            mae += error;
            mse += squaredError;
            totalSq += Math.pow(actuals[i] - meanActual, 2);
        }
        
        mae /= n;
        mse /= n;
        
        // Calculate R² score
        const r2 = totalSq === 0 ? 0 : 1 - (mse * n) / totalSq;
        
        // Calculate RMSE
        const rmse = Math.sqrt(mse);
        
        // Calculate accuracy as percentage (inverse of normalized MAE)
        const meanPrice = meanActual;
        const accuracy = Math.max(0, (1 - mae / meanPrice) * 100);
        
        return {
            mae: mae,
            mse: mse,
            rmse: rmse,
            r2: r2,
            accuracy: accuracy,
            sampleSize: n
        };
    }

    /**
     * Make a single prediction
     */
    async predict(features) {
        if (!this.model) {
            throw new Error('No trained model available for prediction');
        }

        try {
            const inputTensor = tf.tensor2d([features]);
            const prediction = this.model.predict(inputTensor);
            const result = await prediction.data();
            
            // Clean up tensors
            inputTensor.dispose();
            prediction.dispose();
            
            return result[0];
        } catch (error) {
            console.error('Prediction failed:', error);
            throw new Error(`Prediction failed: ${error.message}`);
        }
    }

    /**
     * Get model summary information
     */
    getModelInfo(modelType, cryptoKey) {
        const crypto = CRYPTO_CONFIG[cryptoKey];
        const configType = crypto.iso20022 ? 'iso20022' : 'standard';
        const config = MODEL_CONFIG[modelType][configType];
        
        const architectureDescriptions = {
            neural: `Neural Network with ${config.hiddenUnits} neurons`,
            deep: `Deep Neural Network with batch normalization (${config.hiddenUnits * 2} → ${config.hiddenUnits} → ${Math.floor(config.hiddenUnits / 2)} neurons)`,
            lstm: `LSTM Network with ${config.hiddenUnits} memory units for time series analysis`
        };

        return {
            architecture: architectureDescriptions[modelType] || 'Unknown architecture',
            epochs: config.epochs,
            learningRate: config.learningRate,
            enhanced: crypto.iso20022,
            cryptoName: crypto.name,
            hiddenUnits: config.hiddenUnits
        };
    }

    /**
     * Dispose of the current model to free memory
     */
    dispose() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
        this.trainingHistory = null;
    }

    /**
     * Check if model is trained and ready
     */
    isReady() {
        return this.model !== null;
    }
}

// Export for global use
window.ModelBuilder = ModelBuilder;
