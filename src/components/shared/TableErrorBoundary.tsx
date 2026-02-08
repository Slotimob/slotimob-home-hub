import { Component, ReactNode } from "react";
import { EmptyState } from "./EmptyState";

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class TableErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("TableErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <EmptyState
          type="error"
          title={this.props.fallbackTitle || "Erro ao carregar tabela"}
          description={
            this.props.fallbackDescription || 
            "Ocorreu um problema ao renderizar os dados. Tente recarregar a página."
          }
          onAction={this.handleRetry}
          actionLabel="Tentar Novamente"
        />
      );
    }

    return this.props.children;
  }
}
