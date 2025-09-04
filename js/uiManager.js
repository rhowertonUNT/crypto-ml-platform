/**
 * UI Manager for handling user interface updates and interactions
 * Manages status messages, training progress, metrics display, and user feedback
 */

class UIManager {
    constructor() {
        this.elements = this.initializeElements();
        this.trainingActive = false;
    }

    /**
     * Initialize references to DOM elements
     */
    initializeElements() {
        return {
            // Status and messaging
            status: document.getElementById('status'),
            
            // Training modal elements
            trainingOverlay: document.getElementById('trainingOverlay'),
            trainingTitle: document.getElementById('trainingTitle'),
            trainingDetails: document.getElementById('trainingDetails'),
            trainingProgress: document.getElementById('trainingProgress'),
            progressFill: document.getElementById('progressFill'),
            
            // Control elements
            cryptoSelect: document.getElementById('cryptoSelect'),
            modelSelect: document.getElementById('modelSelect'),
            trainBtn: document.getElementById('trainBtn'),
            predictBtn: document.getElementById('predictBtn'),
            
            // Metrics display
            accuracy: document.getElementById('accuracy'),
            mae: document.getElementById('mae'),
            prediction: document.getElementById('prediction'),
            modelInfo: document.getElementById('modelInfo')
        };
    }

    /**
     * Update status message with optional styling
     */
    updateStatus(message, type = 'info') {
        if (!this.elements.status) return;
        
        this.elements.status.innerHTML = message;
        
        // Apply status type styling
        this.elements.status.className = 'status';
        switch (type) {
            case 'success':
                this.elements.status.style.borderColor = 'rgba(0, 255, 0, 0.3)';
                this.elements.status.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
                break;
            case 'error':
                this.elements.status.style.borderColor = 'rgba(255, 0, 0, 0.3)';
                this.elements.status.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                break;
            case 'warning':
                this.elements.status.style.borderColor = 'rgba(255, 165, 0, 0.3)';
                this.elements.status.style.backgroundColor = 'rgba(255, 165, 0, 0.1)';
                break;
            default:
                this.elements.status.style.borderColor = 'rgba(0, 255, 0, 0.3)';
                this.elements.status.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
        }
    }

    /**
     * Show training modal with progress tracking
     */
    showTrainingModal(modelType, cryptoName, isISO20022 = false) {
        if (!this.elements.trainingOverlay) return;
        
        this.trainingActive = true;
        this.elements.trainingOverlay.style.display = 'flex';
        
        // Set modal content
        this.elements.trainingTitle.textContent = `Training ${modelType.toUpperCase()} Model`;
        this.elements.trainingDetails.textContent = `${cryptoName} with ${isISO20022 ? 'ISO20022 enhancement' : 'standard processing'}`;
        this.elements.trainingProgress.textContent = 'Initializing...';
        
        // Reset progress bar
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = '0%';
        }
        
        // Disable interactions
        this.disableControls();
    }

    /**
     * Update training progress
     */
    updateTrainingProgress(progressData) {
        if (!this.trainingActive || !this.elements.progressFill) return;
        
        const { epoch, totalEpochs, progress, loss, valLoss, mae } = progressData;
        
        // Update progress bar
        this.elements.progressFill.style.width = `${Math.min(progress, 100)}%`;
        
        // Update progress text
        const lossText = loss ? loss.toFixed(4) : 'N/A';
        this.elements.trainingProgress.textContent = 
            `Epoch ${epoch}/${totalEpochs} - Loss: ${lossText}`;
        
        // Update details with additional metrics if available
        if (valLoss !== undefined && mae !== undefined) {
            this.elements.trainingDetails.textContent = 
                `Validation Loss: ${valLoss.toFixed(4)} | MAE: ${mae.toFixed(4)}`;
        }
    }

    /**
     * Hide training modal and re-enable controls
     */
    hideTrainingModal() {
        if (!this.elements.trainingOverlay) return;
        
        this.trainingActive = false;
        this.elements.trainingOverlay.style.display = 'none';
        this.enableControls();
    }

    /**
     * Update performance metrics display
     */
    updateMetrics(metrics, cryptoKey) {
        const crypto = CRYPTO_CONFIG[cryptoKey];
        const decimals = this.getDecimalPlaces(crypto.basePrice);
        
        // Apply ISO20022 enhancement bonus if applicable
        const enhancedAccuracy = crypto.iso20022 ? metrics.accuracy * 1.05 : metrics.accuracy;
        
        // Update metric values
        if (this.elements.accuracy) {
            this.elements.accuracy.textContent = `${enhancedAccuracy.toFixed(1)}%`;
        }
        
        if (this.elements.mae) {
            this.elements.mae.textContent = `$${metrics.mae.toFixed(decimals)}`;
        }
        
        // Update R² if available
        if (metrics.r2 !== undefined && this.elements.r2) {
            this.elements.r2.textContent = metrics.r2.toFixed(3);
        }
    }

    /**
     * Update model information display
     */
    updateModelInfo(modelInfo) {
        if (!this.elements.modelInfo) return;
        
        const { architecture, epochs, learningRate, enhanced, cryptoName, hiddenUnits } = modelInfo;
        
        this.elements.modelInfo.innerHTML = `
            <strong>${architecture}</strong><br>
            <div style="margin-top: 10px; font-size: 0.85em; opacity: 0.9;">
                • Training epochs: ${epochs}<br>
                • Learning rate: ${learningRate}<br>
                • Hidden units: ${hiddenUnits}<br>
                • Enhancement: ${enhanced ? 'ISO20022 Active' : 'Standard Processing'}
                ${enhanced ? '<br>• <span class="iso-badge">Compliance Optimized</span>' : ''}
            </div>
        `;
    }

    /**
     * Update prediction display
     */
    updatePrediction(predictionValue, currentPrice, cryptoKey) {
        if (!this.elements.prediction) return;
        
        const crypto = CRYPTO_CONFIG[cryptoKey];
        const decimals = this.getDecimalPlaces(crypto.basePrice);
        const change = ((predictionValue / currentPrice - 1) * 100);
        
        this.elements.prediction.textContent = `$${predictionValue.toFixed(decimals)}`;
        
        // Update status with prediction details
        const changeText = change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;
        const changeColor = change > 0 ? '#00ff00' : '#ff6b6b';
        
        this.updateStatus(
            `🔮 ${crypto.name} prediction: $${predictionValue.toFixed(decimals)} (${changeText}) 
            ${crypto.iso20022 ? '<span class="iso-badge">ISO20022</span>' : ''}`,
            'success'
        );
    }

    /**
     * Show cryptocurrency selection with ISO20022 badge
     */
    updateCryptoSelection(cryptoKey) {
        const crypto = CRYPTO_CONFIG[cryptoKey];
        const badge = crypto.iso20022 ? '<span class="iso-badge">ISO20022</span>' : '';
        
        this.updateStatus(`Selected ${crypto.name} ${badge}`, 'info');
    }

    /**
     * Disable control buttons during processing
     */
    disableControls() {
        const controls = [this.elements.trainBtn, this.elements.predictBtn, this.elements.cryptoSelect, this.elements.modelSelect];
        controls.forEach(control => {
            if (control) {
                control.disabled = true;
                control.classList.add('loading');
            }
        });
    }

    /**
     * Enable control buttons after processing
     */
    enableControls() {
        const controls = [this.elements.trainBtn, this.elements.predictBtn, this.elements.cryptoSelect, this.elements.modelSelect];
        controls.forEach(control => {
            if (control) {
                control.classList.remove('loading');
            }
        });
        
        // Selectively enable based on application state
        if (this.elements.cryptoSelect) this.elements.cryptoSelect.disabled = false;
        if (this.elements.modelSelect) this.elements.modelSelect.disabled = false;
    }

    /**
     * Update button states based on application progress
     */
    updateButtonStates(state) {
        const { dataLoaded, modelTrained } = state;
        
        if (this.elements.trainBtn) {
            this.elements.trainBtn.disabled = !dataLoaded;
        }
        
        if (this.elements.predictBtn) {
            this.elements.predictBtn.disabled = !modelTrained;
        }
    }

    /**
     * Show error message with retry option
     */
    showError(message, retryCallback = null) {
        this.updateStatus(`⚠️ Error: ${message}`, 'error');
        
        if (retryCallback) {
            // Could add retry button functionality here
            console.log('Retry callback available:', retryCallback);
        }
    }

    /**
     * Show loading state for specific operation
     */
    showLoading(operation = 'Processing') {
        this.updateStatus(`🔄 ${operation}...`, 'info');
    }

    /**
     * Get appropriate decimal places for price display
     */
    getDecimalPlaces(price) {
        if (price >= 100) return 0;
        if (price >= 1) return 2;
        if (price >= 0.1) return 3;
        return 4;
    }

    /**
     * Reset all metrics to default state
     */
    resetMetrics() {
        const defaultValue = '-';
        
        if (this.elements.accuracy) this.elements.accuracy.textContent = defaultValue;
        if (this.elements.mae) this.elements.mae.textContent = defaultValue;
        if (this.elements.prediction) this.elements.prediction.textContent = defaultValue;
        if (this.elements.modelInfo) {
            this.elements.modelInfo.textContent = 'Train a model to see performance metrics';
        }
    }

    /**
     * Get current selected values
     */
    getCurrentSelections() {
        return {
            crypto: this.elements.cryptoSelect ? this.elements.cryptoSelect.value : 'xrp',
            model: this.elements.modelSelect ? this.elements.modelSelect.value : 'neural'
        };
    }

    /**
     * Check if training is currently active
     */
    isTrainingActive() {
        return this.trainingActive;
    }

    /**
     * Animate metric updates (optional enhancement)
     */
    animateMetricUpdate(elementId, newValue, duration = 500) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.style.transition = `all ${duration}ms ease-in-out`;
        element.style.transform = 'scale(1.1)';
        element.textContent = newValue;
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 100);
        
        setTimeout(() => {
            element.style.transition = '';
        }, duration);
    }
}

// Export for global use
window.UIManager = UIManager;
