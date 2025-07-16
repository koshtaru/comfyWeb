# Stable Diffusion WebUI Clone - Design Document

## Overview
This document provides detailed specifications for cloning the Stable Diffusion WebUI interface, maintaining exact visual fidelity to the original design.

## Color Palette

### Primary Colors
- **Background**: `#0b0f19` (Dark blue-black)
- **Secondary Background**: `#181825` (Panel backgrounds)
- **Tertiary Background**: `#1f2937` (Input fields)
- **Accent Orange**: `#ff7c00` (Generate button)
- **Accent Blue**: `#1f77b4` (Selected items, sliders)
- **Text Primary**: `#ffffff` (White)
- **Text Secondary**: `#9ca3af` (Gray labels)
- **Border Color**: `#374151` (Subtle gray)

### UI Element Colors
- **Slider Track**: `#374151` (Gray)
- **Slider Fill**: `#1f77b4` (Blue)
- **Slider Thumb**: `#4a5568` (Dark gray)
- **Button Hover**: `#ff8c1a` (Lighter orange)
- **Icon Background**: `#2d3748` (Dark gray)

## Typography

### Font Stack
```css
font-family: 'Helvetica Neue', Arial, sans-serif;
```

### Font Sizes
- **Tab Labels**: 14px, font-weight: 500
- **Input Labels**: 12px, font-weight: 400, color: #9ca3af
- **Input Values**: 14px, font-weight: 400
- **Button Text**: 16px, font-weight: 600
- **Metadata Text**: 11px, color: #6b7280

## Layout Structure

### Main Container
- **Width**: 100%
- **Display**: Flex (horizontal)
- **Gap**: 20px
- **Padding**: 20px
- **Background**: #0b0f19

### Left Panel (Controls)
- **Width**: 600px (fixed)
- **Background**: #181825
- **Border Radius**: 8px
- **Padding**: 20px

### Right Panel (Output)
- **Flex**: 1 (flexible width)
- **Background**: #181825
- **Border Radius**: 8px
- **Padding**: 20px

## Component Specifications

### 1. Model Selector Dropdown
```css
.model-selector {
  width: 100%;
  height: 40px;
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 4px;
  padding: 8px 12px;
  color: #ffffff;
  font-size: 14px;
}

.refresh-button {
  width: 32px;
  height: 32px;
  background: #1f77b4;
  border-radius: 4px;
  margin-left: 8px;
}
```

### 2. Tab Navigation
```css
.tab-container {
  display: flex;
  gap: 16px;
  border-bottom: 1px solid #374151;
  margin-bottom: 20px;
}

.tab {
  padding: 8px 16px;
  color: #9ca3af;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab.active {
  color: #ffffff;
  border-bottom-color: #1f77b4;
}
```

### 3. Prompt Text Areas
```css
.prompt-container {
  margin-bottom: 16px;
}

.prompt-textarea {
  width: 100%;
  min-height: 80px;
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 4px;
  padding: 12px;
  color: #ffffff;
  font-size: 14px;
  resize: vertical;
}

.prompt-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  gap: 8px;
}

.icon-button {
  width: 24px;
  height: 24px;
  background: #2d3748;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### 4. Generate Button
```css
.generate-button {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #ff7c00 0%, #ff9a00 100%);
  border: none;
  border-radius: 6px;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.generate-button:hover {
  background: linear-gradient(135deg, #ff8c1a 0%, #ffaa1a 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 124, 0, 0.3);
}
```

### 5. Parameter Controls Layout
```css
.control-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-label {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 400;
}
```

### 6. Sliders
```css
.slider-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider {
  flex: 1;
  height: 4px;
  background: #374151;
  border-radius: 2px;
  position: relative;
}

.slider-fill {
  height: 100%;
  background: #1f77b4;
  border-radius: 2px;
}

.slider-thumb {
  width: 16px;
  height: 16px;
  background: #4a5568;
  border: 2px solid #1f77b4;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
}

.slider-value {
  width: 60px;
  height: 32px;
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 4px;
  text-align: center;
  color: #ffffff;
  font-size: 14px;
}
```

### 7. Tab Panels (Restore faces, Tiling, Hires. fix)
```css
.tab-panel-container {
  display: flex;
  border-bottom: 1px solid #374151;
  margin-bottom: 16px;
}

.tab-panel {
  padding: 8px 16px;
  color: #9ca3af;
  cursor: pointer;
  font-size: 13px;
  background: transparent;
  border: none;
  position: relative;
}

.tab-panel.active {
  color: #ffffff;
}

.tab-panel.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: #1f77b4;
}
```

### 8. Batch Controls
```css
.batch-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.batch-slider {
  background: #1f2937;
  height: 6px;
  border-radius: 3px;
}

.batch-slider-fill {
  background: #404040;
  height: 100%;
  border-radius: 3px;
}
```

### 9. Output Image Display
```css
.output-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.main-image {
  width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.thumbnail-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.thumbnail {
  aspect-ratio: 1;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.thumbnail:hover {
  transform: scale(1.05);
}
```

### 10. Action Buttons
```css
.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.action-button {
  padding: 8px 16px;
  background: #2d3748;
  border: 1px solid #374151;
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: #374151;
  border-color: #4a5568;
}
```

### 11. Metadata Display
```css
.metadata-container {
  margin-top: 16px;
  padding: 12px;
  background: #1f2937;
  border-radius: 4px;
  font-size: 11px;
  color: #6b7280;
  line-height: 1.6;
}

.metadata-line {
  margin-bottom: 4px;
}
```

## Responsive Behavior

### Breakpoints
- **Desktop**: > 1200px (default layout)
- **Tablet**: 768px - 1200px (stack panels vertically)
- **Mobile**: < 768px (single column, simplified controls)

### Tablet Layout
```css
@media (max-width: 1200px) {
  .main-container {
    flex-direction: column;
  }
  
  .left-panel {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
  }
}
```

## Interactive States

### Hover States
- Buttons: Lighten background by 10%
- Sliders: Show tooltip with current value
- Thumbnails: Scale to 105%
- Input fields: Border color changes to #4a5568

### Focus States
- Input fields: Border color #1f77b4, subtle glow
- Buttons: Outline 2px solid #1f77b4, offset 2px

### Active States
- Generate button: Scale to 98%, darker gradient
- Sliders: Thumb enlarges to 18px

## Animation Specifications

### Transitions
```css
/* Default transition for all interactive elements */
transition: all 0.2s ease;

/* Slider transitions */
transition: background-color 0.15s ease;

/* Button hover transitions */
transition: transform 0.2s ease, box-shadow 0.2s ease;
```

### Loading States
- Generate button shows pulsing animation
- Progress bar appears below generate button
- Output area shows skeleton loader

## Accessibility Considerations

- All interactive elements have proper focus indicators
- ARIA labels for icon buttons
- Keyboard navigation support for all controls
- High contrast mode support
- Screen reader friendly labels

## Implementation Notes

### Z-Index Hierarchy
- Dropdowns: 1000
- Tooltips: 900
- Modals: 800
- Fixed headers: 700
- Default: auto

### Performance Optimizations
- Use CSS Grid for layouts where possible
- Lazy load images in gallery
- Debounce slider input events
- Virtual scrolling for large image galleries

---

This design document provides the exact specifications needed to recreate the Stable Diffusion WebUI interface with pixel-perfect accuracy.