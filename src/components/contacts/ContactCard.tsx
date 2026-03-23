import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, Mail, MapPin, MoreVertical, Pencil, Trash2, Briefcase, MessageSquare } from 'lucide-react';
import { ContactCategoryBadges, ContactCategory } from './ContactCategoryFilter';
import { formatPhoneForWhatsApp } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export interface UnifiedContact {
  id: string;
  broker_id: string;
  assigned_user_id?: string | null; // Individual user responsible for this contact
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  document_type: string | null;
  document_number: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  categories: string[];
  metadata: Record<string, any> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Legacy IDs for reference
  legacy_owner_id?: string | null;
  legacy_lead_id?: string | null;
  legacy_company_id?: string | null;
}

interface ContactCardProps {
  contact: UnifiedContact;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreateDeal?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const ContactCard = ({
  contact,
  onClick,
  onEdit,
  onDelete,
  onCreateDeal,
  canEdit = true,
  canDelete = true,
}: ContactCardProps) => {
  const navigate = useNavigate();
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phoneNumber = contact.whatsapp || contact.phone;
    if (phoneNumber) {
      const formattedPhone = formatPhoneForWhatsApp(phoneNumber);
      navigate(`/whatsapp?phone=${formattedPhone}`);
    }
  };

  const hasLeadCategory = contact.categories.includes('Lead');
  const budget = contact.metadata?.budget_min || contact.metadata?.budget_max;
  
  const formatBudget = () => {
    const min = contact.metadata?.budget_min;
    const max = contact.metadata?.budget_max;
    if (!min && !max) return null;
    const format = (n: number) => `R$ ${n.toLocaleString('pt-BR')}`;
    if (min && max) return `${format(min)} - ${format(max)}`;
    if (min) return `A partir de ${format(min)}`;
    if (max) return `Até ${format(max)}`;
    return null;
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={contact.avatar_url || undefined} alt={contact.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base truncate">{contact.name}</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {hasLeadCategory && onCreateDeal && (
                    <>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateDeal(); }}>
                        <Briefcase className="h-4 w-4 mr-2" />
                        Criar Deal
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {canEdit && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); onDelete(); }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {contact.document_number && (
              <CardDescription className="text-xs">
                {contact.document_type}: {contact.document_number}
              </CardDescription>
            )}
          </div>
        </div>
        
        <div className="mt-2">
          <ContactCategoryBadges categories={contact.categories} size="sm" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {contact.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="truncate">{contact.email}</span>
          </div>
        )}
        
        {contact.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0" />
            <span>{contact.phone}</span>
            {(contact.whatsapp || contact.phone) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={handleWhatsAppClick}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        
        {(contact.city || contact.state) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{[contact.city, contact.state].filter(Boolean).join(', ')}</span>
          </div>
        )}

        {formatBudget() && (
          <p className="text-sm font-medium text-primary pt-1">
            {formatBudget()}
          </p>
        )}
        
        {contact.metadata?.origin && (
          <div className="text-xs text-muted-foreground pt-1">
            Origem: {contact.metadata.origin}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
