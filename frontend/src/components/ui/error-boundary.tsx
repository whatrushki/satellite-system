import React from 'react'

interface Props {
  children: React.ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 flex flex-col gap-2 m-2">
          <div className="font-bold text-rose-400">
            Ошибка модуля: {this.props.fallbackTitle || 'Компонент'}
          </div>
          <p className="text-slate-400">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="self-start px-3 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 hover:bg-slate-700 cursor-pointer transition-colors"
          >
            Перезагрузить компонент
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
