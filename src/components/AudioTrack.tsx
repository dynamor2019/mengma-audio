import { useMemo, useState } from 'react';
import { X, Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { VolumeControl } from '@/components/VolumeControl';
import { LoudnessIndicator } from '@/components/LoudnessIndicator';
import { AudioEnhancementControls } from '@/components/AudioEnhancementControls';
import { WaveformVisualization } from '@/components/WaveformVisualization';
import { cn } from '@/lib/Utils';

export interface AudioFile {
  id: string;
  file: File;
  duration: number;
  name: string;
  url: string;
}

interface AudioTrackProps {
  type: 'voice' | 'music';
  files: AudioFile[];
  onRemoveFile: (id: string) => void;
  onReorderFiles: (startIndex: number, endIndex: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
  gain: number;
  onGainChange: (gain: number) => void;
  pitch?: number;
  onPitchChange?: (pitch: number) => void;
  onNormalizeVolume?: () => void;
  isNormalizingVolume?: boolean;
}

export const AudioTrack = ({
  type,
  files,
  onRemoveFile,
  onReorderFiles,
  isPlaying,
  onPlayPause,
  volume,
  onVolumeChange,
  isMuted,
  onMuteToggle,
  gain,
  onGainChange,
  pitch = 100,
  onPitchChange,
  onNormalizeVolume,
  isNormalizingVolume = false
}: AudioTrackProps) => {
  const trackColor = type === 'voice' ? 'track-voice' : 'track-music';
  const trackBgColor = type === 'voice' ? 'track-voice-bg' : 'track-music-bg';
  
  const trackTotalDuration = useMemo(() => {
    return files.reduce((total, file) => total + file.duration, 0);
  }, [files]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-gradient-secondary border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-3 h-3 rounded-full",
              `bg-${trackColor}`
            )} />
            <h3 className="font-semibold text-foreground">
              {type === 'voice' ? '语音轨道' : '背景音乐'}
            </h3>
            <span className="text-sm text-muted-foreground">
              {files.length} 个文件 · {formatDuration(trackTotalDuration)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {type === 'voice' && onNormalizeVolume && files.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNormalizeVolume}
                disabled={isNormalizingVolume}
                className="hover:bg-secondary text-xs px-2 py-1"
              >
                <Volume2 className="w-3 h-3 mr-1" />
                {isNormalizingVolume ? '标准化中...' : '音量标准化'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onPlayPause}
              disabled={files.length === 0}
              className="hover:bg-secondary"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <div className="flex items-center gap-2 sm:gap-3">
              <LoudnessIndicator
                isPlaying={isPlaying}
                trackType={type}
                className="min-w-[80px] sm:min-w-[120px]"
              />
              <VolumeControl
                volume={volume}
                onVolumeChange={onVolumeChange}
                trackType={type}
                isMuted={isMuted}
                onMuteToggle={onMuteToggle}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className={cn(
        "min-h-[120px] p-4",
        `bg-${trackBgColor}`
      )}>
        {files.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            拖拽音频文件到此处或使用上方上传区域
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {files.map((file, index) => (
              <div
                key={file.id}
                className={cn(
                  "flex-shrink-0 bg-card border border-border rounded-lg p-3 min-w-[200px] group",
                  "hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing"
                )}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', index.toString());
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                  onReorderFiles(dragIndex, index);
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-foreground truncate">
                      {file.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(file.duration)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveFile(file.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                
                {/* Waveform visualization */}
                <WaveformVisualization
                  audioFile={file.file}
                  trackType={type}
                  isPlaying={isPlaying}
                  className="mt-2"
                />
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Audio Enhancement Controls */}
      {files.length > 0 && (
        <div className="p-4 border-t border-border">
          <AudioEnhancementControls
            gain={gain}
            onGainChange={onGainChange}
            pitch={pitch}
            onPitchChange={onPitchChange || (() => {})}
            trackType={type}
            disabled={files.length === 0}
          />
        </div>
      )}
    </Card>
  );
};
