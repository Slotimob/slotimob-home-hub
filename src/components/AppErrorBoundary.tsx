import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

const isDynamicImportError = (error: unknown) => {
  const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk/i.test(msg);
};

/**
 * App-level error boundary. Catches render errors, notably failed dynamic
 * imports (stale chunks after a deploy), showing a reload screen instead of a
 * blank page.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, isChunkError: isDynamicImportError(error) };
  }

  componentDidCatch(error: unknown) {
    console.error('App error boundary caught:', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">
          {this.state.isChunkError ? 'Nova versão disponível' : 'Algo deu errado'}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {this.state.isChunkError
            ? 'O aplicativo foi atualizado enquanto você navegava. Recarregue a página para continuar.'
            : 'Não foi possível carregar esta tela. Tente recarregar a página.'}
        </p>
        <Button onClick={this.handleReload}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Recarregar
        </Button>
      </div>
    );
  }
}
