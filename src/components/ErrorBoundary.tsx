import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReset = () => {
    try {
      localStorage.removeItem("german-vocab-leitner-v1");
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60dvh",
            gap: "16px",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <AlertTriangle
            size={32}
            style={{ color: "var(--color-wrong)", marginBottom: "4px" }}
          />
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
              margin: 0,
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-ink-muted)",
              margin: 0,
              maxWidth: "320px",
              lineHeight: 1.5,
            }}
          >
            An unexpected error occurred. You can try again, or reset the app if
            the problem persists.
          </p>

          {this.state.error && (
            <pre
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "var(--color-wrong)",
                background: "var(--color-wrong-bg)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                maxWidth: "100%",
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                textAlign: "left",
                margin: 0,
              }}
            >
              {this.state.error.message}
            </pre>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button
              onClick={this.handleRetry}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 600,
                border: "none",
                borderRadius: "var(--radius-md)",
                background: "var(--color-accent)",
                color: "#fff",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              <RotateCcw size={14} />
              Try again
            </button>
            <button
              onClick={this.handleReset}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 500,
                border: "1.5px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface)",
                color: "var(--color-ink-muted)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              <Trash2 size={14} />
              Reset app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
