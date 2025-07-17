# InterruptService Testing Guide

## Overview
This guide covers testing the InterruptService implementation for ComfyUI integration.

## Test Files Created
1. `test-interrupt.html` - Standalone test page for InterruptService
2. `test-instructions.md` - This guide

## Testing Methods

### 1. Unit Testing with Test Page

**Setup:**
```bash
cd /Users/james.crawford/ComfyotgTest
python3 -m http.server 8000
```

**Open:** http://localhost:8000/test-interrupt.html

**Tests Available:**
- ✅ Service initialization
- ✅ Successful interrupt
- ✅ Timeout error handling
- ✅ Network error handling
- ✅ Server error handling
- ✅ Retry logic with exponential backoff
- ✅ Event emission system
- ✅ State management

### 2. Integration Testing with ComfyUI

**Prerequisites:**
- ComfyUI running on localhost:8188 (or configure endpoint)
- Active generation in progress

**Test Steps:**

1. **Start ComfyUI**
```bash
# Start ComfyUI server
cd /path/to/ComfyUI
python main.py --listen 0.0.0.0 --port 8188
```

2. **Open Main Application**
```bash
cd /Users/james.crawford/ComfyotgTest
python3 -m http.server 8000
```
Open: http://localhost:8000

3. **Test Interrupt Functionality**
   - Upload a workflow JSON file
   - Start generation
   - Click Cancel button during generation
   - Observe console logs for InterruptService activity

### 3. Manual Testing Scenarios

#### Scenario 1: Successful Interrupt
1. Start a long-running generation (high steps/large image)
2. Click cancel button immediately
3. **Expected:** Generation stops, success toast appears

#### Scenario 2: Network Issues
1. Disconnect from network
2. Start generation and try to cancel
3. **Expected:** Retry attempts with exponential backoff

#### Scenario 3: Server Errors
1. Stop ComfyUI server
2. Try to cancel (with no server running)
3. **Expected:** Appropriate error message

#### Scenario 4: Timeout Testing
1. Configure short timeout (modify service config)
2. Simulate slow network
3. **Expected:** Timeout error with retry

### 4. Browser Console Testing

**Open Developer Tools and run:**

```javascript
// Check service state
console.log('Service state:', AppState.interruptService.getState());

// Check interrupt history
console.log('Interrupt history:', AppState.interruptService.getHistory());

// Manual interrupt test
AppState.interruptService.interrupt().then(result => {
  console.log('Interrupt result:', result);
});

// Test event listeners
AppState.interruptService.on('testEvent', data => {
  console.log('Test event:', data);
});
AppState.interruptService.emit('testEvent', { test: true });
```

### 5. Performance Testing

**Load Testing:**
```javascript
// Test multiple rapid interrupts
async function testRapidInterrupts() {
  const results = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    const result = await AppState.interruptService.interrupt();
    const duration = performance.now() - start;
    results.push({ attempt: i + 1, result, duration });
  }
  console.log('Rapid interrupt results:', results);
}
```

**Memory Leak Testing:**
```javascript
// Test event listener cleanup
function testEventCleanup() {
  const listeners = [];
  for (let i = 0; i < 100; i++) {
    const listener = () => console.log('Event', i);
    AppState.interruptService.on('test', listener);
    listeners.push(listener);
  }
  
  // Clean up
  listeners.forEach(listener => {
    AppState.interruptService.off('test', listener);
  });
  
  console.log('Event cleanup test complete');
}
```

### 6. Error Condition Testing

**Test Different Error Types:**

```javascript
// Test configuration error
const badService = new InterruptService({
  apiEndpoint: null  // Should fail
});
badService.interrupt(); // Should emit configuration error

// Test with invalid endpoint
const invalidService = new InterruptService({
  apiEndpoint: 'http://invalid-endpoint:9999'
});
invalidService.interrupt(); // Should emit network error

// Test timeout
const timeoutService = new InterruptService({
  apiEndpoint: 'http://httpbin.org/delay/10',
  timeout: 1000
});
timeoutService.interrupt(); // Should timeout and retry
```

### 7. UI Integration Testing

**Test Cancel Button States:**
1. **Hidden:** When not generating
2. **Enabled:** During generation
3. **Loading:** During interrupt request
4. **Disabled:** On errors

**Test Toast Messages:**
- Success: "Generation cancelled successfully"
- Timeout: "Cancel request timed out"
- Network: "Network error while cancelling"
- Server: "Server error: [status]"
- Retry: "Retrying cancel request... (1/3)"

### 8. Automated Testing Setup

**Using Playwright/Cypress:**

```javascript
// Example test
describe('InterruptService', () => {
  it('should cancel generation successfully', async () => {
    await page.goto('http://localhost:8000');
    await page.click('#test-connection');
    await page.click('#generate-button');
    await page.click('#cancel-button');
    
    await expect(page.locator('.toast')).toContainText('cancelled successfully');
  });
});
```

## Expected Behaviors

### Success Path
1. Service state: IDLE → INTERRUPTING → SUCCEEDED → IDLE
2. Cancel button: enabled → loading → hidden
3. Toast: "Generation cancelled successfully"
4. Console: Success log with duration and retry count

### Error Path
1. Service state: IDLE → INTERRUPTING → FAILED → IDLE
2. Cancel button: enabled → loading → enabled
3. Toast: Appropriate error message
4. Console: Error log with details

### Retry Path
1. Service state: IDLE → INTERRUPTING → [retry] → INTERRUPTING → FAILED → IDLE
2. Console: Retry logs with attempt numbers
3. Toast: "Retrying cancel request... (1/3)"

## Debugging Tips

**Console Logs to Watch:**
- `🛑 InterruptService state: idle → interrupting`
- `🛑 Attempting interrupt (attempt 1/3)`
- `🔄 Retrying interrupt in 1000ms...`
- `✅ Interrupt succeeded in 234ms (0 retries)`
- `❌ Interrupt failed: Network error`

**Network Tab:**
- POST requests to `/interrupt` endpoint
- Response status codes
- Request timing

**Common Issues:**
- CORS errors: Check ComfyUI server configuration
- Network timeouts: Adjust timeout settings
- Server not running: Verify ComfyUI is accessible
- Multiple interrupts: Check for proper state management

## Test Results Documentation

Create a test report with:
- ✅ Test scenarios passed
- ❌ Test scenarios failed
- Performance metrics
- Browser compatibility
- Error messages observed
- Suggested improvements

## Next Steps After Testing

1. **Fix any issues found**
2. **Optimize performance based on results**
3. **Add automated tests to CI/CD**
4. **Document any limitations discovered**
5. **Update user documentation**