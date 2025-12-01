
import React, { Component, ErrorInfo, ReactNode } from 'react';
import ErrorGame from './ErrorGame';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorInfo: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorInfo: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorInfo: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
      this.setState({ hasError: false });
      window.location.href = '/'; // Hard reset to clear bad state
  }

  public render() {
    if (this.state.hasError) {
      return <ErrorGame onReset={this.handleReset} errorDetails={this.state.errorInfo} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
