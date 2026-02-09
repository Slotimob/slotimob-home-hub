import { Play, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface TrainingContent {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  category: string | null;
  display_order: number;
  is_premium?: boolean;
  price?: number | null;
  checkout_url?: string | null;
}

interface TrainingContentCardProps {
  content: TrainingContent;
  isAdmin: boolean;
  isCompleted: boolean;
  onWatch: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

// Extract YouTube video ID from various URL formats
const getYouTubeId = (url: string | null): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export function TrainingContentCard({
  content,
  isAdmin,
  isCompleted,
  onWatch,
  onEdit,
  onDelete,
}: TrainingContentCardProps) {
  const youtubeId = getYouTubeId(content.video_url);
  const thumbnailUrl = content.thumbnail_url || 
    (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : null);

  const isPremium = content.is_premium || content.content_type === 'external';

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-card">
      <div className="relative">
        <AspectRatio ratio={16 / 9}>
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={content.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Play className="h-16 w-16 text-primary/50" />
            </div>
          )}
        </AspectRatio>
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          {isPremium ? (
            <Button 
              size="lg" 
              className="gap-2"
              onClick={() => content.checkout_url && window.open(content.checkout_url, '_blank')}
            >
              <ExternalLink className="h-5 w-5" />
              Acessar Curso
            </Button>
          ) : (
            <Button size="lg" variant="secondary" className="gap-2" onClick={onWatch}>
              <Play className="h-5 w-5" />
              Assistir Aula
            </Button>
          )}
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-2">
          {isPremium && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-primary-foreground border-0">
              Premium
            </Badge>
          )}
          {isCompleted && !isPremium && (
            <Badge variant="secondary" className="bg-green-500/90 text-primary-foreground border-0">
              Concluído
            </Badge>
          )}
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="secondary" className="h-8 w-8" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="destructive" className="h-8 w-8" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Duration badge */}
        {content.duration_minutes && !isPremium && (
          <Badge variant="secondary" className="absolute bottom-2 right-2 bg-black/70 text-white border-0">
            {content.duration_minutes} min
          </Badge>
        )}

        {/* Price badge for premium */}
        {isPremium && content.price && (
          <Badge className="absolute bottom-2 right-2 bg-primary text-primary-foreground border-0 text-sm px-3">
            R$ {content.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg line-clamp-1 mb-1">{content.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {content.description || 'Sem descrição disponível.'}
        </p>
      </CardContent>
    </Card>
  );
}
