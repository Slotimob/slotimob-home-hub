import { CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface TrainingContent {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
}

interface VideoPlayerDialogProps {
  content: TrainingContent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (contentId: string) => void;
  isCompleted: boolean;
}

// Extract YouTube video ID
const getYouTubeId = (url: string | null): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export function VideoPlayerDialog({
  content,
  open,
  onOpenChange,
  onComplete,
  isCompleted,
}: VideoPlayerDialogProps) {
  if (!content) return null;

  const youtubeId = getYouTubeId(content.video_url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl">{content.title}</DialogTitle>
          {content.description && (
            <DialogDescription className="text-base">
              {content.description}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="p-6 pt-4 space-y-4">
          <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden">
            {youtubeId ? (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
                title={content.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Vídeo não disponível
              </div>
            )}
          </AspectRatio>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button 
              onClick={() => onComplete(content.id)}
              disabled={isCompleted}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {isCompleted ? 'Aula Concluída' : 'Concluir Aula'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
