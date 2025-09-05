import { useCallback } from 'react';
import { Upload, Music, Mic } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/Utils';

interface AudioUploaderProps {
  onFilesUpload: (files: File[], type: 'voice' | 'music') => void;
  accept?: string;
  multiple?: boolean;
}

export const AudioUploader = ({ onFilesUpload, accept = ".mp3,.wav,.m4a,.flac", multiple = true }: AudioUploaderProps) => {
  const handleFileChange = useCallback((files: FileList | null, type: 'voice' | 'music') => {
    if (files) {
      const audioFiles = Array.from(files).filter(file => 
        file.type.startsWith('audio/') || 
        ['.mp3', '.wav', '.m4a', '.flac'].some(ext => file.name.toLowerCase().endsWith(ext))
      );
      if (audioFiles.length > 0) {
        onFilesUpload(audioFiles, type);
      }
    }
  }, [onFilesUpload]);

  const UploadZone = ({ type, icon: Icon, title, description }: {
    type: 'voice' | 'music';
    icon: typeof Upload;
    title: string;
    description: string;
  }) => (
    <Card className={cn(
      "relative border-2 border-dashed border-border hover:border-ring transition-all duration-300",
      "bg-gradient-secondary hover:shadow-glow group cursor-pointer",
      type === 'voice' ? "hover:border-track-voice" : "hover:border-track-music"
    )}>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFileChange(e.target.files, type)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      <div className="p-8 text-center">
        <div className={cn(
          "w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-300",
          type === 'voice' 
            ? "bg-track-voice-bg group-hover:bg-track-voice/20" 
            : "bg-track-music-bg group-hover:bg-track-music/20"
        )}>
          <Icon className={cn(
            "w-8 h-8 transition-colors duration-300",
            type === 'voice' 
              ? "text-track-voice" 
              : "text-track-music"
          )} />
        </div>
        <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
        <p className="text-muted-foreground mb-4">{description}</p>
        <div className="text-sm text-muted-foreground">
          支持格式: MP3, WAV, M4A, FLAC
        </div>
      </div>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <UploadZone
        type="voice"
        icon={Mic}
        title="语音轨道"
        description="上传您的语音文件，将在主轨道中播放"
      />
      <UploadZone
        type="music"
        icon={Music}
        title="背景音乐"
        description="上传背景音乐文件，将在背景轨道中播放"
      />
    </div>
  );
};
