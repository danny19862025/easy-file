import React from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-screen w-screen bg-zinc-950 text-red-300 p-6 font-mono text-sm overflow-auto">
          <h1 className="text-lg font-bold text-red-400 mb-2">Easy File Render Error</h1>
          <pre className="whitespace-pre-wrap">{this.state.error.stack ?? this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
