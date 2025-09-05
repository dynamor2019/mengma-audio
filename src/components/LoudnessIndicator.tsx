import { useEffect, useState } from 'react';
import { cn } from '@/lib/Utils';

interface LoudnessIndicatorProps {
  audioData?: AudioBuffer;
  isPlaying: boolean;
  trackType: 'voice' | 'music';
  className?: string;
}

export const LoudnessIndicator = ({
  audioData,
  isPlaying,
  trackType,
  className
}: LoudnessIndicatorProps) => {
  const [loudness, setLoudness] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  
  const trackColor = trackType === 'voice' ? 'track-voice' : 'track-music';
  
  useEffect(() => {
    if (!audioData || !isPlaying) {
      setLoudness(0);
      setPeakLevel(0);
      return;
    }
    
    // Simulate real-time loudness calculation
    const interval = setInterval(() => {
      // Calculate RMS loudness from audio data
      const samples = audioData.getChannelData(0);
      let sum = 0;
      let peak = 0;
      
      for (let i = 0; i < samples.length; i += 1000) { // Sample every 1000th point for performance
        const sample = Math.abs(samples[i]);
        sum += sample * sample;
        peak = Math.max(peak, sample);
      }
      
      const rms = Math.sqrt(sum / (samples.length / 1000));
      const loudnessDb = 20 * Math.log10(rms + 0.001); // Add small value to avoid log(0)
      const normalizedLoudness = Math.max(0, Math.min(100, (loudnessDb + 60) * (100/60))); // Normalize -60dB to 0dB range
      
      setLoudness(normalizedLoudness + Math.random() * 10); // Add some variation for animation
      setPeakLevel(peak * 100);
    }, 50);
    
    return () => clearInterval(interval);
  }, [audioData, isPlaying]);
  
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="text-xs font-medium text-muted-foreground">响度指标</div>
      
      {/* Digital loudness meter */}
      <div className="flex items-center gap-2">
        <div className="w-20 h-6 bg-muted/30 rounded overflow-hidden relative">
          {/* Background grid */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-muted/50 last:border-r-0"
              />
            ))}
          </div>
          
          {/* Loudness level */}
          <div
            className={cn(
              "h-full transition-all duration-100 rounded",
              `bg-${trackColor}`,
              loudness > 80 && "bg-red-500", // Peak warning
              loudness > 90 && "animate-pulse" // Critical level
            )}
            style={{ width: `${Math.max(0, Math.min(100, loudness))}%` }}
          />
          
          {/* Peak hold indicator */}
          {peakLevel > 0 && (
            <div
              className="absolute top-0 w-0.5 h-full bg-yellow-400"
              style={{ left: `${Math.min(100, peakLevel)}%` }}
            />
          )}
        </div>
        
        {/* Numeric display */}
        <div className="text-xs font-mono tabular-nums min-w-[3rem]">
          {isPlaying ? `${Math.round(loudness)}%` : '--'}
        </div>
      </div>
      
      {/* Peak level display */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>RMS</span>
        <span className={cn(
          peakLevel > 90 && "text-red-400 font-bold animate-pulse"
        )}>
          Peak: {isPlaying ? `${Math.round(peakLevel)}%` : '--'}
        </span>
      </div>
    </div>
  );
};
