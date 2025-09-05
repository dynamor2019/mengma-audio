import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Download, FileAudio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type AudioFormat = 'wav' | 'mp3' | 'ogg' | 'aac';

interface ExportFormatSelectorProps {
  onExport: (formats: AudioFormat[]) => void;
  disabled?: boolean;
  isExporting?: boolean;
}

const formatOptions: { value: AudioFormat; label: string; description: string }[] = [
  { value: 'wav', label: 'WAV', description: '无损音质，文件较大' },
  { value: 'mp3', label: 'MP3', description: '通用格式，文件较小' },
  { value: 'ogg', label: 'OGG', description: '开源格式，高质量' },
  { value: 'aac', label: 'AAC', description: '高效压缩，Apple设备优化' }
];

export const ExportFormatSelector = ({
  onExport,
  disabled = false,
  isExporting = false
}: ExportFormatSelectorProps) => {
  const [selectedFormats, setSelectedFormats] = useState<AudioFormat[]>(['wav']);

  const handleFormatToggle = (format: AudioFormat) => {
    setSelectedFormats(prev =>
      prev.includes(format)
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };

  const handleExport = () => {
    if (selectedFormats.length > 0) {
      onExport(selectedFormats);
    }
  };

  return (
    <Card className="bg-gradient-secondary border-border p-4">
      <div className="flex items-center gap-2 mb-4">
        <FileAudio className="w-4 h-4 text-accent" />
        <h4 className="text-sm font-semibold">选择导出格式</h4>
      </div>

      {/* 横排格式选择 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {formatOptions.map((format) => (
          <div 
            key={format.value} 
            className="flex items-center space-x-2 p-2 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => !disabled && handleFormatToggle(format.value)}
          >
            <Checkbox
              id={format.value}
              checked={selectedFormats.includes(format.value)}
              onCheckedChange={() => handleFormatToggle(format.value)}
              disabled={disabled}
              className="pointer-events-none"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <label
                  htmlFor={format.value}
                  className="text-xs font-medium cursor-pointer truncate"
                >
                  {format.label}
                </label>
                <Badge variant="outline" className="text-xs px-1 py-0">
                  .{format.value}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {format.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          已选择 {selectedFormats.length} 个格式
        </div>
        
        <Button
          onClick={handleExport}
          disabled={disabled || selectedFormats.length === 0 || isExporting}
          className="bg-gradient-accent hover:bg-gradient-accent/90 text-accent-foreground shadow-accent"
          size="sm"
        >
          <Download className="w-3 h-3 mr-1" />
          {isExporting ? '导出中...' : '导出音频'}
        </Button>
      </div>
    </Card>
  );
};