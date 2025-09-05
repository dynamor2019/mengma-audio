import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AudioEnhancementControlsProps {
  gain: number;
  onGainChange: (gain: number) => void;
  pitch: number;
  onPitchChange: (pitch: number) => void;
  trackType: 'voice' | 'music';
  disabled?: boolean;
}

export const AudioEnhancementControls = ({
  gain,
  onGainChange,
  pitch,
  onPitchChange,
  trackType,
  disabled = false
}: AudioEnhancementControlsProps) => {
  const trackColor = trackType === 'voice' ? 'track-voice' : 'track-music';
  
  return (
    <Card className="p-4 bg-gradient-secondary border-border">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <div className={cn(
            "w-2 h-2 rounded-full",
            `bg-${trackColor}`
          )} />
          <h4 className="font-medium text-sm text-foreground">
            {trackType === 'voice' ? '语音增强' : '音乐调节'}
          </h4>
        </div>
        
        {/* Gain Control */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor={`gain-${trackType}`} className="text-xs text-muted-foreground">
              增益 (Gain)
            </Label>
            <span className={cn(
              "text-xs font-mono tabular-nums",
              `text-${trackColor}`,
              gain > 200 && "text-yellow-400 font-bold"
            )}>
              {gain}%
            </span>
          </div>
          <Slider
            id={`gain-${trackType}`}
            value={[gain]}
            onValueChange={(value) => onGainChange(value[0])}
            min={0}
            max={300} // Allow up to 300% gain
            step={5}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className="text-center">100%</span>
            <span>300%</span>
          </div>
        </div>
        
        {/* Pitch Control - Only for voice */}
        {trackType === 'voice' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor={`pitch-${trackType}`} className="text-xs text-muted-foreground">
                音调 (Pitch)
              </Label>
              <span className={cn(
                "text-xs font-mono tabular-nums",
                `text-${trackColor}`,
                pitch !== 100 && "font-bold"
              )}>
                {pitch}%
              </span>
            </div>
            <Slider
              id={`pitch-${trackType}`}
              value={[pitch]}
              onValueChange={(value) => onPitchChange(value[0])}
              min={50}
              max={200} // 50% to 200% pitch range
              step={5}
              disabled={disabled}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50%</span>
              <span className="text-center">100%</span>
              <span>200%</span>
            </div>
          </div>
        )}
        
        {/* Status indicators */}
        <div className="flex gap-2 text-xs">
          {gain > 150 && (
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
              高增益
            </span>
          )}
          {gain > 250 && (
            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded animate-pulse">
              过载风险
            </span>
          )}
          {trackType === 'voice' && pitch !== 100 && (
            <span className={cn(
              "px-2 py-1 rounded",
              `bg-${trackColor}/20 text-${trackColor}`
            )}>
              音调调节
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};