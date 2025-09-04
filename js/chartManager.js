/**
 * Chart Manager for cryptocurrency price visualization
 * Handles Chart.js chart creation, updates, and data visualization
 */

class ChartManager {
    constructor() {
        this.chart = null;
        this.ctx = null;
    }

    /**
     * Initialize chart with given canvas context
     */
    initialize(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }
        
        this.ctx = canvas.getContext('2d');
        return this;
    }

    /**
     * Create price chart for cryptocurrency data
     */
    createPriceChart(data, cryptoKey) {
        const crypto = CRYPTO_CONFIG[cryptoKey];
        
        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        const chartData = {
            labels: data.map(d => d.date.toLocaleDateString()),
            datasets: [{
                label: `${crypto.name} Price (USD)`,
                data: data.map(d => d.price),
                borderColor: crypto.color,
                backgroundColor: this.hexToRgba(crypto.color, 0.1),
                borderWidth: crypto.iso20022 ? 3 : 2,
                fill: true,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: crypto.color,
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2
            }]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    labels: { 
                        color: 'white',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    },
                    display: true
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: crypto.color,
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        title: (tooltipItems) => {
                            return tooltipItems[0].label;
                        },
                        label: (context) => {
                            const price = context.parsed.y;
                            const decimals = this.getDecimalPlaces(price);
                            return `${crypto.name}: $${price.toFixed(decimals)}`;
                        },
                        afterLabel: (context) => {
                            if (crypto.iso20022) {
                                return 'ISO20022 Compliant';
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { 
                        color: 'white',
                        maxTicksLimit: 8,
                        font: {
                            size: 11
                        }
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        borderColor: 'rgba(255, 255, 255, 0.3)'
                    },
                    border: {
                        color: 'rgba(255, 255, 255, 0.3)'
                    }
                },
                y: {
                    ticks: { 
                        color: 'white',
                        font: {
                            size: 11
                        },
                        callback: (value) => {
                            const decimals = this.getDecimalPlaces(value);
                            return '$' + value.toFixed(decimals);
                        }
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        borderColor: 'rgba(255, 255, 255, 0.3)'
                    },
                    border: {
                        color: 'rgba(255, 255, 255, 0.3)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                point: {
                    hoverRadius: 6
                }
            }
        };

        this.chart = new Chart(this.ctx, {
            type: 'line',
            data: chartData,
            options: options
        });

        return this.chart;
    }

    /**
     * Add prediction line to existing chart
     */
    addPredictionLine(predictions, splitIndex) {
        if (!this.chart) {
            console.warn('No chart available to add predictions to');
            return;
        }

        // Create prediction data array with null values before split point
        const predictionData = new Array(splitIndex).fill(null).concat(predictions);

        const predictionDataset = {
            label: 'AI Predictions',
            data: predictionData,
            borderColor: '#ff6b6b',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderDash: [5, 5],
            pointHoverBackgroundColor: '#ff6b6b',
            pointHoverBorderColor: '#ffffff'
        };

        this.chart.data.datasets.push(predictionDataset);
        this.chart.update('none'); // Update without animation for better performance
    }

    /**
     * Update chart data while preserving configuration
     */
    updateData(data, cryptoKey) {
        if (!this.chart) {
            return this.createPriceChart(data, cryptoKey);
        }

        const crypto = CRYPTO_CONFIG[cryptoKey];
        
        // Update labels and data
        this.chart.data.labels = data.map(d => d.date.toLocaleDateString());
        this.chart.data.datasets[0].data = data.map(d => d.price);
        this.chart.data.datasets[0].label = `${crypto.name} Price (USD)`;
        this.chart.data.datasets[0].borderColor = crypto.color;
        this.chart.data.datasets[0].backgroundColor = this.hexToRgba(crypto.color, 0.1);
        this.chart.data.datasets[0].borderWidth = crypto.iso20022 ? 3 : 2;

        // Remove any prediction datasets
        this.chart.data.datasets = this.chart.data.datasets.filter(dataset => 
            dataset.label !== 'AI Predictions'
        );

        this.chart.update();
        return this.chart;
    }

    /**
     * Highlight a specific data point (for prediction visualization)
     */
    highlightPoint(index, color = '#ffd700') {
        if (!this.chart || !this.chart.data.datasets[0]) {
            return;
        }

        // Reset all point styles
        this.chart.data.datasets[0].pointRadius = this.chart.data.datasets[0].data.map(() => 0);
        this.chart.data.datasets[0].pointBackgroundColor = undefined;

        // Highlight specific point
        if (index >= 0 && index < this.chart.data.datasets[0].data.length) {
            this.chart.data.datasets[0].pointRadius[index] = 6;
            this.chart.data.datasets[0].pointBackgroundColor = this.chart.data.datasets[0].pointBackgroundColor || [];
            this.chart.data.datasets[0].pointBackgroundColor[index] = color;
        }

        this.chart.update('none');
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
     * Convert hex color to rgba
     */
    hexToRgba(hex, alpha = 1) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return hex;
        
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Export chart as image (optional feature)
     */
    exportAsImage() {
        if (!this.chart) {
            throw new Error('No chart available to export');
        }
        
        return this.chart.toBase64Image();
    }

    /**
     * Resize chart (useful for responsive layouts)
     */
    resize() {
        if (this.chart) {
            this.chart.resize();
        }
    }

    /**
     * Destroy chart and clean up
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    /**
     * Check if chart is initialized
     */
    isInitialized() {
        return this.chart !== null;
    }

    /**
     * Get current chart configuration for debugging
     */
    getConfig() {
        return this.chart ? this.chart.config : null;
    }
}

// Export for global use
window.ChartManager = ChartManager;
