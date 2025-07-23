import React from 'react'

interface UploadProgressProps {
  progress: number // 0-100
  fileName?: string
  status: 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  fileName,
  status,
  error
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return (
          <svg className="status-icon spinning" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
          </svg>
        )
      case 'processing':
        return (
          <svg className="status-icon" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12,18.17L8.83,15L7.42,16.41L12,21L16.59,16.41L15.17,15M12,5.83L15.17,9L16.58,7.59L12,3L7.41,7.59L8.83,9L12,5.83Z" />
          </svg>
        )
      case 'complete':
        return (
          <svg className="status-icon success" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="status-icon error" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
        )
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading...'
      case 'processing':
        return 'Processing workflow...'
      case 'complete':
        return 'Upload complete'
      case 'error':
        return error || 'Upload failed'
    }
  }

  return (
    <div className={`upload-progress ${status}`}>
      <div className="progress-header">
        {getStatusIcon()}
        <div className="progress-info">
          {fileName && <span className="file-name">{fileName}</span>}
          <span className="status-text">{getStatusText()}</span>
        </div>
      </div>
      
      {(status === 'uploading' || status === 'processing') && (
        <div className="progress-bar-container">
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-percentage">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  )
}