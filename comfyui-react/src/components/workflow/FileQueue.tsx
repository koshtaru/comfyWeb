import React from 'react'

interface QueuedFile {
  id: string
  file: File
  status: 'pending' | 'processing' | 'complete' | 'error'
  error?: string
}

interface FileQueueProps {
  files: QueuedFile[]
  onRemove: (id: string) => void
  onRetry: (id: string) => void
}

export const FileQueue: React.FC<FileQueueProps> = ({ files, onRemove, onRetry }) => {
  if (files.length === 0) return null

  const getStatusIcon = (status: QueuedFile['status']) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="status-icon pending" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
        )
      case 'processing':
        return (
          <svg className="status-icon processing spinning" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
          </svg>
        )
      case 'complete':
        return (
          <svg className="status-icon success" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="status-icon error" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
        )
    }
  }

  return (
    <div className="file-queue">
      <h3 className="queue-title">Upload Queue</h3>
      <div className="queue-list">
        {files.map((queuedFile) => (
          <div key={queuedFile.id} className={`queue-item ${queuedFile.status}`}>
            <div className="queue-item-info">
              {getStatusIcon(queuedFile.status)}
              <span className="file-name">{queuedFile.file.name}</span>
              <span className="file-size">
                ({(queuedFile.file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            
            <div className="queue-item-actions">
              {queuedFile.status === 'error' && (
                <button
                  className="retry-button"
                  onClick={() => onRetry(queuedFile.id)}
                  aria-label="Retry upload"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" />
                  </svg>
                </button>
              )}
              <button
                className="remove-button"
                onClick={() => onRemove(queuedFile.id)}
                aria-label="Remove from queue"
              >
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </svg>
              </button>
            </div>
            
            {queuedFile.error && (
              <div className="queue-item-error">
                {queuedFile.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}