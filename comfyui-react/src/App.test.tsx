import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders ComfyUI React heading', () => {
    render(<App />)
    expect(screen.getByText('ComfyUI React')).toBeInTheDocument()
  })

  it('displays project setup completion message', () => {
    render(<App />)
    expect(
      screen.getByText(/Task 27.1: Project Setup Complete/)
    ).toBeInTheDocument()
  })
})
