# ComfyUI Interface - React Migration Guide

## Overview

This guide provides a complete step-by-step process for migrating the ComfyUI web interface from vanilla HTML/CSS/JavaScript to Node.js + React while preserving all existing functionality and improvements.

## Pre-Migration Setup

### 1. Project Backup & Copy

```bash
# Create backup of current project
cp -r /path/to/ComfyotgTest /path/to/ComfyotgTest-backup

# Create new directory for React version
mkdir ComfyotgTest-react
cd ComfyotgTest-react

# Copy essential files from original
cp -r ../ComfyotgTest/.taskmaster .
cp ../ComfyotgTest/.env .
cp ../ComfyotgTest/.mcp.json .
cp ../ComfyotgTest/README.md .
```

### 2. Environment Requirements

```bash
# Node.js version 18 or higher
node --version

# npm or yarn
npm --version
# or
yarn --version

# Git for version control
git --version
```

### 3. Tool Installation

```bash
# Install Create React App or Vite
npm install -g create-react-app
# or for Vite (recommended)
npm install -g create-vite
```

## Migration Architecture

### Current Structure Analysis

```
ComfyotgTest/
├── index.html              # 535 lines - Main HTML structure
├── script.js               # 3000+ lines - All JavaScript logic
├── style.css               # 2000+ lines - Complete styling
├── presetManager.js        # 458 lines - Preset management
├── CLAUDE.md              # Documentation
└── .taskmaster/           # Task management
```

### Target React Structure

```
ComfyotgTest-react/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── Navigation/
│   │   ├── GenerationControls/
│   │   ├── PromptInput/
│   │   ├── ProgressIndicator/
│   │   ├── PresetManager/
│   │   ├── MetadataPanel/
│   │   └── APIConnection/
│   ├── services/
│   │   ├── comfyuiAPI.js
│   │   ├── websocketService.js
│   │   ├── presetStorage.js
│   │   └── metadataParser.js
│   ├── hooks/
│   │   ├── useWebSocket.js
│   │   ├── useGeneration.js
│   │   └── usePresets.js
│   ├── context/
│   │   └── AppStateContext.js
│   ├── utils/
│   │   └── helpers.js
│   ├── styles/
│   │   ├── global.css
│   │   └── components/
│   ├── App.js
│   └── index.js
├── package.json
└── .taskmaster/           # Copied from original
```

## Phase 1: Project Initialization (1-2 weeks)

### Step 1.1: Create React Application

```bash
# Using Vite (recommended for performance)
npm create vite@latest ComfyotgTest-react -- --template react-ts
cd ComfyotgTest-react
npm install

# Or using Create React App
npx create-react-app ComfyotgTest-react --template typescript
cd ComfyotgTest-react
```

### Step 1.2: Install Dependencies

```bash
# Core dependencies
npm install react-router-dom@6

# Development dependencies
npm install --save-dev @types/react @types/react-dom
npm install --save-dev eslint-plugin-react-hooks
npm install --save-dev prettier eslint-config-prettier
```

### Step 1.3: Configure Project Structure

```bash
# Create directory structure
mkdir -p src/components/{Navigation,GenerationControls,PromptInput,ProgressIndicator,PresetManager,MetadataPanel,APIConnection}
mkdir -p src/services src/hooks src/context src/utils src/styles/components
```

### Step 1.4: Copy and Adapt Styling

```bash
# Copy original CSS as base
cp ../ComfyotgTest/style.css src/styles/global.css
```

**Update src/styles/global.css:**
```css
/* Preserve all existing CSS variables and styles */
:root {
  --color-bg-primary: #0b0f19;
  --color-bg-secondary: #181825;
  --color-bg-tertiary: #1f2937;
  --color-accent-orange: #ff7c00;
  --color-accent-blue: #1f77b4;
  --color-text-primary: #ffffff;
  --color-text-secondary: #9ca3af;
  --color-border: #374151;
  --color-error: #ef4444;
  --color-success: #10b981;
  /* ... keep all existing variables */
}

/* Convert existing styles to CSS modules or styled-components */
/* Maintain all current styling and responsive design */
```

## Phase 2: Core Component Migration (2-3 weeks)

### Step 2.1: App State Management

**src/context/AppStateContext.js:**
```javascript
import React, { createContext, useContext, useReducer } from 'react';

const AppStateContext = createContext();

const initialState = {
  isGenerating: false,
  currentWorkflow: null,
  workflowMetadata: null,
  generationHistory: [],
  apiEndpoint: 'http://192.168.10.15:8188',
  connectionStatus: 'unknown',
  realtimeStatus: {
    visible: false,
    currentNode: null,
    progress: 0,
    step: 0,
    totalSteps: 0
  },
  presets: [],
  currentPreset: null
};

function appStateReducer(state, action) {
  switch (action.type) {
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    case 'SET_WORKFLOW':
      return { ...state, currentWorkflow: action.payload };
    case 'SET_WORKFLOW_METADATA':
      return { ...state, workflowMetadata: action.payload };
    case 'UPDATE_PROGRESS':
      return { 
        ...state, 
        realtimeStatus: { ...state.realtimeStatus, ...action.payload }
      };
    case 'SET_API_ENDPOINT':
      return { ...state, apiEndpoint: action.payload };
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };
    case 'ADD_TO_HISTORY':
      return { 
        ...state, 
        generationHistory: [action.payload, ...state.generationHistory]
      };
    case 'SET_PRESETS':
      return { ...state, presets: action.payload };
    case 'SET_CURRENT_PRESET':
      return { ...state, currentPreset: action.payload };
    default:
      return state;
  }
}

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}
```

### Step 2.2: Service Layer Migration

**src/services/comfyuiAPI.js:**
```javascript
// Migrate existing API functions from script.js
class ComfyUIAPI {
  constructor() {
    this.baseURL = '';
    this.timeout = 30000;
  }

  setBaseURL(url) {
    this.baseURL = url;
  }

  async testConnection() {
    // Migrate existing connection test logic
    try {
      const response = await this.makeRequest('/system_stats', 'GET', null, 5000);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async submitWorkflow(workflow) {
    // Migrate existing workflow submission logic
    try {
      const response = await this.makeRequest('/prompt', 'POST', {
        prompt: workflow
      });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async interrupt() {
    // Migrate existing interrupt logic
    try {
      const response = await this.makeRequest('/interrupt', 'POST');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async makeRequest(endpoint, method, data, timeout = this.timeout) {
    // Migrate existing request logic with all error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }
}

export default new ComfyUIAPI();
```

**src/services/websocketService.js:**
```javascript
// Migrate WebSocket service from script.js
class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectInterval = 1000;
    this.listeners = new Map();
    this.isManuallyDisconnected = false;
  }

  connect(url) {
    // Migrate existing WebSocket connection logic
    this.isManuallyDisconnected = false;
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    this.ws.onclose = () => {
      this.emit('disconnected');
      if (!this.isManuallyDisconnected) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };
  }

  handleMessage(data) {
    // Migrate message handling logic
    const { type, data: messageData } = data;
    
    switch (type) {
      case 'executing':
        this.emit('executing', messageData);
        break;
      case 'progress':
        this.emit('progress', messageData);
        break;
      case 'executed':
        this.emit('executed', messageData);
        break;
      case 'execution_error':
        this.emit('execution_error', messageData);
        break;
      default:
        this.emit('message', data);
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  disconnect() {
    this.isManuallyDisconnected = true;
    if (this.ws) {
      this.ws.close();
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(this.ws.url);
      }, this.reconnectInterval * Math.pow(2, this.reconnectAttempts));
    }
  }
}

export default new WebSocketService();
```

**src/services/presetStorage.js:**
```javascript
// Migrate PresetStorageService from presetManager.js
class PresetStorageService {
  constructor() {
    this.PRESET_PREFIX = 'comfyui_preset_';
    this.METADATA_KEY = 'comfyui_preset_metadata';
    this.LAST_WORKFLOW_KEY = 'comfyui_last_workflow_id';
    this.STORAGE_WARNING_THRESHOLD = 0.8;
    this.MAX_STORAGE_SIZE = 5 * 1024 * 1024;
    
    if (!this.getMetadata()) {
      this.setMetadata([]);
    }
  }

  // Copy all existing methods from presetManager.js
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  compress(workflowData) {
    // Copy existing compression logic
    try {
      if (!workflowData) {
        throw new Error('No workflow data provided');
      }
      
      let cleanData = workflowData;
      if (typeof workflowData === 'string') {
        try {
          cleanData = JSON.parse(workflowData);
        } catch (e) {
          throw new Error('Invalid JSON string provided');
        }
      }
      
      const jsonString = JSON.stringify(cleanData);
      if (!jsonString || jsonString === 'null' || jsonString === 'undefined') {
        throw new Error('Failed to serialize workflow data to JSON');
      }
      
      const compressed = btoa(jsonString);
      if (!compressed) {
        throw new Error('Compression failed');
      }
      
      return compressed;
    } catch (error) {
      console.error('Compression error:', error);
      throw new Error(`Failed to compress workflow data: ${error.message}`);
    }
  }

  decompress(compressedData) {
    // Copy existing decompression logic
    try {
      if (!compressedData) {
        throw new Error('No compressed data provided');
      }
      
      const jsonString = atob(compressedData);
      
      if (!jsonString) {
        throw new Error('Decompression resulted in empty data');
      }
      
      const result = JSON.parse(jsonString);
      if (!result || typeof result !== 'object') {
        throw new Error('Decompressed data is not a valid object');
      }
      return result;
    } catch (error) {
      console.error('Decompression error:', error);
      throw new Error(`Failed to decompress workflow data: ${error.message}`);
    }
  }

  // Copy all other methods from presetManager.js
  // ... (savePreset, loadPreset, deletePreset, etc.)
}

export default new PresetStorageService();
```

### Step 2.3: Custom Hooks

**src/hooks/useWebSocket.js:**
```javascript
import { useEffect, useCallback } from 'react';
import { useAppState } from '../context/AppStateContext';
import websocketService from '../services/websocketService';

export function useWebSocket() {
  const { state, dispatch } = useAppState();

  const connect = useCallback((url) => {
    websocketService.connect(url);
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  useEffect(() => {
    const handleProgress = (data) => {
      dispatch({
        type: 'UPDATE_PROGRESS',
        payload: {
          progress: data.value || 0,
          step: data.value || 0,
          totalSteps: data.max || 0
        }
      });
    };

    const handleExecuting = (data) => {
      if (data.node) {
        dispatch({
          type: 'UPDATE_PROGRESS',
          payload: {
            currentNode: data.node,
            visible: true
          }
        });
      } else {
        // Generation completed
        dispatch({
          type: 'UPDATE_PROGRESS',
          payload: {
            visible: false,
            currentNode: null,
            progress: 0
          }
        });
        dispatch({ type: 'SET_GENERATING', payload: false });
      }
    };

    const handleExecuted = (data) => {
      // Handle execution completion
      dispatch({
        type: 'UPDATE_PROGRESS',
        payload: {
          visible: false
        }
      });
    };

    const handleError = (data) => {
      dispatch({ type: 'SET_GENERATING', payload: false });
      dispatch({
        type: 'UPDATE_PROGRESS',
        payload: {
          visible: false
        }
      });
    };

    websocketService.on('progress', handleProgress);
    websocketService.on('executing', handleExecuting);
    websocketService.on('executed', handleExecuted);
    websocketService.on('execution_error', handleError);

    return () => {
      websocketService.off('progress', handleProgress);
      websocketService.off('executing', handleExecuting);
      websocketService.off('executed', handleExecuted);
      websocketService.off('execution_error', handleError);
    };
  }, [dispatch]);

  return { connect, disconnect };
}
```

**src/hooks/useGeneration.js:**
```javascript
import { useCallback } from 'react';
import { useAppState } from '../context/AppStateContext';
import comfyuiAPI from '../services/comfyuiAPI';

export function useGeneration() {
  const { state, dispatch } = useAppState();

  const startGeneration = useCallback(async (workflow) => {
    try {
      dispatch({ type: 'SET_GENERATING', payload: true });
      
      const result = await comfyuiAPI.submitWorkflow(workflow);
      
      if (result.success) {
        dispatch({
          type: 'UPDATE_PROGRESS',
          payload: {
            visible: true,
            currentNode: 'Starting...',
            progress: 0
          }
        });
        return { success: true, data: result.data };
      } else {
        dispatch({ type: 'SET_GENERATING', payload: false });
        return { success: false, error: result.error };
      }
    } catch (error) {
      dispatch({ type: 'SET_GENERATING', payload: false });
      return { success: false, error: error.message };
    }
  }, [dispatch]);

  const cancelGeneration = useCallback(async () => {
    try {
      const result = await comfyuiAPI.interrupt();
      if (result.success) {
        dispatch({ type: 'SET_GENERATING', payload: false });
        dispatch({
          type: 'UPDATE_PROGRESS',
          payload: {
            visible: false
          }
        });
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [dispatch]);

  return {
    startGeneration,
    cancelGeneration,
    isGenerating: state.isGenerating,
    progress: state.realtimeStatus
  };
}
```

### Step 2.4: Component Migration

**src/components/Navigation/Navigation.js:**
```javascript
import React from 'react';
import './Navigation.css';

const Navigation = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'generate', label: 'txt2img', ariaLabel: 'txt2img mode' },
    { id: 'history', label: 'img2img', ariaLabel: 'img2img mode' },
    { id: 'models', label: 'Extras', ariaLabel: 'Extras mode' },
    { id: 'settings', label: 'Settings', ariaLabel: 'Settings mode' },
    { id: 'queue', label: 'Queue', ariaLabel: 'Queue mode' }
  ];

  return (
    <header className="app-header">
      <div className="app-header-content">
        <div className="app-logo">
          <h1 className="app-title">ComfyUI Runner</h1>
        </div>
        <nav className="app-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              data-mode={tab.id}
              aria-label={tab.ariaLabel}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Navigation;
```

**src/components/PromptInput/PromptInput.js:**
```javascript
import React, { useState } from 'react';
import './PromptInput.css';

const PromptInput = ({ value, onChange, placeholder }) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="prompt-controls">
      <legend className="control-label">Prompt</legend>
      <div className="control-group">
        <label htmlFor="positive-prompt" className="control-label">
          Positive Prompt
        </label>
        <div className="prompt-container">
          <textarea
            id="positive-prompt"
            name="positive_prompt"
            className="prompt-textarea"
            placeholder={placeholder}
            rows="3"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          <div className="prompt-toolbar">
            <button
              type="button"
              className="icon-button"
              title="Clear prompt"
              onClick={handleClear}
            >
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path
                  fill="currentColor"
                  d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptInput;
```

**src/components/ProgressIndicator/ProgressIndicator.js:**
```javascript
import React from 'react';
import { useAppState } from '../../context/AppStateContext';
import './ProgressIndicator.css';

const ProgressIndicator = () => {
  const { state } = useAppState();
  const { realtimeStatus } = state;

  if (!realtimeStatus.visible) {
    return null;
  }

  return (
    <div className="realtime-status" style={{ display: 'block' }}>
      <div className="status-header">
        <h4>Generation Status</h4>
        <div className="websocket-indicator">
          <div className="indicator-dot"></div>
          <span>Real-time</span>
        </div>
      </div>
      
      <div className="execution-status">
        <div className="current-node">
          <span className="node-label">Current:</span>
          <span className="node-name">
            {realtimeStatus.currentNode || '-'}
          </span>
        </div>
      </div>
      
      {realtimeStatus.progress > 0 && (
        <div className="progress-container" style={{ display: 'block' }}>
          <div className="progress-info">
            <span className="progress-label">Generating</span>
            <span className="progress-percentage">
              {Math.round(realtimeStatus.progress)}%
            </span>
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar"
              style={{ width: `${realtimeStatus.progress}%` }}
            />
          </div>
          <div className="progress-details">
            <span className="progress-step">
              {realtimeStatus.step} / {realtimeStatus.totalSteps}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;
```

**src/components/APIConnection/APIConnection.js:**
```javascript
import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import comfyuiAPI from '../../services/comfyuiAPI';
import './APIConnection.css';

const APIConnection = () => {
  const { state, dispatch } = useAppState();
  const [apiUrl, setApiUrl] = useState(state.apiEndpoint);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    setApiUrl(state.apiEndpoint);
  }, [state.apiEndpoint]);

  const validateUrl = (url) => {
    // Copy existing URL validation logic
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleApply = async () => {
    if (!validateUrl(apiUrl)) {
      alert('Please enter a valid URL');
      return;
    }

    setIsApplying(true);
    try {
      // Save to localStorage
      localStorage.setItem('comfyui_api_endpoint', apiUrl);
      
      // Update app state
      dispatch({ type: 'SET_API_ENDPOINT', payload: apiUrl });
      
      // Update API service
      comfyuiAPI.setBaseURL(apiUrl);
      
      // Emit event for other components
      window.dispatchEvent(new CustomEvent('api-config-updated', {
        detail: { endpoint: apiUrl }
      }));
      
      console.log('API endpoint saved successfully');
    } catch (error) {
      console.error('Error saving API endpoint:', error);
      alert('Failed to save API endpoint');
    } finally {
      setIsApplying(false);
    }
  };

  const handleTest = async () => {
    if (!validateUrl(apiUrl)) {
      alert('Please enter a valid URL');
      return;
    }

    setIsTestingConnection(true);
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'testing' });

    try {
      // Set URL for testing
      comfyuiAPI.setBaseURL(apiUrl);
      
      const result = await comfyuiAPI.testConnection();
      
      if (result.success) {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
      } else {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
        alert(`Connection failed: ${result.error}`);
      }
    } catch (error) {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
      alert(`Connection error: ${error.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <section className="api-section">
      <h3 className="section-title">API Connection</h3>
      <div className="control-group">
        <label htmlFor="api-url" className="control-label">
          ComfyUI API Endpoint
        </label>
        <div className="input-with-button">
          <input
            type="url"
            id="api-url"
            name="api_url"
            className="api-input"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://192.168.10.15:8188"
            required
          />
          <button
            type="button"
            className={`apply-button ${isApplying ? 'loading' : ''}`}
            onClick={handleApply}
            disabled={isApplying}
          >
            <span className="button-text">Apply</span>
            {isApplying && (
              <span className="button-spinner">
                <svg className="spinner" viewBox="0 0 50 50">
                  <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray="80 20"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            )}
          </button>
          <button
            type="button"
            className="test-button"
            onClick={handleTest}
            disabled={isTestingConnection}
          >
            {isTestingConnection ? 'Testing...' : 'Test'}
          </button>
        </div>
        <div className="connection-status">
          <span
            className="status-indicator"
            data-status={state.connectionStatus}
          />
          <span className="status-text">
            {state.connectionStatus === 'connected' && 'Connected'}
            {state.connectionStatus === 'error' && 'Connection failed'}
            {state.connectionStatus === 'testing' && 'Testing...'}
            {state.connectionStatus === 'unknown' && 'Not tested'}
          </span>
        </div>
      </div>
    </section>
  );
};

export default APIConnection;
```

### Step 2.5: Main App Component

**src/App.js:**
```javascript
import React, { useState, useEffect } from 'react';
import { AppStateProvider } from './context/AppStateContext';
import Navigation from './components/Navigation/Navigation';
import GenerationControls from './components/GenerationControls/GenerationControls';
import ProgressIndicator from './components/ProgressIndicator/ProgressIndicator';
import APIConnection from './components/APIConnection/APIConnection';
import { useWebSocket } from './hooks/useWebSocket';
import './styles/global.css';

function AppContent() {
  const [activeTab, setActiveTab] = useState('generate');
  const { connect } = useWebSocket();

  useEffect(() => {
    // Initialize WebSocket connection
    const apiEndpoint = localStorage.getItem('comfyui_api_endpoint') || 'http://192.168.10.15:8188';
    const wsUrl = apiEndpoint.replace(/^https?:\/\//, 'ws://').replace(/\/$/, '') + '/ws';
    connect(wsUrl);

    // Listen for API endpoint changes
    const handleApiConfigUpdate = (event) => {
      const { endpoint } = event.detail;
      const wsUrl = endpoint.replace(/^https?:\/\//, 'ws://').replace(/\/$/, '') + '/ws';
      connect(wsUrl);
    };

    window.addEventListener('api-config-updated', handleApiConfigUpdate);
    return () => {
      window.removeEventListener('api-config-updated', handleApiConfigUpdate);
    };
  }, [connect]);

  return (
    <div className="App">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="main-container">
        {activeTab === 'generate' && (
          <div className="mode-content active">
            <section className="left-panel">
              <header className="panel-header">
                <h2 className="panel-title">Workflow Controls</h2>
              </header>
              
              <ProgressIndicator />
              <APIConnection />
              <GenerationControls />
            </section>
            
            <section className="right-panel">
              <header className="panel-header">
                <h2 className="panel-title">Generated Images</h2>
              </header>
              
              <div className="results-area">
                <div className="empty-state">
                  <svg className="empty-icon" viewBox="0 0 24 24" width="48" height="48">
                    <path
                      fill="currentColor"
                      d="M21,17H7V3A1,1 0 0,1 8,2H20A1,1 0 0,1 21,3V17M19,19H5V5H3V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19H19M11,6H18V8H11V6M11,10H18V12H11V10M11,14H18V16H11V14Z"
                    />
                  </svg>
                  <p className="empty-text">
                    Upload a workflow and click Generate to see results here
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
        
        {activeTab === 'history' && (
          <div className="mode-content">
            <section className="history-panel">
              <header className="panel-header">
                <h2 className="panel-title">img2img</h2>
              </header>
              <div className="history-content">
                <div className="empty-state">
                  <p className="empty-text">img2img functionality coming soon</p>
                </div>
              </div>
            </section>
          </div>
        )}
        
        {/* Add other tab content as needed */}
      </main>
    </div>
  );
}

function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
}

export default App;
```

**src/index.js:**
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## Phase 3: Advanced Features Migration (2-3 weeks)

### Step 3.1: Preset Management Component

**src/components/PresetManager/PresetManager.js:**
```javascript
import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import presetStorage from '../../services/presetStorage';
import './PresetManager.css';

const PresetManager = () => {
  const { state, dispatch } = useAppState();
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [storageUsage, setStorageUsage] = useState(null);

  useEffect(() => {
    loadPresets();
    updateStorageUsage();
  }, []);

  const loadPresets = () => {
    try {
      const metadata = presetStorage.getMetadata();
      setPresets(metadata);
    } catch (error) {
      console.error('Error loading presets:', error);
    }
  };

  const updateStorageUsage = () => {
    try {
      const usage = presetStorage.getStorageUsage();
      setStorageUsage(usage);
    } catch (error) {
      console.error('Error getting storage usage:', error);
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }

    if (!state.currentWorkflow) {
      alert('No workflow loaded to save');
      return;
    }

    try {
      await presetStorage.savePreset(presetName, state.currentWorkflow);
      setShowSaveModal(false);
      setPresetName('');
      loadPresets();
      updateStorageUsage();
      alert('Preset saved successfully');
    } catch (error) {
      console.error('Error saving preset:', error);
      alert(`Failed to save preset: ${error.message}`);
    }
  };

  const handleLoadPreset = async (presetId) => {
    try {
      const { workflowData, metadata } = await presetStorage.loadPreset(presetId);
      dispatch({ type: 'SET_WORKFLOW', payload: workflowData });
      dispatch({ type: 'SET_WORKFLOW_METADATA', payload: metadata });
      dispatch({ type: 'SET_CURRENT_PRESET', payload: presetId });
      setSelectedPreset(presetId);
      alert('Preset loaded successfully');
    } catch (error) {
      console.error('Error loading preset:', error);
      alert(`Failed to load preset: ${error.message}`);
    }
  };

  const handleDeletePreset = async () => {
    if (!selectedPreset) return;

    try {
      await presetStorage.deletePreset(selectedPreset);
      setShowDeleteModal(false);
      setSelectedPreset('');
      loadPresets();
      updateStorageUsage();
      alert('Preset deleted successfully');
    } catch (error) {
      console.error('Error deleting preset:', error);
      alert(`Failed to delete preset: ${error.message}`);
    }
  };

  return (
    <section className="preset-section">
      <div className="preset-header">
        <h3 className="section-title">Workflow Presets</h3>
        <button
          type="button"
          className="preset-toggle-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          <svg className="toggle-icon" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M7,10L12,15L17,10H7Z" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="preset-content">
          <div className="preset-controls">
            <select
              className="preset-dropdown"
              value={selectedPreset}
              onChange={(e) => {
                setSelectedPreset(e.target.value);
                if (e.target.value) {
                  handleLoadPreset(e.target.value);
                }
              }}
            >
              <option value="">Select a preset...</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <div className="preset-buttons">
              <button
                type="button"
                className="preset-save-btn"
                onClick={() => setShowSaveModal(true)}
                title="Save current workflow"
              >
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path
                    fill="currentColor"
                    d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="preset-delete-btn"
                onClick={() => setShowDeleteModal(true)}
                disabled={!selectedPreset}
                title="Delete selected preset"
              >
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path
                    fill="currentColor"
                    d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {storageUsage && (
            <div className="storage-info">
              <div className="storage-text">
                <span>Storage: </span>
                <span className="storage-usage">
                  {storageUsage.totalSizeKB}KB / 5MB
                </span>
              </div>
              <div className="storage-bar">
                <div
                  className="storage-fill"
                  style={{ width: `${storageUsage.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal">
          <div className="modal-backdrop" onClick={() => setShowSaveModal(false)} />
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Save Workflow Preset</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowSaveModal(false)}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="currentColor"
                    d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
                  />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <label htmlFor="preset-name-input" className="control-label">
                Preset Name
              </label>
              <input
                type="text"
                id="preset-name-input"
                className="preset-name-input"
                placeholder="Enter preset name..."
                maxLength="100"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-save-btn"
                onClick={handleSavePreset}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal">
          <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)} />
          <div className="modal-content modal-compact">
            <div className="modal-header">
              <h3 className="modal-title">Delete Preset</h3>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete "
                <span>
                  {presets.find(p => p.id === selectedPreset)?.name}
                </span>
                "?
              </p>
              <p className="modal-warning">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-delete-btn"
                onClick={handleDeletePreset}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PresetManager;
```

### Step 3.2: Metadata Panel Component

**src/components/MetadataPanel/MetadataPanel.js:**
```javascript
import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import './MetadataPanel.css';

const MetadataPanel = () => {
  const { state } = useAppState();
  const [metadata, setMetadata] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    if (state.workflowMetadata) {
      setMetadata(state.workflowMetadata);
    }
  }, [state.workflowMetadata]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  if (!metadata) {
    return null;
  }

  return (
    <div className="metadata-panel">
      <div className="metadata-title">
        <h3>Generation Details</h3>
      </div>

      {/* Generation Settings */}
      <div className="metadata-section">
        <div
          className="metadata-section-header"
          onClick={() => toggleSection('generation')}
        >
          <h4>Generation Settings</h4>
          <svg
            className={`chevron ${expandedSections.generation ? 'expanded' : ''}`}
            viewBox="0 0 24 24"
            width="16"
            height="16"
          >
            <path fill="currentColor" d="M7,10L12,15L17,10H7Z" />
          </svg>
        </div>
        {expandedSections.generation && (
          <div className="metadata-content">
            {metadata.generation && Object.entries(metadata.generation).map(([key, value]) => (
              <div key={key} className="metadata-item">
                <span className="metadata-label">{key}:</span>
                <span className="metadata-value">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Properties */}
      <div className="metadata-section">
        <div
          className="metadata-section-header"
          onClick={() => toggleSection('image')}
        >
          <h4>Image Properties</h4>
          <svg
            className={`chevron ${expandedSections.image ? 'expanded' : ''}`}
            viewBox="0 0 24 24"
            width="16"
            height="16"
          >
            <path fill="currentColor" d="M7,10L12,15L17,10H7Z" />
          </svg>
        </div>
        {expandedSections.image && (
          <div className="metadata-content">
            {metadata.image && Object.entries(metadata.image).map(([key, value]) => (
              <div key={key} className="metadata-item">
                <span className="metadata-label">{key}:</span>
                <span className="metadata-value">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timing Information */}
      <div className="metadata-section">
        <div
          className="metadata-section-header"
          onClick={() => toggleSection('timing')}
        >
          <h4>Timing Information</h4>
          <svg
            className={`chevron ${expandedSections.timing ? 'expanded' : ''}`}
            viewBox="0 0 24 24"
            width="16"
            height="16"
          >
            <path fill="currentColor" d="M7,10L12,15L17,10H7Z" />
          </svg>
        </div>
        {expandedSections.timing && (
          <div className="metadata-content">
            {metadata.timing && Object.entries(metadata.timing).map(([key, value]) => (
              <div key={key} className="metadata-item">
                <span className="metadata-label">{key}:</span>
                <span className="metadata-value">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prompt Information */}
      {metadata.prompts && (
        <div className="metadata-prompt-section">
          <h4>Prompt Information</h4>
          <div className="prompt-section">
            <div className="prompt-item">
              <span className="prompt-label">Positive:</span>
              <div className="prompt-content">
                <pre>{metadata.prompts.positive}</pre>
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(metadata.prompts.positive)}
                >
                  Copy
                </button>
              </div>
            </div>
            {metadata.prompts.negative && (
              <div className="prompt-item">
                <span className="prompt-label">Negative:</span>
                <div className="prompt-content">
                  <pre>{metadata.prompts.negative}</pre>
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(metadata.prompts.negative)}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="metadata-actions">
        <button
          className="metadata-action-btn"
          onClick={() => copyToClipboard(JSON.stringify(metadata, null, 2))}
        >
          Copy All Metadata
        </button>
      </div>
    </div>
  );
};

export default MetadataPanel;
```

## Phase 4: Testing & Optimization (1-2 weeks)

### Step 4.1: Testing Setup

**package.json testing dependencies:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/user-event": "^14.4.3",
    "jest": "^29.5.0",
    "jest-environment-jsdom": "^29.5.0"
  }
}
```

**src/setupTests.js:**
```javascript
import '@testing-library/jest-dom';
```

### Step 4.2: Component Tests

**src/components/__tests__/Navigation.test.js:**
```javascript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navigation from '../Navigation/Navigation';

describe('Navigation', () => {
  const mockOnTabChange = jest.fn();
  const defaultProps = {
    activeTab: 'generate',
    onTabChange: mockOnTabChange
  };

  beforeEach(() => {
    mockOnTabChange.mockClear();
  });

  test('renders all navigation tabs', () => {
    render(<Navigation {...defaultProps} />);
    
    expect(screen.getByText('txt2img')).toBeInTheDocument();
    expect(screen.getByText('img2img')).toBeInTheDocument();
    expect(screen.getByText('Extras')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Queue')).toBeInTheDocument();
  });

  test('highlights active tab', () => {
    render(<Navigation {...defaultProps} />);
    
    const activeTab = screen.getByText('txt2img');
    expect(activeTab).toHaveClass('active');
  });

  test('calls onTabChange when tab is clicked', () => {
    render(<Navigation {...defaultProps} />);
    
    const historyTab = screen.getByText('img2img');
    fireEvent.click(historyTab);
    
    expect(mockOnTabChange).toHaveBeenCalledWith('history');
  });
});
```

### Step 4.3: Integration Tests

**src/__tests__/App.integration.test.js:**
```javascript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock services
jest.mock('../services/comfyuiAPI');
jest.mock('../services/websocketService');

describe('App Integration', () => {
  test('renders main application', () => {
    render(<App />);
    
    expect(screen.getByText('ComfyUI Runner')).toBeInTheDocument();
    expect(screen.getByText('Workflow Controls')).toBeInTheDocument();
    expect(screen.getByText('Generated Images')).toBeInTheDocument();
  });

  test('navigation between tabs works', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Click on img2img tab
    await user.click(screen.getByText('img2img'));
    
    await waitFor(() => {
      expect(screen.getByText('img2img functionality coming soon')).toBeInTheDocument();
    });
  });

  test('API connection form works', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const apiInput = screen.getByPlaceholderText('http://192.168.10.15:8188');
    await user.clear(apiInput);
    await user.type(apiInput, 'http://localhost:8188');
    
    expect(apiInput).toHaveValue('http://localhost:8188');
  });
});
```

### Step 4.4: Performance Optimization

**src/components/OptimizedComponent.js:**
```javascript
import React, { memo, useMemo, useCallback } from 'react';

const OptimizedComponent = memo(({ data, onAction }) => {
  const processedData = useMemo(() => {
    // Expensive computation
    return data.map(item => ({
      ...item,
      processed: true
    }));
  }, [data]);

  const handleAction = useCallback((id) => {
    onAction(id);
  }, [onAction]);

  return (
    <div>
      {processedData.map(item => (
        <div key={item.id} onClick={() => handleAction(item.id)}>
          {item.name}
        </div>
      ))}
    </div>
  );
});

export default OptimizedComponent;
```

**Code Splitting Example:**
```javascript
import React, { lazy, Suspense } from 'react';

const LazyMetadataPanel = lazy(() => import('./MetadataPanel/MetadataPanel'));

const App = () => {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <LazyMetadataPanel />
      </Suspense>
    </div>
  );
};
```

## Migration Checklist

### Feature Parity Checklist

- [ ] **Navigation System**
  - [ ] Tab switching works correctly
  - [ ] Active tab highlighting
  - [ ] Keyboard navigation
  - [ ] ARIA labels preserved

- [ ] **API Connection**
  - [ ] Apply button functionality
  - [ ] Test button functionality
  - [ ] URL validation
  - [ ] Connection status display
  - [ ] Error handling

- [ ] **Prompt Input**
  - [ ] Textarea functionality
  - [ ] Improved height/padding
  - [ ] Clear button
  - [ ] No fieldset borders

- [ ] **Real-time Progress**
  - [ ] WebSocket connection
  - [ ] Progress bar updates
  - [ ] Step counter
  - [ ] Node execution display
  - [ ] Error handling

- [ ] **Generation System**
  - [ ] Workflow upload
  - [ ] Parameter controls
  - [ ] Generate button
  - [ ] Cancel button
  - [ ] State management

- [ ] **Preset Management**
  - [ ] Save presets
  - [ ] Load presets
  - [ ] Delete presets
  - [ ] Storage monitoring
  - [ ] Compression system

- [ ] **Metadata Display**
  - [ ] Parameter extraction
  - [ ] Timing information
  - [ ] Collapsible sections
  - [ ] Copy functionality

### Performance Benchmarks

- [ ] **Bundle Size**
  - [ ] Initial bundle < 1MB
  - [ ] Lazy loading implemented
  - [ ] Code splitting working

- [ ] **Runtime Performance**
  - [ ] First Paint < 2s
  - [ ] Time to Interactive < 3s
  - [ ] WebSocket connection stable

- [ ] **Memory Usage**
  - [ ] No memory leaks
  - [ ] Proper cleanup
  - [ ] Event listener management

## Troubleshooting Guide

### Common Migration Issues

**1. CSS Conflicts**
```css
/* Issue: Global CSS conflicts */
/* Solution: Use CSS modules or styled-components */
.navigation-module {
  /* Component-specific styles */
}
```

**2. State Management Issues**
```javascript
// Issue: State not updating
// Solution: Check useCallback dependencies
const handleUpdate = useCallback(() => {
  dispatch({ type: 'UPDATE', payload: data });
}, [data]); // Missing dependency
```

**3. WebSocket Connection Problems**
```javascript
// Issue: Connection not working
// Solution: Check URL construction
const wsUrl = apiEndpoint
  .replace(/^https?:\/\//, 'ws://')
  .replace(/\/$/, '') + '/ws';
```

### Performance Issues

**1. Unnecessary Re-renders**
```javascript
// Issue: Component re-rendering too often
// Solution: Use React.memo and useMemo
const OptimizedComponent = memo(({ data }) => {
  const processedData = useMemo(() => 
    expensiveProcessing(data), [data]
  );
  return <div>{processedData}</div>;
});
```

**2. Bundle Size Too Large**
```javascript
// Issue: Large bundle size
// Solution: Implement code splitting
const LazyComponent = lazy(() => import('./LazyComponent'));
```

## Rollback Strategy

### Safe Migration Approach

1. **Backup Original**
   ```bash
   # Keep original as backup
   cp -r ComfyotgTest ComfyotgTest-original
   ```

2. **Feature Flags**
   ```javascript
   // Enable gradual rollout
   const USE_REACT_COMPONENT = process.env.REACT_MIGRATION === 'true';
   
   return USE_REACT_COMPONENT ? 
     <ReactComponent /> : 
     <OriginalComponent />;
   ```

3. **Rollback Procedures**
   ```bash
   # If migration fails, rollback
   rm -rf ComfyotgTest-react
   mv ComfyotgTest-original ComfyotgTest
   ```

### Risk Mitigation

1. **Incremental Migration**
   - Start with one component
   - Test thoroughly before proceeding
   - Maintain feature parity

2. **Testing Strategy**
   - Unit tests for all components
   - Integration tests for workflows
   - Manual testing across browsers

3. **Monitoring**
   - Performance monitoring
   - Error tracking
   - User feedback collection

## Deployment

### Build Configuration

**package.json:**
```json
{
  "scripts": {
    "build": "react-scripts build",
    "build:analyze": "npm run build && npx webpack-bundle-analyzer build/static/js/*.js"
  }
}
```

### Production Deployment

```bash
# Build production version
npm run build

# Test production build
npm install -g serve
serve -s build

# Deploy to server
rsync -av build/ user@server:/path/to/deployment/
```

## Success Metrics

### Technical Metrics
- [ ] Bundle size optimized
- [ ] Performance improved
- [ ] Memory usage stable
- [ ] Test coverage > 80%

### User Experience Metrics
- [ ] All features working
- [ ] No regression in functionality
- [ ] Improved development speed
- [ ] Better error handling

### Development Metrics
- [ ] Code maintainability improved
- [ ] Team productivity increased
- [ ] Bug resolution faster
- [ ] Feature development accelerated

---

This comprehensive migration guide provides all the necessary information to successfully migrate the ComfyUI interface from vanilla JavaScript to React while preserving all existing functionality and improvements. The step-by-step approach ensures a safe migration with proper testing and rollback procedures.