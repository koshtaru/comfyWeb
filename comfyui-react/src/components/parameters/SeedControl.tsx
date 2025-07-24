import React, { useState, useCallback, useRef } from 'react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useParameterTooltips } from '@/hooks/useParameterTooltips'
import { useEnhancedValidation } from './hooks/useEnhancedValidation'
import { ValidationMessage } from './ValidationMessage'

interface SeedControlProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  className?: string
  showCopy?: boolean
}

export const SeedControl: React.FC<SeedControlProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  showCopy = true
}) => {
  const [inputValue, setInputValue] = useState(value.toString())
  const [isGenerating, setIsGenerating] = useState(false)
  const [showCopyFeedback, setShowCopyFeedback] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const { getTooltipContent } = useParameterTooltips()
  const enhancedValidation = useEnhancedValidation(-1, 2147483647, 1, 'seed')

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    setInputValue(rawValue)
    
    // Only update if it's a valid number
    const numericValue = parseInt(rawValue, 10)
    if (!isNaN(numericValue) && numericValue >= 0) {
      onChange(numericValue)
    }
  }, [onChange])

  // Handle input blur - validate and format
  const handleInputBlur = useCallback(() => {
    const numericValue = parseInt(inputValue, 10)
    
    if (isNaN(numericValue) || numericValue < 0) {
      // Reset to current value if invalid
      setInputValue(value.toString())
    } else {
      // Ensure consistent formatting
      const clampedValue = Math.max(0, Math.min(4294967295, numericValue)) // 32-bit unsigned int max
      setInputValue(clampedValue.toString())
      if (clampedValue !== value) {
        onChange(clampedValue)
      }
    }
  }, [inputValue, value, onChange])

  // Generate random seed
  const generateRandomSeed = useCallback(() => {
    if (disabled) return
    
    setIsGenerating(true)
    
    // Generate random 32-bit unsigned integer
    const randomSeed = Math.floor(Math.random() * 4294967295)
    
    // Simulate brief generation animation
    setTimeout(() => {
      onChange(randomSeed)
      setInputValue(randomSeed.toString())
      setIsGenerating(false)
    }, 200)
  }, [onChange, disabled])

  // Copy seed to clipboard
  const copySeed = useCallback(async () => {
    if (!showCopy || disabled) return
    
    try {
      await navigator.clipboard.writeText(value.toString())
      setShowCopyFeedback(true)
      setTimeout(() => setShowCopyFeedback(false), 2000)
    } catch (err) {
      console.warn('Failed to copy seed to clipboard:', err)
      // Fallback: select the input text
      if (inputRef.current) {
        inputRef.current.select()
      }
    }
  }, [value, showCopy, disabled])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur()
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
      e.preventDefault()
      generateRandomSeed()
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'c' && showCopy) {
      // Don't prevent default - let normal copy work
      // But show our feedback
      setShowCopyFeedback(true)
      setTimeout(() => setShowCopyFeedback(false), 2000)
    }
  }, [handleInputBlur, generateRandomSeed, showCopy])

  // Get validation state
  const validationClasses = enhancedValidation.getValidationClasses(value)
  const validationMessage = enhancedValidation.getPrimaryMessage(value)
  const validationResult = enhancedValidation.validateValue(value)

  return (
    <div className={`seed-control ${className}`}>
      <Tooltip 
        content={getTooltipContent('seed')} 
        placement="top"
        delay={200}
      >
        <label className="parameter-label" htmlFor="seed-input">
          Seed
          <span className="parameter-label-tooltip-indicator">
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="currentColor"
              style={{ marginLeft: '0.25rem', opacity: 0.6 }}
            >
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A1.5,1.5 0 0,1 10.5,15.5A1.5,1.5 0 0,1 12,14A1.5,1.5 0 0,1 13.5,15.5A1.5,1.5 0 0,1 12,17M12,10.5C10.8,10.5 10.5,9.3 10.5,9C10.5,7.8 11.2,7 12,7S13.5,7.8 13.5,9C13.5,9.3 13.2,10.5 12,10.5Z" />
            </svg>
          </span>
        </label>
      </Tooltip>
      
      <div className="seed-input-container">
        <input
          ref={inputRef}
          id="seed-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`seed-input ${validationClasses}`}
          placeholder="Random seed value"
          aria-label="Seed value for reproducible generation"
          title="Enter a seed value or use the dice button to generate a random one"
        />
        
        <div className="seed-controls">
          <button
            type="button"
            onClick={generateRandomSeed}
            disabled={disabled || isGenerating}
            className={`seed-random-button ${isGenerating ? 'generating' : ''}`}
            title="Generate random seed (Ctrl/Cmd + R)"
            aria-label="Generate random seed"
          >
            {isGenerating ? (
              <div className="seed-loading">
                <div className="seed-spinner"></div>
              </div>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7.5A2,2 0 0,1 11,9.5H7.5A2,2 0 0,1 5.5,7.5V5.73C4.4,5.39 4,4.74 4,4A2,2 0 0,1 6,2A2,2 0 0,1 8,4C8,4.74 7.6,5.39 7,5.73V7.5H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M16,8A2,2 0 0,1 18,10C18,10.74 17.6,11.39 17,11.73V13.5A2,2 0 0,1 15,15.5H11.5V17.27C11.6,17.39 12,17.74 12,18A2,2 0 0,1 10,20A2,2 0 0,1 8,18C8,17.26 8.4,16.61 9,16.27V13.5A2,2 0 0,1 11,11.5H15V11.73C14.4,11.39 14,10.74 14,10A2,2 0 0,1 16,8Z"/>
              </svg>
            )}
          </button>
          
          {showCopy && (
            <button
              type="button"
              onClick={copySeed}
              disabled={disabled}
              className={`seed-copy-button ${showCopyFeedback ? 'copied' : ''}`}
              title="Copy seed to clipboard (Ctrl/Cmd + C)"
              aria-label="Copy seed to clipboard"
            >
              {showCopyFeedback ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
      
      <div className="seed-info">
        <div className="info-item">
          <span className="info-label">Reproducibility:</span>
          <span className="info-value">{value === -1 ? 'Random' : 'Fixed'}</span>
        </div>
        {value !== -1 && (
          <div className="info-item">
            <span className="info-label">Hex:</span>
            <span className="info-value seed-hex">0x{value.toString(16).toUpperCase()}</span>
          </div>
        )}
      </div>
      
      <div className="seed-tips">
        <div className="tip-text">
          💡 Use the same seed with identical settings to reproduce exact results
        </div>
      </div>
      
      {/* Validation Message */}
      {validationMessage && validationResult && (
        <ValidationMessage
          message={validationMessage}
          severity={validationResult.severity}
          compact={false}
          show={true}
        />
      )}
    </div>
  )
}