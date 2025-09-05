import { Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  trackType: 'voice' | 'music';
  isMuted?: boolean;
  onMuteToggle?: () => void;
}

export const VolumeControl = ({
  volume,
  onVolumeChange,
  trackType,
  isMuted = false,
  onMuteToggle
}: VolumeControlProps) => {
  const trackColor = trackType === 'voice' ? 'track-voice' : 'track-music';
  
  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <Button
        variant="ghost"
        size="sm"
        onClick={onMuteToggle}
        className={cn(
          "p-2 hover:bg-secondary",
          isMuted && "text-muted-foreground"
        )}
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </Button>
      
      <div className="flex-1 relative">
        <Slider
          value={[isMuted ? 0 : volume]}
          onValueChange={(value) => onVolumeChange(value[0])}
          max={100}
          step={1}
          className="w-full"
          disabled={isMuted}
        />
        
        {/* Volume level indicator */}
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>0</span>
          <span className={cn(
            "font-medium",
            `text-${trackColor}`
          )}>
            {Math.round(isMuted ? 0 : volume)}%
          </span>
          <span>100</span>
        </div>
      </div>
      
      {/* Visual volume indicator */}
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1 h-6 rounded-full transition-all duration-200",
              volume > (i + 1) * 20 && !isMuted
                ? `bg-${trackColor}` 
                : "bg-muted/50"
            )}
          />
        ))}
      </div>
    </div>
  );
};