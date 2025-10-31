import { useCallback, memo } from 'react';
import { Upload, Music, Mic } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/Utils';

interface AudioUploaderProps {
  onFilesUpload: (files: File[], type: 'voice' | 'music') => void;
  accept?: string;
  multiple?: boolean;
}

const AudioUploaderComponent = ({ onFilesUpload, accept = "audio/*", multiple = true }: AudioUploaderProps) => {
  const handleFileChange = useCallback((fileList: FileList | null, type: 'voice' | 'music') => {
    console.log('AudioUploader: handleFileChange triggered', { fileList, type });
    if (fileList) {
      const files = Array.from(fileList);
      console.log('AudioUploader: 选择的文件:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
      const audioFiles = files.filter(file => {
        const isAudio = file.type.startsWith('audio/') || 
                       /\.(mp3|wav|m4a|flac|aac|ogg)$/i.test(file.name);
        console.log(`AudioUploader: 文件 ${file.name} 是否为音频:`, isAudio);
        return isAudio;
      });
      
      console.log('AudioUploader: 过滤后的音频文件:', audioFiles.map(f => f.name));
      if (audioFiles.length > 0) {
        console.log('AudioUploader: 调用 onFilesUpload', { audioFiles: audioFiles.map(f => f.name), type });
        onFilesUpload(audioFiles, type);
      } else {
        console.warn('AudioUploader: 没有有效的音频文件');
      }
    } else {
      console.log('AudioUploader: fileList 为空');
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
      <div className="p-3 flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300",
          type === 'voice' 
            ? "bg-track-voice-bg group-hover:bg-track-voice/20" 
            : "bg-track-music-bg group-hover:bg-track-music/20"
        )}>
          <Icon className={cn(
            "w-4 h-4 transition-colors duration-300",
            type === 'voice' 
              ? "text-track-voice" 
              : "text-track-music"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-medium mb-0.5 text-foreground truncate">{title}</h3>
          <p className="text-[11px] text-muted-foreground mb-0.5 truncate">{description}（支持多选）</p>
          <div className="text-[11px] text-muted-foreground opacity-75">
            支持所有音频类型（audio/*）
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <UploadZone
        type="voice"
        icon={Mic}
        title="语音轨道"
        description="上传语音文件"
      />
      <UploadZone
        type="music"
        icon={Music}
        title="背景音乐"
        description="上传背景音乐"
      />
    </div>
  );
};

export const AudioUploader = memo(AudioUploaderComponent);
