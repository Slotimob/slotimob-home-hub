import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, Mail, MapPin, MoreVertical, Pencil, Trash2, Briefcase, MessageSquare } from 'lucide-react';
import { ContactCategoryBadges } from './ContactCategoryFilter';
import { formatPhoneForWhatsApp } from '@/lib/utils';
import { UnifiedContact } from './ContactCard';

interface ContactListItemProps {
  contact: UnifiedContact;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreateDeal?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const ContactListItem = ({
  contact,
  onClick,
  onEdit,
  onDelete,
  onCreateDeal,
}: ContactListItemProps) => {
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
      window.open(`https://wa.me/${formattedPhone}`, '_blank');
    }
  };

  const hasLeadCategory = contact.categories.includes('Lead');

  return (
    <div 
      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Avatar */}
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarImage src={contact.avatar_url || undefined} alt={contact.name} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {getInitials(contact.name)}
        </AvatarFallback>
      </Avatar>

      {/* Main info */}
      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Name and categories */}
        <div className="space-y-1">
          <p className="font-medium truncate">{contact.name}</p>
          <ContactCategoryBadges categories={contact.categories} size="sm" />
        </div>

        {/* Contact info */}
        <div className="space-y-1">
          {contact.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{contact.phone}</span>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="hidden lg:block">
          {(contact.city || contact.state) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{[contact.city, contact.state].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {contact.document_number && (
            <p className="text-xs text-muted-foreground mt-1">
              {contact.document_type}: {contact.document_number}
            </p>
          )}
        </div>

        {/* Actions inline */}
        <div className="hidden sm:flex items-center gap-2 justify-end">
          {(contact.whatsapp || contact.phone) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
              onClick={handleWhatsAppClick}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Actions dropdown */}
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
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
