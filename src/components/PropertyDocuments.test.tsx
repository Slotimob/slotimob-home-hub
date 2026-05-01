import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockDeleteEq = vi.fn();
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }));
const mockSelectEq = vi.fn();
const mockSelectOrder = vi.fn();
const mockSelect = vi.fn(() => ({
  eq: mockSelectEq.mockReturnValue({ order: mockSelectOrder }),
}));
const mockStorageRemove = vi.fn();
const mockStorageFrom = vi.fn(() => ({ remove: mockStorageRemove }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'property_documents') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: mockSelect,
        delete: mockDelete,
      };
    },
    storage: {
      from: mockStorageFrom,
    },
  },
}));

import { PropertyDocuments } from './PropertyDocuments';
import { Toaster } from '@/components/ui/toaster';

describe('PropertyDocuments', () => {
  const documents = [
    {
      id: 'doc-1',
      title: 'Contrato Drive',
      file_path: null,
      file_size: null,
      created_at: '2026-05-01T12:00:00.000Z',
      source_type: 'external_link',
      external_url: 'https://drive.google.com/file/d/123/view',
      external_provider: 'google_drive',
    },
  ];

  beforeEach(() => {
    mockSelectOrder.mockResolvedValue({ data: documents, error: null });
    mockDeleteEq.mockResolvedValue({ error: null });
    mockStorageRemove.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('remove external_link sem acessar o Storage nem submeter o form pai', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <PropertyDocuments propertyId="property-1" userId="broker-1" />
        <Toaster />
      </form>
    );

    expect(await screen.findByText('Contrato Drive')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Excluir documento Contrato Drive' }));
    expect(await screen.findByText('Excluir documento?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(mockDeleteEq).toHaveBeenCalledWith('id', 'doc-1');
    });

    expect(mockStorageFrom).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('Documento excluído!')).toBeInTheDocument();
      expect(screen.getByText('O link foi removido.')).toBeInTheDocument();
    });
  });
});