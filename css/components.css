/* Buttons */
.button-group {
    display: flex;
    gap: 10px;
    margin: 15px 0;
    flex-wrap: wrap;
}

.btn-primary {
    background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9em;
    transition: all 0.3s ease;
    min-width: 120px;
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

/* Form Controls */
.controls-row {
    display: flex;
    gap: 20px;
    margin: 15px 0;
    flex-wrap: wrap;
}

.control-group {
    display: flex;
    flex-direction: column;
    min-width: 200px;
}

.control-group label {
    margin-bottom: 5px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
}

select {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    padding: 10px;
    color: white;
    font-size: 0.9em;
    cursor: pointer;
    transition: border-color 0.3s ease;
}

select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

select option {
    background: #2a5298;
    color: white;
}

/* Training Modal */
.training-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    backdrop-filter: blur(10px);
}

.training-modal {
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    padding: 40px;
    border-radius: 20px;
    text-align: center;
    border: 2px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
    max-width: 500px;
    width: 90%;
}

.training-spinner {
    width: 80px;
    height: 80px;
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-top: 4px solid #ffd700;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 20px auto;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.progress-bar {
    width: 100%;
    height: 12px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    overflow: hidden;
    margin: 20px 0;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #ffd700, #ff6b6b);
    width: 0%;
    transition: width 0.5s ease;
    border-radius: 10px;
}

/* Metrics Grid */
.metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 15px;
    margin-top: 20px;
}

.metric {
    background: rgba(255, 255, 255, 0.1);
    padding: 15px;
    border-radius: 10px;
    text-align: center;
    transition: transform 0.3s ease;
}

.metric:hover {
    transform: translateY(-2px);
}

.metric-value {
    font-size: 1.5em;
    font-weight: bold;
    color: #ffd700;
    margin-bottom: 5px;
}

.metric-label {
    font-size: 0.8em;
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* Loading States */
.loading {
    opacity: 0.6;
    pointer-events: none;
}

.loading::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    margin: -10px 0 0 -10px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid #ffd700;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

/* Responsive Components */
@media (max-width: 768px) {
    .button-group {
        flex-direction: column;
    }
    
    .btn-primary {
        min-width: auto;
        width: 100%;
    }
    
    .controls-row {
        flex-direction: column;
        gap: 15px;
    }
    
    .control-group {
        min-width: auto;
    }
    
    .metrics {
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 10px;
    }
    
    .training-modal {
        padding: 30px 20px;
    }
}
