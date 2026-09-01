import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const NEW_CONTACT = {
  id: 'new-contact-id',
  name: 'Fulano de Tal',
  email: null,
  phone: null,
  whatsapp: null,
  categories: ['Proprietário'],
};

vi.mock('@/integrations/supabase/client', () => {
  const builder: any = {
    select: () => builder,
    order: () => Promise.resolve({ data: [], error: null }),
    eq: () => builder,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    single: () => Promise.resolve({ data: NEW_CONTACT, error: null }),
    insert: () => builder,
    update: () => builder,
    in: () => Promise.resolve({ data: null, error: null }),
    then: (res: any) => Promise.resolve({ data: [], error: null }).then(res),
  };
  return { supabase: { from: () => builder } };
});

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useWorkspace', () => ({ useWorkspace: () => ({ effectiveBrokerId: 'broker-1' }) }));
vi.mock('@/hooks/useCepSearch', () => ({
  useCepSearch: () => ({ searchCepData: vi.fn(), isLoadingCep: false }),
}));

import { UnitFormFields, getInitialFormData, UnitFormData } from '@/components/units/UnitFormFields';

function Harness({ onData }: { onData: (d: UnitFormData) => void }) {
  const [formData, setFormData] = useState<UnitFormData>(() => ({
    ...getInitialFormData(),
    intent_type: 'rental',
    is_occupied: true,
  }));
  onData(formData);
  return (
    <QueryClientProvider client={new QueryClient()}>
      <UnitFormFields
        formData={formData}
        setFormData={setFormData}
        properties={[]}
        isStandalone
      />
    </QueryClientProvider>
  );
}

describe('UnitFormFields — criação de contato inline', () => {
  let latest: UnitFormData;

  beforeEach(() => {
    latest = undefined as any;
  });

  const setup = () => render(<Harness onData={(d) => { latest = d; }} />);

  const createContactVia = async (selectorPlaceholder: string) => {
    const user = userEvent.setup();
    await user.click(screen.getByText(selectorPlaceholder));
    const createButtons = await screen.findAllByText('Criar Novo Contato');
    await user.click(createButtons[0]);
    const nameInput = await screen.findByLabelText(/Nome/i);
    await user.type(nameInput, 'Fulano de Tal');
    await user.click(screen.getByRole('button', { name: /Criar Contato|Salvar/i }));
  };

  it('vincula o proprietário criado em owner_contact_id', async () => {
    setup();
    await createContactVia('Buscar proprietário...');
    await waitFor(() => expect(latest.owner_contact_id).toBe(NEW_CONTACT.id));
  });

  it('vincula o inquilino criado em tenant_contact_id', async () => {
    setup();
    await createContactVia('Buscar inquilino...');
    await waitFor(() => expect(latest.tenant_contact_id).toBe(NEW_CONTACT.id));
  });
});
