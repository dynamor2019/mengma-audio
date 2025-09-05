import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, RotateCcw, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ExportFormatSelector, type AudioFormat } from '@/components/ExportFormatSelector';

interface ComposedAudioPlayerProps {
  composedAudioUrl: string | null;
  onDownload: (formats: AudioFormat[]) => void;
  isComposing: boolean;
}

export const ComposedAudioPlayer = ({
  composedAudioUrl,
  onDownload,
  isComposing
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
      <Card className="bg-gradient-secondary border-border p-8">
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
            <Play className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold mb-2">合成音频播放器</h3>
          <p>请先上传音频文件并点击合成按钮</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-secondary border-border">
      {composedAudioUrl && (
        <audio ref={audioRef} src={composedAudioUrl} preload="metadata" />
      )}
      
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Badge variant="secondary" className="bg-accent/20 text-accent">
            合成音频
          </Badge>
          {isComposing && (
            <Badge variant="secondary" className="bg-primary/20 text-primary animate-pulse">
              合成中...
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={handlePlayPause}
            disabled={!composedAudioUrl || isComposing}
            className={cn(
              "h-12 w-12",
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

          <div className="flex items-center gap-2 min-w-[120px]">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[volume]}
              onValueChange={(value) => setVolume(value[0])}
              max={100}
              step={1}
              className="w-16"
            />
            <span className="text-sm text-muted-foreground w-8">
              {volume}%
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="space-y-2">
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
          <div className="mt-4 flex items-end gap-px h-12 bg-muted/20 rounded-lg p-2">
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
          <div className="mt-6">
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