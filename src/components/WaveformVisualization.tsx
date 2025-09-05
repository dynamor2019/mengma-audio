import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface WaveformVisualizationProps {
  audioFile: File;
  trackType: 'voice' | 'music';
  isPlaying?: boolean;
  className?: string;
}

export const WaveformVisualization = ({
  audioFile,
  trackType,
  isPlaying = false,
  className
}: WaveformVisualizationProps) => {
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const trackColor = trackType === 'voice' ? 'track-voice' : 'track-music';

  useEffect(() => {
    let isCancelled = false;
    let audioContext: AudioContext | null = null;
    
    const analyzeAudioFile = async () => {
      setIsLoading(true);
      try {
        audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        
        // Check if component was unmounted before proceeding
        if (isCancelled) {
          audioContext.close();
          return;
        }
        
        const arrayBuffer = await audioFile.arrayBuffer();
        
        // Check again after async operation
        if (isCancelled) {
          audioContext.close();
          return;
        }
        
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Check once more after decoding
        if (isCancelled) {
          audioContext.close();
          return;
        }
        
        // Get the first channel data
        const channelData = audioBuffer.getChannelData(0);
        const samples = 40; // Number of bars in the waveform
        const blockSize = Math.floor(channelData.length / samples);
        const waveform: number[] = [];
        
        // Calculate RMS for each block to create waveform
        for (let i = 0; i < samples; i++) {
          const start = i * blockSize;
          const end = Math.min(start + blockSize, channelData.length);
          
          let sum = 0;
          for (let j = start; j < end; j++) {
            sum += channelData[j] * channelData[j];
          }
          
          const rms = Math.sqrt(sum / (end - start));
          // Normalize to 0-100 range and apply some gain for better visualization
          const normalizedValue = Math.min(100, rms * 300);
          waveform.push(normalizedValue);
        }
        
        if (!isCancelled) {
          setWaveformData(waveform);
        }
        
        audioContext.close();
      } catch (error) {
        console.error('Error analyzing audio file:', error);
        // Clean up audio context on error
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close();
        }
        // Fallback to random data if analysis fails
        if (!isCancelled) {
          setWaveformData(Array.from({ length: 40 }, () => Math.random() * 80 + 10));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    analyzeAudioFile();
    
    // Cleanup function
    return () => {
      isCancelled = true;
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [audioFile]);

  if (isLoading) {
    return (
      <div className={cn("flex items-end gap-px h-12 animate-pulse", className)}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-muted/50 rounded-sm"
            style={{ height: '50%' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-end gap-px h-12", className)}>
      {waveformData.map((amplitude, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-sm transition-all duration-300 min-h-[2px]",
            `bg-${trackColor}/70 hover:bg-${trackColor}`,
            isPlaying && "animate-pulse"
          )}
          style={{
            height: `${Math.max(5, amplitude)}%`,
            animationDelay: isPlaying ? `${i * 0.05}s` : undefined
          }}
        />
      ))}
    </div>
  );
};