// Metadata Components Index
// Centralized exports for all metadata display components

// Main display component
export { MetadataDisplay } from './MetadataDisplay'
export type { MetadataDisplayProps } from './MetadataDisplay'

// Collapsible sections for organizing content
export { CollapsibleSection, useCollapsibleSections } from './CollapsibleSection'
export type { CollapsibleSectionProps } from './CollapsibleSection'

// Copy functionality
export { CopyButton, MultiFormatCopyButton } from './CopyButton'
export type { CopyButtonProps, MultiFormatCopyButtonProps } from './CopyButton'

// Search and filtering
export { MetadataSearch, AdvancedMetadataSearch } from './MetadataSearch'
export type { MetadataSearchProps, AdvancedMetadataSearchProps } from './MetadataSearch'

// Comparison functionality
export { MetadataComparison, generateComparison, getAllPaths, deepEqual } from './MetadataComparison'
export type { MetadataComparisonProps } from './MetadataComparison'

// CSS imports for styling
import './MetadataDisplay.css'
import './CollapsibleSection.css'
import './CopyButton.css'
import './MetadataSearch.css'
import './MetadataComparison.css'