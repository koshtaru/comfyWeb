/**
 * ComfyUI JSON Workflow Runner
 * Main application script
 * Updated: 2025-07-18 - Added header navigation system
 */

// Navigation Manager Class
class NavigationManager {
    constructor() {
        this.modes = ['generate', 'history', 'models', 'settings', 'queue'];
        this.currentMode = 'generate';
        this.modeChangeCallbacks = [];
        this.init();
    }

    init() {
        // Initialize navigation tabs
        this.initializeNavigation();
        // Restore last mode from sessionStorage
        this.restoreLastMode();
    }

    initializeNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                if (mode && this.modes.includes(mode)) {
                    this.switchMode(mode);
                }
            });

            // Keyboard navigation
            tab.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const mode = e.target.dataset.mode;
                    if (mode && this.modes.includes(mode)) {
                        this.switchMode(mode);
                    }
                }
            });
        });
    }

    switchMode(mode) {
        if (!this.modes.includes(mode) || mode === this.currentMode) {
            return;
        }

        console.log(`🔄 Switching to ${mode} mode`);
        
        // Update current mode
        this.currentMode = mode;
        
        // Update tab states
        this.updateTabStates();
        
        // Show/hide content panels
        this.showModeContent(mode);
        
        // Store in sessionStorage
        try {
            sessionStorage.setItem('comfyui_current_mode', mode);
        } catch (e) {
            console.warn('Failed to store current mode:', e);
        }
        
        // Notify listeners
        this.notifyListeners(mode);
    }

    updateTabStates() {
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            const tabMode = tab.dataset.mode;
            if (tabMode === this.currentMode) {
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
            } else {
                tab.classList.remove('active');
                tab.setAttribute('aria-selected', 'false');
            }
        });
    }

    showModeContent(mode) {
        // Hide all mode content
        const allModeContent = document.querySelectorAll('.mode-content');
        allModeContent.forEach(content => {
            content.classList.remove('active');
        });

        // Show active mode content
        const activeContent = document.getElementById(`${mode}-mode`);
        if (activeContent) {
            activeContent.classList.add('active');
        } else {
            console.warn(`No content found for mode: ${mode}`);
        }
    }

    restoreLastMode() {
        try {
            const lastMode = sessionStorage.getItem('comfyui_current_mode');
            if (lastMode && this.modes.includes(lastMode)) {
                this.switchMode(lastMode);
            }
        } catch (e) {
            console.warn('Failed to restore last mode:', e);
        }
    }

    onModeChange(callback) {
        if (typeof callback === 'function') {
            this.modeChangeCallbacks.push(callback);
        }
    }

    notifyListeners(mode) {
        this.modeChangeCallbacks.forEach(callback => {
            try {
                callback(mode);
            } catch (e) {
                console.error('Error in mode change callback:', e);
            }
        });
    }

    getCurrentMode() {
        return this.currentMode;
    }
}

// WebSocket Connection States
const WebSocketState = {
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    ERROR: 'error'
};

// WebSocket Service Class
class WebSocketService {
    constructor(config = {}) {
        this.url = config.url || 'ws://192.168.10.15:8188/ws';
        this.reconnectInterval = config.reconnectInterval || 3000;
        this.maxRetryAttempts = config.maxRetryAttempts || 5;
        this.retryAttempts = 0;
        this.state = WebSocketState.DISCONNECTED;
        this.ws = null;
        this.eventListeners = new Map();
        this.reconnectTimer = null;
        this.isManualDisconnect = false;
    }

    // Event emitter methods
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.eventListeners.has(event)) return;
        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.eventListeners.has(event)) return;
        this.eventListeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in WebSocket event listener for ${event}:`, error);
            }
        });
    }

    // Connection management
    connect() {
        if (this.state === WebSocketState.CONNECTING || this.state === WebSocketState.CONNECTED) {
            return;
        }

        this.isManualDisconnect = false;
        this.setState(WebSocketState.CONNECTING);
        
        try {
            this.ws = new WebSocket(this.url);
            this.setupEventHandlers();
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.handleConnectionError(error);
        }
    }

    disconnect() {
        this.isManualDisconnect = true;
        this.clearReconnectTimer();
        
        if (this.ws) {
            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.close();
            }
        }
        
        this.setState(WebSocketState.DISCONNECTED);
    }

    setupEventHandlers() {
        if (!this.ws) return;

        this.ws.onopen = () => {
            console.log('🔌 WebSocket connected to ComfyUI');
            this.retryAttempts = 0;
            this.setState(WebSocketState.CONNECTED);
            this.emit('connected', { url: this.url });
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
                this.emit('error', { type: 'parse_error', error, data: event.data });
            }
        };

        this.ws.onclose = (event) => {
            console.log('🔌 WebSocket disconnected:', event.code, event.reason);
            this.setState(WebSocketState.DISCONNECTED);
            this.emit('disconnected', { code: event.code, reason: event.reason });
            
            if (!this.isManualDisconnect && this.retryAttempts < this.maxRetryAttempts) {
                this.scheduleReconnect();
            }
        };

        this.ws.onerror = (error) => {
            console.error('🔌 WebSocket error:', error);
            this.handleConnectionError(error);
        };
    }

    handleMessage(message) {
        // Validate message structure
        if (!this.validateMessage(message)) {
            console.warn('🔌 Received malformed WebSocket message:', message);
            this.emit('error', { type: 'malformed_message', message });
            return;
        }

        // ComfyUI WebSocket message types with enhanced parsing
        try {
            switch (message.type) {
                case 'executing':
                    this.handleExecutingEvent(message);
                    break;
                case 'progress':
                    this.handleProgressEvent(message);
                    break;
                case 'progress_state':
                    this.handleProgressStateEvent(message);
                    break;
                case 'executed':
                    this.handleExecutedEvent(message);
                    break;
                case 'execution_error':
                    this.handleExecutionErrorEvent(message);
                    break;
                case 'status':
                    this.handleStatusEvent(message);
                    break;
                default:
                    // Forward any other message types
                    console.log('🔌 Unknown WebSocket message type:', message.type);
                    this.emit('message', message);
            }
        } catch (error) {
            console.error('🔌 Error handling WebSocket message:', error);
            this.emit('error', { type: 'handler_error', error, message });
        }
    }

    validateMessage(message) {
        return message && 
               typeof message === 'object' && 
               typeof message.type === 'string' &&
               message.data !== undefined;
    }

    handleExecutingEvent(message) {
        const event = {
            nodeId: message.data.node,
            promptId: message.data.prompt_id,
            timestamp: Date.now()
        };
        
        // Validate required fields
        if (!event.nodeId || !event.promptId) {
            console.warn('🔌 Invalid executing event data:', message.data);
            return;
        }
        
        console.log(`🔌 Executing node ${event.nodeId} for prompt ${event.promptId}`);
        this.emit('executing', event);
    }

    handleProgressEvent(message) {
        const event = {
            value: parseInt(message.data.value) || 0,
            max: parseInt(message.data.max) || 100,
            nodeId: message.data.node,
            promptId: message.data.prompt_id,
            percentage: 0,
            timestamp: Date.now()
        };
        
        // Calculate percentage
        if (event.max > 0) {
            event.percentage = Math.round((event.value / event.max) * 100);
        }
        
        // Validate progress data
        if (event.value < 0 || event.max < 0 || event.value > event.max) {
            console.warn('🔌 Invalid progress values:', message.data);
            return;
        }
        
        console.log(`🔌 Progress: ${event.percentage}% (${event.value}/${event.max})`);
        this.emit('progress', event);
    }

    handleProgressStateEvent(message) {
        // ComfyUI sends progress_state with detailed node information
        const nodes = message.data.nodes || {};
        
        let totalValue = 0;
        let totalMax = 0;
        let activeNodeId = null;
        let activeNodeProgress = null;
        
        // Process each node to calculate overall progress
        for (const [nodeId, nodeData] of Object.entries(nodes)) {
            totalValue += nodeData.value || 0;
            totalMax += nodeData.max || 0;
            
            // Find currently active node (not finished, has progress)
            if (nodeData.state !== 'finished' && nodeData.value < nodeData.max) {
                activeNodeId = nodeId;
                activeNodeProgress = nodeData;
            }
        }
        
        // If no active node, use the node with highest max (likely the main sampler)
        if (!activeNodeId) {
            let maxSteps = 0;
            for (const [nodeId, nodeData] of Object.entries(nodes)) {
                if (nodeData.max > maxSteps) {
                    maxSteps = nodeData.max;
                    activeNodeId = nodeId;
                    activeNodeProgress = nodeData;
                }
            }
        }
        
        const event = {
            value: totalValue,
            max: totalMax,
            percentage: totalMax > 0 ? Math.round((totalValue / totalMax) * 100) : 0,
            activeNodeId,
            activeNodeProgress,
            promptId: message.data.prompt_id,
            timestamp: Date.now(),
            allNodes: nodes
        };
        
        console.log(`🔌 ProgressState: ${event.percentage}% (${event.value}/${event.max}) - Active Node: ${activeNodeId}`);
        
        // Emit as progress event for compatibility
        this.emit('progress', event);
    }

    handleExecutedEvent(message) {
        const event = {
            nodeId: message.data.node,
            promptId: message.data.prompt_id,
            output: message.data.output || {},
            timestamp: Date.now()
        };
        
        // Validate required fields
        if (!event.nodeId || !event.promptId) {
            console.warn('🔌 Invalid executed event data:', message.data);
            return;
        }
        
        console.log(`🔌 Executed node ${event.nodeId} for prompt ${event.promptId}`);
        this.emit('executed', event);
    }

    handleExecutionErrorEvent(message) {
        const event = {
            nodeId: message.data.node_id,
            promptId: message.data.prompt_id,
            error: message.data.exception_message || 'Unknown execution error',
            nodeType: message.data.node_type,
            traceback: message.data.traceback,
            timestamp: Date.now()
        };
        
        console.error(`🔌 Execution error in node ${event.nodeId}:`, event.error);
        this.emit('execution_error', event);
    }

    handleStatusEvent(message) {
        const event = {
            status: message.data,
            timestamp: Date.now()
        };
        
        console.log('🔌 Status update:', event.status);
        this.emit('status', event);
    }

    setState(newState) {
        const oldState = this.state;
        this.state = newState;
        this.emit('stateChange', { oldState, newState });
    }

    handleConnectionError(error) {
        this.setState(WebSocketState.ERROR);
        this.emit('error', { type: 'connection_error', error });
        
        if (!this.isManualDisconnect && this.retryAttempts < this.maxRetryAttempts) {
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        this.clearReconnectTimer();
        this.retryAttempts++;
        
        const delay = Math.min(this.reconnectInterval * Math.pow(1.5, this.retryAttempts - 1), 30000);
        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.retryAttempts}/${this.maxRetryAttempts})`);
        
        this.reconnectTimer = setTimeout(() => {
            if (!this.isManualDisconnect) {
                this.connect();
            }
        }, delay);
    }

    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    // Public getters
    getState() {
        return this.state;
    }

    isConnected() {
        return this.state === WebSocketState.CONNECTED;
    }

    // Send message (if connected)
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
            return true;
        }
        return false;
    }
}

// Interrupt Service States
const InterruptState = {
    IDLE: 'idle',
    INTERRUPTING: 'interrupting',
    SUCCEEDED: 'succeeded',
    FAILED: 'failed'
};

// Custom error types for interrupt operations
class InterruptError extends Error {
    constructor(message, type, details = {}) {
        super(message);
        this.name = 'InterruptError';
        this.type = type;
        this.details = details;
    }
}

class NetworkError extends InterruptError {
    constructor(message, details = {}) {
        super(message, 'network', details);
        this.name = 'NetworkError';
    }
}

class TimeoutError extends InterruptError {
    constructor(message, details = {}) {
        super(message, 'timeout', details);
        this.name = 'TimeoutError';
    }
}

class ServerError extends InterruptError {
    constructor(message, status, details = {}) {
        super(message, 'server', { ...details, status });
        this.name = 'ServerError';
    }
}

// Interrupt Service Class
class InterruptService {
    constructor(config = {}) {
        // Configuration
        this.apiEndpoint = config.apiEndpoint || null;
        this.timeout = config.timeout || 5000;
        this.maxRetryAttempts = config.maxRetryAttempts || 3;
        this.retryDelay = config.retryDelay || 1000;
        
        // State
        this.state = InterruptState.IDLE;
        this.currentRequest = null;
        this.retryCount = 0;
        this.interruptHistory = [];
        
        // Event listeners
        this.eventListeners = new Map();
        
        // Bind methods
        this.interrupt = this.interrupt.bind(this);
    }
    
    // Event emitter methods
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (!this.eventListeners.has(event)) return;
        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }
    
    emit(event, data) {
        if (!this.eventListeners.has(event)) return;
        this.eventListeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in InterruptService event listener for ${event}:`, error);
            }
        });
    }
    
    // Set API endpoint
    setApiEndpoint(endpoint) {
        this.apiEndpoint = endpoint;
    }
    
    // Get current state
    getState() {
        return this.state;
    }
    
    // Change state and emit event
    setState(newState) {
        const oldState = this.state;
        this.state = newState;
        this.emit('stateChange', { oldState, newState });
        console.log(`🛑 InterruptService state: ${oldState} → ${newState}`);
    }
    
    // Main interrupt method
    async interrupt() {
        // Check if already interrupting
        if (this.state === InterruptState.INTERRUPTING) {
            console.warn('🛑 Interrupt already in progress');
            return false;
        }
        
        // Validate endpoint
        if (!this.apiEndpoint) {
            const error = new InterruptError('No API endpoint configured', 'configuration');
            this.handleError(error);
            return false;
        }
        
        // Reset retry count
        this.retryCount = 0;
        
        // Attempt interrupt with retry logic
        return this.attemptInterrupt();
    }
    
    // Attempt interrupt with retry logic
    async attemptInterrupt() {
        this.setState(InterruptState.INTERRUPTING);
        
        const startTime = Date.now();
        const url = `${this.apiEndpoint}/interrupt`;
        
        console.log(`🛑 Attempting interrupt (attempt ${this.retryCount + 1}/${this.maxRetryAttempts})`);
        
        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, this.timeout);
            
            // Store current request for potential cancellation
            this.currentRequest = { controller, timeoutId };
            
            // Make the request
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
            
            // Clear timeout
            clearTimeout(timeoutId);
            this.currentRequest = null;
            
            // Handle response
            if (response.ok) {
                const duration = Date.now() - startTime;
                this.handleSuccess(duration);
                return true;
            } else {
                // Server error
                const error = new ServerError(
                    `Interrupt failed with status ${response.status}`,
                    response.status,
                    { url, duration: Date.now() - startTime }
                );
                throw error;
            }
            
        } catch (error) {
            // Handle different error types
            if (error.name === 'AbortError') {
                const timeoutError = new TimeoutError(
                    `Interrupt request timed out after ${this.timeout}ms`,
                    { url, timeout: this.timeout }
                );
                return this.handleRetriableError(timeoutError);
            } else if (error instanceof ServerError) {
                // Don't retry on server errors (4xx, 5xx)
                this.handleError(error);
                return false;
            } else {
                // Network error - retry
                const networkError = new NetworkError(
                    `Network error during interrupt: ${error.message}`,
                    { url, originalError: error }
                );
                return this.handleRetriableError(networkError);
            }
        }
    }
    
    // Handle retriable errors with exponential backoff
    async handleRetriableError(error) {
        this.retryCount++;
        
        if (this.retryCount >= this.maxRetryAttempts) {
            console.error(`🛑 Max retry attempts (${this.maxRetryAttempts}) reached`);
            this.handleError(error);
            return false;
        }
        
        // Calculate delay with exponential backoff
        const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
        console.log(`🔄 Retrying interrupt in ${delay}ms...`);
        
        // Emit retry event
        this.emit('retry', {
            error,
            attempt: this.retryCount,
            maxAttempts: this.maxRetryAttempts,
            delay
        });
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry if not cancelled
        if (this.state === InterruptState.INTERRUPTING) {
            return this.attemptInterrupt();
        }
        
        return false;
    }
    
    // Handle successful interrupt
    handleSuccess(duration) {
        this.setState(InterruptState.SUCCEEDED);
        
        // Add to history
        const historyEntry = {
            timestamp: Date.now(),
            duration,
            retryCount: this.retryCount,
            success: true
        };
        this.addToHistory(historyEntry);
        
        // Emit success event
        this.emit('success', {
            duration,
            retryCount: this.retryCount
        });
        
        console.log(`✅ Interrupt succeeded in ${duration}ms (${this.retryCount} retries)`);
        
        // Reset state after a delay
        setTimeout(() => {
            if (this.state === InterruptState.SUCCEEDED) {
                this.setState(InterruptState.IDLE);
            }
        }, 1000);
    }
    
    // Handle interrupt error
    handleError(error) {
        this.setState(InterruptState.FAILED);
        
        // Add to history
        const historyEntry = {
            timestamp: Date.now(),
            error: {
                message: error.message,
                type: error.type || 'unknown',
                details: error.details || {}
            },
            retryCount: this.retryCount,
            success: false
        };
        this.addToHistory(historyEntry);
        
        // Emit error event
        this.emit('error', {
            error,
            retryCount: this.retryCount
        });
        
        console.error(`❌ Interrupt failed:`, error.message);
        
        // Reset state after a delay
        setTimeout(() => {
            if (this.state === InterruptState.FAILED) {
                this.setState(InterruptState.IDLE);
            }
        }, 1000);
    }
    
    // Cancel ongoing interrupt
    cancel() {
        if (this.state !== InterruptState.INTERRUPTING) {
            return false;
        }
        
        // Cancel current request
        if (this.currentRequest) {
            clearTimeout(this.currentRequest.timeoutId);
            this.currentRequest.controller.abort();
            this.currentRequest = null;
        }
        
        this.setState(InterruptState.IDLE);
        console.log('🛑 Interrupt cancelled');
        return true;
    }
    
    // Add entry to history (keep last 10)
    addToHistory(entry) {
        this.interruptHistory.unshift(entry);
        if (this.interruptHistory.length > 10) {
            this.interruptHistory.pop();
        }
    }
    
    // Get interrupt history
    getHistory() {
        return [...this.interruptHistory];
    }
    
    // Clear history
    clearHistory() {
        this.interruptHistory = [];
    }
}

// Progress Bar Component Class
class ProgressBarComponent {
    constructor(config = {}) {
        this.container = config.container || document.getElementById('progress-container');
        this.progressBar = config.progressBar || document.getElementById('progress-bar');
        this.progressPercentage = config.progressPercentage || document.getElementById('progress-percentage');
        this.progressStep = config.progressStep || document.getElementById('progress-step');
        
        // State
        this.currentProgress = 0;
        this.targetProgress = 0;
        this.currentStep = 0;
        this.totalSteps = 0;
        this.isVisible = false;
        this.hideTimeout = null;
        this.animationFrame = null;
        
        // Fallback progress tracking
        this.fallbackMode = false;
        this.fallbackTimer = null;
        this.executedNodes = 0;
        this.totalNodes = 0;
        this.lastProgressTime = 0;
        
        // Configuration
        this.smoothingFactor = config.smoothingFactor || 0.1;
        this.hideDelay = config.hideDelay || 2000;
        this.updateDebounceTime = config.updateDebounceTime || 16; // 60fps for smooth updates
        
        // Debounce timer
        this.updateDebounceTimer = null;
        
        // Bind methods
        this.updateProgress = this.updateProgress.bind(this);
        this.animate = this.animate.bind(this);
    }
    
    // Show the progress bar with fade-in animation
    show() {
        if (!this.container) return;
        
        clearTimeout(this.hideTimeout);
        this.container.style.display = 'block';
        
        // Force reflow before adding active class
        this.container.offsetHeight;
        this.container.classList.add('active');
        this.isVisible = true;
        
        console.log('🎨 Progress bar shown');
        
        // Start animation loop
        if (!this.animationFrame) {
            this.animate();
        }
    }
    
    // Hide the progress bar with fade-out animation
    hide() {
        if (!this.container || !this.isVisible) return;
        
        this.container.classList.remove('active');
        this.container.classList.add('complete');
        
        this.hideTimeout = setTimeout(() => {
            this.container.style.display = 'none';
            this.container.classList.remove('complete');
            this.isVisible = false;
            this.reset();
        }, this.hideDelay);
    }
    
    // Reset progress to initial state
    reset() {
        this.currentProgress = 0;
        this.targetProgress = 0;
        this.currentStep = 0;
        this.totalSteps = 0;
        
        // Stop fallback mode
        this.stopFallbackProgress();
        this.executedNodes = 0;
        this.totalNodes = 0;
        
        if (this.progressBar) {
            this.progressBar.style.width = '0%';
        }
        if (this.progressPercentage) {
            this.progressPercentage.textContent = '0%';
        }
        if (this.progressStep) {
            this.progressStep.textContent = '0 / 0';
        }
        
        // Cancel animation frame
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    
    // Update progress with smooth animation
    updateProgress(value, max, extraInfo = null) {
        console.log(`📊 ProgressBar.updateProgress called: ${value}/${max}`);
        
        // For real progress events, stop fallback mode
        if (value > 0 && max > 0) {
            this.stopFallbackProgress();
        }
        
        // Debounce rapid updates (but allow instant completion)
        const isCompletion = value >= max && max > 0;
        const debounceTime = isCompletion ? 0 : this.updateDebounceTime;
        
        clearTimeout(this.updateDebounceTimer);
        
        this.updateDebounceTimer = setTimeout(() => {
            // Validate inputs
            value = Math.max(0, Math.min(value, max));
            max = Math.max(1, max);
            
            this.currentStep = value;
            this.totalSteps = max;
            this.targetProgress = (value / max) * 100;
            
            console.log(`📊 Progress target: ${this.targetProgress}%`);
            
            // Show progress bar if hidden
            if (!this.isVisible) {
                this.show();
            }
            
            // Update step display with enhanced info if available
            if (this.progressStep) {
                let stepText = `Steps: ${value}/${max}`;
                
                // Log technical node info for debugging but show user-friendly text
                if (extraInfo && extraInfo.activeNodeId) {
                    console.log(`🔧 Active node: ${extraInfo.activeNodeId}`);
                }
                
                this.progressStep.textContent = stepText;
            }
            
            // Check if complete
            if (value >= max) {
                this.targetProgress = 100;
                setTimeout(() => this.hide(), 500);
            }
        }, debounceTime);
    }
    
    // Smooth animation loop
    animate() {
        if (!this.isVisible) return;
        
        // Lerp towards target progress
        const diff = this.targetProgress - this.currentProgress;
        if (Math.abs(diff) > 0.1) {
            this.currentProgress += diff * this.smoothingFactor;
            
            // Update UI
            const displayProgress = Math.round(this.currentProgress);
            if (this.progressBar) {
                this.progressBar.style.width = `${this.currentProgress}%`;
            }
            if (this.progressPercentage) {
                this.progressPercentage.textContent = `${displayProgress}%`;
            }
        }
        
        // Continue animation
        this.animationFrame = requestAnimationFrame(this.animate);
    }
    
    // Set error state
    setError() {
        if (this.container) {
            this.container.classList.add('error');
        }
        this.hide();
    }
    
    // Remove error state
    clearError() {
        if (this.container) {
            this.container.classList.remove('error');
        }
    }
    
    // Start fallback progress mode (when no real progress events)
    startFallbackProgress(estimatedDurationMs = 30000) {
        console.log('🔄 Starting fallback progress mode');
        this.fallbackMode = true;
        this.lastProgressTime = Date.now();
        
        const updateInterval = 500; // Update every 500ms
        const maxProgress = 90; // Don't go to 100% until completion
        
        this.fallbackTimer = setInterval(() => {
            const elapsed = Date.now() - this.lastProgressTime;
            const progress = Math.min((elapsed / estimatedDurationMs) * maxProgress, maxProgress);
            
            if (this.targetProgress < progress) {
                this.targetProgress = progress;
                
                // Update step display with estimated progress
                if (this.progressStep) {
                    const estimatedStep = Math.floor((progress / 100) * 20); // Assume ~20 steps
                    this.progressStep.textContent = `Step ${estimatedStep} of ~20`;
                }
            }
        }, updateInterval);
    }
    
    // Stop fallback progress mode
    stopFallbackProgress() {
        if (this.fallbackTimer) {
            clearInterval(this.fallbackTimer);
            this.fallbackTimer = null;
        }
        this.fallbackMode = false;
    }
    
    // Track node execution for progress estimation
    onNodeExecuted() {
        if (this.fallbackMode && this.totalNodes > 0) {
            this.executedNodes++;
            const nodeProgress = (this.executedNodes / this.totalNodes) * 90; // 90% max
            
            if (nodeProgress > this.targetProgress) {
                this.targetProgress = nodeProgress;
                
                if (this.progressStep) {
                    this.progressStep.textContent = `Node ${this.executedNodes} of ${this.totalNodes}`;
                }
                
                console.log(`🔄 Node progress: ${this.executedNodes}/${this.totalNodes} (${Math.round(nodeProgress)}%)`);
            }
        }
    }
    
    // Start generation with node count estimation
    startGeneration(workflowData) {
        this.reset();
        this.show();
        this.executedNodes = 0;
        
        // Estimate total nodes from workflow (rough approximation)
        if (workflowData && typeof workflowData === 'object') {
            this.totalNodes = Object.keys(workflowData).length || 10;
            console.log(`🔄 Estimated ${this.totalNodes} nodes in workflow`);
        } else {
            this.totalNodes = 10; // Default estimate
        }
        
        // Start fallback progress after 2 seconds if no real progress
        setTimeout(() => {
            if (this.targetProgress === 0 && this.isVisible) {
                console.log('🔄 No progress events received, starting fallback mode');
                this.startFallbackProgress();
            }
        }, 2000);
    }
}

// Global cancellation state tracking
let isCancellationInProgress = false;

// Application state
const AppState = {
    apiEndpoint: localStorage.getItem('comfyui_endpoint') || 'http://192.168.10.15:8188',
    isConnected: false,
    workflowData: null,
    workflowMetadata: null,
    modifiedWorkflowData: null,
    isGenerating: false,
    websocket: null,
    progressBar: null,
    interruptService: null,
    navigationManager: null
};

// DOM Elements
const elements = {
    apiUrl: document.getElementById('api-url'),
    testConnection: document.getElementById('test-connection'),
    connectionStatus: document.getElementById('connection-status'),
    fileUpload: document.getElementById('workflow-file'),
    fileUploadArea: document.getElementById('file-upload-area'),
    uploadStatus: document.getElementById('upload-status'),
    workflowForm: document.getElementById('workflow-form'),
    generateButton: document.getElementById('generate-button'),
    cancelButton: document.getElementById('cancel-button'),
    resultsArea: document.getElementById('results-area'),
    clearResults: document.getElementById('clear-results'),
    toastContainer: document.getElementById('toast-container'),
    // Real-time status elements
    realtimeStatus: document.getElementById('realtime-status'),
    websocketIndicator: document.getElementById('websocket-indicator'),
    currentNodeName: document.getElementById('current-node-name'),
    progressContainer: document.getElementById('progress-container'),
    progressPercentage: document.getElementById('progress-percentage'),
    progressBar: document.getElementById('progress-bar'),
    progressStep: document.getElementById('progress-step'),
    // Simple seed control elements
    seedInput: document.getElementById('seed-input'),
    randomSeedButton: document.getElementById('random-seed-button'),
    seedDisplay: document.getElementById('seed-display'),
    randomSeedCheckbox: document.getElementById('random-seed-checkbox')
};

// Utility Functions
const Utils = {
    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: start; gap: 12px;">
                <svg style="width: 20px; height: 20px; flex-shrink: 0;" viewBox="0 0 24 24">
                    ${type === 'error' ? 
                        '<path fill="currentColor" d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z" />' :
                        '<path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />'
                    }
                </svg>
                <div>${message}</div>
            </div>
        `;
        
        elements.toastContainer.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    },

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // ================================================================================
    // Timing Utilities
    // ================================================================================

    /**
     * Format generation time from metadata
     * @param {Object} metadata - Metadata object with timing information
     * @returns {string} Formatted generation time summary
     */
    formatGenerationTime(metadata) {
        if (!metadata || !metadata.timing) {
            return 'No timing information available';
        }

        const timing = metadata.timing;
        const parts = [];

        if (timing.formatted && timing.formatted.duration) {
            parts.push(`Duration: ${timing.formatted.duration}`);
        }

        if (timing.formatted && timing.formatted.startTime) {
            parts.push(timing.formatted.startTime);
        }

        if (timing.analysis && timing.analysis.efficiency > 0) {
            parts.push(`Efficiency: ${timing.analysis.efficiency.toFixed(1)}%`);
        }

        return parts.length > 0 ? parts.join(' | ') : 'Timing information unavailable';
    },

    /**
     * Format duration in short format
     * @param {number} milliseconds - Duration in milliseconds
     * @returns {string} Short duration format (e.g., "2:34")
     */
    formatDurationShort(milliseconds) {
        return timingCalculator.formatDuration(milliseconds, { shortFormat: true });
    },

    /**
     * Format duration in long format
     * @param {number} milliseconds - Duration in milliseconds
     * @returns {string} Long duration format (e.g., "2 minutes 34 seconds")
     */
    formatDurationLong(milliseconds) {
        return timingCalculator.formatDuration(milliseconds, { shortFormat: false });
    },

    /**
     * Get relative time string
     * @param {Date|number} timestamp - Timestamp to compare
     * @returns {string} Relative time string (e.g., "3 minutes ago")
     */
    getRelativeTime(timestamp) {
        return timingCalculator.getRelativeTime(timestamp);
    },

    /**
     * Format timestamp with timezone
     * @param {Date|number} timestamp - Timestamp to format
     * @param {Object} options - Formatting options
     * @returns {string} Formatted timestamp with timezone
     */
    formatTimeWithTimezone(timestamp, options = {}) {
        const formatted = timingCalculator.formatTimestamp(timestamp, options);
        const timezone = timingCalculator.getTimezoneInfo();
        return `${formatted} (${timezone.offsetString})`;
    },

    /**
     * Format timing summary for display
     * @param {Object} timingData - Timing data object
     * @returns {Object} Formatted timing summary
     */
    formatTimingSummary(timingData) {
        return timingCalculator.createTimingSummary(timingData);
    },

    // ================================================================================
    // End Timing Utilities
    // ================================================================================

    // Validate JSON
    isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch {
            return false;
        }
    },

    // Validate ComfyUI workflow structure
    validateComfyUIWorkflow(workflowData) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            nodeCount: 0,
            foundNodes: {
                ksampler: false,
                emptyLatentImage: false,
                clipTextEncode: false
            }
        };

        try {
            // Check if it's an object
            if (!workflowData || typeof workflowData !== 'object') {
                validation.isValid = false;
                validation.errors.push('Workflow must be a valid JSON object');
                return validation;
            }

            // Check for basic ComfyUI workflow structure
            if (!workflowData.nodes && !Object.keys(workflowData).some(key => !isNaN(key))) {
                validation.isValid = false;
                validation.errors.push('Invalid ComfyUI workflow format - missing nodes structure');
                return validation;
            }

            // Parse workflow nodes (handle both node array and numbered object formats)
            let nodes = [];
            if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
                // New format with nodes array
                nodes = workflowData.nodes;
            } else {
                // Old format with numbered keys
                nodes = Object.keys(workflowData)
                    .filter(key => !isNaN(key))
                    .map(key => workflowData[key]);
            }

            validation.nodeCount = nodes.length;

            if (nodes.length === 0) {
                validation.isValid = false;
                validation.errors.push('Workflow contains no nodes');
                return validation;
            }

            // Check for essential ComfyUI node types
            for (const node of nodes) {
                if (!node || typeof node !== 'object') {
                    validation.warnings.push('Found invalid node structure');
                    continue;
                }

                const nodeType = node.class_type || node.type;
                if (!nodeType) {
                    validation.warnings.push('Found node without type information');
                    continue;
                }

                // Check for key node types
                if (nodeType === 'KSampler' || nodeType === 'KSamplerAdvanced') {
                    validation.foundNodes.ksampler = true;
                } else if (nodeType === 'FluxSampler' || nodeType.includes('FluxSample')) {
                    validation.foundNodes.ksampler = true;
                } else if (nodeType === 'FluxGuidanceNode' || nodeType === 'FluxGuidance') {
                    validation.foundNodes.ksampler = true;
                } else if (nodeType === 'EmptyLatentImage') {
                    validation.foundNodes.emptyLatentImage = true;
                } else if (nodeType === 'EmptySD3LatentImage' || nodeType === 'SD3LatentImage') {
                    validation.foundNodes.emptyLatentImage = true;
                } else if (nodeType === 'FluxGGUFLatent' || nodeType === 'FluxLatent' || nodeType === 'FluxGGUFLatentImage') {
                    validation.foundNodes.emptyLatentImage = true;
                } else if (nodeType.includes('Flux') && nodeType.includes('Latent')) {
                    validation.foundNodes.emptyLatentImage = true;
                } else if (nodeType === 'CLIPTextEncode') {
                    validation.foundNodes.clipTextEncode = true;
                }
            }

            // Validate essential nodes with Flux/SD3-aware messages
            if (!validation.foundNodes.ksampler) {
                validation.warnings.push('No sampling control nodes found (KSampler, FluxSampler, or FluxGuidanceNode) - generation steps and CFG may not be controllable');
            }
            if (!validation.foundNodes.emptyLatentImage) {
                validation.warnings.push('No dimension control nodes found (EmptyLatentImage, EmptySD3LatentImage, FluxGGUFLatent, FluxLatent, VAE, or ModelInput) - image dimensions may not be controllable through the UI');
            }
            if (!validation.foundNodes.clipTextEncode) {
                validation.warnings.push('No text encoding nodes found (CLIPTextEncode) - positive prompt may not be controllable');
            }

            return validation;
        } catch (error) {
            validation.isValid = false;
            validation.errors.push(`Workflow validation error: ${error.message}`);
            return validation;
        }
    },

    // Extract parameters from ComfyUI workflow
    extractWorkflowParameters(workflowData) {
        console.log('🔍 Extracting parameters from workflow...');
        
        const parameters = {
            steps: 20,
            cfg: 7.0,
            width: 512,
            height: 512,
            batchSize: 1,
            seed: -1,
            positivePrompt: '',
            foundNodes: {
                ksampler: false,
                emptyLatentImage: false,
                clipTextEncode: false
            }
        };
        
        try {
            // Parse workflow nodes (handle both formats)
            let nodes = [];
            if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
                // New format with nodes array
                nodes = workflowData.nodes;
                console.log('📋 Using new workflow format (nodes array)');
            } else {
                // Old format with numbered keys
                nodes = Object.keys(workflowData)
                    .filter(key => !isNaN(key))
                    .map(key => ({ ...workflowData[key], id: key }));
                console.log('📋 Using old workflow format (numbered keys)');
            }
            
            console.log(`📊 Processing ${nodes.length} nodes for parameter extraction`);
            
            // DEBUG: Log all node types found in workflow
            console.log('🔍 DEBUG: All node types in workflow:');
            nodes.forEach((node, index) => {
                if (node && typeof node === 'object') {
                    const nodeType = node.class_type || node.type;
                    const inputs = node.inputs || {};
                    const inputKeys = Object.keys(inputs);
                    console.log(`  Node ${index}: "${nodeType}" | Inputs: [${inputKeys.join(', ')}]`);
                }
            });
            
            // Extract parameters from each node
            nodes.forEach((node, index) => {
                if (!node || typeof node !== 'object') return;
                
                const nodeType = node.class_type || node.type;
                if (!nodeType) return;
                
                console.log(`🔎 Node ${index}: "${nodeType}"`);
                
                // SPECIAL DEBUG for EmptySD3LatentImage
                if (nodeType === 'EmptySD3LatentImage') {
                    console.log(`🎯 FOUND EmptySD3LatentImage! Node structure:`, {
                        nodeType,
                        inputs: node.inputs,
                        allNodeKeys: Object.keys(node)
                    });
                }
                
                // Extract KSampler parameters (traditional ComfyUI)
                if (nodeType === 'KSampler' || nodeType === 'KSamplerAdvanced') {
                    parameters.foundNodes.ksampler = true;
                    
                    const inputs = node.inputs || {};
                    if (inputs.steps !== undefined) {
                        parameters.steps = parseInt(inputs.steps) || parameters.steps;
                        console.log(`  ⚙️ Found steps (${nodeType}): ${parameters.steps}`);
                    }
                    if (inputs.cfg !== undefined) {
                        parameters.cfg = parseFloat(inputs.cfg) || parameters.cfg;
                        console.log(`  ⚙️ Found CFG (${nodeType}): ${parameters.cfg}`);
                    }
                    if (inputs.seed !== undefined) {
                        parameters.seed = parseInt(inputs.seed) || parameters.seed;
                        console.log(`  🎲 Found seed (${nodeType}): ${parameters.seed}`);
                    }
                }
                
                // Extract FluxSampler parameters
                else if (nodeType === 'FluxSampler' || nodeType.includes('FluxSample')) {
                    parameters.foundNodes.ksampler = true;
                    
                    const inputs = node.inputs || {};
                    if (inputs.steps !== undefined || inputs.num_steps !== undefined) {
                        const stepValue = inputs.steps || inputs.num_steps;
                        parameters.steps = parseInt(stepValue) || parameters.steps;
                        console.log(`  ⚙️ Found steps (${nodeType}): ${parameters.steps}`);
                    }
                    if (inputs.cfg !== undefined || inputs.guidance !== undefined || inputs.guidance_scale !== undefined) {
                        const cfgValue = inputs.cfg || inputs.guidance || inputs.guidance_scale;
                        parameters.cfg = parseFloat(cfgValue) || parameters.cfg;
                        console.log(`  ⚙️ Found CFG/guidance (${nodeType}): ${parameters.cfg}`);
                    }
                    if (inputs.seed !== undefined) {
                        parameters.seed = parseInt(inputs.seed) || parameters.seed;
                        console.log(`  🎲 Found seed (${nodeType}): ${parameters.seed}`);
                    }
                }
                
                // Extract FluxGuidanceNode parameters
                else if (nodeType === 'FluxGuidanceNode' || nodeType === 'FluxGuidance') {
                    parameters.foundNodes.ksampler = true; // Mark as found for CFG control
                    
                    const inputs = node.inputs || {};
                    if (inputs.guidance !== undefined || inputs.guidance_scale !== undefined || inputs.cfg !== undefined) {
                        const guidanceValue = inputs.guidance || inputs.guidance_scale || inputs.cfg;
                        parameters.cfg = parseFloat(guidanceValue) || parameters.cfg;
                        console.log(`  ⚙️ Found guidance (${nodeType}): ${parameters.cfg}`);
                    }
                }
                
                // Extract dimension parameters from various node types
                else if (nodeType === 'EmptyLatentImage') {
                    parameters.foundNodes.emptyLatentImage = true;
                    
                    const inputs = node.inputs || {};
                    if (inputs.width !== undefined) {
                        parameters.width = parseInt(inputs.width) || parameters.width;
                        console.log(`  📐 Found width (EmptyLatentImage): ${parameters.width}`);
                    }
                    if (inputs.height !== undefined) {
                        parameters.height = parseInt(inputs.height) || parameters.height;
                        console.log(`  📐 Found height (EmptyLatentImage): ${parameters.height}`);
                    }
                    if (inputs.batch_size !== undefined) {
                        parameters.batchSize = parseInt(inputs.batch_size) || parameters.batchSize;
                        console.log(`  📦 Found batch size (EmptyLatentImage): ${parameters.batchSize}`);
                    }
                }
                
                // Extract EmptySD3LatentImage parameters (SD3/Flux workflows)
                else if (nodeType === 'EmptySD3LatentImage' || nodeType === 'SD3LatentImage' || 
                        nodeType === 'Empty SD3 LatentImage' || nodeType.includes('SD3') && nodeType.includes('Latent')) {
                    parameters.foundNodes.emptyLatentImage = true;
                    
                    const inputs = node.inputs || {};
                    console.log(`  🎯 FOUND SD3 NODE: "${nodeType}" with inputs:`, Object.keys(inputs));
                    
                    if (inputs.width !== undefined) {
                        parameters.width = parseInt(inputs.width) || parameters.width;
                        console.log(`  📐 Found width (${nodeType}): ${parameters.width}`);
                    }
                    if (inputs.height !== undefined) {
                        parameters.height = parseInt(inputs.height) || parameters.height;
                        console.log(`  📐 Found height (${nodeType}): ${parameters.height}`);
                    }
                    if (inputs.batch_size !== undefined) {
                        parameters.batchSize = parseInt(inputs.batch_size) || parameters.batchSize;
                        console.log(`  📦 Found batch size (${nodeType}): ${parameters.batchSize}`);
                    }
                }
                
                // Extract FluxGGUFLatent and specific Flux dimension parameters
                else if (nodeType === 'FluxGGUFLatent' || nodeType === 'FluxLatent' || nodeType === 'FluxGGUFLatentImage') {
                    parameters.foundNodes.emptyLatentImage = true;
                    
                    const inputs = node.inputs || {};
                    if (inputs.width !== undefined) {
                        parameters.width = parseInt(inputs.width) || parameters.width;
                        console.log(`  📐 Found width (${nodeType}): ${parameters.width}`);
                    }
                    if (inputs.height !== undefined) {
                        parameters.height = parseInt(inputs.height) || parameters.height;
                        console.log(`  📐 Found height (${nodeType}): ${parameters.height}`);
                    }
                    if (inputs.batch_size !== undefined || inputs.batchSize !== undefined) {
                        const batchValue = inputs.batch_size || inputs.batchSize;
                        parameters.batchSize = parseInt(batchValue) || parameters.batchSize;
                        console.log(`  📦 Found batch size (${nodeType}): ${parameters.batchSize}`);
                    }
                }
                
                // Extract other Flux-specific dimension parameters (fallback)
                else if (nodeType.includes('Flux') && (nodeType.includes('Latent') || nodeType.includes('Image'))) {
                    parameters.foundNodes.emptyLatentImage = true; // Mark as found for compatibility
                    
                    const inputs = node.inputs || {};
                    if (inputs.width !== undefined) {
                        parameters.width = parseInt(inputs.width) || parameters.width;
                        console.log(`  📐 Found width (${nodeType}): ${parameters.width}`);
                    }
                    if (inputs.height !== undefined) {
                        parameters.height = parseInt(inputs.height) || parameters.height;
                        console.log(`  📐 Found height (${nodeType}): ${parameters.height}`);
                    }
                    if (inputs.batch_size !== undefined || inputs.batchSize !== undefined) {
                        const batchValue = inputs.batch_size || inputs.batchSize;
                        parameters.batchSize = parseInt(batchValue) || parameters.batchSize;
                        console.log(`  📦 Found batch size (${nodeType}): ${parameters.batchSize}`);
                    }
                }
                
                // Extract VAE dimension parameters
                else if (nodeType.includes('VAE') && (nodeType.includes('Encode') || nodeType.includes('Decode'))) {
                    const inputs = node.inputs || {};
                    // Some VAE nodes have dimension inputs
                    if (inputs.width !== undefined || inputs.height !== undefined) {
                        parameters.foundNodes.emptyLatentImage = true;
                        if (inputs.width !== undefined) {
                            parameters.width = parseInt(inputs.width) || parameters.width;
                            console.log(`  📐 Found width (${nodeType}): ${parameters.width}`);
                        }
                        if (inputs.height !== undefined) {
                            parameters.height = parseInt(inputs.height) || parameters.height;
                            console.log(`  📐 Found height (${nodeType}): ${parameters.height}`);
                        }
                    }
                }
                
                // Extract model input dimensions (for various model types)
                else if (nodeType.includes('ModelInput') || nodeType.includes('ImageSize') || nodeType.includes('Resolution')) {
                    const inputs = node.inputs || {};
                    if (inputs.width !== undefined || inputs.height !== undefined) {
                        parameters.foundNodes.emptyLatentImage = true;
                        if (inputs.width !== undefined) {
                            parameters.width = parseInt(inputs.width) || parameters.width;
                            console.log(`  📐 Found width (${nodeType}): ${parameters.width}`);
                        }
                        if (inputs.height !== undefined) {
                            parameters.height = parseInt(inputs.height) || parameters.height;
                            console.log(`  📐 Found height (${nodeType}): ${parameters.height}`);
                        }
                    }
                }
                
                // Extract CLIPTextEncode parameters (positive prompt)
                else if (nodeType === 'CLIPTextEncode') {
                    parameters.foundNodes.clipTextEncode = true;
                    
                    const inputs = node.inputs || {};
                    if (inputs.text !== undefined && typeof inputs.text === 'string' && inputs.text.trim()) {
                        // Only use the first non-empty prompt we find
                        if (!parameters.positivePrompt) {
                            parameters.positivePrompt = inputs.text.trim();
                            console.log(`  💬 Found positive prompt: "${parameters.positivePrompt.substring(0, 50)}${parameters.positivePrompt.length > 50 ? '...' : '"'}`);
                        }
                    }
                }
                
                // FALLBACK: Check ANY node for dimension parameters
                else {
                    const inputs = node.inputs || {};
                    if ((inputs.width !== undefined || inputs.height !== undefined) && !parameters.foundNodes.emptyLatentImage) {
                        console.log(`  🔍 FALLBACK: Found node "${nodeType}" with dimension inputs:`, Object.keys(inputs));
                        parameters.foundNodes.emptyLatentImage = true;
                        
                        if (inputs.width !== undefined) {
                            parameters.width = parseInt(inputs.width) || parameters.width;
                            console.log(`  📐 Found width (FALLBACK ${nodeType}): ${parameters.width}`);
                        }
                        if (inputs.height !== undefined) {
                            parameters.height = parseInt(inputs.height) || parameters.height;
                            console.log(`  📐 Found height (FALLBACK ${nodeType}): ${parameters.height}`);
                        }
                        if (inputs.batch_size !== undefined) {
                            parameters.batchSize = parseInt(inputs.batch_size) || parameters.batchSize;
                            console.log(`  📦 Found batch size (FALLBACK ${nodeType}): ${parameters.batchSize}`);
                        }
                    }
                }
            });
            
            console.log('🎯 Parameter extraction summary:', {
                steps: parameters.steps,
                cfg: parameters.cfg,
                dimensions: `${parameters.width}x${parameters.height}`,
                batchSize: parameters.batchSize,
                promptLength: parameters.positivePrompt.length,
                foundNodes: parameters.foundNodes
            });
            
            return parameters;
            
        } catch (error) {
            console.error('❌ Error extracting parameters:', error);
            return parameters; // Return defaults on error
        }
    },
    
    // Collect current form data for workflow modification
    collectFormData() {
        console.log('📝 Collecting form data for workflow modification...');
        
        try {
            const formData = {
                steps: parseInt(document.getElementById('steps')?.value) || 20,
                cfg: parseFloat(document.querySelector('[data-linked="cfg"]')?.value) || 7.0,
                width: parseInt(document.querySelector('[data-linked="width"]')?.value) || 512,
                height: parseInt(document.querySelector('[data-linked="height"]')?.value) || 512,
                batchSize: parseInt(document.querySelector('[data-linked="batch-size"]')?.value) || 1,
                positivePrompt: document.getElementById('positive-prompt')?.value?.trim() || '',
                // Simple seed parameter
                seed: parseInt(elements.seedInput?.value) || 0
            };
            
            console.log('📊 Collected form data:', formData);
            return formData;
        } catch (error) {
            console.error('❌ Error collecting form data:', error);
            return null;
        }
    },
    
    // Modify workflow parameters with form data
    modifyWorkflowParameters(workflowData, formData) {
        console.log('🔧 Modifying workflow parameters...');
        
        if (!workflowData || !formData) {
            console.error('❌ Invalid workflow data or form data');
            return null;
        }
        
        try {
            // Create a deep copy to avoid modifying the original
            const modifiedWorkflow = JSON.parse(JSON.stringify(workflowData));
            
            // Parse workflow nodes (handle both formats)
            let nodes = [];
            let isOldFormat = false;
            
            if (modifiedWorkflow.nodes && Array.isArray(modifiedWorkflow.nodes)) {
                // New format with nodes array
                nodes = modifiedWorkflow.nodes;
                console.log('📋 Using new workflow format for modification');
            } else {
                // Old format with numbered keys
                isOldFormat = true;
                nodes = Object.keys(modifiedWorkflow)
                    .filter(key => !isNaN(key))
                    .map(key => ({ ...modifiedWorkflow[key], nodeId: key }));
                console.log('📋 Using old workflow format for modification');
            }
            
            console.log(`🔧 Modifying ${nodes.length} nodes`);
            
            // Track modifications made
            const modifications = {
                ksampler: 0,
                emptyLatentImage: 0,
                clipTextEncode: 0,
                fluxGuidance: 0,
                advancedSeedNode: 0
            };
            
            // Modify each node as needed
            nodes.forEach((node, index) => {
                if (!node || typeof node !== 'object') return;
                
                const nodeType = node.class_type || node.type;
                if (!nodeType) return;
                
                const nodeRef = isOldFormat ? modifiedWorkflow[node.nodeId] : node;
                
                // Modify KSampler parameters
                if (nodeType === 'KSampler' || nodeType === 'KSamplerAdvanced') {
                    if (nodeRef.inputs) {
                        if (nodeRef.inputs.steps !== undefined) {
                            const oldSteps = nodeRef.inputs.steps;
                            nodeRef.inputs.steps = formData.steps;
                            console.log(`  ⚙️ Updated KSampler steps: ${oldSteps} → ${formData.steps}`);
                        }
                        if (nodeRef.inputs.cfg !== undefined) {
                            const oldCfg = nodeRef.inputs.cfg;
                            nodeRef.inputs.cfg = formData.cfg;
                            console.log(`  ⚙️ Updated KSampler CFG: ${oldCfg} → ${formData.cfg}`);
                        }
                        if (nodeRef.inputs.seed !== undefined) {
                            const oldSeed = nodeRef.inputs.seed;
                            nodeRef.inputs.seed = formData.seed;
                            console.log(`  🎲 Updated KSampler seed: ${oldSeed} → ${formData.seed}`);
                        }
                        modifications.ksampler++;
                    }
                }
                
                // Modify FluxSampler parameters
                else if (nodeType === 'FluxSampler' || nodeType.includes('FluxSample')) {
                    if (nodeRef.inputs) {
                        if (nodeRef.inputs.steps !== undefined || nodeRef.inputs.num_steps !== undefined) {
                            const stepsKey = nodeRef.inputs.steps !== undefined ? 'steps' : 'num_steps';
                            const oldSteps = nodeRef.inputs[stepsKey];
                            nodeRef.inputs[stepsKey] = formData.steps;
                            console.log(`  ⚙️ Updated FluxSampler steps: ${oldSteps} → ${formData.steps}`);
                        }
                        if (nodeRef.inputs.cfg !== undefined || nodeRef.inputs.guidance !== undefined) {
                            const cfgKey = nodeRef.inputs.cfg !== undefined ? 'cfg' : 'guidance';
                            const oldCfg = nodeRef.inputs[cfgKey];
                            nodeRef.inputs[cfgKey] = formData.cfg;
                            console.log(`  ⚙️ Updated FluxSampler CFG: ${oldCfg} → ${formData.cfg}`);
                        }
                        if (nodeRef.inputs.seed !== undefined) {
                            const oldSeed = nodeRef.inputs.seed;
                            nodeRef.inputs.seed = formData.seed;
                            console.log(`  🎲 Updated FluxSampler seed: ${oldSeed} → ${formData.seed}`);
                        }
                        modifications.ksampler++;
                    }
                }
                
                // Modify FluxGuidance parameters
                else if (nodeType === 'FluxGuidanceNode' || nodeType === 'FluxGuidance') {
                    if (nodeRef.inputs) {
                        if (nodeRef.inputs.guidance !== undefined) {
                            const oldGuidance = nodeRef.inputs.guidance;
                            nodeRef.inputs.guidance = formData.cfg;
                            console.log(`  ⚙️ Updated FluxGuidance: ${oldGuidance} → ${formData.cfg}`);
                        }
                        modifications.fluxGuidance++;
                    }
                }
                
                // Modify EmptySD3LatentImage parameters
                else if (nodeType === 'EmptySD3LatentImage' || nodeType === 'EmptyLatentImage') {
                    if (nodeRef.inputs) {
                        if (nodeRef.inputs.width !== undefined) {
                            const oldWidth = nodeRef.inputs.width;
                            nodeRef.inputs.width = formData.width;
                            console.log(`  📐 Updated ${nodeType} width: ${oldWidth} → ${formData.width}`);
                        }
                        if (nodeRef.inputs.height !== undefined) {
                            const oldHeight = nodeRef.inputs.height;
                            nodeRef.inputs.height = formData.height;
                            console.log(`  📐 Updated ${nodeType} height: ${oldHeight} → ${formData.height}`);
                        }
                        if (nodeRef.inputs.batch_size !== undefined) {
                            const oldBatch = nodeRef.inputs.batch_size;
                            nodeRef.inputs.batch_size = formData.batchSize;
                            console.log(`  📦 Updated ${nodeType} batch_size: ${oldBatch} → ${formData.batchSize}`);
                        }
                        modifications.emptyLatentImage++;
                    }
                }
                
                // Modify CLIPTextEncode parameters (only first one)
                else if (nodeType === 'CLIPTextEncode' && modifications.clipTextEncode === 0) {
                    if (nodeRef.inputs && nodeRef.inputs.text !== undefined) {
                        const oldText = nodeRef.inputs.text;
                        nodeRef.inputs.text = formData.positivePrompt;
                        console.log(`  💬 Updated CLIPTextEncode prompt: "${oldText.substring(0, 30)}..." → "${formData.positivePrompt.substring(0, 30)}..."`);
                        modifications.clipTextEncode++;
                    }
                }
            });
            
            console.log('🎯 Workflow modification summary:', modifications);
            
            // Show user feedback about modifications
            const modifiedFields = [];
            if (modifications.ksampler > 0) modifiedFields.push('Sampling Parameters');
            if (modifications.fluxGuidance > 0) modifiedFields.push('Flux Guidance');
            if (modifications.emptyLatentImage > 0) modifiedFields.push('Image Dimensions');
            if (modifications.clipTextEncode > 0) modifiedFields.push('Prompt');
            if (modifications.advancedSeedNode > 0) modifiedFields.push('Advanced Seed Sequence');
            
            if (modifiedFields.length > 0) {
                Utils.showToast(`Modified: ${modifiedFields.join(', ')}`, 'success');
            } else {
                Utils.showToast('No parameters were modified', 'info');
            }
            
            return modifiedWorkflow;
            
        } catch (error) {
            console.error('❌ Error modifying workflow:', error);
            Utils.showToast('Failed to modify workflow parameters', 'error');
            return null;
        }
    },

    // Populate form fields with extracted parameters
    populateFormParameters(parameters) {
        console.log('📝 Populating form with extracted parameters...');
        
        try {
            // Update steps
            const stepsSlider = document.getElementById('steps');
            const stepsInput = document.querySelector('[data-linked="steps"]');
            if (stepsSlider && stepsInput) {
                stepsSlider.value = parameters.steps;
                stepsInput.value = parameters.steps;
                console.log(`✅ Set steps to: ${parameters.steps}`);
            }
            
            // Update CFG
            const cfgSlider = document.getElementById('cfg');
            const cfgInput = document.querySelector('[data-linked="cfg"]');
            if (cfgSlider && cfgInput) {
                cfgSlider.value = parameters.cfg;
                cfgInput.value = parameters.cfg;
                console.log(`✅ Set CFG to: ${parameters.cfg}`);
            }
            
            // Update width
            const widthSlider = document.getElementById('width');
            const widthInput = document.querySelector('[data-linked="width"]');
            if (widthSlider && widthInput) {
                widthSlider.value = parameters.width;
                widthInput.value = parameters.width;
                console.log(`✅ Set width to: ${parameters.width}`);
            }
            
            // Update height
            const heightSlider = document.getElementById('height');
            const heightInput = document.querySelector('[data-linked="height"]');
            if (heightSlider && heightInput) {
                heightSlider.value = parameters.height;
                heightInput.value = parameters.height;
                console.log(`✅ Set height to: ${parameters.height}`);
            }
            
            // Update batch size
            const batchSlider = document.getElementById('batch-size');
            const batchInput = document.querySelector('[data-linked="batch-size"]');
            if (batchSlider && batchInput) {
                batchSlider.value = parameters.batchSize;
                batchInput.value = parameters.batchSize;
                console.log(`✅ Set batch size to: ${parameters.batchSize}`);
            }
            
            // Update seed
            if (elements.seedInput) {
                elements.seedInput.value = parameters.seed;
                SeedUtils.updateSeedDisplay(parameters.seed);
                console.log(`✅ Set seed to: ${parameters.seed}`);
            }
            
            // Update positive prompt
            const promptTextarea = document.getElementById('positive-prompt');
            if (promptTextarea && parameters.positivePrompt) {
                promptTextarea.value = parameters.positivePrompt;
                console.log(`✅ Set positive prompt (${parameters.positivePrompt.length} characters)`);
            }
            
            // Show user feedback about what was populated
            const populatedFields = [];
            const controllableFields = [];
            
            if (parameters.foundNodes.ksampler) {
                populatedFields.push('Steps, CFG & Seed');
                controllableFields.push('Steps, CFG & Seed');
            }
            if (parameters.foundNodes.emptyLatentImage) {
                populatedFields.push('Dimensions & Batch Size');
                controllableFields.push('Dimensions & Batch Size');
            }
            if (parameters.foundNodes.clipTextEncode && parameters.positivePrompt) {
                populatedFields.push('Positive Prompt');
                controllableFields.push('Positive Prompt');
            }
            
            if (populatedFields.length > 0) {
                Utils.showToast(`Auto-populated: ${populatedFields.join(', ')}`, 'success');
                
                // Additional info about controllability
                setTimeout(() => {
                    if (controllableFields.length < 3) {
                        const uncontrollable = [];
                        if (!parameters.foundNodes.ksampler) uncontrollable.push('Steps/CFG');
                        if (!parameters.foundNodes.emptyLatentImage) uncontrollable.push('Dimensions');
                        if (!parameters.foundNodes.clipTextEncode) uncontrollable.push('Prompt');
                        
                        if (uncontrollable.length > 0) {
                            Utils.showToast(`Note: ${uncontrollable.join(', ')} may not be controllable in this workflow`, 'info');
                        }
                    } else {
                        Utils.showToast('All parameters are controllable in this workflow! 🎉', 'success');
                    }
                }, 1500);
            } else {
                Utils.showToast('No parameters found to auto-populate - workflow may use custom node types', 'info');
            }
            
        } catch (error) {
            console.error('❌ Error populating form:', error);
            Utils.showToast('Failed to auto-populate form fields', 'error');
        }
    },

    // Test WebSocket connection as fallback
    async testWebSocketConnection(url) {
        return new Promise((resolve, reject) => {
            const wsUrl = url.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws';
            console.log(`🔌 Testing WebSocket connection: ${wsUrl}`);
            
            const ws = new WebSocket(wsUrl);
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error('WebSocket connection timeout'));
            }, 5000);
            
            ws.onopen = () => {
                console.log('✅ WebSocket connection successful');
                clearTimeout(timeout);
                ws.close();
                resolve(true);
            };
            
            ws.onerror = (error) => {
                console.log('❌ WebSocket connection failed:', error);
                clearTimeout(timeout);
                reject(new Error('WebSocket connection failed'));
            };
            
            ws.onclose = (event) => {
                if (event.wasClean) {
                    console.log('WebSocket closed cleanly');
                } else {
                    console.log('WebSocket connection lost');
                }
            };
        });
    },

    // API Communication Functions for Task 6
    
    // Submit workflow to ComfyUI API
    async submitToComfyUI(workflowData) {
        if (!AppState.apiEndpoint) {
            throw new Error('No API endpoint configured');
        }

        const url = `${AppState.apiEndpoint}/prompt`;
        console.log(`🚀 Submitting workflow to ComfyUI: ${url}`);

        try {
            // Create manual AbortController for cross-browser compatibility
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.log('⏱️ ComfyUI submission timeout after 30 seconds');
                controller.abort();
            }, 30000); // 30 second timeout

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    prompt: workflowData,
                    client_id: this.generateClientId()
                }),
                signal: controller.signal // Manual timeout for browser compatibility
            });

            // Clear timeout if request succeeds
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Workflow submitted successfully:', result);

            if (!result.prompt_id) {
                throw new Error('No prompt_id received from ComfyUI');
            }

            return {
                success: true,
                promptId: result.prompt_id,
                node_errors: result.node_errors || {}
            };

        } catch (error) {
            console.error('❌ Failed to submit workflow:', error);
            throw error;
        }
    },

    // Poll for generation results
    async pollForResults(promptId, maxRetries = 30, retryInterval = 2000) {
        console.log(`🔍 Polling for results: ${promptId}`);
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Create manual AbortController for cross-browser compatibility
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    console.log('⏱️ History polling timeout after 10 seconds');
                    controller.abort();
                }, 10000); // 10 second timeout

                const response = await fetch(`${AppState.apiEndpoint}/history/${promptId}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    signal: controller.signal // Manual timeout for browser compatibility
                });

                // Clear timeout if request succeeds
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const history = await response.json();
                
                if (history[promptId]) {
                    const promptData = history[promptId];
                    
                    // Check if generation is complete
                    if (promptData.status && promptData.status.completed) {
                        console.log('✅ Generation completed:', promptData);
                        
                        // Parse metadata from history response
                        const historyMetadata = metadataParser.parseHistoryResponse(promptData);
                        const normalizedHistoryMetadata = metadataParser.normalizeMetadata(historyMetadata);
                        
                        return {
                            success: true,
                            status: 'completed',
                            outputs: promptData.outputs || {},
                            meta: promptData.meta || {},
                            metadata: normalizedHistoryMetadata
                        };
                    }
                    
                    // Check for errors
                    if (promptData.status && promptData.status.status_str === 'error') {
                        console.error('❌ Generation failed:', promptData.status);
                        return {
                            success: false,
                            status: 'error',
                            error: promptData.status.messages || 'Unknown error occurred'
                        };
                    }
                    
                    // Still processing
                    console.log(`⏳ Generation in progress (attempt ${attempt + 1}/${maxRetries})`);
                } else {
                    console.log(`⏳ Waiting for prompt to appear in history (attempt ${attempt + 1}/${maxRetries})`);
                }

                // Wait before next poll
                if (attempt < maxRetries - 1) {
                    await this.sleep(retryInterval);
                }

            } catch (error) {
                console.error(`❌ Poll attempt ${attempt + 1} failed:`, error);
                
                if (attempt === maxRetries - 1) {
                    throw new Error(`Failed to get results after ${maxRetries} attempts: ${error.message}`);
                }
                
                // Wait before retry
                await this.sleep(retryInterval);
            }
        }

        throw new Error(`Generation timed out after ${maxRetries} attempts`);
    },

    // Extract image URLs from ComfyUI outputs
    extractImageUrls(outputs) {
        const imageUrls = [];
        
        try {
            console.log('🔍 Extracting images from outputs:', outputs);
            
            for (const nodeId in outputs) {
                const nodeOutput = outputs[nodeId];
                console.log(`🔍 Checking node ${nodeId}:`, nodeOutput);
                
                if (nodeOutput.images && Array.isArray(nodeOutput.images)) {
                    console.log(`📷 Found ${nodeOutput.images.length} images in node ${nodeId}`);
                    for (const image of nodeOutput.images) {
                        console.log('🖼️ Processing image:', image);
                        if (image.filename) {
                            const imageUrl = `${AppState.apiEndpoint}/view?filename=${encodeURIComponent(image.filename)}&type=output`;
                            imageUrls.push({
                                url: imageUrl,
                                filename: image.filename,
                                subfolder: image.subfolder || '',
                                type: image.type || 'output'
                            });
                        }
                    }
                } else {
                    console.log(`❌ Node ${nodeId} has no images array or is not an array`);
                }
            }
            
            console.log(`📷 Found ${imageUrls.length} images:`, imageUrls);
            return imageUrls;
            
        } catch (error) {
            console.error('❌ Failed to extract image URLs:', error);
            return [];
        }
    },

    // Generate unique client ID
    generateClientId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    },

    // Sleep utility for polling
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// ComfyUI API Functions
const ComfyUIAPI = {
    // Interrupt current generation - now uses InterruptService
    async interrupt() {
        if (!AppState.interruptService) {
            console.error('❌ InterruptService not initialized');
            return false;
        }
        
        // Use the interrupt service
        return await AppState.interruptService.interrupt();
    }
};

// Enhanced Cancel Button State Management with Validation
const CancelButtonStateManager = {
    currentState: 'hidden',
    lastStateChange: Date.now(),
    validStates: ['hidden', 'enabled', 'loading', 'disabled'],
    
    // Valid state transitions
    validTransitions: {
        'hidden': ['enabled'],
        'enabled': ['loading', 'hidden'],
        'loading': ['enabled', 'hidden'],
        'disabled': ['enabled', 'hidden']
    },
    
    // Validate state transition
    isValidTransition(fromState, toState) {
        if (!this.validStates.includes(toState)) {
            console.warn(`⚠️ Invalid cancel button state: ${toState}`);
            return false;
        }
        
        const validNextStates = this.validTransitions[fromState] || [];
        if (!validNextStates.includes(toState) && fromState !== toState) {
            console.warn(`⚠️ Invalid state transition: ${fromState} → ${toState}`);
            return true; // Allow but warn
        }
        
        return true;
    },
    
    // Set button state with validation
    setState(state, source = 'unknown') {
        if (!this.isValidTransition(this.currentState, state)) {
            return false;
        }
        
        // Don't update if already in this state (unless forced)
        if (this.currentState === state) {
            console.log(`🛑 Cancel button already in state: ${state}`);
            return true;
        }
        
        const oldState = this.currentState;
        this.currentState = state;
        this.lastStateChange = Date.now();
        
        console.log(`🛑 Cancel button state: ${oldState} → ${state} (source: ${source})`);
        
        return this.applyState(state);
    },
    
    // Apply the actual DOM changes
    applyState(state) {
        const cancelButton = elements.cancelButton;
        if (!cancelButton) {
            console.warn('❌ Cancel button element not found');
            return false;
        }
        
        const buttonText = cancelButton.querySelector('.button-text');
        const buttonSpinner = cancelButton.querySelector('.button-spinner');
        
        // Validate DOM elements
        if (!buttonText || !buttonSpinner) {
            console.warn('❌ Cancel button DOM elements incomplete');
        }
        
        switch (state) {
            case 'hidden':
                cancelButton.style.display = 'none';
                cancelButton.classList.remove('loading');
                cancelButton.disabled = false;
                cancelButton.style.opacity = '1';
                if (buttonSpinner) buttonSpinner.style.display = 'none';
                if (buttonText) buttonText.style.display = 'flex';
                break;
                
            case 'enabled':
                cancelButton.style.display = 'flex';
                cancelButton.classList.remove('loading');
                cancelButton.disabled = false;
                cancelButton.style.opacity = '1';
                if (buttonSpinner) buttonSpinner.style.display = 'none';
                if (buttonText) buttonText.style.display = 'flex';
                break;
                
            case 'loading':
                cancelButton.style.display = 'flex';
                cancelButton.classList.add('loading');
                cancelButton.disabled = true;
                cancelButton.style.opacity = '1';
                if (buttonSpinner) buttonSpinner.style.display = 'inline-flex';
                if (buttonText) buttonText.style.display = 'none';
                break;
                
            case 'disabled':
                cancelButton.style.display = 'flex';
                cancelButton.classList.remove('loading');
                cancelButton.disabled = true;
                cancelButton.style.opacity = '1';
                if (buttonSpinner) buttonSpinner.style.display = 'none';
                if (buttonText) buttonText.style.display = 'flex';
                break;
                
                
            default:
                console.warn(`⚠️ Unknown cancel button state: ${state}`);
                return false;
        }
        
        return true;
    },
    
    // Get current state
    getState() {
        return this.currentState;
    },
    
    // Validate current state matches DOM
    validateState() {
        const cancelButton = elements.cancelButton;
        if (!cancelButton) {
            console.warn('❌ Cannot validate: Cancel button element not found');
            return false;
        }
        
        const isVisible = cancelButton.style.display !== 'none';
        const isLoading = cancelButton.classList.contains('loading');
        const isDisabled = cancelButton.disabled;
        
        let expectedState = 'hidden';
        if (isVisible && isLoading) {
            expectedState = 'loading';
        } else if (isVisible && isDisabled) {
            expectedState = 'disabled';
        } else if (isVisible) {
            expectedState = 'enabled';
        }
        
        if (expectedState !== this.currentState) {
            console.warn(`⚠️ State mismatch: expected ${expectedState}, current ${this.currentState}`);
            this.currentState = expectedState;
            return false;
        }
        
        return true;
    }
};

// Backward compatibility wrapper
function setCancelButtonState(state, source = 'legacy') {
    return CancelButtonStateManager.setState(state, source);
}

// Simple Seed Utility Functions
const SeedUtils = {
    // Generate random seed within user-friendly range
    generateRandomSeed() {
        const MIN_SEED = 1;
        const MAX_SEED = 999999;
        return Math.floor(Math.random() * (MAX_SEED - MIN_SEED + 1)) + MIN_SEED;
    },
    
    // Validate seed value for user-friendly range
    validateSeed(seed) {
        const MIN_SEED = 1;
        const MAX_SEED = 999999;
        const numSeed = parseInt(seed);
        
        if (isNaN(numSeed)) {
            return { valid: false, message: 'Seed must be a valid number' };
        }
        
        if (numSeed < MIN_SEED || numSeed > MAX_SEED) {
            return { valid: false, message: `Seed must be between ${MIN_SEED} and ${MAX_SEED}` };
        }
        
        return { valid: true };
    },
    
    // Update seed display
    updateSeedDisplay(seed) {
        if (elements.seedDisplay) {
            elements.seedDisplay.textContent = `Current seed: ${seed}`;
        }
    },
    
    // Set random seed and update display
    setRandomSeed() {
        const randomSeed = this.generateRandomSeed();
        if (elements.seedInput) {
            elements.seedInput.value = randomSeed;
            this.updateSeedDisplay(randomSeed);
        }
        console.log(`🎲 Generated random seed: ${randomSeed}`);
        return randomSeed;
    }
};

// Form Validation
const Validation = {
    validateSteps(value) {
        const num = parseInt(value);
        if (isNaN(num) || num < 1 || num > 150) {
            return { valid: false, message: 'Steps must be between 1 and 150' };
        }
        return { valid: true };
    },

    validateCFG(value) {
        const num = parseFloat(value);
        if (isNaN(num) || num < 1 || num > 30) {
            return { valid: false, message: 'CFG must be between 1 and 30' };
        }
        return { valid: true };
    },

    validateDimensions(value) {
        const num = parseInt(value);
        if (isNaN(num) || num < 64 || num > 2048 || num % 8 !== 0) {
            return { valid: false, message: 'Dimensions must be 64-2048 in increments of 8' };
        }
        return { valid: true };
    },

    validateBatchSize(value) {
        const num = parseInt(value);
        if (isNaN(num) || num < 1 || num > 10) {
            return { valid: false, message: 'Batch size must be between 1 and 10' };
        }
        return { valid: true };
    },

    // Task 10: Comprehensive form validation before submission
    validateAllFields() {
        const validationResults = [];
        const errors = [];

        // Get form elements using the correct selectors (data-linked attributes)
        const stepsElement = document.querySelector('[data-linked="steps"]');
        const cfgElement = document.querySelector('[data-linked="cfg"]');
        const widthElement = document.querySelector('[data-linked="width"]');
        const heightElement = document.querySelector('[data-linked="height"]');
        const batchSizeElement = document.querySelector('[data-linked="batch-size"]');
        const promptElement = document.getElementById('positive-prompt');

        // Check if elements exist and get values safely
        const steps = stepsElement?.value || '';
        const cfg = cfgElement?.value || '';
        const width = widthElement?.value || '';
        const height = heightElement?.value || '';
        const batchSize = batchSizeElement?.value || '';
        const seed = elements.seedInput?.value || '';
        const prompt = promptElement?.value?.trim() || '';

        // Validate each field with null checks
        const validations = [
            { field: 'steps', value: steps, validator: this.validateSteps, element: stepsElement },
            { field: 'cfg', value: cfg, validator: this.validateCFG, element: cfgElement },
            { field: 'width', value: width, validator: this.validateDimensions, element: widthElement },
            { field: 'height', value: height, validator: this.validateDimensions, element: heightElement },
            { field: 'batch-size', value: batchSize, validator: this.validateBatchSize, element: batchSizeElement },
            { field: 'seed', value: seed, validator: SeedUtils.validateSeed, element: elements.seedInput }
        ];

        validations.forEach(({ field, value, validator, element }) => {
            // Check if element exists
            if (!element) {
                console.warn(`⚠️ Form element not found for field: ${field}`);
                const missingError = { field, message: `Form element for ${field} not found`, element: null };
                validationResults.push({ field, valid: false, message: missingError.message, element: null });
                errors.push(missingError);
                return;
            }

            // Validate if element exists
            const result = validator(value);
            validationResults.push({ field, ...result, element });
            
            if (!result.valid) {
                errors.push({ field, message: result.message, element });
            }
        });

        // Validate prompt (minimum length) with null check
        if (!promptElement) {
            console.warn('⚠️ Prompt element not found');
            const missingPromptError = { field: 'prompt', message: 'Prompt element not found', element: null };
            validationResults.push({ field: 'prompt', valid: false, message: missingPromptError.message, element: null });
            errors.push(missingPromptError);
        } else if (prompt.length === 0) {
            const promptError = { field: 'prompt', message: 'Positive prompt is required', element: promptElement };
            validationResults.push({ field: 'prompt', valid: false, message: 'Positive prompt is required', element: promptElement });
            errors.push(promptError);
        } else if (prompt.length < 3) {
            const promptError = { field: 'prompt', message: 'Prompt must be at least 3 characters long', element: promptElement };
            validationResults.push({ field: 'prompt', valid: false, message: 'Prompt must be at least 3 characters long', element: promptElement });
            errors.push(promptError);
        } else {
            validationResults.push({ field: 'prompt', valid: true, element: promptElement });
        }

        return {
            isValid: errors.length === 0,
            errors,
            validationResults
        };
    },

    // Show validation errors with styled feedback
    showValidationErrors(errors) {
        // Clear previous error states
        document.querySelectorAll('.control-group.error').forEach(group => {
            group.classList.remove('error');
            const errorMsg = group.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        });

        // Clear prompt error state
        const promptGroup = document.querySelector('.prompt-control');
        if (promptGroup) {
            promptGroup.classList.remove('error');
            const errorMsg = promptGroup.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        }

        // Show new errors
        errors.forEach(({ field, message, element }) => {
            let controlGroup;
            
            if (field === 'prompt') {
                controlGroup = document.querySelector('.prompt-control');
            } else if (element) {
                controlGroup = element.closest('.control-group');
            } else {
                // Element is null, skip visual error display but log it
                console.warn(`⚠️ Cannot show error for ${field}: element not found`);
                return;
            }
            
            if (controlGroup) {
                controlGroup.classList.add('error');
                
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.textContent = message;
                controlGroup.appendChild(errorMsg);
            }
        });

        // Show summary toast
        const errorCount = errors.length;
        const errorFields = errors.map(e => e.field).join(', ');
        Utils.showToast(`${errorCount} validation error${errorCount > 1 ? 's' : ''}: ${errorFields}`, 'error');
    },

    // Clear all validation error states
    clearValidationErrors() {
        document.querySelectorAll('.control-group.error, .prompt-control.error').forEach(group => {
            group.classList.remove('error');
            const errorMsg = group.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        });
    },

    // Validate workflow compatibility with current form values
    validateWorkflowCompatibility(workflowData) {
        const errors = [];
        
        if (!workflowData) {
            errors.push('No workflow data provided');
            return { isValid: false, errors };
        }
        
        try {
            // Get current form values
            const formData = Utils.collectFormData();
            if (!formData) {
                errors.push('Could not collect form data');
                return { isValid: false, errors };
            }
            
            
            // Check for basic workflow structure issues
            let nodeCount = 0;
            if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
                nodeCount = workflowData.nodes.length;
            } else {
                // Count numbered keys for old format
                nodeCount = Object.keys(workflowData).filter(key => !isNaN(key)).length;
            }
            
            if (nodeCount === 0) {
                errors.push('Workflow contains no nodes');
            } else if (nodeCount < 3) {
                errors.push('Workflow appears incomplete (too few nodes)');
            }
            
            // Check for extremely large values that might cause issues
            if (formData.width > 2048 || formData.height > 2048) {
                errors.push('Image dimensions are very large - this may cause memory issues');
            }
            
            if (formData.steps > 100) {
                errors.push('Step count is very high - this may take a long time to generate');
            }
            
            if (formData.cfg > 30) {
                errors.push('CFG scale is very high - this may produce poor quality images');
            }
            
            if (formData.batchSize > 4) {
                errors.push('Large batch size may cause memory issues');
            }
            
            return { isValid: errors.length === 0, errors };
            
        } catch (error) {
            console.error('Error validating workflow compatibility:', error);
            errors.push('Failed to validate workflow compatibility');
            return { isValid: false, errors };
        }
    }
};

// Slider Synchronization
function initializeSliders() {
    const sliders = document.querySelectorAll('.slider');
    
    sliders.forEach(slider => {
        const linkedInput = document.querySelector(`[data-linked="${slider.id}"]`);
        
        if (linkedInput) {
            // Sync slider to input
            slider.addEventListener('input', () => {
                linkedInput.value = slider.value;
            });
            
            // Sync input to slider
            linkedInput.addEventListener('input', () => {
                const value = parseFloat(linkedInput.value);
                const min = parseFloat(slider.min);
                const max = parseFloat(slider.max);
                
                if (value >= min && value <= max) {
                    slider.value = value;
                }
            });
            
            // Validate on blur
            linkedInput.addEventListener('blur', () => {
                const value = linkedInput.value;
                let validation;
                
                switch (slider.id) {
                    case 'steps':
                        validation = Validation.validateSteps(value);
                        break;
                    case 'cfg':
                        validation = Validation.validateCFG(value);
                        break;
                    case 'width':
                    case 'height':
                        validation = Validation.validateDimensions(value);
                        break;
                    case 'batch-size':
                        validation = Validation.validateBatchSize(value);
                        break;
                    default:
                        validation = { valid: true };
                }
                
                const controlGroup = linkedInput.closest('.control-group');
                const existingError = controlGroup.querySelector('.error-message');
                
                if (existingError) {
                    existingError.remove();
                }
                
                if (!validation.valid) {
                    controlGroup.classList.add('error');
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'error-message';
                    errorMsg.textContent = validation.message;
                    controlGroup.appendChild(errorMsg);
                } else {
                    controlGroup.classList.remove('error');
                }
            });
        }
    });
}

// File Upload Handling
let fileUploadInitialized = false;

function initializeFileUpload() {
    console.log('🔧 Initializing file upload...');
    
    // Prevent duplicate initialization
    if (fileUploadInitialized) {
        console.log('⚠️ File upload already initialized, skipping...');
        return;
    }
    
    const fileInput = elements.fileUpload;
    const uploadArea = elements.fileUploadArea;
    
    // Check if DOM elements exist
    if (!fileInput) {
        console.error('❌ File input element not found (id: workflow-file)');
        Utils.showToast('File upload initialization failed - missing file input', 'error');
        return;
    }
    
    if (!uploadArea) {
        console.error('❌ Upload area element not found (id: file-upload-area)');
        Utils.showToast('File upload initialization failed - missing upload area', 'error');
        return;
    }
    
    console.log('✅ File upload DOM elements found');
    
    try {
        let lastClickTime = 0;
        const debounceDelay = 500; // 500ms debounce
        
        // No click handler on upload area - file input handles clicks directly
        // The file input is positioned to cover the entire upload area
        console.log('📁 File input will handle clicks directly (no programmatic triggering)');
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            console.log('📂 File dragged over upload area');
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            console.log('📂 File dragged away from upload area');
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            console.log(`📂 Files dropped: ${files.length} file(s)`);
            if (files.length > 0) {
                console.log(`📂 Processing dropped file: ${files[0].name}`);
                handleFileUpload(files[0]);
            }
        });
        
        // Add click listener to file input for debugging
        fileInput.addEventListener('click', (e) => {
            console.log('📁 File input clicked directly!', e);
        });

        // File input change with enhanced logging
        fileInput.addEventListener('change', (e) => {
            console.log(`📁 File input changed: ${e.target.files.length} file(s)`);
            console.log('📁 File input element:', e.target);
            console.log('📁 Files object:', e.target.files);
            
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                console.log(`📁 Processing selected file: ${file.name}`, {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: new Date(file.lastModified)
                });
                handleFileUpload(file);
            } else {
                console.warn('⚠️ No files selected from file input');
            }
        });
        
        console.log('✅ File upload event listeners attached successfully');
        fileUploadInitialized = true;
    } catch (error) {
        console.error('❌ Error setting up file upload event listeners:', error);
        Utils.showToast('File upload initialization failed', 'error');
    }
}

// Handle file upload
function handleFileUpload(file) {
    console.log('📄 handleFileUpload called with file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
    });
    
    const status = elements.uploadStatus;
    
    // Check if status element exists
    if (!status) {
        console.error('❌ Upload status element not found (id: upload-status)');
        Utils.showToast('Upload failed - status display not found', 'error');
        return;
    }
    
    // Validate file type
    console.log(`🔍 Validating file type for: ${file.name}`);
    if (!file.name.toLowerCase().endsWith('.json')) {
        console.log('❌ File validation failed: not a JSON file');
        status.textContent = 'Please select a JSON file';
        status.className = 'upload-status error';
        Utils.showToast('Only JSON files are supported', 'error');
        return;
    }
    
    // Validate file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    console.log(`🔍 Validating file size: ${file.size} bytes (max: ${maxSize})`);
    if (file.size > maxSize) {
        console.log('❌ File validation failed: too large');
        status.textContent = 'File too large (max 10MB)';
        status.className = 'upload-status error';
        Utils.showToast('File size exceeds 10MB limit', 'error');
        return;
    }
    
    // Show detailed loading status
    const loadingMessage = `Loading ${file.name} (${Utils.formatFileSize(file.size)})...`;
    console.log(`⏳ ${loadingMessage}`);
    status.textContent = loadingMessage;
    status.className = 'upload-status';
    
    // Read file
    const reader = new FileReader();
    
    reader.onload = (e) => {
        console.log('📖 File read completed, processing content...');
        try {
            const jsonText = e.target.result;
            console.log(`📝 File content length: ${jsonText.length} characters`);
            
            // Basic JSON validation
            console.log('🔍 Validating JSON syntax...');
            if (!Utils.isValidJSON(jsonText)) {
                throw new Error('Invalid JSON format - check for syntax errors');
            }
            console.log('✅ JSON syntax is valid');
            
            const workflowData = JSON.parse(jsonText);
            console.log('📊 Parsed JSON data:', Object.keys(workflowData));
            
            // ComfyUI workflow validation
            console.log('🔍 Validating ComfyUI workflow structure...');
            const validation = Utils.validateComfyUIWorkflow(workflowData);
            console.log('📊 Validation result:', validation);
            
            if (!validation.isValid) {
                const errorMessage = validation.errors.join(', ');
                throw new Error(`Invalid ComfyUI workflow: ${errorMessage}`);
            }
            
            // Store workflow data
            AppState.workflowData = workflowData;
            console.log('💾 Workflow data stored in AppState');
            
            // Parse metadata using the new MetadataParser
            console.log('🔍 Parsing workflow metadata...');
            const metadata = metadataParser.parseWorkflowMetadata(workflowData);
            const normalizedMetadata = metadataParser.normalizeMetadata(metadata);
            
            // Store metadata in AppState
            AppState.workflowMetadata = normalizedMetadata;
            console.log('💾 Workflow metadata stored in AppState:', normalizedMetadata);
            
            // Build detailed success message
            let successMessage = `✓ ${file.name} loaded successfully`;
            if (validation.nodeCount > 0) {
                successMessage += ` (${validation.nodeCount} nodes)`;
            }
            
            status.textContent = successMessage;
            status.className = 'upload-status success';
            console.log(`✅ ${successMessage}`);
            
            // Show success toast with node information
            const nodeInfo = [];
            if (validation.foundNodes.ksampler) nodeInfo.push('KSampler');
            if (validation.foundNodes.emptyLatentImage) nodeInfo.push('EmptyLatentImage');
            if (validation.foundNodes.clipTextEncode) nodeInfo.push('CLIPTextEncode');
            
            const toastMessage = nodeInfo.length > 0 
                ? `Workflow loaded with ${nodeInfo.join(', ')} nodes`
                : 'Workflow loaded successfully';
            
            Utils.showToast(toastMessage, 'success');
            console.log(`🎉 ${toastMessage}`);
            
            // Show warnings if any
            if (validation.warnings.length > 0) {
                console.log('⚠️ Validation warnings:', validation.warnings);
                setTimeout(() => {
                    validation.warnings.forEach(warning => {
                        Utils.showToast(`⚠️ ${warning}`, 'info');
                    });
                }, 1000);
            }
            
            // Extract and populate parameters from workflow
            console.log('🔄 Starting parameter extraction...');
            const extractedParams = Utils.extractWorkflowParameters(workflowData);
            Utils.populateFormParameters(extractedParams);
            console.log('✅ Parameter extraction and population completed');
            
        } catch (error) {
            console.error('❌ File upload error:', error);
            
            let errorMessage = error.message;
            
            // Provide specific error guidance
            if (errorMessage.includes('JSON')) {
                errorMessage += '. Please check your JSON syntax using a validator.';
            } else if (errorMessage.includes('ComfyUI workflow')) {
                errorMessage += '. Please ensure this is a valid ComfyUI workflow export.';
            }
            
            status.textContent = `Error: ${errorMessage}`;
            status.className = 'upload-status error';
            Utils.showToast('Failed to load workflow file', 'error');
            
            // Clear invalid data
            AppState.workflowData = null;
            AppState.workflowMetadata = null;
        }
    };
    
    reader.onerror = (error) => {
        console.error('❌ FileReader error:', error);
        status.textContent = 'Error reading file';
        status.className = 'upload-status error';
        Utils.showToast('File could not be read', 'error');
        AppState.workflowData = null;
        AppState.workflowMetadata = null;
    };
    
    console.log('📖 Starting file read...');
    reader.readAsText(file);
}

// Connection Testing
function initializeConnectionTest() {
    elements.testConnection.addEventListener('click', async () => {
        const url = elements.apiUrl.value.trim();
        const indicator = elements.connectionStatus.querySelector('.status-indicator');
        const statusText = elements.connectionStatus.querySelector('.status-text');
        
        // Validate URL format
        if (!url) {
            Utils.showToast('Please enter an API URL', 'error');
            return;
        }
        
        // Ensure URL has protocol
        let testUrl = url;
        if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
            testUrl = 'http://' + testUrl;
            elements.apiUrl.value = testUrl; // Update the input field
        }
        
        // Update UI
        elements.testConnection.textContent = 'Testing...';
        elements.testConnection.disabled = true;
        statusText.textContent = 'Testing connection...';
        indicator.dataset.status = 'unknown';
        
        console.log(`🔍 Testing connection to: ${testUrl}`);
        console.log(`📊 Current state - AppState.isConnected: ${AppState.isConnected}, WebSocket: ${AppState.websocket ? AppState.websocket.getState() : 'not initialized'}`);
        
        // Check browser compatibility
        const hasAbortSignalTimeout = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal;
        console.log(`🌐 Browser compatibility: AbortSignal.timeout ${hasAbortSignalTimeout ? 'supported' : 'not supported, using manual AbortController'}`);
        
        // Create fail-safe timeout to ensure button is never permanently stuck
        const failSafeTimeout = setTimeout(() => {
            console.error('🚨 Connection test fail-safe timeout reached (30s)');
            elements.testConnection.textContent = 'Test';
            elements.testConnection.disabled = false;
            statusText.textContent = 'Connection test timed out';
            indicator.dataset.status = 'disconnected';
            Utils.showToast('Connection test timed out - please try again', 'error');
        }, 30000); // 30 second fail-safe

        try {
            // Test official ComfyUI endpoints in order of reliability
            const endpoints = [
                { path: '/history', name: 'History API' },
                { path: '/queue', name: 'Queue API' },
                { path: '/prompt', name: 'Prompt API' }
            ];
            
            let response = null;
            let lastError = null;
            let successfulEndpoint = null;
            
            for (const endpoint of endpoints) {
                try {
                    console.log(`🔍 Testing ComfyUI ${endpoint.name}: ${testUrl}${endpoint.path}`);
                    
                    // Create manual AbortController for cross-browser compatibility
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => {
                        console.log(`⏱️ Timing out ${endpoint.name} after 3 seconds`);
                        controller.abort();
                    }, 3000); // 3 second timeout (reduced for better UX)
                    
                    console.log(`📡 Sending request to ${testUrl}${endpoint.path}...`);
                    const startTime = Date.now();
                    
                    response = await fetch(`${testUrl}${endpoint.path}`, {
                        method: 'GET',
                        signal: controller.signal, // Manual timeout for browser compatibility
                        mode: 'cors',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const duration = Date.now() - startTime;
                    clearTimeout(timeoutId); // Clear timeout on successful response
                    
                    console.log(`📊 ${endpoint.name} response (${duration}ms):`, response.status, response.statusText);
                    console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));
                    
                    if (response.ok) {
                        successfulEndpoint = endpoint;
                        console.log(`✅ Success with ${endpoint.name}`);
                        break;
                    } else if (response.status === 405) {
                        // Method not allowed - endpoint exists but wrong method
                        console.log(`${endpoint.name} exists but method not allowed`);
                        successfulEndpoint = endpoint;
                        break;
                    }
                } catch (endpointError) {
                    console.log(`❌ ${endpoint.name} failed:`, endpointError.message);
                    lastError = endpointError;
                    
                    // Clear the timeout for this specific endpoint
                    clearTimeout(timeoutId);
                    
                    // Check if it's a timeout/abort error
                    if (endpointError.name === 'AbortError') {
                        console.log('Request timed out after 5 seconds');
                        lastError.message = 'Connection timeout (5s)';
                    }
                    
                    // Check if it's a CORS error
                    if (endpointError.message.includes('CORS') || 
                        endpointError.message.includes('NetworkError') ||
                        endpointError.name === 'TypeError') {
                        // This might be CORS blocking
                        console.log('Possible CORS issue detected');
                        lastError.possibleCors = true;
                    }
                }
            }
            
            if (response && (response.ok || response.status === 405) && successfulEndpoint) {
                // Verify it's ComfyUI by checking response structure
                let isComfyUI = false;
                try {
                    if (response.ok) {
                        const data = await response.json();
                        console.log('ComfyUI response data:', data);
                        
                        // Check if response looks like ComfyUI
                        if (successfulEndpoint.path === '/history' && 
                            (typeof data === 'object' || Array.isArray(data))) {
                            isComfyUI = true;
                        } else if (successfulEndpoint.path === '/queue' && 
                                 data && (data.queue_running !== undefined || data.queue_pending !== undefined)) {
                            isComfyUI = true;
                        } else {
                            isComfyUI = true; // Assume it's ComfyUI if we get any JSON response
                        }
                    } else {
                        // 405 Method Not Allowed means endpoint exists
                        isComfyUI = true;
                    }
                } catch (jsonError) {
                    console.log('Response not JSON, but endpoint responded');
                    isComfyUI = true; // Endpoint responded, likely ComfyUI
                }
                
                if (isComfyUI) {
                    AppState.isConnected = true;
                    AppState.apiEndpoint = testUrl;
                    localStorage.setItem('comfyui_endpoint', testUrl);
                    
                    // Update InterruptService endpoint
                    if (AppState.interruptService) {
                        AppState.interruptService.setApiEndpoint(testUrl);
                    }
                    
                    indicator.dataset.status = 'connected';
                    statusText.textContent = 'Connected to ComfyUI';
                    Utils.showToast(`Connected to ComfyUI via ${successfulEndpoint.name}`, 'success');
                    
                    console.log('✅ Connection test completed successfully');
                    console.log('✅ ComfyUI connection verified!');
                } else {
                    throw new Error('Server responded but does not appear to be ComfyUI');
                }
            } else {
                // Try WebSocket as fallback
                console.log('🔄 HTTP endpoints failed, trying WebSocket fallback...');
                statusText.textContent = 'Trying WebSocket...';
                
                try {
                    await Utils.testWebSocketConnection(testUrl);
                    
                    AppState.isConnected = true;
                    AppState.apiEndpoint = testUrl;
                    localStorage.setItem('comfyui_endpoint', testUrl);
                    
                    // Update InterruptService endpoint
                    if (AppState.interruptService) {
                        AppState.interruptService.setApiEndpoint(testUrl);
                    }
                    
                    indicator.dataset.status = 'connected';
                    statusText.textContent = 'Connected via WebSocket';
                    Utils.showToast('Connected to ComfyUI via WebSocket (CORS may be blocking HTTP)', 'success');
                    console.log('✅ ComfyUI WebSocket connection successful!');
                } catch (wsError) {
                    console.log('❌ WebSocket also failed:', wsError.message);
                    throw lastError || new Error(`All connection methods failed`);
                }
            }
        } catch (error) {
            console.error('Connection failed:', error);
            AppState.isConnected = false;
            indicator.dataset.status = 'disconnected';
            
            // Provide detailed error messages with solutions
            let errorMessage = 'Connection failed';
            let detailedMessage = error.message;
            let solution = '';
            
            if (error.name === 'AbortError' || error.message.includes('timeout')) {
                errorMessage = 'Connection timeout';
                detailedMessage = 'Request timed out after 3 seconds';
                solution = 'Check if ComfyUI is running and accessible';
                console.log('⏱️ Timeout handled by manual AbortController (cross-browser compatible)');
            } else if (error.possibleCors || 
                       error.message.includes('CORS') ||
                       error.message.includes('NetworkError') ||
                       error.name === 'TypeError') {
                errorMessage = '🚫 CORS Issue Detected';
                detailedMessage = 'Cross-origin request blocked by browser';
                solution = `To fix this:\n1. Restart ComfyUI with: python main.py --enable-cors-header\n2. Or add --cors-enable flag to your ComfyUI startup command`;
                
                // Show detailed CORS help
                setTimeout(() => {
                    Utils.showToast('💡 CORS Solution: Restart ComfyUI with --enable-cors-header flag', 'info');
                }, 2000);
            } else if (error.message.includes('Failed to fetch') || 
                      error.message.includes('ERR_CONNECTION_REFUSED')) {
                errorMessage = 'Cannot reach ComfyUI';
                detailedMessage = 'Server is not responding';
                solution = `Check:\n1. ComfyUI is running at ${testUrl}\n2. IP address and port are correct\n3. No firewall blocking the connection`;
            } else if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
                errorMessage = 'Invalid address';
                detailedMessage = 'Cannot resolve hostname';
                solution = 'Verify the IP address is correct';
            }
            
            statusText.textContent = errorMessage;
            
            // Show comprehensive error message
            if (solution) {
                Utils.showToast(`${errorMessage}: ${detailedMessage}\n\n${solution}`, 'error');
            } else {
                Utils.showToast(`${errorMessage}: ${detailedMessage}`, 'error');
            }
            
            // Log detailed error for debugging
            console.log('🔍 Connection Error Details:', {
                name: error.name,
                message: error.message,
                possibleCors: error.possibleCors,
                url: testUrl,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            });
            
            // Additional CORS debugging
            if (error.possibleCors) {
                console.log('🛠️ CORS Troubleshooting:');
                console.log('1. ComfyUI Command: python main.py --enable-cors-header');
                console.log('2. Alternative: python main.py --cors-enable');
                console.log('3. Check ComfyUI startup logs for CORS headers');
            }
        } finally {
            // Clear the fail-safe timeout since we're handling cleanup properly
            clearTimeout(failSafeTimeout);
            
            elements.testConnection.textContent = 'Test';
            elements.testConnection.disabled = false;
        }
    });
    
    // Auto-save endpoint on change
    elements.apiUrl.addEventListener('blur', () => {
        const url = elements.apiUrl.value.trim();
        if (url && url !== AppState.apiEndpoint) {
            localStorage.setItem('comfyui_endpoint', url);
        }
    });
}

// Error Classification for Task 10
function classifyError(error) {
    const message = error.message.toLowerCase();
    
    // Timeout errors
    if (message.includes('aborted') || message.includes('timeout')) {
        return {
            title: 'Request Timeout',
            details: 'The request to ComfyUI took too long to complete',
            suggestions: [
                'Check if ComfyUI is running and responding',
                'Verify your network connection is stable',
                'Try a simpler workflow to test connectivity',
                'Consider increasing timeout settings if using complex workflows'
            ],
            type: 'timeout'
        };
    }
    
    // Network and connection errors
    if (message.includes('failed to fetch') || message.includes('network error')) {
        return {
            title: 'Connection Lost',
            details: 'Unable to connect to ComfyUI server',
            suggestions: [
                'Check if ComfyUI is running at the configured endpoint',
                'Verify your network connection',
                'Ensure CORS headers are enabled in ComfyUI (--enable-cors-header)',
                'Try refreshing the page and reconnecting'
            ],
            type: 'network'
        };
    }
    
    // HTTP status errors - Enhanced error messages
    if (message.includes('http 400')) {
        let details = 'The workflow contains invalid parameters or missing nodes';
        let suggestions = [
            'Check that all required nodes are present in your workflow',
            'Verify parameter values are within valid ranges',
            'Try uploading a different workflow file',
            'Check ComfyUI console for detailed validation errors'
        ];
        
        // Try to provide more specific error information
        if (message.includes('missing')) {
            details = 'Required nodes or connections are missing from the workflow';
            suggestions = [
                'Ensure all nodes referenced in the workflow are present',
                'Check for broken connections between nodes',
                'Verify that all required custom nodes are installed',
                'Try regenerating the workflow from ComfyUI'
            ];
        } else if (message.includes('invalid') || message.includes('error')) {
            details = 'Parameter values are outside valid ranges or incompatible';
            suggestions = [
                'Check if seed value is within valid range (-2,147,483,648 to 2,147,483,647)',
                'Verify image dimensions are appropriate (e.g., 512x512, 1024x1024)',
                'Ensure CFG scale is reasonable (typically 1-20)',
                'Check that steps count is appropriate (typically 20-150)',
                'Verify prompt length is not too long'
            ];
        }
        
        return {
            title: 'Invalid Workflow Configuration',
            details: details,
            suggestions: suggestions,
            type: 'validation'
        };
    }
    
    if (message.includes('http 401') || message.includes('unauthorized')) {
        return {
            title: 'Authorization Failed',
            details: 'Access denied to ComfyUI API',
            suggestions: [
                'Check if ComfyUI requires authentication',
                'Verify API key configuration if applicable',
                'Contact system administrator for access'
            ],
            type: 'auth'
        };
    }
    
    if (message.includes('http 404')) {
        return {
            title: 'API Endpoint Not Found',
            details: 'ComfyUI API endpoint is not available',
            suggestions: [
                'Verify the API URL is correct',
                'Check if ComfyUI is running on the specified port',
                'Ensure you\'re using the correct ComfyUI version'
            ],
            type: 'endpoint'
        };
    }
    
    if (message.includes('http 500') || message.includes('internal server error')) {
        return {
            title: 'ComfyUI Server Error',
            details: 'Internal error occurred in ComfyUI',
            suggestions: [
                'Check ComfyUI console output for detailed error messages',
                'Verify all required models and nodes are installed',
                'Try restarting ComfyUI',
                'Check system resources (memory, disk space, GPU)'
            ],
            type: 'server'
        };
    }
    
    if (message.includes('http 503') || message.includes('service unavailable')) {
        return {
            title: 'ComfyUI Temporarily Unavailable',
            details: 'ComfyUI server is overloaded or restarting',
            suggestions: [
                'Wait a few moments and try again',
                'Check if ComfyUI is processing other requests',
                'Verify system resources are not exhausted'
            ],
            type: 'overload'
        };
    }
    
    // Timeout errors
    if (message.includes('timeout') || message.includes('aborted')) {
        return {
            title: 'Generation Timed Out',
            details: 'The generation process took too long to complete',
            suggestions: [
                'Try reducing image dimensions or batch size',
                'Check if ComfyUI has sufficient system resources',
                'Verify the workflow doesn\'t contain computationally expensive nodes',
                'Consider increasing timeout settings if appropriate'
            ],
            type: 'timeout'
        };
    }
    
    // JSON parsing errors
    if (message.includes('json') || message.includes('parse')) {
        return {
            title: 'Invalid Response Format',
            details: 'ComfyUI returned invalid or corrupted data',
            suggestions: [
                'Try the request again',
                'Check ComfyUI console for error messages',
                'Verify ComfyUI is running the expected version'
            ],
            type: 'parsing'
        };
    }
    
    // Model or resource errors
    if (message.includes('model') || message.includes('checkpoint') || message.includes('out of memory')) {
        return {
            title: 'Resource or Model Error',
            details: 'Missing models or insufficient system resources',
            suggestions: [
                'Ensure all required models are downloaded and available',
                'Check available GPU memory and system RAM',
                'Try reducing batch size or image dimensions',
                'Verify model paths in ComfyUI configuration'
            ],
            type: 'resources'
        };
    }
    
    // Generic workflow errors
    if (message.includes('node') || message.includes('workflow')) {
        return {
            title: 'Workflow Execution Error',
            details: 'Error occurred while processing the workflow',
            suggestions: [
                'Check the workflow for missing or incompatible nodes',
                'Verify all node connections are valid',
                'Try testing with a simpler workflow first',
                'Check ComfyUI logs for specific node errors'
            ],
            type: 'workflow'
        };
    }
    
    // Default fallback
    return {
        title: 'Generation Failed',
        details: error.message || 'An unexpected error occurred',
        suggestions: [
            'Try the operation again',
            'Check ComfyUI console for detailed error information',
            'Verify all settings and try with default values',
            'Report the issue if it persists'
        ],
        type: 'unknown'
    };
}

// Generation Functions (Task 6)
async function generateImages(workflowData) {
    try {
        // Prevent multiple simultaneous generations
        if (AppState.isGenerating) {
            Utils.showToast('Generation already in progress', 'info');
            return;
        }

        AppState.isGenerating = true;
        setGenerationLoadingState(true);
        
        // Update generation state
        GenerationStateManager.setState('starting', { 
            source: 'generateImages', 
            timestamp: Date.now() 
        });
        
        // Reset progress bar for new generation
        if (AppState.progressBar) {
            AppState.progressBar.clearError();
            AppState.progressBar.startGeneration(workflowData);
        }
        
        // Show real-time status container (contains progress bar)
        if (elements.realtimeStatus) {
            elements.realtimeStatus.style.display = 'block';
        }
        
        // Clear results area to remove any previous content
        if (elements.resultsArea) {
            elements.resultsArea.innerHTML = '';
        }
        
        Utils.showToast('Starting image generation...', 'info');
        console.log('🎨 Starting image generation process');

        // Submit workflow to ComfyUI
        const submitResult = await Utils.submitToComfyUI(workflowData);
        
        if (!submitResult.success) {
            throw new Error('Failed to submit workflow to ComfyUI');
        }

        const { promptId, node_errors } = submitResult;
        
        // Check for node errors
        if (Object.keys(node_errors).length > 0) {
            console.warn('⚠️ Node errors detected:', node_errors);
            Utils.showToast('Some workflow nodes had warnings - generation may be affected', 'warning');
        }

        Utils.showToast(`Workflow submitted! Prompt ID: ${promptId}`, 'success');
        console.log(`📝 Prompt submitted with ID: ${promptId}`);

        // Don't update results area during generation - let progress bar show instead
        // updateGenerationProgress('Generating images...', 'This may take several minutes');

        // Poll for results
        const pollResult = await Utils.pollForResults(promptId);
        
        if (!pollResult.success) {
            throw new Error(pollResult.error || 'Generation failed');
        }

        console.log('🖼️ Generation completed successfully:', pollResult);
        
        // Extract and display images
        console.log('📊 Poll result outputs:', pollResult.outputs);
        const imageUrls = Utils.extractImageUrls(pollResult.outputs);
        
        if (imageUrls.length === 0) {
            console.error('❌ No images found in outputs. Full poll result:', pollResult);
            throw new Error('No images were generated');
        }

        displayGeneratedImages(imageUrls, pollResult.metadata);
        Utils.showToast(`Successfully generated ${imageUrls.length} image(s)!`, 'success');
        
        // Update generation state to idle (completed)
        GenerationStateManager.setState('idle', { 
            source: 'generation-complete', 
            imageCount: imageUrls.length,
            timestamp: Date.now()
        });
        
        // Complete progress bar
        if (AppState.progressBar) {
            AppState.progressBar.stopFallbackProgress();
            AppState.progressBar.updateProgress(100, 100); // Force completion
        }
        
        // Hide real-time status after a delay
        setTimeout(() => {
            hideRealtimeStatus();
        }, 3000);

    } catch (error) {
        console.error('❌ Generation failed:', error);
        
        // Check if this is a cancellation error that should not show error screen
        if (isCancellationInProgress) {
            console.log('🛑 Generation error during cancellation - suppressing error screen');
            console.log('🛑 Cancellation flag was true, clearing and returning early');
            isCancellationInProgress = false;
            return;
        }
        
        // Debug: Log that this is a real error, not cancellation
        console.log('🛑 Real generation error (not cancellation):', error);
        console.log('🛑 isCancellationInProgress was:', isCancellationInProgress);
        
        // Task 10: Enhanced error classification and user-friendly messages
        const errorClassification = classifyError(error);
        const errorMessage = errorClassification.title;
        const errorDetails = errorClassification.details;
        const suggestions = errorClassification.suggestions;
        
        Utils.showToast(`${errorMessage}: ${errorDetails}`, 'error');
        showGenerationError(errorClassification);
        
        // Set progress bar to error state
        if (AppState.progressBar) {
            AppState.progressBar.setError();
        }
        
    } finally {
        AppState.isGenerating = false;
        setGenerationLoadingState(false);
        hideRealtimeStatus();
        
        // Reset generation state to idle
        GenerationStateManager.setState('idle', { 
            source: 'generateImages-finally', 
            timestamp: Date.now() 
        });
        
        // Progress bar will auto-hide after completion
        // or set error state if there was an error
    }
}

function setGenerationLoadingState(isLoading) {
    const generateButton = elements.generateButton;
    
    if (isLoading) {
        generateButton.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <div class="loading-spinner"></div>
                <span>Generating...</span>
            </div>
        `;
        generateButton.disabled = true;
        generateButton.classList.add('loading');
        
        // Show cancel button when generation starts
        setCancelButtonState('enabled', 'generate-button');
    } else {
        generateButton.innerHTML = 'Generate';
        generateButton.disabled = false;
        generateButton.classList.remove('loading');
        
        // Hide cancel button when generation ends
        setCancelButtonState('hidden', 'generate-button');
    }
}

function updateGenerationProgress(status, details) {
    const progressHtml = `
        <div class="generation-progress">
            <div class="progress-header">
                <div class="loading-spinner"></div>
                <h3>${status}</h3>
            </div>
            <p class="progress-details">${details}</p>
        </div>
    `;
    
    elements.resultsArea.innerHTML = progressHtml;
}

function displayGeneratedImages(imageUrls, metadata = null) {
    const imageCount = imageUrls.length;
    const imagesHtml = imageUrls.map((imageData, index) => `
        <div class="generated-image-container">
            <div class="image-header">
                <span class="image-index">Image ${index + 1} of ${imageCount}</span>
                <button class="download-button" onclick="downloadImage('${imageData.url}', '${imageData.filename}')">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" />
                    </svg>
                    Open
                </button>
            </div>
            <img src="${imageData.url}" alt="Generated image ${index + 1}" class="generated-image" loading="lazy" onclick="expandImage('${imageData.url}', '${imageData.filename}')" />
            <div class="image-info">
                <span class="filename">${imageData.filename}</span>
            </div>
        </div>
    `).join('');
    
    // Generate metadata panel HTML if metadata is available
    const metadataHtml = metadata ? `
        <div class="metadata-container">
            ${metadataPanel.generatePanelHTML(metadata, { 
                panelId: 'generation-metadata-panel',
                showTitle: true 
            })}
        </div>
    ` : '';
    
    elements.resultsArea.innerHTML = `
        <div class="results-header">
            <h3>Generated Images (${imageCount})</h3>
            <button id="download-all" class="secondary-button" onclick="downloadAllImages()">Open All</button>
        </div>
        <div class="images-grid">
            ${imagesHtml}
        </div>
        ${metadataHtml}
    `;
    
    // Enable clear results button
    elements.clearResults.disabled = false;
    
    // Store image URLs for download functionality
    window.generatedImages = imageUrls;
}

function showGenerationError(errorClassification) {
    // Task 10: Enhanced error display with suggestions
    const suggestionsHtml = errorClassification.suggestions.map(suggestion => 
        `<li>${suggestion}</li>`
    ).join('');
    
    const errorHtml = `
        <div class="generation-error">
            <div class="error-icon">
                <svg viewBox="0 0 24 24" width="48" height="48">
                    <path fill="currentColor" d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z" />
                </svg>
            </div>
            <h3>${errorClassification.title}</h3>
            <p class="error-message">${errorClassification.details}</p>
            
            <div class="error-suggestions">
                <h4>Suggestions to resolve this issue:</h4>
                <ul>
                    ${suggestionsHtml}
                </ul>
            </div>
            
            <div class="error-actions">
                <button class="primary-button" onclick="clearErrorAndRetry()">Try Again</button>
                <button class="secondary-button" onclick="clearErrorDisplay()">Clear Error</button>
            </div>
        </div>
    `;
    
    elements.resultsArea.innerHTML = errorHtml;
}

// Error Recovery Functions
window.clearErrorAndRetry = function() {
    // Clear any validation errors
    Validation.clearValidationErrors();
    
    // Reset the results area to empty state
    elements.resultsArea.innerHTML = `
        <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" width="48" height="48">
                <path fill="currentColor" d="M21,17H7V3A1,1 0 0,1 8,2H20A1,1 0 0,1 21,3V17M19,19H5V5H3V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19H19M11,6H18V8H11V6M11,10H18V12H11V10M11,14H18V16H11V14Z" />
            </svg>
            <p class="empty-text">Upload a workflow and click Generate to see results here</p>
        </div>
    `;
    
    // Show helpful message
    Utils.showToast('Error cleared - ready to try again', 'info');
    
    // Focus on the generate button
    if (elements.generateButton) {
        elements.generateButton.focus();
    }
};

window.clearErrorDisplay = function() {
    // Clear any validation errors
    Validation.clearValidationErrors();
    
    // Reset the results area to empty state
    elements.resultsArea.innerHTML = `
        <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" width="48" height="48">
                <path fill="currentColor" d="M21,17H7V3A1,1 0 0,1 8,2H20A1,1 0 0,1 21,3V17M19,19H5V5H3V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19H19M11,6H18V8H11V6M11,10H18V12H11V10M11,14H18V16H11V14Z" />
            </svg>
            <p class="empty-text">Upload a workflow and click Generate to see results here</p>
        </div>
    `;
    
    Utils.showToast('Error cleared', 'info');
};

// Download Functions
window.downloadImage = function(url, filename) {
    // Open image in new window/tab instead of downloading
    window.open(url, '_blank');
    Utils.showToast(`Opening ${filename} in new window`, 'success');
};

window.downloadAllImages = function() {
    if (window.generatedImages && window.generatedImages.length > 0) {
        window.generatedImages.forEach((imageData, index) => {
            setTimeout(() => {
                downloadImage(imageData.url, imageData.filename);
            }, index * 200); // Stagger window opening (reduced delay)
        });
        Utils.showToast(`Opening ${window.generatedImages.length} images in new windows`, 'success');
    }
};

// Image Modal Functions
window.expandImage = function(url, filename) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('image-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'image-modal';
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="closeImageModal()">&times;</button>
                <img class="expanded-image" src="" alt="" />
                <div class="modal-info">
                    <div class="modal-filename"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Close modal when clicking outside the image
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeImageModal();
            }
        });
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeImageModal();
            }
        });
    }
    
    // Update modal content
    const modalImage = modal.querySelector('.expanded-image');
    const modalFilename = modal.querySelector('.modal-filename');
    
    modalImage.src = url;
    modalImage.alt = `Expanded view of ${filename}`;
    modalFilename.textContent = filename;
    
    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
};

window.closeImageModal = function() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
};

// Form Submission
function initializeFormSubmission() {
    elements.workflowForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!AppState.workflowData) {
            Utils.showToast('Please upload a workflow file first', 'error');
            return;
        }
        
        if (!AppState.isConnected) {
            // Check if WebSocket is connected as fallback
            const wsConnected = AppState.websocket && AppState.websocket.isConnected();
            if (wsConnected) {
                console.log('💡 HTTP test failed but WebSocket is connected - allowing generation');
                Utils.showToast('Using WebSocket connection for generation', 'info');
            } else {
                Utils.showToast('Please test API connection first', 'error');
                return;
            }
        }
        
        // Task 10: Comprehensive validation before submission
        console.log('🔍 Validating all form fields...');
        const validation = Validation.validateAllFields();
        
        if (!validation.isValid) {
            console.warn('❌ Form validation failed:', validation.errors);
            Validation.showValidationErrors(validation.errors);
            return;
        }
        
        // Additional workflow-specific validation
        const workflowValidation = Validation.validateWorkflowCompatibility(AppState.workflowData);
        if (!workflowValidation.isValid) {
            console.warn('❌ Workflow validation failed:', workflowValidation.errors);
            Utils.showToast(`Workflow validation failed: ${workflowValidation.errors.join(', ')}`, 'error');
            return;
        }
        
        console.log('✅ All form fields and workflow validated successfully');
        Validation.clearValidationErrors();
        
        // Auto-generate seed if Random checkbox is checked
        if (elements.randomSeedCheckbox && elements.randomSeedCheckbox.checked) {
            const randomSeed = SeedUtils.generateRandomSeed();
            if (elements.seedInput) {
                elements.seedInput.value = randomSeed;
                SeedUtils.updateSeedDisplay(randomSeed);
                console.log(`🎲 Auto-generated random seed: ${randomSeed}`);
            }
        }
        
        // Collect current form data
        const formData = Utils.collectFormData();
        if (!formData) {
            Utils.showToast('Failed to collect form data', 'error');
            return;
        }
        
        // Modify workflow with current form values
        console.log('🔄 Starting workflow modification...');
        const modifiedWorkflow = Utils.modifyWorkflowParameters(AppState.workflowData, formData);
        
        if (!modifiedWorkflow) {
            Utils.showToast('Failed to modify workflow parameters', 'error');
            return;
        }
        
        // Store modified workflow for API submission
        AppState.modifiedWorkflowData = modifiedWorkflow;
        
        console.log('✅ Workflow modification completed successfully');
        
        // Start generation process (Task 6)
        generateImages(modifiedWorkflow);
    });
}

// Clear Results
function initializeClearResults() {
    elements.clearResults.addEventListener('click', () => {
        elements.resultsArea.innerHTML = `
            <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" width="48" height="48">
                    <path fill="currentColor" d="M21,17H7V3A1,1 0 0,1 8,2H20A1,1 0 0,1 21,3V17M19,19H5V5H3V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19H19M11,6H18V8H11V6M11,10H18V12H11V10M11,14H18V16H11V14Z" />
                </svg>
                <p class="empty-text">Upload a workflow and click Generate to see results here</p>
            </div>
        `;
        elements.clearResults.disabled = true;
        Utils.showToast('Results cleared', 'success');
    });
}

// Cancel Button
function initializeCancelButton() {
    if (!elements.cancelButton) {
        console.warn('❌ Cancel button element not found (id: cancel-button)');
        return;
    }
    
    // Initialize cancel button as hidden
    setCancelButtonState('hidden', 'initialize');
    
    elements.cancelButton.addEventListener('click', async () => {
        if (!AppState.isGenerating) {
            console.log('🛑 No generation in progress to cancel');
            return;
        }
        
        try {
            console.log('🛑 Cancelling generation...');
            
            // Set cancellation in progress flag
            isCancellationInProgress = true;
            console.log('🛑 Set isCancellationInProgress = true');
            
            // Set button to loading state
            setCancelButtonState('loading', 'user-click');
            
            // Call ComfyUI interrupt endpoint
            const success = await ComfyUIAPI.interrupt();
            
            if (success) {
                console.log('✅ Generation cancelled successfully');
                Utils.showToast('Generation cancelled successfully', 'success');
                
                // Update app state
                AppState.isGenerating = false;
                setGenerationLoadingState(false);
                hideRealtimeStatus();
                
                // Hide cancel button
                setCancelButtonState('hidden', 'cancellation-success');
                
                // Don't clear cancellation flag yet - wait for WebSocket events
                // The flag will be cleared by the WebSocket execution_error handler
                console.log('🛑 Cancellation successful, keeping flag for WebSocket events');
                
                // Safety timeout to clear flag in case WebSocket event doesn't come
                setTimeout(() => {
                    if (isCancellationInProgress) {
                        console.log('🛑 Timeout: clearing cancellation flag after 3 seconds');
                        isCancellationInProgress = false;
                    }
                }, 3000);
            } else {
                console.error('❌ Failed to cancel generation');
                Utils.showToast('Failed to cancel generation - please try again', 'error');
                setCancelButtonState('enabled', 'cancellation-failed');
                
                // Clear cancellation flag on failure
                isCancellationInProgress = false;
            }
            
        } catch (error) {
            console.error('❌ Error cancelling generation:', error);
            
            // Enhanced error messages based on error type
            let errorMessage = 'Error cancelling generation';
            if (error.message.includes('timeout')) {
                errorMessage = 'Cancel request timed out - please try again';
            } else if (error.message.includes('network')) {
                errorMessage = 'Network error while cancelling - check connection';
            } else if (error.message.includes('server')) {
                errorMessage = 'Server error during cancellation - please try again';
            }
            
            Utils.showToast(errorMessage, 'error');
            setCancelButtonState('enabled', 'cancellation-error');
            
            // Clear cancellation flag on error
            isCancellationInProgress = false;
        }
    });
    
    console.log('✅ Cancel button initialized');
}


// Prompt Toolbar
function initializePromptToolbar() {
    const clearButton = document.querySelector('.prompt-toolbar .icon-button');
    const promptTextarea = document.getElementById('positive-prompt');
    
    clearButton.addEventListener('click', () => {
        promptTextarea.value = '';
        promptTextarea.focus();
    });
}

// Initialize Simple Seed Controls
function initializeSeedControls() {
    console.log('🎲 Initializing simple seed controls...');
    
    // Initialize seed display
    if (elements.seedInput) {
        const currentSeed = elements.seedInput.value || 1;
        SeedUtils.updateSeedDisplay(currentSeed);
        
        // Update display when seed input changes
        elements.seedInput.addEventListener('input', () => {
            const seed = elements.seedInput.value || 1;
            SeedUtils.updateSeedDisplay(seed);
        });
        console.log('✅ Seed input initialized');
    }
    
    // Random seed button
    if (elements.randomSeedButton) {
        elements.randomSeedButton.addEventListener('click', () => {
            SeedUtils.setRandomSeed();
        });
        console.log('✅ Random seed button initialized');
    }
    
    // Random seed checkbox
    if (elements.randomSeedCheckbox) {
        elements.randomSeedCheckbox.addEventListener('change', () => {
            const isChecked = elements.randomSeedCheckbox.checked;
            console.log(`🎲 Random seed checkbox ${isChecked ? 'enabled' : 'disabled'}`);
            
            // If checkbox is checked, generate a new random seed immediately
            if (isChecked) {
                SeedUtils.setRandomSeed();
            }
        });
        console.log('✅ Random seed checkbox initialized');
    }
}

// Initialize Application
function initializeApp() {
    console.log('🚀 Initializing ComfyUI JSON Workflow Runner...');
    
    try {
        // Check if critical DOM elements exist
        const criticalElements = [
            { key: 'apiUrl', id: 'api-url' },
            { key: 'fileUpload', id: 'workflow-file' },
            { key: 'fileUploadArea', id: 'file-upload-area' },
            { key: 'uploadStatus', id: 'upload-status' },
            { key: 'toastContainer', id: 'toast-container' }
        ];
        
        let missingElements = [];
        criticalElements.forEach(element => {
            if (!elements[element.key]) {
                missingElements.push(element.id);
                console.error(`❌ Missing critical element: ${element.key} (id: ${element.id})`);
            } else {
                console.log(`✅ Found element: ${element.key}`);
            }
        });
        
        if (missingElements.length > 0) {
            const errorMsg = `Missing DOM elements: ${missingElements.join(', ')}`;
            console.error('❌ Critical initialization error:', errorMsg);
            alert(`Application initialization failed: ${errorMsg}`);
            return;
        }
        
        // Set initial API URL
        if (elements.apiUrl) {
            elements.apiUrl.value = AppState.apiEndpoint;
            console.log(`🔧 Set API URL to: ${AppState.apiEndpoint}`);
        }
        
        // Initialize all components
        console.log('🔧 Initializing components...');
        
        // Initialize navigation manager
        AppState.navigationManager = new NavigationManager();
        console.log('✅ Navigation manager initialized');
        
        initializeSliders();
        initializeFileUpload();
        initializeConnectionTest();
        initializeFormSubmission();
        initializeClearResults();
        initializeCancelButton();
        initializePromptToolbar();
        initializeSeedControls();
        
        // Initialize WebSocket connection
        initializeWebSocket();
        
        // Initialize Interrupt Service
        AppState.interruptService = new InterruptService({
            apiEndpoint: AppState.apiEndpoint,
            timeout: 5000,
            maxRetryAttempts: 3,
            retryDelay: 1000
        });
        
        // Setup Interrupt Service event listeners
        setupInterruptServiceListeners();
        
        // Initialize Generation State Manager
        console.log('🔄 Initializing Generation State Manager...');
        GenerationStateManager.syncWithAppState();
        
        // Initialize Progress Bar Component
        AppState.progressBar = new ProgressBarComponent({
            container: elements.progressContainer,
            progressBar: elements.progressBar,
            progressPercentage: elements.progressPercentage,
            progressStep: elements.progressStep,
            smoothingFactor: 0.15,
            hideDelay: 2000
        });
        
        // Initialize Preset Manager
        console.log('💾 Initializing Preset Manager...');
        presetManager = new PresetManager();
        
        // Show welcome message
        Utils.showToast('ComfyUI Workflow Runner initialized', 'success');
        
        // Try to auto-load last used workflow after initialization
        setTimeout(() => {
            try {
                const autoLoaded = presetManager.autoLoadLastWorkflow();
                if (autoLoaded) {
                    console.log('✅ Auto-loaded last used workflow');
                } else {
                    console.log('ℹ️ No previous workflow to auto-load');
                }
            } catch (error) {
                console.warn('Failed to auto-load workflow:', error);
            }
        }, 100); // Small delay to ensure all components are ready
        
        console.log('✅ Application ready!');
        console.log('📋 Debug: Try uploading a file and check console for detailed logs');
    } catch (error) {
        console.error('❌ Application initialization failed:', error);
        alert(`Application failed to initialize: ${error.message}`);
    }
}

// WebSocket Integration with Application Lifecycle
function initializeWebSocket() {
    console.log('🔌 Initializing WebSocket connection...');
    
    // Create WebSocket service instance
    const wsUrl = AppState.apiEndpoint.replace('http', 'ws') + '/ws';
    AppState.websocket = new WebSocketService({
        url: wsUrl,
        reconnectInterval: 3000,
        maxRetryAttempts: 5
    });
    
    // Subscribe to WebSocket events
    setupWebSocketEventHandlers();
    
    // Start connection
    AppState.websocket.connect();
}

// Centralized Generation State Manager
const GenerationStateManager = {
    // Current generation state
    currentState: 'idle', // 'idle', 'starting', 'generating', 'completing', 'error'
    
    // State change listeners
    stateChangeListeners: [],
    
    // Add state change listener
    onStateChange(callback) {
        this.stateChangeListeners.push(callback);
    },
    
    // Remove state change listener
    offStateChange(callback) {
        const index = this.stateChangeListeners.indexOf(callback);
        if (index > -1) {
            this.stateChangeListeners.splice(index, 1);
        }
    },
    
    // Update generation state
    setState(newState, metadata = {}) {
        if (this.currentState === newState) return;
        
        const oldState = this.currentState;
        this.currentState = newState;
        
        console.log(`🔄 Generation state: ${oldState} → ${newState}`, metadata);
        
        // Notify listeners
        this.stateChangeListeners.forEach(listener => {
            try {
                listener({ oldState, newState, metadata });
            } catch (error) {
                console.error('Error in generation state listener:', error);
            }
        });
        
        // Update button state based on generation state
        this.updateButtonState(newState, metadata);
    },
    
    // Update button state based on generation state
    updateButtonState(state, metadata = {}) {
        const source = `generation-${state}`;
        
        switch (state) {
            case 'idle':
                setCancelButtonState('hidden', source);
                break;
            case 'starting':
                setCancelButtonState('enabled', source);
                break;
            case 'generating':
                setCancelButtonState('enabled', source);
                break;
            case 'completing':
                // Keep button enabled until fully complete
                setCancelButtonState('enabled', source);
                break;
            case 'cancelled':
                setCancelButtonState('hidden', source);
                break;
            case 'error':
                setCancelButtonState('hidden', source);
                break;
            default:
                console.warn(`Unknown generation state: ${state}`);
        }
    },
    
    // Get current state
    getState() {
        return this.currentState;
    },
    
    // Check if generation is active
    isGenerating() {
        return ['starting', 'generating', 'completing'].includes(this.currentState);
    },
    
    // Sync with AppState.isGenerating
    syncWithAppState() {
        if (AppState.isGenerating && this.currentState === 'idle') {
            this.setState('generating', { source: 'appState' });
        } else if (!AppState.isGenerating && this.isGenerating()) {
            this.setState('idle', { source: 'appState' });
        }
    }
};

function setupWebSocketEventHandlers() {
    const ws = AppState.websocket;
    
    // Connection state changes
    ws.on('stateChange', ({ oldState, newState }) => {
        console.log(`🔌 WebSocket state: ${oldState} → ${newState}`);
        updateConnectionStatus(newState);
    });
    
    // Connection established
    ws.on('connected', ({ url }) => {
        console.log(`🔌 Connected to ComfyUI WebSocket: ${url}`);
        
        // Set connected state for WebSocket connection
        AppState.isConnected = true;
        AppState.apiEndpoint = AppState.apiEndpoint || url.replace('ws://', 'http://').replace('/ws', '');
        
        // Update connection status display
        updateConnectionStatus(WebSocketState.CONNECTED);
        
        // Sync generation state when reconnected
        GenerationStateManager.syncWithAppState();
        
        Utils.showToast('Real-time connection established', 'success');
        console.log('✅ WebSocket connection enables API functionality');
    });
    
    // Connection lost
    ws.on('disconnected', ({ code, reason }) => {
        console.log(`🔌 Disconnected: ${code} - ${reason}`);
        
        // Only reset connection state if this was not a manual disconnect
        // and there's no other successful connection method
        if (code !== 1000) { // Not a normal closure
            Utils.showToast('Real-time connection lost, attempting to reconnect...', 'info');
            // Don't immediately set isConnected = false, let reconnection attempt first
        }
        
        // If we're generating and WebSocket disconnects, we lose real-time updates
        // but generation might still be happening on the server
        if (GenerationStateManager.isGenerating()) {
            console.log('⚠️ WebSocket disconnected during generation, button state may be inconsistent');
        }
    });
    
    // WebSocket errors
    ws.on('error', ({ type, error }) => {
        console.error(`🔌 WebSocket error (${type}):`, error);
        if (type === 'connection_error') {
            Utils.showToast('Failed to establish real-time connection', 'error');
        }
    });
    
    // Progress updates
    ws.on('progress', (event) => {
        console.log(`🔌 Progress: ${event.percentage}% (${event.value}/${event.max})`);
        if (AppState.progressBar) {
            // Pass extra info for enhanced display
            const extraInfo = {
                activeNodeId: event.activeNodeId,
                activeNodeProgress: event.activeNodeProgress
            };
            AppState.progressBar.updateProgress(event.value, event.max, extraInfo);
        } else {
            updateProgressIndicator(event.percentage, event.value, event.max);
        }
    });
    
    // Execution events - Enhanced for generation state management
    ws.on('executing', (event) => {
        console.log(`🔌 Executing node ${event.nodeId} for prompt ${event.promptId}`);
        updateExecutionStatus('executing', event.nodeId);
        
        // Update generation state when first node starts executing
        if (GenerationStateManager.getState() === 'idle') {
            GenerationStateManager.setState('starting', { 
                source: 'websocket', 
                nodeId: event.nodeId, 
                promptId: event.promptId 
            });
        } else if (GenerationStateManager.getState() === 'starting') {
            GenerationStateManager.setState('generating', { 
                source: 'websocket', 
                nodeId: event.nodeId, 
                promptId: event.promptId 
            });
        }
    });
    
    ws.on('executed', (event) => {
        console.log(`🔌 Executed node ${event.nodeId} for prompt ${event.promptId}`);
        updateExecutionStatus('executed', event.nodeId);
        
        // Track node execution for fallback progress
        if (AppState.progressBar) {
            AppState.progressBar.onNodeExecuted();
        }
        
        // Check if this might be the final node (has output)
        if (event.output && Object.keys(event.output).length > 0) {
            console.log('🔌 Node produced output, checking for images...');
            
            // If we're generating and a node produces output, we might be completing
            if (GenerationStateManager.getState() === 'generating') {
                GenerationStateManager.setState('completing', { 
                    source: 'websocket', 
                    nodeId: event.nodeId, 
                    outputKeys: Object.keys(event.output) 
                });
            }
        }
    });
    
    // Execution errors - Enhanced with state management
    ws.on('execution_error', (event) => {
        console.error(`🔌 Execution error in node ${event.nodeId}:`, event.error);
        console.log('🔌 WebSocket execution_error - isCancellationInProgress:', isCancellationInProgress);
        
        // Check if this is a user-initiated cancellation
        if (isCancellationInProgress) {
            console.log('🛑 Execution error during cancellation - treating as expected cancellation');
            console.log('🛑 WebSocket clearing cancellation flag and handling as success');
            
            // Clear cancellation flag
            isCancellationInProgress = false;
            
            // Update app state for successful cancellation
            AppState.isGenerating = false;
            setGenerationLoadingState(false);
            hideRealtimeStatus();
            
            // Hide cancel button
            setCancelButtonState('hidden', 'cancellation-websocket-success');
            
            // Update generation state to cancelled (not error)
            GenerationStateManager.setState('cancelled', { 
                source: 'websocket-cancellation', 
                nodeId: event.nodeId, 
                timestamp: Date.now()
            });
            
            console.log('✅ Cancellation completed via WebSocket');
            return;
        }
        
        // This is an actual error, not a cancellation
        Utils.showToast(`Error in ${event.nodeType || 'unknown'} node: ${event.error}`, 'error');
        
        // Update generation state to error
        GenerationStateManager.setState('error', { 
            source: 'websocket', 
            nodeId: event.nodeId, 
            error: event.error 
        });
        
        // Update app state
        AppState.isGenerating = false;
        setGenerationLoadingState(false);
        
        // Set progress bar to error state
        if (AppState.progressBar) {
            AppState.progressBar.setError();
        }
    });
    
    // Status updates
    ws.on('status', (event) => {
        console.log('🔌 Status update:', event.status);
    });
}

function updateConnectionStatus(state) {
    // Update main connection status
    if (elements.connectionStatus) {
        const httpConnected = AppState.isConnected;
        const wsConnected = AppState.websocket && AppState.websocket.isConnected();
        
        let statusText = '';
        let statusClass = '';
        
        if (httpConnected && wsConnected) {
            statusText = 'Connected (HTTP + Real-time)';
            statusClass = 'connected';
        } else if (wsConnected) {
            statusText = 'Connected (Real-time only)';
            statusClass = 'connected';
        } else if (httpConnected) {
            statusText = 'Connected (HTTP only)';
            statusClass = 'connected';
        } else {
            const statusMap = {
                [WebSocketState.CONNECTING]: { text: 'Connecting...', class: 'connecting' },
                [WebSocketState.DISCONNECTED]: { text: 'Disconnected', class: 'disconnected' },
                [WebSocketState.ERROR]: { text: 'Connection Error', class: 'error' }
            };
            const status = statusMap[state] || { text: 'Not Connected', class: 'disconnected' };
            statusText = status.text;
            statusClass = status.class;
        }
        
        elements.connectionStatus.textContent = statusText;
        elements.connectionStatus.className = `connection-status ${statusClass}`;
        
        console.log(`📊 Connection status updated: ${statusText} (HTTP: ${httpConnected}, WS: ${wsConnected})`);
    }
    
    // Update WebSocket indicator in real-time status
    if (elements.websocketIndicator) {
        elements.websocketIndicator.className = `websocket-indicator ${state}`;
    }
}

function updateProgressIndicator(percentage, value, max) {
    if (!elements.progressContainer || !elements.progressBar) return;
    
    // Show progress container
    elements.progressContainer.style.display = 'block';
    
    // Update progress bar
    elements.progressBar.style.width = `${percentage}%`;
    
    // Update text displays
    if (elements.progressPercentage) {
        elements.progressPercentage.textContent = `${percentage}%`;
    }
    
    if (elements.progressStep) {
        elements.progressStep.textContent = `${value} / ${max}`;
    }
    
    console.log(`📊 Progress: ${percentage}% (${value}/${max})`);
}

function updateExecutionStatus(status, nodeId) {
    if (!elements.currentNodeName) return;
    
    // Show real-time status panel when generation starts
    if (elements.realtimeStatus && status === 'executing') {
        elements.realtimeStatus.style.display = 'block';
    }
    
    // Update current node display
    if (status === 'executing') {
        elements.currentNodeName.textContent = nodeId || 'Unknown';
        elements.currentNodeName.style.color = '#1f77b4'; // Blue for executing
    } else if (status === 'executed') {
        elements.currentNodeName.style.color = '#22c55e'; // Green for completed
        
        // Hide progress after a delay if execution is complete
        setTimeout(() => {
            if (elements.progressContainer) {
                elements.progressContainer.style.display = 'none';
            }
        }, 2000);
    }
    
    console.log(`⚙️ Node ${nodeId}: ${status}`);
}

function hideRealtimeStatus() {
    if (elements.realtimeStatus) {
        elements.realtimeStatus.style.display = 'none';
    }
    if (elements.progressContainer) {
        elements.progressContainer.style.display = 'none';
    }
    if (elements.currentNodeName) {
        elements.currentNodeName.textContent = '-';
        elements.currentNodeName.style.color = '#1f77b4';
    }
}

function cleanupWebSocket() {
    if (AppState.websocket) {
        console.log('🔌 Cleaning up WebSocket connection...');
        AppState.websocket.disconnect();
        AppState.websocket = null;
    }
}

// Setup Interrupt Service Event Handlers
function setupInterruptServiceListeners() {
    const service = AppState.interruptService;
    if (!service) {
        console.warn('⚠️ InterruptService not available for event setup');
        return;
    }
    
    // Listen for state changes
    service.on('stateChange', ({ oldState, newState }) => {
        console.log(`🛑 Interrupt state: ${oldState} → ${newState}`);
        
        // Update UI based on state
        if (newState === InterruptState.INTERRUPTING) {
            setCancelButtonState('loading', 'interrupt-service');
        } else if (newState === InterruptState.SUCCEEDED) {
            setCancelButtonState('hidden', 'interrupt-success');
        } else if (newState === InterruptState.FAILED) {
            setCancelButtonState('enabled', 'interrupt-failed');
        }
    });
    
    // Listen for successful interrupts
    service.on('success', ({ duration, retryCount }) => {
        console.log(`✅ Interrupt succeeded in ${duration}ms (${retryCount} retries)`);
        Utils.showToast('Generation cancelled successfully', 'info');
        
        // Update app state
        AppState.isGenerating = false;
        setGenerationLoadingState(false);
        hideRealtimeStatus();
        
        // Update generation state
        GenerationStateManager.setState('idle', { 
            source: 'interrupt-success', 
            duration, 
            retryCount 
        });
    });
    
    // Listen for errors
    service.on('error', ({ error, retryCount }) => {
        console.error(`❌ Interrupt error:`, error);
        
        // Show appropriate error message based on error type
        let message = 'Failed to cancel generation';
        if (error.type === 'timeout') {
            message = 'Cancel request timed out';
        } else if (error.type === 'network') {
            message = 'Network error while cancelling';
        } else if (error.type === 'server' && error.details.status) {
            message = `Server error: ${error.details.status}`;
        }
        
        Utils.showToast(message, 'error');
    });
    
    // Listen for retry attempts
    service.on('retry', ({ error, attempt, maxAttempts, delay }) => {
        console.log(`🔄 Retrying interrupt (${attempt}/${maxAttempts}) in ${delay}ms`);
        Utils.showToast(`Retrying cancel request... (${attempt}/${maxAttempts})`, 'info');
    });
    
    console.log('✅ InterruptService event listeners configured');
}

// ================================================================================
// Metadata Parser Module
// ================================================================================

/**
 * MetadataParser - Robust parser for ComfyUI workflow and history metadata
 * Extracts generation parameters, model information, and timing data
 */
class MetadataParser {
    constructor() {
        this.supportedNodeTypes = {
            samplers: ['KSampler', 'KSamplerAdvanced', 'FluxSampler', 'FluxGuidanceNode', 'FluxGuidance'],
            textEncoders: ['CLIPTextEncode', 'CLIPTextEncodeSDXL', 'FluxTextEncode', 'NunchakuTextEncoderLoaderV2'],
            imageGenerators: ['EmptyLatentImage', 'EmptySD3LatentImage', 'FluxLatent', 'FluxGGUFLatent'],
            models: ['CheckpointLoaderSimple', 'CheckpointLoader', 'FluxCheckpointLoader', 'UNETLoader', 'NunchakuFluxDiTLoader'],
            vae: ['VAELoader', 'VAEEncode', 'VAEDecode']
        };
        
        this.defaultMetadata = this.createDefaultMetadata();
    }

    /**
     * Create default metadata structure
     */
    createDefaultMetadata() {
        return {
            generation: {
                steps: null,
                cfg: null,
                sampler: null,
                scheduler: null,
                seed: null,
                dimensions: { width: null, height: null },
                batchSize: null,
                guidance: null // For Flux models
            },
            prompts: {
                positive: null,
                negative: null
            },
            model: {
                name: null,
                hash: null,
                type: null,
                architecture: null // 'SD1.5', 'SDXL', 'Flux', 'SD3'
            },
            timing: {
                startTime: null,
                endTime: null,
                duration: null,
                queueTime: null,
                formatted: {
                    duration: null,
                    startTime: null,
                    endTime: null,
                    timeRange: null,
                    queueTime: null,
                    execTime: null
                },
                analysis: {
                    efficiency: 0,
                    queuePercentage: 0,
                    execPercentage: 0
                },
                perStep: null,
                timezone: null
            },
            technical: {
                clipSkip: null,
                vae: null,
                nodeTypes: [],
                workflowVersion: null,
                nodeCount: 0
            },
            raw: {
                workflow: null,
                history: null
            }
        };
    }

    /**
     * Parse metadata from ComfyUI workflow JSON
     * @param {Object} workflowData - ComfyUI workflow JSON
     * @returns {Object} Parsed metadata object
     */
    parseWorkflowMetadata(workflowData) {
        console.log('🔍 Parsing workflow metadata...');
        console.log('🔍 DEBUG: Raw workflow data structure:', JSON.stringify(workflowData, null, 2));
        
        const metadata = this.createDefaultMetadata();
        
        try {
            if (!workflowData || typeof workflowData !== 'object') {
                throw new Error('Invalid workflow data provided');
            }

            // Store raw workflow data
            metadata.raw.workflow = workflowData;
            metadata.technical.nodeCount = Object.keys(workflowData).length;
            console.log('🔍 DEBUG: Node count:', metadata.technical.nodeCount);

            // Extract node types for technical info
            const nodeTypes = new Set();
            
            // Parse each node in the workflow
            Object.entries(workflowData).forEach(([nodeId, node]) => {
                if (!node || !node.class_type) {
                    console.log('🔍 DEBUG: Skipping node', nodeId, '- no class_type');
                    return;
                }
                
                const nodeType = node.class_type;
                nodeTypes.add(nodeType);
                console.log('🔍 DEBUG: Processing node', nodeId, 'of type:', nodeType);
                console.log('🔍 DEBUG: Node inputs:', JSON.stringify(node.inputs, null, 2));
                
                // Extract parameters based on node type
                this.extractNodeParameters(node, nodeType, metadata);
            });

            metadata.technical.nodeTypes = Array.from(nodeTypes);
            console.log('🔍 DEBUG: Found node types:', metadata.technical.nodeTypes);
            
            // Determine model architecture based on node types
            metadata.model.architecture = this.detectModelArchitecture(nodeTypes);
            
            console.log('✅ Workflow metadata parsed successfully');
            console.log('🔍 DEBUG: Final metadata:', JSON.stringify(metadata, null, 2));
            return metadata;
            
        } catch (error) {
            console.error('❌ Error parsing workflow metadata:', error);
            return metadata; // Return default metadata on error
        }
    }

    /**
     * Extract parameters from individual workflow nodes
     * @param {Object} node - Workflow node data
     * @param {string} nodeType - Node class type
     * @param {Object} metadata - Metadata object to populate
     */
    extractNodeParameters(node, nodeType, metadata) {
        const inputs = node.inputs || {};
        console.log('🔍 DEBUG: Extracting parameters for node type:', nodeType);
        console.log('🔍 DEBUG: Node inputs:', JSON.stringify(inputs, null, 2));
        
        // Extract sampler parameters
        if (this.supportedNodeTypes.samplers.includes(nodeType)) {
            console.log('🔍 DEBUG: Processing sampler node');
            if (inputs.steps !== undefined) {
                metadata.generation.steps = inputs.steps;
                console.log('🔍 DEBUG: Set steps to:', inputs.steps);
            }
            if (inputs.cfg !== undefined) {
                metadata.generation.cfg = inputs.cfg;
                console.log('🔍 DEBUG: Set cfg to:', inputs.cfg);
            }
            if (inputs.sampler_name !== undefined) {
                metadata.generation.sampler = inputs.sampler_name;
                console.log('🔍 DEBUG: Set sampler to:', inputs.sampler_name);
            }
            if (inputs.scheduler !== undefined) {
                metadata.generation.scheduler = inputs.scheduler;
                console.log('🔍 DEBUG: Set scheduler to:', inputs.scheduler);
            }
            if (inputs.seed !== undefined) {
                metadata.generation.seed = inputs.seed;
                console.log('🔍 DEBUG: Set seed to:', inputs.seed);
            }
            if (inputs.guidance !== undefined) {
                metadata.generation.guidance = inputs.guidance;
                console.log('🔍 DEBUG: Set guidance to:', inputs.guidance);
            }
        }
        
        // Extract text encoder parameters (prompts)
        else if (this.supportedNodeTypes.textEncoders.includes(nodeType)) {
            console.log('🔍 DEBUG: Processing text encoder node');
            if (inputs.text !== undefined) {
                // Determine if this is positive or negative prompt
                if (this.isNegativePrompt(inputs.text)) {
                    metadata.prompts.negative = inputs.text;
                    console.log('🔍 DEBUG: Set negative prompt to:', inputs.text);
                } else {
                    metadata.prompts.positive = inputs.text;
                    console.log('🔍 DEBUG: Set positive prompt to:', inputs.text);
                }
            }
            if (inputs.clip_skip !== undefined) {
                metadata.technical.clipSkip = inputs.clip_skip;
                console.log('🔍 DEBUG: Set clip skip to:', inputs.clip_skip);
            }
        }
        
        // Extract image dimensions
        else if (this.supportedNodeTypes.imageGenerators.includes(nodeType)) {
            console.log('🔍 DEBUG: Processing image generator node');
            if (inputs.width !== undefined) {
                metadata.generation.dimensions.width = inputs.width;
                console.log('🔍 DEBUG: Set width to:', inputs.width);
            }
            if (inputs.height !== undefined) {
                metadata.generation.dimensions.height = inputs.height;
                console.log('🔍 DEBUG: Set height to:', inputs.height);
            }
            if (inputs.batch_size !== undefined) {
                metadata.generation.batchSize = inputs.batch_size;
                console.log('🔍 DEBUG: Set batch size to:', inputs.batch_size);
            }
        }
        
        // Extract model information
        else if (this.supportedNodeTypes.models.includes(nodeType)) {
            console.log('🔍 DEBUG: Processing model node');
            if (inputs.ckpt_name !== undefined) {
                metadata.model.name = inputs.ckpt_name;
                metadata.model.type = this.extractModelType(inputs.ckpt_name);
                console.log('🔍 DEBUG: Set model name to:', inputs.ckpt_name);
            }
            if (inputs.model_path !== undefined) {
                metadata.model.name = inputs.model_path;
                metadata.model.type = this.extractModelType(inputs.model_path);
                console.log('🔍 DEBUG: Set model path to:', inputs.model_path);
            }
        }
        
        // Extract VAE information
        else if (this.supportedNodeTypes.vae.includes(nodeType)) {
            console.log('🔍 DEBUG: Processing VAE node');
            if (inputs.vae_name !== undefined) {
                metadata.technical.vae = inputs.vae_name;
                console.log('🔍 DEBUG: Set VAE to:', inputs.vae_name);
            }
        }
        
        else {
            console.log('🔍 DEBUG: Unknown node type:', nodeType, '- not in supported types');
            console.log('🔍 DEBUG: Supported types:', this.supportedNodeTypes);
        }
    }

    /**
     * Parse metadata from ComfyUI history API response
     * @param {Object} historyData - ComfyUI history response
     * @returns {Object} Parsed metadata object
     */
    parseHistoryResponse(historyData) {
        console.log('🔍 Parsing history response metadata...');
        console.log('🔍 DEBUG: Full history data:', JSON.stringify(historyData, null, 2));
        
        const metadata = this.createDefaultMetadata();
        
        try {
            if (!historyData || typeof historyData !== 'object') {
                throw new Error('Invalid history data provided');
            }

            // Store raw history data
            metadata.raw.history = historyData;
            
            // Extract timing information
            this.extractTimingInfo(historyData, metadata);
            
            // Extract workflow metadata if present
            if (historyData.prompt && historyData.prompt[2]) {
                console.log('🔍 DEBUG: Found workflow data in historyData.prompt[2]');
                const workflowData = historyData.prompt[2];
                const workflowMetadata = this.parseWorkflowMetadata(workflowData);
                
                // Merge workflow metadata
                this.mergeMetadata(metadata, workflowMetadata);
            } else {
                console.log('🔍 DEBUG: No workflow data found in historyData.prompt[2]');
                console.log('🔍 DEBUG: historyData.prompt:', historyData.prompt);
            }
            
            console.log('✅ History metadata parsed successfully');
            console.log('🔍 DEBUG: Final history metadata:', JSON.stringify(metadata, null, 2));
            return metadata;
            
        } catch (error) {
            console.error('❌ Error parsing history metadata:', error);
            return metadata; // Return default metadata on error
        }
    }

    /**
     * Extract timing information from history data
     * @param {Object} historyData - History response data
     * @param {Object} metadata - Metadata object to populate
     */
    extractTimingInfo(historyData, metadata) {
        try {
            // Parse timestamps using TimingCalculator
            const parsedTimestamps = timingCalculator.parseComfyUITimestamps(historyData);
            
            // Update metadata with parsed timing data
            metadata.timing.queueTime = parsedTimestamps.queueTime;
            metadata.timing.startTime = parsedTimestamps.startTime;
            metadata.timing.endTime = parsedTimestamps.endTime;
            metadata.timing.duration = parsedTimestamps.totalTime || parsedTimestamps.execTime;
            
            // Create comprehensive timing summary
            const timingSummary = timingCalculator.createTimingSummary(metadata.timing);
            
            // Add formatted timing data to metadata
            metadata.timing.formatted = timingSummary.formatted;
            metadata.timing.analysis = timingSummary.analysis;
            
            // Add per-step timing analysis if available
            if (historyData.status && historyData.status.exec_info) {
                const stepAnalysis = timingCalculator.calculatePerStepTiming(historyData.status);
                metadata.timing.perStep = stepAnalysis;
            }
            
            // Add timezone information
            metadata.timing.timezone = timingCalculator.getTimezoneInfo();
            
            console.log('✅ Enhanced timing information extracted with TimingCalculator');
            
        } catch (error) {
            console.error('❌ Error extracting timing info:', error);
            
            // Fallback to basic timing extraction
            try {
                if (historyData.status && historyData.status.exec_info) {
                    const execInfo = historyData.status.exec_info;
                    
                    if (execInfo.queue_time !== undefined) {
                        metadata.timing.queueTime = execInfo.queue_time;
                    }
                    
                    if (execInfo.exec_time !== undefined) {
                        metadata.timing.duration = execInfo.exec_time;
                    }
                }
                
                // Try to extract timestamps from status
                if (historyData.status) {
                    if (historyData.status.started_at) {
                        metadata.timing.startTime = new Date(historyData.status.started_at);
                    }
                    if (historyData.status.completed_at) {
                        metadata.timing.endTime = new Date(historyData.status.completed_at);
                    }
                    
                    // Calculate duration if not already set
                    if (!metadata.timing.duration && metadata.timing.startTime && metadata.timing.endTime) {
                        metadata.timing.duration = metadata.timing.endTime - metadata.timing.startTime;
                    }
                }
                
                console.log('⚠️ Used fallback timing extraction');
            } catch (fallbackError) {
                console.error('❌ Fallback timing extraction also failed:', fallbackError);
            }
        }
    }

    /**
     * Detect model architecture based on node types
     * @param {Set} nodeTypes - Set of node types in workflow
     * @returns {string} Model architecture
     */
    detectModelArchitecture(nodeTypes) {
        const nodeTypeArray = Array.from(nodeTypes);
        
        if (nodeTypeArray.some(type => type.includes('Flux'))) {
            return 'Flux';
        } else if (nodeTypeArray.some(type => type.includes('SD3'))) {
            return 'SD3';
        } else if (nodeTypeArray.some(type => type.includes('SDXL'))) {
            return 'SDXL';
        } else {
            return 'SD1.5';
        }
    }

    /**
     * Extract model type from checkpoint name
     * @param {string} ckptName - Checkpoint filename
     * @returns {string} Model type
     */
    extractModelType(ckptName) {
        if (!ckptName) return null;
        
        const name = ckptName.toLowerCase();
        
        if (name.includes('flux')) return 'Flux';
        if (name.includes('sd3')) return 'SD3';
        if (name.includes('sdxl')) return 'SDXL';
        if (name.includes('sd15') || name.includes('sd-1.5')) return 'SD1.5';
        
        return 'Unknown';
    }

    /**
     * Determine if text is likely a negative prompt
     * @param {string} text - Prompt text
     * @returns {boolean} True if likely negative prompt
     */
    isNegativePrompt(text) {
        if (!text || typeof text !== 'string') return false;
        
        const negativeKeywords = [
            'worst quality', 'low quality', 'bad anatomy', 'blurry',
            'out of frame', 'deformed', 'ugly', 'bad hands',
            'extra limbs', 'missing limbs', 'malformed'
        ];
        
        return negativeKeywords.some(keyword => text.toLowerCase().includes(keyword));
    }

    /**
     * Merge metadata objects, prioritizing non-null values
     * @param {Object} target - Target metadata object
     * @param {Object} source - Source metadata object
     */
    mergeMetadata(target, source) {
        const mergeObject = (targetObj, sourceObj) => {
            Object.keys(sourceObj).forEach(key => {
                if (sourceObj[key] !== null && sourceObj[key] !== undefined) {
                    if (typeof sourceObj[key] === 'object' && !Array.isArray(sourceObj[key])) {
                        if (!targetObj[key]) targetObj[key] = {};
                        mergeObject(targetObj[key], sourceObj[key]);
                    } else {
                        targetObj[key] = sourceObj[key];
                    }
                }
            });
        };
        
        mergeObject(target, source);
    }

    /**
     * Validate metadata object structure
     * @param {Object} metadata - Metadata object to validate
     * @returns {boolean} True if valid
     */
    validateMetadata(metadata) {
        if (!metadata || typeof metadata !== 'object') return false;
        
        const requiredSections = ['generation', 'prompts', 'model', 'timing', 'technical'];
        return requiredSections.every(section => metadata.hasOwnProperty(section));
    }

    /**
     * Normalize metadata values to ensure consistent types
     * @param {Object} metadata - Metadata object to normalize
     * @returns {Object} Normalized metadata
     */
    normalizeMetadata(metadata) {
        const normalized = JSON.parse(JSON.stringify(metadata));
        
        // Ensure numbers are properly typed
        if (normalized.generation.steps) normalized.generation.steps = parseInt(normalized.generation.steps);
        if (normalized.generation.cfg) normalized.generation.cfg = parseFloat(normalized.generation.cfg);
        if (normalized.generation.seed) normalized.generation.seed = parseInt(normalized.generation.seed);
        if (normalized.generation.batchSize) normalized.generation.batchSize = parseInt(normalized.generation.batchSize);
        if (normalized.generation.dimensions.width) normalized.generation.dimensions.width = parseInt(normalized.generation.dimensions.width);
        if (normalized.generation.dimensions.height) normalized.generation.dimensions.height = parseInt(normalized.generation.dimensions.height);
        
        // Ensure strings are properly trimmed
        if (normalized.prompts.positive) normalized.prompts.positive = normalized.prompts.positive.trim();
        if (normalized.prompts.negative) normalized.prompts.negative = normalized.prompts.negative.trim();
        if (normalized.model.name) normalized.model.name = normalized.model.name.trim();
        
        return normalized;
    }
}

// ================================================================================
// Timing Calculator Module
// ================================================================================

/**
 * TimingCalculator - Comprehensive timing utilities for ComfyUI generation data
 * Handles duration calculations, timestamp formatting, and timing analysis
 */
class TimingCalculator {
    constructor() {
        this.defaultOptions = {
            locale: 'en-US',
            timeZone: 'local',
            includeMilliseconds: false,
            shortFormat: false
        };
    }

    /**
     * Calculate duration between two timestamps
     * @param {Date|number} startTime - Start timestamp
     * @param {Date|number} endTime - End timestamp
     * @returns {number} Duration in milliseconds
     */
    calculateDuration(startTime, endTime) {
        try {
            const start = startTime instanceof Date ? startTime.getTime() : startTime;
            const end = endTime instanceof Date ? endTime.getTime() : endTime;
            
            if (typeof start !== 'number' || typeof end !== 'number') {
                throw new Error('Invalid timestamp format');
            }
            
            if (start > end) {
                throw new Error('Start time cannot be after end time');
            }
            
            return end - start;
        } catch (error) {
            console.error('❌ Error calculating duration:', error);
            return 0;
        }
    }

    /**
     * Format duration in human-readable format
     * @param {number} milliseconds - Duration in milliseconds
     * @param {Object} options - Formatting options
     * @returns {string} Formatted duration string
     */
    formatDuration(milliseconds, options = {}) {
        const opts = { ...this.defaultOptions, ...options };
        
        try {
            if (typeof milliseconds !== 'number' || milliseconds < 0) {
                return 'Invalid duration';
            }
            
            if (milliseconds === 0) {
                return '0 seconds';
            }
            
            const totalSeconds = Math.floor(milliseconds / 1000);
            const ms = milliseconds % 1000;
            
            if (totalSeconds === 0) {
                return opts.includeMilliseconds ? `${ms}ms` : '< 1 second';
            }
            
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            const parts = [];
            
            if (opts.shortFormat) {
                // Short format: "2:34:56" or "34:56" or "56s"
                if (hours > 0) {
                    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else if (minutes > 0) {
                    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                } else {
                    return `${seconds}s`;
                }
            } else {
                // Long format: "2 hours 34 minutes 56 seconds"
                if (hours > 0) {
                    parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
                }
                if (minutes > 0) {
                    parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
                }
                if (seconds > 0 || parts.length === 0) {
                    parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
                }
                
                if (parts.length === 1) {
                    return parts[0];
                } else if (parts.length === 2) {
                    return parts.join(' and ');
                } else {
                    return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
                }
            }
            
        } catch (error) {
            console.error('❌ Error formatting duration:', error);
            return 'Error formatting duration';
        }
    }

    /**
     * Format timestamp for display
     * @param {Date|number} timestamp - Timestamp to format
     * @param {Object} options - Formatting options
     * @returns {string} Formatted timestamp string
     */
    formatTimestamp(timestamp, options = {}) {
        const opts = { ...this.defaultOptions, ...options };
        
        try {
            const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
            
            if (isNaN(date.getTime())) {
                return 'Invalid timestamp';
            }
            
            if (opts.shortFormat) {
                // Short format: just time "14:23:45"
                const formatOptions = {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                };
                
                if (opts.includeMilliseconds) {
                    formatOptions.fractionalSecondDigits = 3;
                }
                
                if (opts.timeZone && opts.timeZone !== 'local') {
                    formatOptions.timeZone = opts.timeZone;
                }
                
                return date.toLocaleTimeString(opts.locale, formatOptions);
            } else {
                // Long format: full date and time
                const formatOptions = {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                };
                
                if (opts.includeMilliseconds) {
                    formatOptions.fractionalSecondDigits = 3;
                }
                
                if (opts.timeZone && opts.timeZone !== 'local') {
                    formatOptions.timeZone = opts.timeZone;
                }
                
                return date.toLocaleString(opts.locale, formatOptions);
            }
            
        } catch (error) {
            console.error('❌ Error formatting timestamp:', error);
            return 'Error formatting timestamp';
        }
    }

    /**
     * Format time range between start and end timestamps
     * @param {Date|number} startTime - Start timestamp
     * @param {Date|number} endTime - End timestamp
     * @param {Object} options - Formatting options
     * @returns {string} Formatted time range string
     */
    formatTimeRange(startTime, endTime, options = {}) {
        const opts = { ...this.defaultOptions, ...options };
        
        try {
            const startFormatted = this.formatTimestamp(startTime, { ...opts, shortFormat: true });
            const endFormatted = this.formatTimestamp(endTime, { ...opts, shortFormat: true });
            
            if (startFormatted === 'Invalid timestamp' || endFormatted === 'Invalid timestamp') {
                return 'Invalid time range';
            }
            
            return `${startFormatted} - ${endFormatted}`;
            
        } catch (error) {
            console.error('❌ Error formatting time range:', error);
            return 'Error formatting time range';
        }
    }

    /**
     * Get relative time string (e.g., "3 minutes ago")
     * @param {Date|number} timestamp - Timestamp to compare
     * @param {Date|number} referenceTime - Reference time (defaults to now)
     * @returns {string} Relative time string
     */
    getRelativeTime(timestamp, referenceTime = Date.now()) {
        try {
            const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
            const reference = referenceTime instanceof Date ? referenceTime : new Date(referenceTime);
            
            if (isNaN(date.getTime()) || isNaN(reference.getTime())) {
                return 'Invalid time';
            }
            
            const diffMs = reference.getTime() - date.getTime();
            const diffSeconds = Math.floor(diffMs / 1000);
            
            if (diffSeconds < 60) {
                return diffSeconds <= 1 ? 'just now' : `${diffSeconds} seconds ago`;
            }
            
            const diffMinutes = Math.floor(diffSeconds / 60);
            if (diffMinutes < 60) {
                return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
            }
            
            const diffHours = Math.floor(diffMinutes / 60);
            if (diffHours < 24) {
                return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
            }
            
            const diffDays = Math.floor(diffHours / 24);
            return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
            
        } catch (error) {
            console.error('❌ Error calculating relative time:', error);
            return 'Error calculating relative time';
        }
    }

    /**
     * Calculate per-step timing analysis from ComfyUI execution data
     * @param {Object} execData - Execution data from ComfyUI
     * @returns {Object} Per-step timing analysis
     */
    calculatePerStepTiming(execData) {
        const analysis = {
            totalDuration: 0,
            nodeTimings: {},
            slowestNodes: [],
            fastestNodes: [],
            averageNodeTime: 0
        };
        
        try {
            if (!execData || typeof execData !== 'object') {
                return analysis;
            }
            
            // Extract node timings from various possible formats
            const nodeTimings = {};
            let totalTime = 0;
            
            // Try to extract from different ComfyUI response formats
            if (execData.exec_info && execData.exec_info.node_times) {
                // Format: { node_id: execution_time_ms }
                Object.entries(execData.exec_info.node_times).forEach(([nodeId, timeMs]) => {
                    const duration = parseFloat(timeMs) || 0;
                    nodeTimings[nodeId] = {
                        duration,
                        percentage: 0, // Will be calculated later
                        formatted: this.formatDuration(duration, { shortFormat: true })
                    };
                    totalTime += duration;
                });
            }
            
            // Calculate percentages
            if (totalTime > 0) {
                Object.keys(nodeTimings).forEach(nodeId => {
                    nodeTimings[nodeId].percentage = (nodeTimings[nodeId].duration / totalTime) * 100;
                });
            }
            
            // Sort nodes by timing
            const sortedNodes = Object.entries(nodeTimings)
                .map(([nodeId, data]) => ({ nodeId, ...data }))
                .sort((a, b) => b.duration - a.duration);
            
            analysis.totalDuration = totalTime;
            analysis.nodeTimings = nodeTimings;
            analysis.slowestNodes = sortedNodes.slice(0, 5); // Top 5 slowest
            analysis.fastestNodes = sortedNodes.slice(-5).reverse(); // Top 5 fastest
            analysis.averageNodeTime = sortedNodes.length > 0 ? totalTime / sortedNodes.length : 0;
            
            return analysis;
            
        } catch (error) {
            console.error('❌ Error calculating per-step timing:', error);
            return analysis;
        }
    }

    /**
     * Get timezone information
     * @returns {Object} Timezone information
     */
    getTimezoneInfo() {
        try {
            const date = new Date();
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const offset = date.getTimezoneOffset();
            const offsetHours = Math.floor(Math.abs(offset) / 60);
            const offsetMinutes = Math.abs(offset) % 60;
            const offsetSign = offset <= 0 ? '+' : '-';
            
            return {
                timeZone,
                offset,
                offsetString: `UTC${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`,
                isDST: this.isDaylightSavingTime(date)
            };
        } catch (error) {
            console.error('❌ Error getting timezone info:', error);
            return {
                timeZone: 'Unknown',
                offset: 0,
                offsetString: 'UTC+00:00',
                isDST: false
            };
        }
    }

    /**
     * Check if a date is during daylight saving time
     * @param {Date} date - Date to check
     * @returns {boolean} True if DST is active
     */
    isDaylightSavingTime(date) {
        try {
            const january = new Date(date.getFullYear(), 0, 1);
            const july = new Date(date.getFullYear(), 6, 1);
            return Math.max(january.getTimezoneOffset(), july.getTimezoneOffset()) !== date.getTimezoneOffset();
        } catch (error) {
            return false;
        }
    }

    /**
     * Parse ComfyUI timestamps from history data
     * @param {Object} historyData - ComfyUI history response
     * @returns {Object} Parsed timestamp data
     */
    parseComfyUITimestamps(historyData) {
        const timestamps = {
            queueTime: null,
            startTime: null,
            endTime: null,
            execTime: null,
            totalTime: null
        };
        
        try {
            if (!historyData || typeof historyData !== 'object') {
                return timestamps;
            }
            
            // Extract from exec_info
            if (historyData.status && historyData.status.exec_info) {
                const execInfo = historyData.status.exec_info;
                timestamps.queueTime = execInfo.queue_time || null;
                timestamps.execTime = execInfo.exec_time || null;
            }
            
            // Extract timestamps from status
            if (historyData.status) {
                if (historyData.status.started_at) {
                    timestamps.startTime = new Date(historyData.status.started_at);
                }
                if (historyData.status.completed_at) {
                    timestamps.endTime = new Date(historyData.status.completed_at);
                }
            }
            
            // Calculate total time if we have start and end
            if (timestamps.startTime && timestamps.endTime) {
                timestamps.totalTime = this.calculateDuration(timestamps.startTime, timestamps.endTime);
            }
            
            return timestamps;
            
        } catch (error) {
            console.error('❌ Error parsing ComfyUI timestamps:', error);
            return timestamps;
        }
    }

    /**
     * Create comprehensive timing summary
     * @param {Object} timingData - Raw timing data
     * @returns {Object} Comprehensive timing summary
     */
    createTimingSummary(timingData) {
        const summary = {
            raw: timingData,
            formatted: {
                duration: 'Unknown',
                startTime: 'Unknown',
                endTime: 'Unknown',
                timeRange: 'Unknown',
                queueTime: 'Unknown',
                execTime: 'Unknown'
            },
            analysis: {
                efficiency: 0,
                queuePercentage: 0,
                execPercentage: 0
            }
        };
        
        try {
            if (!timingData) return summary;
            
            // Format basic timing information
            if (timingData.duration) {
                summary.formatted.duration = this.formatDuration(timingData.duration);
            }
            
            if (timingData.startTime) {
                summary.formatted.startTime = `Started at ${this.formatTimestamp(timingData.startTime, { shortFormat: true })}`;
            }
            
            if (timingData.endTime) {
                summary.formatted.endTime = `Completed at ${this.formatTimestamp(timingData.endTime, { shortFormat: true })}`;
            }
            
            if (timingData.startTime && timingData.endTime) {
                summary.formatted.timeRange = this.formatTimeRange(timingData.startTime, timingData.endTime);
            }
            
            if (timingData.queueTime) {
                summary.formatted.queueTime = this.formatDuration(timingData.queueTime);
            }
            
            if (timingData.execTime) {
                summary.formatted.execTime = this.formatDuration(timingData.execTime);
            }
            
            // Calculate efficiency analysis
            if (timingData.queueTime && timingData.execTime) {
                const totalTime = timingData.queueTime + timingData.execTime;
                summary.analysis.queuePercentage = (timingData.queueTime / totalTime) * 100;
                summary.analysis.execPercentage = (timingData.execTime / totalTime) * 100;
                summary.analysis.efficiency = summary.analysis.execPercentage;
            }
            
            return summary;
            
        } catch (error) {
            console.error('❌ Error creating timing summary:', error);
            return summary;
        }
    }
}

// Create global instance
const timingCalculator = new TimingCalculator();

// ================================================================================
// End Timing Calculator Module
// ================================================================================

// Create global instance
const metadataParser = new MetadataParser();

// ================================================================================
// End Metadata Parser Module
// ================================================================================

// ================================================================================
// Task 14.3: Metadata Display Component Structure
// ================================================================================

/**
 * MetadataPanel - Component for displaying workflow metadata
 * 
 * This component provides a structured display for workflow metadata including:
 * - Generation settings (model, sampler, steps, CFG)
 * - Prompt information (positive/negative with smart truncation)
 * - Image properties (dimensions, batch size)
 * - Timing data (start time, duration, completion)
 * 
 * Features:
 * - Collapsible/expandable sections
 * - Smart content truncation with expand/collapse
 * - Copy-to-clipboard functionality
 * - Responsive design
 * - Error handling for missing metadata
 */
class MetadataPanel {
    constructor() {
        this.sectionStates = {
            generationSettings: true,    // Expanded by default
            promptInfo: false,           // Collapsed by default
            imageProperties: true,       // Expanded by default
            timingData: true             // Expanded by default
        };
        
        this.maxPromptLength = 100;      // Characters before truncation
        this.maxValueLength = 50;        // Max length for parameter values
        
        this.bindMethods();
    }
    
    bindMethods() {
        this.toggleSection = this.toggleSection.bind(this);
        this.togglePromptExpansion = this.togglePromptExpansion.bind(this);
        this.copyToClipboard = this.copyToClipboard.bind(this);
    }
    
    /**
     * Generate HTML for the complete metadata panel
     * @param {Object} metadata - Parsed metadata object
     * @param {Object} options - Display options
     * @returns {string} HTML string
     */
    generatePanelHTML(metadata, options = {}) {
        if (!metadata || typeof metadata !== 'object') {
            return this.generateErrorHTML('No metadata available');
        }
        
        const panelId = options.panelId || 'metadata-panel';
        const showTitle = options.showTitle !== false;
        
        return `
            <div class="metadata-panel" id="${panelId}">
                ${showTitle ? '<h4 class="metadata-title">Generation Details</h4>' : ''}
                
                ${this.generateGenerationSettings(metadata)}
                ${this.generateImageProperties(metadata)}
                ${this.generateTimingData(metadata)}
                
                <div class="metadata-prompt-section">
                    ${this.generatePromptInfo(metadata)}
                </div>
                
                <div class="metadata-actions">
                    <button class="metadata-action-btn" onclick="metadataPanel.copyAllMetadata('${panelId}')">
                        <svg viewBox="0 0 24 24" width="14" height="14">
                            <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />
                        </svg>
                        Copy All
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Generate generation settings section
     * @param {Object} metadata - Parsed metadata object
     * @returns {string} HTML string
     */
    generateGenerationSettings(metadata) {
        const isExpanded = this.sectionStates.generationSettings;
        const sectionId = 'generation-settings';
        
        const settings = this.extractGenerationSettings(metadata);
        
        return `
            <div class="metadata-section" data-section="${sectionId}">
                <div class="metadata-section-header" onclick="metadataPanel.toggleSection('${sectionId}')">
                    <h5>Generation Settings</h5>
                    <svg class="expand-icon ${isExpanded ? 'expanded' : ''}" viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
                    </svg>
                </div>
                
                <div class="metadata-section-content ${isExpanded ? 'expanded' : ''}" id="${sectionId}-content">
                    <div class="metadata-grid">
                        ${this.generateParameterRows(settings)}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Generate prompt information section
     * @param {Object} metadata - Parsed metadata object
     * @returns {string} HTML string
     */
    generatePromptInfo(metadata) {
        const isExpanded = this.sectionStates.promptInfo;
        const sectionId = 'prompt-info';
        
        const prompts = this.extractPromptInfo(metadata);
        
        return `
            <div class="metadata-section" data-section="${sectionId}">
                <div class="metadata-section-header" onclick="metadataPanel.toggleSection('${sectionId}')">
                    <h5>Prompt Information</h5>
                    <svg class="expand-icon ${isExpanded ? 'expanded' : ''}" viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
                    </svg>
                </div>
                
                <div class="metadata-section-content ${isExpanded ? 'expanded' : ''}" id="${sectionId}-content">
                    ${this.generatePromptContent(prompts)}
                </div>
            </div>
        `;
    }
    
    /**
     * Generate image properties section
     * @param {Object} metadata - Parsed metadata object
     * @returns {string} HTML string
     */
    generateImageProperties(metadata) {
        const isExpanded = this.sectionStates.imageProperties;
        const sectionId = 'image-properties';
        
        const properties = this.extractImageProperties(metadata);
        
        return `
            <div class="metadata-section" data-section="${sectionId}">
                <div class="metadata-section-header" onclick="metadataPanel.toggleSection('${sectionId}')">
                    <h5>Image Properties</h5>
                    <svg class="expand-icon ${isExpanded ? 'expanded' : ''}" viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
                    </svg>
                </div>
                
                <div class="metadata-section-content ${isExpanded ? 'expanded' : ''}" id="${sectionId}-content">
                    <div class="metadata-grid">
                        ${this.generateParameterRows(properties)}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Generate timing data section
     * @param {Object} metadata - Parsed metadata object
     * @returns {string} HTML string
     */
    generateTimingData(metadata) {
        const isExpanded = this.sectionStates.timingData;
        const sectionId = 'timing-data';
        
        const timing = this.extractTimingData(metadata);
        
        return `
            <div class="metadata-section" data-section="${sectionId}">
                <div class="metadata-section-header" onclick="metadataPanel.toggleSection('${sectionId}')">
                    <h5>Timing Information</h5>
                    <svg class="expand-icon ${isExpanded ? 'expanded' : ''}" viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
                    </svg>
                </div>
                
                <div class="metadata-section-content ${isExpanded ? 'expanded' : ''}" id="${sectionId}-content">
                    <div class="metadata-grid">
                        ${this.generateParameterRows(timing)}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Extract generation settings from metadata
     * @param {Object} metadata - Parsed metadata object
     * @returns {Array} Array of parameter objects
     */
    extractGenerationSettings(metadata) {
        const settings = [];
        
        try {
            const generation = metadata.generation || {};
            const model = metadata.model || {};
            
            // Model information
            if (model.name) {
                settings.push({
                    label: 'Model',
                    value: model.name,
                    type: 'text',
                    copyable: true
                });
            }
            
            // Sampler information
            if (generation.sampler) {
                settings.push({
                    label: 'Sampler',
                    value: generation.sampler,
                    type: 'text',
                    copyable: true
                });
            }
            
            // Steps
            if (generation.steps) {
                settings.push({
                    label: 'Steps',
                    value: generation.steps.toString(),
                    type: 'number'
                });
            }
            
            // CFG Scale
            if (generation.cfg) {
                settings.push({
                    label: 'CFG Scale',
                    value: generation.cfg.toString(),
                    type: 'number'
                });
            }
            
            // Seed
            if (generation.seed) {
                settings.push({
                    label: 'Seed',
                    value: generation.seed.toString(),
                    type: 'number',
                    copyable: true
                });
            }
            
            // Scheduler
            if (generation.scheduler) {
                settings.push({
                    label: 'Scheduler',
                    value: generation.scheduler,
                    type: 'text'
                });
            }
            
            // Guidance
            if (generation.guidance) {
                settings.push({
                    label: 'Guidance',
                    value: generation.guidance.toString(),
                    type: 'number'
                });
            }
            
        } catch (error) {
            console.error('Error extracting generation settings:', error);
        }
        
        return settings;
    }
    
    /**
     * Extract prompt information from metadata
     * @param {Object} metadata - Parsed metadata object
     * @returns {Object} Prompt information object
     */
    extractPromptInfo(metadata) {
        const prompts = {
            positive: '',
            negative: ''
        };
        
        try {
            const promptData = metadata.prompts || {};
            
            if (promptData.positive) {
                prompts.positive = promptData.positive;
            }
            
            if (promptData.negative) {
                prompts.negative = promptData.negative;
            }
            
        } catch (error) {
            console.error('Error extracting prompt info:', error);
        }
        
        return prompts;
    }
    
    /**
     * Extract image properties from metadata
     * @param {Object} metadata - Parsed metadata object
     * @returns {Array} Array of property objects
     */
    extractImageProperties(metadata) {
        const properties = [];
        
        try {
            const generation = metadata.generation || {};
            const dimensions = generation.dimensions || {};
            
            // Dimensions
            if (dimensions.width && dimensions.height) {
                properties.push({
                    label: 'Dimensions',
                    value: `${dimensions.width} × ${dimensions.height}`,
                    type: 'text'
                });
            }
            
            // Batch size
            if (generation.batchSize) {
                properties.push({
                    label: 'Batch Size',
                    value: generation.batchSize.toString(),
                    type: 'number'
                });
            }
            
            // Aspect ratio
            if (dimensions.width && dimensions.height) {
                const ratio = this.calculateAspectRatio(dimensions.width, dimensions.height);
                properties.push({
                    label: 'Aspect Ratio',
                    value: ratio,
                    type: 'text'
                });
            }
            
        } catch (error) {
            console.error('Error extracting image properties:', error);
        }
        
        return properties;
    }
    
    /**
     * Extract timing data from metadata
     * @param {Object} metadata - Parsed metadata object
     * @returns {Array} Array of timing objects
     */
    extractTimingData(metadata) {
        const timing = [];
        
        try {
            const timingData = metadata.timing || {};
            
            // Generation time
            if (timingData.formatted && timingData.formatted.duration) {
                timing.push({
                    label: 'Generation Time',
                    value: timingData.formatted.duration,
                    type: 'text'
                });
            }
            
            // Start time
            if (timingData.formatted && timingData.formatted.startTime) {
                timing.push({
                    label: 'Started',
                    value: timingData.formatted.startTime,
                    type: 'text',
                    copyable: true
                });
            }
            
            // Completion time
            if (timingData.formatted && timingData.formatted.endTime) {
                timing.push({
                    label: 'Completed',
                    value: timingData.formatted.endTime,
                    type: 'text',
                    copyable: true
                });
            }
            
            // Per-step timing (if available)
            if (timingData.perStep && timingData.perStep.steps && timingData.perStep.steps.length > 0) {
                const avgStepTime = timingData.perStep.analysis.averageStepTime || 0;
                timing.push({
                    label: 'Avg Step Time',
                    value: timingCalculator.formatDuration(avgStepTime),
                    type: 'text'
                });
            }
            
        } catch (error) {
            console.error('Error extracting timing data:', error);
        }
        
        return timing;
    }
    
    /**
     * Generate parameter rows HTML
     * @param {Array} parameters - Array of parameter objects
     * @returns {string} HTML string
     */
    generateParameterRows(parameters) {
        if (!parameters || parameters.length === 0) {
            return '<div class="metadata-empty">No data available</div>';
        }
        
        return parameters.map(param => {
            const value = this.truncateValue(param.value, this.maxValueLength);
            const copyButton = param.copyable ? `
                <button class="copy-btn" onclick="metadataPanel.copyToClipboard('${param.value.replace(/'/g, "\\'")}', '${param.label}')" title="Copy ${param.label}">
                    <svg viewBox="0 0 24 24" width="12" height="12">
                        <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />
                    </svg>
                </button>
            ` : '';
            
            return `
                <div class="metadata-row">
                    <div class="metadata-label">${param.label}</div>
                    <div class="metadata-value-container">
                        <div class="metadata-value ${param.type}">${value}</div>
                        ${copyButton}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Generate prompt content HTML with truncation
     * @param {Object} prompts - Prompt information object
     * @returns {string} HTML string
     */
    generatePromptContent(prompts) {
        if (!prompts.positive && !prompts.negative) {
            return '<div class="metadata-empty">No prompt information available</div>';
        }
        
        let content = '';
        
        // Positive prompt
        if (prompts.positive) {
            const truncated = this.truncatePrompt(prompts.positive);
            content += `
                <div class="prompt-section">
                    <div class="prompt-header">
                        <span class="prompt-label">Positive Prompt</span>
                        <button class="copy-btn" onclick="metadataPanel.copyToClipboard('${prompts.positive.replace(/'/g, "\\'")}', 'Positive Prompt')" title="Copy positive prompt">
                            <svg viewBox="0 0 24 24" width="12" height="12">
                                <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />
                            </svg>
                        </button>
                    </div>
                    <div class="prompt-content">
                        <div class="prompt-text ${truncated.isTruncated ? 'truncated' : ''}" id="positive-prompt-text">
                            ${truncated.text}
                        </div>
                        ${truncated.isTruncated ? `
                            <button class="expand-prompt-btn" onclick="metadataPanel.togglePromptExpansion('positive-prompt-text', '${prompts.positive.replace(/'/g, "\\'")}')">
                                Show More
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        // Negative prompt
        if (prompts.negative) {
            const truncated = this.truncatePrompt(prompts.negative);
            content += `
                <div class="prompt-section">
                    <div class="prompt-header">
                        <span class="prompt-label">Negative Prompt</span>
                        <button class="copy-btn" onclick="metadataPanel.copyToClipboard('${prompts.negative.replace(/'/g, "\\'")}', 'Negative Prompt')" title="Copy negative prompt">
                            <svg viewBox="0 0 24 24" width="12" height="12">
                                <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />
                            </svg>
                        </button>
                    </div>
                    <div class="prompt-content">
                        <div class="prompt-text ${truncated.isTruncated ? 'truncated' : ''}" id="negative-prompt-text">
                            ${truncated.text}
                        </div>
                        ${truncated.isTruncated ? `
                            <button class="expand-prompt-btn" onclick="metadataPanel.togglePromptExpansion('negative-prompt-text', '${prompts.negative.replace(/'/g, "\\'")}')">
                                Show More
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        return content;
    }
    
    /**
     * Generate error HTML
     * @param {string} message - Error message
     * @returns {string} HTML string
     */
    generateErrorHTML(message) {
        return `
            <div class="metadata-error">
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z" />
                </svg>
                <p>${message}</p>
            </div>
        `;
    }
    
    /**
     * Utility Methods
     */
    
    truncateValue(value, maxLength) {
        if (!value || value.length <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength) + '...';
    }
    
    truncatePrompt(prompt) {
        if (!prompt || prompt.length <= this.maxPromptLength) {
            return {
                text: prompt,
                isTruncated: false
            };
        }
        
        return {
            text: prompt.substring(0, this.maxPromptLength) + '...',
            isTruncated: true
        };
    }
    
    calculateAspectRatio(width, height) {
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const divisor = gcd(width, height);
        return `${width / divisor}:${height / divisor}`;
    }
    
    /**
     * Event Handlers
     */
    
    toggleSection(sectionId) {
        this.sectionStates[sectionId] = !this.sectionStates[sectionId];
        
        const content = document.getElementById(`${sectionId}-content`);
        const icon = document.querySelector(`[data-section="${sectionId}"] .expand-icon`);
        
        if (content && icon) {
            if (this.sectionStates[sectionId]) {
                content.classList.add('expanded');
                icon.classList.add('expanded');
            } else {
                content.classList.remove('expanded');
                icon.classList.remove('expanded');
            }
        }
    }
    
    togglePromptExpansion(elementId, fullText) {
        const element = document.getElementById(elementId);
        const button = element.parentElement.querySelector('.expand-prompt-btn');
        
        if (element && button) {
            const isExpanded = element.classList.contains('expanded');
            
            if (isExpanded) {
                // Collapse
                const truncated = this.truncatePrompt(fullText);
                element.textContent = truncated.text;
                element.classList.remove('expanded');
                button.textContent = 'Show More';
            } else {
                // Expand
                element.textContent = fullText;
                element.classList.add('expanded');
                button.textContent = 'Show Less';
            }
        }
    }
    
    async copyToClipboard(text, label) {
        try {
            await navigator.clipboard.writeText(text);
            Utils.showToast(`${label} copied to clipboard`, 'success');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            Utils.showToast('Failed to copy to clipboard', 'error');
        }
    }
    
    async copyAllMetadata(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;
        
        try {
            // Extract all metadata text
            const metadataText = this.extractMetadataText(panel);
            await navigator.clipboard.writeText(metadataText);
            Utils.showToast('All metadata copied to clipboard', 'success');
        } catch (error) {
            console.error('Failed to copy metadata:', error);
            Utils.showToast('Failed to copy metadata', 'error');
        }
    }
    
    extractMetadataText(panel) {
        const sections = panel.querySelectorAll('.metadata-section');
        let text = 'Generation Details\n\n';
        
        sections.forEach(section => {
            const header = section.querySelector('.metadata-section-header h5');
            if (header) {
                text += `${header.textContent}:\n`;
            }
            
            const rows = section.querySelectorAll('.metadata-row');
            rows.forEach(row => {
                const label = row.querySelector('.metadata-label');
                const value = row.querySelector('.metadata-value');
                if (label && value) {
                    text += `  ${label.textContent}: ${value.textContent}\n`;
                }
            });
            
            const prompts = section.querySelectorAll('.prompt-section');
            prompts.forEach(prompt => {
                const label = prompt.querySelector('.prompt-label');
                const content = prompt.querySelector('.prompt-text');
                if (label && content) {
                    text += `  ${label.textContent}: ${content.textContent}\n`;
                }
            });
            
            text += '\n';
        });
        
        return text;
    }
}

// Global instance
const metadataPanel = new MetadataPanel();

// ================================================================================
// End Metadata Display Component Structure
// ================================================================================

// ================================================================================
// Preset Management System
// ================================================================================

/**
 * Preset Manager Class
 * Handles all preset-related UI interactions and operations
 */
class PresetManager {
    constructor() {
        if (!window.presetStorage) {
            console.error('PresetStorageService not available');
            throw new Error('PresetStorageService must be loaded before PresetManager');
        }
        
        this.storage = window.presetStorage;
        this.elements = {};
        this.currentPresetId = null;
        this.isExpanded = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.updateStorageDisplay();
        this.refreshPresetList();
    }
    
    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.elements = {
            // Main preset section
            presetToggleBtn: document.getElementById('preset-toggle-btn'),
            presetContent: document.getElementById('preset-content'),
            presetDropdown: document.getElementById('preset-dropdown'),
            presetSaveBtn: document.getElementById('preset-save-btn'),
            presetDeleteBtn: document.getElementById('preset-delete-btn'),
            
            // Storage info
            storageUsage: document.getElementById('storage-usage'),
            storageFill: document.getElementById('storage-fill'),
            
            // Save modal
            saveModal: document.getElementById('save-preset-modal'),
            saveBackdrop: document.getElementById('save-preset-backdrop'),
            saveClose: document.getElementById('save-preset-close'),
            saveCancel: document.getElementById('save-preset-cancel'),
            saveConfirm: document.getElementById('save-preset-confirm'),
            presetNameInput: document.getElementById('preset-name-input'),
            presetNameError: document.getElementById('preset-name-error'),
            
            // Delete modal
            deleteModal: document.getElementById('delete-preset-modal'),
            deleteBackdrop: document.getElementById('delete-preset-backdrop'),
            deleteCancel: document.getElementById('delete-preset-cancel'),
            deleteConfirm: document.getElementById('delete-preset-confirm'),
            deletePresetName: document.getElementById('delete-preset-name')
        };
        
        // Validate critical elements
        const missing = Object.entries(this.elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);
        
        if (missing.length > 0) {
            console.error('Missing preset elements:', missing);
        }
    }
    
    /**
     * Setup event listeners for all preset interactions
     */
    setupEventListeners() {
        // Toggle preset panel
        this.elements.presetToggleBtn?.addEventListener('click', () => {
            this.togglePresetPanel();
        });
        
        // Also make the header clickable
        const presetHeader = document.querySelector('.preset-header');
        presetHeader?.addEventListener('click', () => {
            this.togglePresetPanel();
        });
        
        // Preset dropdown selection
        this.elements.presetDropdown?.addEventListener('change', (e) => {
            this.loadSelectedPreset(e.target.value);
        });
        
        // Save preset button
        this.elements.presetSaveBtn?.addEventListener('click', () => {
            this.showSaveModal();
        });
        
        // Delete preset button
        this.elements.presetDeleteBtn?.addEventListener('click', () => {
            this.showDeleteModal();
        });
        
        // Save modal events
        this.elements.saveBackdrop?.addEventListener('click', () => this.hideSaveModal());
        this.elements.saveClose?.addEventListener('click', () => this.hideSaveModal());
        this.elements.saveCancel?.addEventListener('click', () => this.hideSaveModal());
        this.elements.saveConfirm?.addEventListener('click', () => this.saveCurrentPreset());
        
        // Delete modal events
        this.elements.deleteBackdrop?.addEventListener('click', () => this.hideDeleteModal());
        this.elements.deleteCancel?.addEventListener('click', () => this.hideDeleteModal());
        this.elements.deleteConfirm?.addEventListener('click', () => this.deleteSelectedPreset());
        
        // Preset name input validation
        this.elements.presetNameInput?.addEventListener('input', () => {
            this.validatePresetName();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideSaveModal();
                this.hideDeleteModal();
            }
        });
    }
    
    /**
     * Toggle the preset panel visibility
     */
    togglePresetPanel() {
        this.isExpanded = !this.isExpanded;
        
        if (this.isExpanded) {
            this.elements.presetContent.style.display = 'block';
            this.elements.presetToggleBtn.setAttribute('aria-expanded', 'true');
            this.refreshPresetList();
            this.updateStorageDisplay();
        } else {
            this.elements.presetContent.style.display = 'none';
            this.elements.presetToggleBtn.setAttribute('aria-expanded', 'false');
        }
    }
    
    /**
     * Refresh the preset dropdown list
     */
    refreshPresetList() {
        if (!this.elements.presetDropdown) return;
        
        try {
            const metadata = this.storage.getMetadata();
            const dropdown = this.elements.presetDropdown;
            
            // Clear existing options except the first one
            dropdown.innerHTML = '<option value="">Select a preset...</option>';
            
            // Sort presets by last used (most recent first)
            const sortedPresets = [...metadata].sort((a, b) => 
                new Date(b.lastUsedAt) - new Date(a.lastUsedAt)
            );
            
            // Add preset options
            sortedPresets.forEach(preset => {
                const option = document.createElement('option');
                option.value = preset.id;
                
                // Format display text with last used info
                const lastUsed = this.formatLastUsed(preset.lastUsedAt);
                option.textContent = `${preset.name} (${lastUsed})`;
                
                if (preset.id === this.currentPresetId) {
                    option.selected = true;
                }
                
                dropdown.appendChild(option);
            });
            
            // Update delete button state
            this.updateDeleteButtonState();
            
        } catch (error) {
            console.error('Error refreshing preset list:', error);
            Utils.showToast('Failed to load presets', 'error');
        }
    }
    
    /**
     * Format last used timestamp
     */
    formatLastUsed(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    /**
     * Update delete button enabled/disabled state
     */
    updateDeleteButtonState() {
        if (!this.elements.presetDeleteBtn) return;
        
        const hasSelection = this.elements.presetDropdown?.value;
        this.elements.presetDeleteBtn.disabled = !hasSelection;
    }
    
    /**
     * Load selected preset from dropdown
     */
    async loadSelectedPreset(presetId) {
        if (!presetId) {
            this.currentPresetId = null;
            this.updateDeleteButtonState();
            return;
        }
        
        try {
            const { metadata, workflowData } = this.storage.loadPreset(presetId);
            
            // Update app state with loaded workflow
            AppState.workflowData = workflowData;
            AppState.workflowMetadata = null; // Will be parsed in extractWorkflowParameters
            this.currentPresetId = presetId;
            
            // Extract and populate parameters from workflow
            const extractedParams = Utils.extractWorkflowParameters(workflowData);
            Utils.populateFormParameters(extractedParams);
            
            // Parse metadata
            const parsedMetadata = metadataParser.parseWorkflowMetadata(workflowData);
            const normalizedMetadata = metadataParser.normalizeMetadata(parsedMetadata);
            AppState.workflowMetadata = normalizedMetadata;
            
            // Update metadata display (with safety check)
            try {
                if (metadataPanel && typeof metadataPanel.updateDisplay === 'function') {
                    metadataPanel.updateDisplay(normalizedMetadata);
                }
            } catch (error) {
                console.warn('Failed to update metadata display:', error);
            }
            
            // Update UI status
            if (elements?.uploadStatus) {
                elements.uploadStatus.textContent = `Loaded preset: ${metadata.name}`;
                elements.uploadStatus.className = 'upload-status success';
            }
            
            // Update dropdown selection
            if (this.elements.presetDropdown) {
                this.elements.presetDropdown.value = presetId;
            }
            
            this.updateDeleteButtonState();
            this.refreshPresetList(); // Refresh to update last used timestamps
            
            Utils.showToast(`Loaded preset: ${metadata.name}`, 'success');
            console.log('✅ Preset loaded:', metadata.name);
            
        } catch (error) {
            console.error('Error loading preset:', error);
            Utils.showToast('Failed to load preset', 'error');
            
            // Reset selection on error
            this.elements.presetDropdown.value = '';
            this.currentPresetId = null;
            this.updateDeleteButtonState();
        }
    }
    
    /**
     * Show save preset modal
     */
    showSaveModal() {
        if (!AppState.workflowData) {
            Utils.showToast('Please upload a workflow first', 'error');
            return;
        }
        
        // Clear previous input
        this.elements.presetNameInput.value = '';
        this.elements.presetNameError.textContent = '';
        
        // Generate default name
        const timestamp = new Date().toLocaleString();
        this.elements.presetNameInput.value = `Workflow ${timestamp}`;
        this.elements.presetNameInput.select();
        
        this.elements.saveModal.style.display = 'flex';
        this.elements.presetNameInput.focus();
    }
    
    /**
     * Hide save preset modal
     */
    hideSaveModal() {
        this.elements.saveModal.style.display = 'none';
    }
    
    /**
     * Validate preset name input
     */
    validatePresetName() {
        const name = this.elements.presetNameInput.value.trim();
        const errorElement = this.elements.presetNameError;
        
        if (!name) {
            errorElement.textContent = 'Preset name is required';
            this.elements.saveConfirm.disabled = true;
            return false;
        }
        
        if (name.length > 100) {
            errorElement.textContent = 'Preset name must be 100 characters or less';
            this.elements.saveConfirm.disabled = true;
            return false;
        }
        
        // Check for duplicate names
        const metadata = this.storage.getMetadata();
        const duplicate = metadata.find(p => p.name === name);
        if (duplicate) {
            errorElement.textContent = 'A preset with this name already exists';
            this.elements.saveConfirm.disabled = true;
            return false;
        }
        
        errorElement.textContent = '';
        this.elements.saveConfirm.disabled = false;
        return true;
    }
    
    /**
     * Save current workflow as preset
     */
    async saveCurrentPreset() {
        if (!this.validatePresetName()) {
            return;
        }
        
        const name = this.elements.presetNameInput.value.trim();
        
        try {
            console.log('🔄 Saving preset with data:', {
                name,
                dataType: typeof AppState.workflowData,
                dataExists: !!AppState.workflowData,
                dataKeys: AppState.workflowData ? Object.keys(AppState.workflowData).length : 0
            });
            
            const metadata = this.storage.savePreset(name, AppState.workflowData);
            this.currentPresetId = metadata.id;
            
            this.hideSaveModal();
            this.refreshPresetList();
            this.updateStorageDisplay();
            
            // Select the newly saved preset
            this.elements.presetDropdown.value = metadata.id;
            
            Utils.showToast(`Preset saved: ${name}`, 'success');
            console.log('✅ Preset saved:', name);
            
        } catch (error) {
            console.error('Error saving preset:', error);
            
            if (error.message.includes('quota')) {
                this.elements.presetNameError.textContent = 'Storage quota exceeded. Please delete some presets.';
            } else {
                this.elements.presetNameError.textContent = 'Failed to save preset. Please try again.';
            }
        }
    }
    
    /**
     * Show delete confirmation modal
     */
    showDeleteModal() {
        const selectedId = this.elements.presetDropdown.value;
        if (!selectedId) return;
        
        const metadata = this.storage.getMetadata();
        const preset = metadata.find(p => p.id === selectedId);
        if (!preset) return;
        
        this.elements.deletePresetName.textContent = preset.name;
        this.elements.deleteModal.style.display = 'flex';
    }
    
    /**
     * Hide delete confirmation modal
     */
    hideDeleteModal() {
        this.elements.deleteModal.style.display = 'none';
    }
    
    /**
     * Delete selected preset
     */
    async deleteSelectedPreset() {
        const selectedId = this.elements.presetDropdown.value;
        if (!selectedId) return;
        
        try {
            const success = this.storage.deletePreset(selectedId);
            
            if (success) {
                // Clear selection if deleted preset was selected
                if (this.currentPresetId === selectedId) {
                    this.currentPresetId = null;
                }
                
                this.hideDeleteModal();
                this.refreshPresetList();
                this.updateStorageDisplay();
                
                // Reset dropdown selection
                this.elements.presetDropdown.value = '';
                this.updateDeleteButtonState();
                
                Utils.showToast('Preset deleted', 'success');
                console.log('✅ Preset deleted:', selectedId);
            } else {
                throw new Error('Delete operation failed');
            }
            
        } catch (error) {
            console.error('Error deleting preset:', error);
            Utils.showToast('Failed to delete preset', 'error');
        }
    }
    
    /**
     * Update storage usage display
     */
    updateStorageDisplay() {
        if (!this.elements.storageUsage || !this.elements.storageFill) return;
        
        try {
            const usage = this.storage.getStorageUsage();
            
            // Update text
            this.elements.storageUsage.textContent = `${usage.totalSizeKB}KB / 5MB`;
            
            // Update progress bar
            this.elements.storageFill.style.width = `${usage.percentage}%`;
            
            // Update color based on usage
            this.elements.storageFill.className = 'storage-fill';
            if (usage.percentage >= 90) {
                this.elements.storageFill.classList.add('danger');
            } else if (usage.percentage >= 70) {
                this.elements.storageFill.classList.add('warning');
            }
            
            // Show warning if approaching limit
            if (usage.isWarning && usage.percentage >= 90) {
                Utils.showToast(`Storage almost full (${usage.percentage}%). Consider deleting old presets.`, 'warning');
            }
            
        } catch (error) {
            console.error('Error updating storage display:', error);
        }
    }
    
    /**
     * Auto-load last used workflow on app initialization
     */
    autoLoadLastWorkflow() {
        console.log('🔄 Attempting to auto-load last used workflow...');
        
        try {
            const lastWorkflowId = this.storage.getLastUsedWorkflowId();
            if (!lastWorkflowId) {
                console.log('ℹ️ No last used workflow ID found');
                return false;
            }
            
            console.log('📋 Last used workflow ID:', lastWorkflowId);
            
            const metadata = this.storage.getMetadata();
            const preset = metadata.find(p => p.id === lastWorkflowId);
            if (!preset) {
                console.warn('⚠️ Last used workflow preset not found in metadata, cleaning up reference');
                localStorage.removeItem(this.storage.LAST_WORKFLOW_KEY);
                return false;
            }
            
            console.log('📋 Found preset in metadata:', preset.name);
            
            // Load the workflow
            this.loadSelectedPreset(lastWorkflowId);
            return true;
            
        } catch (error) {
            console.error('❌ Error auto-loading last workflow:', error);
            // Clean up potentially corrupted reference
            try {
                localStorage.removeItem(this.storage.LAST_WORKFLOW_KEY);
            } catch (e) {
                console.error('Failed to clean up last workflow reference:', e);
            }
            return false;
        }
    }
}

// Global preset manager instance
let presetManager = null;

// ================================================================================
// End Preset Management System
// ================================================================================

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    cleanupWebSocket();
});

// Start the application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}