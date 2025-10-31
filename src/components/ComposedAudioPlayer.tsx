import { useState, useRef, useEffect, memo } from 'react';
import { Play, Pause, Square, RotateCcw, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/Utils';
import { ExportFormatSelector, type AudioFormat } from '@/components/ExportFormatSelector';

interface ComposedAudioPlayerProps {
  composedAudioUrl: string | null;
  onDownload: (formats: AudioFormat[]) => void;
  isComposing: boolean;
  // 当点击播放并开始播放合成音频时触发，用于停止其他预览播放
  onStartPlay?: () => void;
}

const ComposedAudioPlayerComponent = ({
  composedAudioUrl,
  onDownload,
  isComposing,
  onStartPlay
}: ComposedAudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [composedAudioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const handlePlayPause = () => {
    if (!audioRef.current || !composedAudioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // 开始播放时先通知外部停止预览播放
      try { onStartPlay?.(); } catch {}
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!composedAudioUrl && !isComposing) {
    return (
      <Card className="bg-gradient-secondary border-border p-4">
        <div className="text-center text-muted-foreground">
          <div className="w-12 h-12 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
            <Play className="w-6 h-6" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-secondary border-border">
      {composedAudioUrl && (
        <audio ref={audioRef} src={composedAudioUrl} preload="metadata" />
      )}
      
      <div className="p-3">

        <div className="flex items-center gap-3 mb-3">
          <Button
            onClick={handlePlayPause}
            disabled={!composedAudioUrl || isComposing}
            className={cn(
              "h-10 w-10",
              composedAudioUrl && !isComposing
                ? "bg-gradient-primary hover:bg-gradient-primary/90 text-primary-foreground shadow-glow"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleStop}
            disabled={!isPlaying}
            className="border-border hover:bg-secondary"
          >
            <Square className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            onClick={() => handleSeek(0)}
            disabled={!composedAudioUrl}
            className="border-border hover:bg-secondary"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-2 min-w-[110px]">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[volume]}
              onValueChange={(value) => setVolume(value[0])}
              max={100}
              step={1}
              className="w-14"
            />
            <span className="text-sm text-muted-foreground w-8">
              {volume}%
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="space-y-1">
          <Slider
            value={[currentTime]}
            onValueChange={(value) => handleSeek(value[0])}
            max={duration || 100}
            step={0.1}
            className="w-full"
            disabled={!composedAudioUrl || isComposing}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Waveform visualization */}
        {composedAudioUrl && (
          <div className="mt-2 flex items-end gap-px h-6 bg-muted/20 rounded-md p-1">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-sm transition-all duration-300",
                  isPlaying 
                    ? "bg-primary animate-waveform" 
                    : "bg-primary/40"
                )}
                style={{
                  height: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.05}s`
                }}
              />
            ))}
          </div>
        )}

        {/* Export Format Selector */}
        {composedAudioUrl && (
          <div className="mt-3">
            <ExportFormatSelector
              onExport={onDownload}
              disabled={isComposing}
              isExporting={isComposing}
            />
          </div>
        )}
      </div>
    </Card>
  );
};

export const ComposedAudioPlayer = memo(ComposedAudioPlayerComponent);
