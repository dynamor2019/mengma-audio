import { useEffect, useRef, useState, memo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';

interface VoiceCaptureControlsProps {
  onAddVoiceFiles: (files: File[]) => void;
}

const VoiceCaptureControlsComponent = ({ onAddVoiceFiles }: VoiceCaptureControlsProps) => {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    return () => {
      // 清理资源
      try {
        mediaRecorderRef.current?.stop();
      } catch {}
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const getUserMediaCompat = async (constraints: MediaStreamConstraints) => {
    const md = navigator.mediaDevices as MediaDevices | undefined;
    if (md && md.getUserMedia) {
      return md.getUserMedia(constraints);
    }
    const legacy = (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia || (navigator as any).getUserMedia;
    if (legacy) {
      return new Promise<MediaStream>((resolve, reject) => legacy.call(navigator, constraints, resolve, reject));
    }
    throw new Error('当前环境不支持麦克风访问（缺少 mediaDevices）');
  };

  const startRecording = async () => {
    try {
      const stream = await getUserMediaCompat({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const filename = `recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        await saveRecording(blob, filename);
        const file = new File([blob], filename, { type: blob.type });
        onAddVoiceFiles([file]);
        chunksRef.current = [];
        // 释放媒体流
        mediaStreamRef.current?.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      };
      recorder.start();
      setIsRecording(true);
    } catch (error: any) {
      console.error('开始录音失败:', error);
      const name = error?.name || '';
      const msg = error?.message || '';
      // 统一友好提示，并给出操作指引
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        toast.error('无法访问麦克风：请在系统设置中授予麦克风权限');
      } else if (msg.includes('mediaDevices')) {
        toast.error('当前系统WebView不支持麦克风访问（缺少 mediaDevices）');
      } else {
        toast.error(`无法访问麦克风：${msg || '未知错误'}`);
      }
    }
  };

  const stopRecording = () => {
    try {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } catch (error) {
      console.error('停止录音失败:', error);
    }
  };

  // 已移除本地文件选择入口，统一使用轨道头部的“本地上传”按钮

  const saveRecording = async (blob: Blob, filename: string) => {
    try {
      // 优先使用文件系统访问API保存到用户选择的本地目录
      if ('showDirectoryPicker' in window) {
        // @ts-ignore
        const dirHandle = await window.showDirectoryPicker();
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      }
    } catch (error) {
      console.warn('保存到本地目录失败，将回退为下载:', error);
    }
    // 回退：触发浏览器下载
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return false;
    } catch (error) {
      console.error('下载录音失败:', error);
      return false;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isRecording ? (
        <Button variant="destructive" size="sm" onClick={stopRecording} aria-label="停止并保存">
          <Square className="w-4 h-4 mr-1" /> 停止并保存
        </Button>
      ) : (
        <Button variant="secondary" size="sm" onClick={startRecording} aria-label="开始录音">
          <Mic className="w-4 h-4 mr-1" /> 录音
        </Button>
      )}
      {/* 本地文件按钮已移除，避免与轨道头部上传入口重复 */}
    </div>
  );
};

export const VoiceCaptureControls = memo(VoiceCaptureControlsComponent);