import { useMemo, useState, useRef, memo, useEffect } from 'react';
import { X, Play, Pause, Volume2, ChevronLeft, ChevronRight, GripVertical, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { VolumeControl } from '@/components/VolumeControl';
import { LoudnessIndicator } from '@/components/LoudnessIndicator';
import { AudioEnhancementControls } from '@/components/AudioEnhancementControls';
import { WaveformVisualization } from '@/components/WaveformVisualization';
import { cn } from '@/lib/Utils';
import { VoiceCaptureControls } from '@/components/VoiceCaptureControls';
import { parseBuffer } from 'music-metadata';

export interface AudioFile {
  id: string;
  file: File;
  duration: number;
  name: string;
  url: string;
  coverUrl?: string; // 音频封面图片URL
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
  onAddVoiceFiles?: (files: File[]) => void;
  onAddFiles?: (files: File[]) => void;
}

const AudioTrackComponent = ({
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
  isNormalizingVolume = false,
  onAddVoiceFiles,
  onAddFiles
}: AudioTrackProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showVoiceCapture, setShowVoiceCapture] = useState(false);
  const [fileCoverUrls, setFileCoverUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 跑马灯检测：基于真实 DOM 尺寸，避免测量误差
  const titleRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [marqueeFlags, setMarqueeFlags] = useState<Record<string, boolean>>({});
  // 响度指标所需的音频数据缓冲
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | undefined>(undefined);

  useEffect(() => {
    const computeFlags = () => {
      const flags: Record<string, boolean> = {};
      files.forEach(file => {
        const el = titleRefs.current[file.id];
        if (el) {
          const container = el.parentElement;
          const containerWidth = container ? container.clientWidth : el.clientWidth;
          flags[file.id] = el.scrollWidth > containerWidth;
        }
      });
      setMarqueeFlags(flags);
    };

    // 初次渲染后与下一帧分别计算，避免字体或布局延迟导致测量不准
    computeFlags();
    const rafId = requestAnimationFrame(() => computeFlags());
    const timeoutId = setTimeout(() => computeFlags(), 120);

    // 监听容器尺寸变化，动态更新
    const observers: ResizeObserver[] = [];
    files.forEach(file => {
      const el = titleRefs.current[file.id];
      const container = el?.parentElement;
      if (container) {
        const ro = new ResizeObserver(() => computeFlags());
        ro.observe(container);
        observers.push(ro);
      }
    });

    const onResize = () => computeFlags();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      observers.forEach(ro => ro.disconnect());
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [files]);

  // 解析当前轨道的首个文件以供响度指标计算（紧凑实现，避免复杂依赖）
  useEffect(() => {
    let isCancelled = false;
    const decodeFirstFile = async () => {
      try {
        if (!files.length) {
          setAudioBuffer(undefined);
          return;
        }
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await files[0].file.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        if (!isCancelled) {
          setAudioBuffer(decoded);
        }
        // 关闭临时上下文，避免资源泄漏
        ctx.close().catch(() => {});
      } catch (error) {
        console.warn('解析音频用于响度指标失败:', error);
        if (!isCancelled) {
          setAudioBuffer(undefined);
        }
      }
    };
    decodeFirstFile();
    return () => {
      isCancelled = true;
    };
  }, [files]);

  // 获取音频文件的封面图片
  const getAudioCover = async (file: File): Promise<string | null> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const metadata = await parseBuffer(new Uint8Array(arrayBuffer));
      
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        const blob = new Blob([picture.data], { type: picture.format });
        return URL.createObjectURL(blob);
      }
      return null;
    } catch (error) {
      console.error('Error extracting audio cover:', error);
      return null;
    }
  };

  // 提取所有文件的封面
  useEffect(() => {
    const extractCovers = async () => {
      const newCoverUrls: Record<string, string> = {};
      
      for (const file of files) {
        if (!fileCoverUrls[file.id]) {
          const coverUrl = await getAudioCover(file.file);
          if (coverUrl) {
            newCoverUrls[file.id] = coverUrl;
          }
        }
      }
      
      if (Object.keys(newCoverUrls).length > 0) {
        setFileCoverUrls(prev => ({ ...prev, ...newCoverUrls }));
      }
    };

    extractCovers();
  }, [files]);

  // 清理不再使用的封面URL
  useEffect(() => {
    const currentFileIds = new Set(files.map(f => f.id));
    const urlsToRevoke: string[] = [];
    const fileIdsToRemove: string[] = [];
    
    Object.entries(fileCoverUrls).forEach(([fileId, url]) => {
      if (!currentFileIds.has(fileId)) {
        urlsToRevoke.push(url);
        fileIdsToRemove.push(fileId);
      }
    });
    
    if (urlsToRevoke.length > 0) {
      urlsToRevoke.forEach(url => URL.revokeObjectURL(url));
      
      setFileCoverUrls(prev => {
        const newUrls = { ...prev };
        fileIdsToRemove.forEach(fileId => {
          delete newUrls[fileId];
        });
        return newUrls;
      });
    }
  }, [files, fileCoverUrls]);

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
        <div className="flex flex-col gap-2">
          {/* 第二行：标题在前，按钮区（上传、录音、标准化）居中且垂直居中 */}
          <div className="flex items-center justify-center gap-2">
            <h3 className="font-semibold text-foreground">
              {type === 'voice' ? '语音轨道' : '背景音乐'}
            </h3>
            {type === 'voice' && onAddVoiceFiles && (
              <VoiceCaptureControls onAddVoiceFiles={onAddVoiceFiles} />
            )}
            {onAddFiles && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,.m4a,.flac,.ogg,.aac,.webm"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const list = e.target.files;
                    const files = list ? Array.from(list) : [];
                    if (files.length) {
                      onAddFiles(files);
                    }
                    e.currentTarget.value = '';
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-8 rounded-md px-3 text-sm"
                  aria-label="选择本地文件"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  本地上传
                </Button>
              </>
            )}
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
          </div>

          {/* 第三行：文件信息居中在前，播放与音量控制在后（紧凑） */}
          <div className="flex items-center justify-center gap-3">
            <span className="text-xs text-muted-foreground text-center">
              {files.length} 个文件 · {formatDuration(trackTotalDuration)}
            </span>
            <div className="flex items-center gap-2">
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
                {isPlaying && files.length > 0 && (
                  <LoudnessIndicator
                    audioData={audioBuffer}
                    isPlaying={isPlaying}
                    trackType={type}
                    className="min-w-[80px] sm:min-w-[120px]"
                  />
                )}
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
      </div>
      
      <div className={cn(
        files.length === 0 ? "min-h-[110px] p-2 flex items-center justify-center" : "min-h-[100px] p-2",
        `bg-${trackBgColor}`
      )}>
        {files.length === 0 ? (
          <div className="text-muted-foreground text-sm">
            {type === 'voice' ? '语音存放空间' : '背景音乐存放空间'}
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 items-start">
            {files.map((file, index) => (
              <div key={file.id} className="flex-shrink-0 w-fit">
                <div
                  className={cn(
                    "relative bg-card border border-border rounded-lg p-0.5 w-[90px] h-auto overflow-hidden group shadow-sm",
                    "hover:shadow-md hover:ring-1 transition-all duration-200 cursor-grab active:cursor-grabbing select-none",
                    type === 'voice' ? 'ring-track-voice' : 'ring-track-music'
                  )}
                  style={{
                    backgroundImage: fileCoverUrls[file.id] 
                      ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${fileCoverUrls[file.id]})` 
                      : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
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
                  {/* Accent stripe to distinguish track type */}
                  <div className={cn(
                    "absolute left-0 top-0 h-full w-1",
                    `bg-${trackColor}`
                  )} />
                  <div className="grid grid-cols-[1fr_auto] items-start gap-x-1 mb-1">
                    <div className="min-w-0 flex items-center gap-1">
                      <GripVertical className={cn(
                        "w-2 h-2",
                        fileCoverUrls[file.id] ? "text-white/70" : "text-muted-foreground"
                      )} aria-hidden="true" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => index > 0 && onReorderFiles(index, index - 1)}
                        aria-label="向前移动"
                        className={cn(
                          "h-4 w-4 p-0 hover:bg-secondary",
                          fileCoverUrls[file.id] && "hover:bg-white/20"
                        )}
                      >
                        <ChevronLeft className={cn(
                          "w-2 h-2",
                          fileCoverUrls[file.id] ? "text-white/90" : ""
                        )} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => index < files.length - 1 && onReorderFiles(index, index + 1)}
                        aria-label="向后移动"
                        className={cn(
                          "h-4 w-4 p-0 hover:bg-secondary",
                          fileCoverUrls[file.id] && "hover:bg-white/20"
                        )}
                      >
                        <ChevronRight className={cn(
                          "w-2 h-2",
                          fileCoverUrls[file.id] ? "text-white/90" : ""
                        )} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveFile(file.id)}
                        aria-label="移除文件"
                        className={cn(
                          "h-4 w-4 p-0 hover:bg-destructive/20 hover:text-destructive",
                          fileCoverUrls[file.id] && "hover:bg-red-500/30 hover:text-red-200"
                        )}
                      >
                        <X className={cn(
                          "w-2 h-2",
                          fileCoverUrls[file.id] ? "text-white/90" : ""
                        )} />
                      </Button>
                    </div>
                    {/* 文件标题：窄区域内使用跑马灯效果，时长置于其下方 */}
                    <div
                      className="col-start-2 w-[70px] mt-0.5 relative rounded-md overflow-hidden flex flex-col items-center justify-center text-center"
                      data-force-marquee={marqueeFlags[file.id] ? "true" : undefined}
                    >
                      <span
                        ref={(el) => { titleRefs.current[file.id] = el }}
                        className={cn(
                          "text-[12px] inline-block whitespace-nowrap min-w-full",
                          fileCoverUrls[file.id] ? "text-white/90" : "text-foreground/80",
                          marqueeFlags[file.id] ? "animate-marquee" : ""
                        )}
                      >
                        {file.name.replace(/\.[^./\\]+$/, '')}
                      </span>
                      <p className={cn(
                        "mt-0.5 text-[12px] text-center whitespace-nowrap px-0 pb-0",
                        fileCoverUrls[file.id] ? "text-white/80" : "text-muted-foreground"
                      )}>
                        {formatDuration(file.duration)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Waveform visualization */}
                  <WaveformVisualization
                    audioFile={file.file}
                    trackType={type}
                    isPlaying={isPlaying}
                    className="mt-1 h-5"
                  />
                </div>
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

export const AudioTrack = memo(AudioTrackComponent);
