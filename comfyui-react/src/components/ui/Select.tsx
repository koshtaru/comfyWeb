// ============================================================================
// ComfyUI React - Select Component
// ============================================================================

import React, { forwardRef, useState, useRef, useEffect, useId } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../utils/cn'
import type { SelectProps, SelectOption } from '../../types/component'

// Select variants using CVA
const selectVariants = cva(
  // Base classes
  'w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-comfy-bg-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-comfy-bg-tertiary border-comfy-border text-comfy-text-primary focus:border-comfy-accent-blue focus:ring-comfy-accent-blue',
        filled: 'bg-comfy-bg-secondary border-transparent text-comfy-text-primary focus:bg-comfy-bg-tertiary focus:ring-comfy-accent-blue',
        outlined: 'bg-transparent border-comfy-border text-comfy-text-primary focus:border-comfy-accent-blue focus:ring-comfy-accent-blue'
      },
      size: {
        xs: 'px-2 py-1 text-xs',
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-2.5 text-base',
        xl: 'px-4 py-3 text-lg'
      },
      error: {
        true: 'border-comfy-error focus:border-comfy-error focus:ring-comfy-error',
        false: ''
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      error: false
    }
  }
)

/**
 * A customizable select component with search functionality and keyboard navigation.
 * 
 * @example
 * ```tsx
 * <Select
 *   label="Country"
 *   options={countryOptions}
 *   value={selectedCountry}
 *   onChange={setSelectedCountry}
 *   searchable
 *   placeholder="Select a country..."
 * />
 * ```
 */
const Select = forwardRef<HTMLDivElement, SelectProps>(
  ({
    className,
    variant = 'default',
    size = 'md',
    label,
    error,
    helpText,
    required,
    disabled,
    testId,
    id,
    value,
    onChange,
    options,
    placeholder = 'Select...',
    searchable = false,
    searchPlaceholder = 'Search...',
    maxHeight = 200
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [focusedIndex, setFocusedIndex] = useState(-1)
    const selectId = useId()
    const finalId = id || selectId
    const hasError = !!error
    
    const selectRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLUListElement>(null)
    const searchRef = useRef<HTMLInputElement>(null)

    // Filter options based on search term
    const filteredOptions = searchable && searchTerm
      ? options.filter(option => 
          option.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : options

    // Get display value
    const selectedOption = options.find(option => option.value === value)
    const displayValue = selectedOption ? selectedOption.label : placeholder

    // Handle click outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false)
          setSearchTerm('')
          setFocusedIndex(-1)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (!isOpen) {
            setIsOpen(true)
            if (searchable) {
              setTimeout(() => searchRef.current?.focus(), 0)
            }
          } else if (focusedIndex >= 0) {
            const option = filteredOptions[focusedIndex]
            if (option && !option.disabled) {
              handleOptionSelect(option)
            }
          }
          break
        case 'ArrowDown':
          e.preventDefault()
          if (!isOpen) {
            setIsOpen(true)
          } else {
            setFocusedIndex(prev => 
              prev < filteredOptions.length - 1 ? prev + 1 : 0
            )
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          if (isOpen) {
            setFocusedIndex(prev => 
              prev > 0 ? prev - 1 : filteredOptions.length - 1
            )
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setSearchTerm('')
          setFocusedIndex(-1)
          break
      }
    }

    const handleOptionSelect = (option: SelectOption) => {
      if (option.disabled) return
      
      onChange(option.value)
      setIsOpen(false)
      setSearchTerm('')
      setFocusedIndex(-1)
    }

    return (
      <div className="w-full" ref={selectRef}>
        {label && (
          <label
            htmlFor={finalId}
            className="block text-sm font-medium text-comfy-text-primary mb-1.5"
          >
            {label}
            {required && (
              <span className="text-comfy-error ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}
        
        <div className="relative">
          <div
            ref={ref}
            id={finalId}
            className={cn(
              selectVariants({ variant, size, error: hasError }),
              'flex items-center justify-between',
              className
            )}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-invalid={hasError}
            aria-describedby={
              error ? `${finalId}-error` : helpText ? `${finalId}-help` : undefined
            }
            tabIndex={disabled ? -1 : 0}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            data-testid={testId}
          >
            <span className={cn(
              'truncate',
              !selectedOption && 'text-comfy-text-secondary'
            )}>
              {displayValue}
            </span>
            
            <svg
              className={cn(
                'h-4 w-4 transition-transform duration-200 text-comfy-text-secondary flex-shrink-0',
                isOpen && 'rotate-180'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
          
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-comfy-bg-secondary border border-comfy-border rounded-lg shadow-comfy-lg">
              {searchable && (
                <div className="p-2 border-b border-comfy-border">
                  <input
                    ref={searchRef}
                    type="text"
                    className="w-full px-3 py-1.5 text-sm bg-comfy-bg-tertiary border border-comfy-border rounded focus:outline-none focus:ring-2 focus:ring-comfy-accent-blue text-comfy-text-primary placeholder:text-comfy-text-secondary"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setFocusedIndex(-1)
                    }}
                  />
                </div>
              )}
              
              <ul
                ref={listRef}
                className="py-1 overflow-auto"
                style={{ maxHeight }}
                role="listbox"
                aria-labelledby={finalId}
              >
                {filteredOptions.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-comfy-text-secondary">
                    No options found
                  </li>
                ) : (
                  filteredOptions.map((option, index) => (
                    <li
                      key={option.value}
                      className={cn(
                        'px-3 py-2 text-sm cursor-pointer transition-colors',
                        'hover:bg-comfy-bg-tertiary',
                        option.disabled && 'opacity-50 cursor-not-allowed',
                        focusedIndex === index && 'bg-comfy-bg-tertiary',
                        value === option.value && 'bg-comfy-accent-blue/20 text-comfy-accent-blue'
                      )}
                      role="option"
                      aria-selected={value === option.value}
                      aria-disabled={option.disabled}
                      onClick={() => handleOptionSelect(option)}
                    >
                      {option.label}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
        
        {error && (
          <p
            id={`${finalId}-error`}
            className="mt-1.5 text-sm text-comfy-error"
            role="alert"
          >
            {error}
          </p>
        )}
        
        {helpText && !error && (
          <p
            id={`${finalId}-help`}
            className="mt-1.5 text-sm text-comfy-text-secondary"
          >
            {helpText}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Select, selectVariants }