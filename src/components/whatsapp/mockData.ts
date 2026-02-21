export type MockConversation = {
  id: string;
  contactName: string;
  contactPhone: string;
  contactAvatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: 'active' | 'waiting' | 'resolved';
  isOnline?: boolean;
};

export type MockMessage = {
  id: string;
  conversationId: string;
  direction: 'incoming' | 'outgoing';
  content: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'read';
  isInternalNote?: boolean;
};

export type MockDeal = {
  id: string;
  title: string;
  stage: string;
  value: number;
  expectedCloseDate: string;
};

export type MockContactDetail = {
  id: string;
  name: string;
  email: string;
  phone: string;
  tags: string[];
  deal?: MockDeal;
  activities: { id: string; type: string; description: string; date: string }[];
};

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    id: '1',
    contactName: 'Felipe Oliveira',
    contactPhone: '+55 11 98765-4321',
    lastMessage: 'Olá, gostaria de agendar uma visita ao apartamento do Jardins.',
    lastMessageAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    unreadCount: 3,
    status: 'active',
    isOnline: true,
  },
  {
    id: '2',
    contactName: 'Ana Carolina Silva',
    contactPhone: '+55 11 91234-5678',
    lastMessage: 'Vocês têm unidades disponíveis no condomínio Vista Park?',
    lastMessageAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    unreadCount: 1,
    status: 'waiting',
  },
  {
    id: '3',
    contactName: 'Roberto Santos',
    contactPhone: '+55 21 99876-5432',
    lastMessage: 'Obrigado pela proposta! Vou analisar e retorno amanhã.',
    lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
    status: 'active',
  },
  {
    id: '4',
    contactName: 'Mariana Costa',
    contactPhone: '+55 11 97654-3210',
    lastMessage: 'Qual é a metragem do apartamento 302?',
    lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
    status: 'active',
    isOnline: true,
  },
  {
    id: '5',
    contactName: 'Carlos Mendes',
    contactPhone: '+55 31 98888-7777',
    lastMessage: 'Posso financiar em 360 meses?',
    lastMessageAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
    status: 'waiting',
  },
  {
    id: '6',
    contactName: 'Luciana Ferreira',
    contactPhone: '+55 11 96543-2100',
    lastMessage: 'A documentação já está pronta?',
    lastMessageAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    unreadCount: 2,
    status: 'active',
  },
];

export const MOCK_MESSAGES: Record<string, MockMessage[]> = {
  '1': [
    { id: 'm1', conversationId: '1', direction: 'incoming', content: 'Olá, boa tarde!', sentAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), status: 'read' },
    { id: 'm2', conversationId: '1', direction: 'outgoing', content: 'Boa tarde, Felipe! Como posso ajudar?', sentAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(), status: 'read' },
    { id: 'm3', conversationId: '1', direction: 'incoming', content: 'Estou interessado no apartamento de 3 quartos na região do Jardins. Vi no portal e achei incrível!', sentAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(), status: 'read' },
    { id: 'm4', conversationId: '1', direction: 'outgoing', content: 'Que ótimo! Temos ótimas opções lá. O apartamento que viu é de 120m², com 3 suítes, varanda gourmet e 2 vagas. Valor de R$ 1.850.000,00.', sentAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), status: 'read' },
    { id: 'm5', conversationId: '1', direction: 'incoming', content: 'Parece perfeito! Aceita financiamento?', sentAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(), status: 'read' },
    { id: 'm6', conversationId: '1', direction: 'outgoing', content: 'Sim, aceita financiamento bancário. Podemos fazer uma simulação para você. Gostaria de agendar uma visita?', sentAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(), status: 'read' },
    { id: 'm7', conversationId: '1', direction: 'incoming', content: 'Olá, gostaria de agendar uma visita ao apartamento do Jardins.', sentAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), status: 'read' },
  ],
  '2': [
    { id: 'm8', conversationId: '2', direction: 'incoming', content: 'Oi! Vi que vocês trabalham com o condomínio Vista Park.', sentAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(), status: 'read' },
    { id: 'm9', conversationId: '2', direction: 'outgoing', content: 'Olá, Ana! Sim, somos parceiros exclusivos do Vista Park. Em que posso ajudar?', sentAt: new Date(Date.now() - 33 * 60 * 1000).toISOString(), status: 'read' },
    { id: 'm10', conversationId: '2', direction: 'incoming', content: 'Vocês têm unidades disponíveis no condomínio Vista Park?', sentAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), status: 'read' },
  ],
  '3': [
    { id: 'm11', conversationId: '3', direction: 'outgoing', content: 'Roberto, segue a proposta atualizada conforme conversamos.', sentAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), status: 'read' },
    { id: 'm12', conversationId: '3', direction: 'incoming', content: 'Obrigado pela proposta! Vou analisar e retorno amanhã.', sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), status: 'read' },
  ],
};

export const MOCK_CONTACT_DETAILS: Record<string, MockContactDetail> = {
  '1': {
    id: '1',
    name: 'Felipe Oliveira',
    email: 'felipe.oliveira@email.com',
    phone: '+55 11 98765-4321',
    tags: ['Comprador', 'Alto Padrão', 'Jardins'],
    deal: {
      id: 'd1',
      title: 'Apto 3Q Jardins - Felipe',
      stage: 'Visita Agendada',
      value: 1850000,
      expectedCloseDate: '2026-03-15',
    },
    activities: [
      { id: 'a1', type: 'visit', description: 'Visita agendada para o Apto 1201', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'a2', type: 'note', description: 'Lead demonstrou interesse em financiamento', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'a3', type: 'call', description: 'Ligação de qualificação realizada', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
    ],
  },
  '2': {
    id: '2',
    name: 'Ana Carolina Silva',
    email: 'ana.silva@email.com',
    phone: '+55 11 91234-5678',
    tags: ['Lead Novo', 'Vista Park'],
    activities: [
      { id: 'a4', type: 'message', description: 'Primeiro contato via WhatsApp', date: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
    ],
  },
  '3': {
    id: '3',
    name: 'Roberto Santos',
    email: 'roberto.santos@email.com',
    phone: '+55 21 99876-5432',
    tags: ['Investidor', 'Proposta Enviada'],
    deal: {
      id: 'd2',
      title: 'Sala Comercial Centro - Roberto',
      stage: 'Proposta',
      value: 750000,
      expectedCloseDate: '2026-04-01',
    },
    activities: [
      { id: 'a5', type: 'proposal', description: 'Proposta de R$ 750k enviada', date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { id: 'a6', type: 'visit', description: 'Visita realizada à sala 808', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
    ],
  },
};

export const QUICK_REPLIES = [
  { id: 'qr1', title: 'Boas-vindas', content: 'Olá! Obrigado pelo seu interesse. Sou consultor da imobiliária e estou à disposição para ajudá-lo(a). Como posso auxiliar?' },
  { id: 'qr2', title: 'Agendar visita', content: 'Ótimo! Vamos agendar uma visita? Quais dias e horários são melhores para você?' },
  { id: 'qr3', title: 'Enviar proposta', content: 'Preparei uma proposta personalizada para você. Vou encaminhar os detalhes em instantes.' },
  { id: 'qr4', title: 'Financiamento', content: 'Sim, aceitamos financiamento bancário! Podemos fazer uma simulação. Qual seria o valor de entrada disponível?' },
  { id: 'qr5', title: 'Documentação', content: 'Para prosseguir, precisaremos dos seguintes documentos: RG, CPF, comprovante de renda e comprovante de residência.' },
];
