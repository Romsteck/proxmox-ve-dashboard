"use client";

/**
 * React Error Boundary with retry functionality and contextual error reporting
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import Button from './ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from './ui/Card';
import Icon from './ui/Icon';
import { createContextualError } from '@/lib/utils/error-handling';
import { ErrorContext } from '@/lib/types';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // If true, only catches errors from direct children
  level?: 'page' | 'section' | 'component';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorId: string | null;
}

/**
 * Enhanced Error Boundary with retry logic and error reporting
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;

    // Create contextual error with additional information
    const context: ErrorContext = {
      operation: `render ${level}`,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      additionalData: {
        componentStack: errorInfo.componentStack,
        errorBoundaryLevel: level,
        retryCount: this.state.retryCount,
      },
    };

    const contextualError = createContextualError(
      `render React ${level}`,
      error,
      context
    );

    this.setState({ errorInfo });

    // Call custom error handler
    onError?.(contextualError, errorInfo);

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Context:', context);
      console.groupEnd();
    }

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      this.reportError(contextualError, errorInfo, context);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo, context: ErrorContext) => {
    // This is where you would integrate with error reporting services
    // like Sentry, Bugsnag, or your own error reporting endpoint
    
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Example: Send to your error reporting endpoint
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorReport),
    // }).catch(console.error);

    console.warn('Error report generated:', errorReport);
  };

  private handleRetry = () => {
    const maxRetries = 3;
    
    if (this.state.retryCount >= maxRetries) {
      console.warn('Max retries reached, not retrying');
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));

    // Add a small delay before retry to prevent immediate re-error
    this.retryTimeoutId = setTimeout(() => {
      // Force a re-render by updating state
      this.forceUpdate();
    }, 100);
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: null,
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    const { hasError, error, errorInfo, retryCount, errorId } = this.state;
    const { children, fallback, level = 'component' } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, this.handleRetry);
      }

      // Default error UI based on level
      return this.renderDefaultErrorUI(error, errorInfo, retryCount, errorId, level);
    }

    return children;
  }

  private renderDefaultErrorUI(
    error: Error,
    errorInfo: ErrorInfo | null,
    retryCount: number,
    errorId: string | null,
    level: string
  ) {
    const isPageLevel = level === 'page';
    const maxRetries = 3;
    const canRetry = retryCount < maxRetries;

    if (isPageLevel) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <Icon icon={AlertTriangle} className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-red-900 dark:text-red-100">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
              </p>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded">
                  <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <strong>Error:</strong> {error.message}
                    </div>
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap text-xs mt-1">{error.stack}</pre>
                    </div>
                    {errorId && (
                      <div>
                        <strong>Error ID:</strong> {errorId}
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-2">
                {canRetry && (
                  <Button
                    onClick={this.handleRetry}
                    variant="primary"
                    size="sm"
                    className="flex-1"
                  >
                    <Icon icon={RefreshCw} size="sm" className="mr-2" />
                    Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
                  </Button>
                )}
                <Button
                  onClick={this.handleGoHome}
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                >
                  <Icon icon={Home} size="sm" className="mr-2" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Component/section level error UI
    return (
      <div className="p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Icon icon={Bug} className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Component Error
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              This section encountered an error and couldn&apos;t render properly.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer text-red-600 dark:text-red-400">
                  Show Details
                </summary>
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                  <div><strong>Error:</strong> {error.message}</div>
                  {errorId && <div><strong>ID:</strong> {errorId}</div>}
                </div>
              </details>
            )}

            <div className="flex gap-2 mt-3">
              {canRetry && (
                <Button
                  onClick={this.handleRetry}
                  variant="secondary"
                  size="sm"
                >
                  <Icon icon={RefreshCw} size="sm" className="mr-1" />
                  Retry {retryCount > 0 && `(${retryCount})`}
                </Button>
              )}
              <Button
                onClick={this.handleReset}
                variant="secondary"
                size="sm"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * HOC for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Specialized error boundaries for different use cases
 */
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page">
    {children}
  </ErrorBoundary>
);

export const SectionErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="section">
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="component">
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;