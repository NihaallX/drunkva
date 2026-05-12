'use client'
import React from "react"

interface Props {
  children: React.ReactNode
}
interface State {
  hasError: boolean
}

export class ShareExportErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Will be replaced with Sentry when integrated
    console.error('[ShareExportErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: '#555',
          fontSize: '14px'
        }}>
          <p>Something went wrong generating your card.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              marginTop: '12px',
              background: 'none',
              border: '0.5px solid #333',
              borderRadius: '8px',
              padding: '8px 16px',
              color: '#888',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '13px'
            }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
