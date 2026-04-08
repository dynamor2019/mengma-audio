import { useEffect, useRef, useState, memo } from 'react';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';

interface VoiceCaptureControlsProps {
  onAddVoiceFiles: (files: File[]) => void;
  onSavedToVoiceStorage?: () => void;
}

const VoiceCaptureControlsComponent = ({ onAddVoiceFiles, onSavedToVoiceStorage }: VoiceCaptureControlsProps) => {
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

  const selectSupportedMimeType = (): string | undefined => {
    const candidates = [
      'audio/mp4',
      'audio/aac',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
    ];
    for (const type of candidates) {
      if ((window as any).MediaRecorder?.isTypeSupported?.(type)) {
        return type;
      }
    }
    return undefined;
  };

  const getFileExtension = (mimeType?: string) => {
    if (!mimeType) return 'webm';
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('aac')) return 'aac';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('webm')) return 'webm';
    return 'webm';
  };

  const sanitizeFilename = (rawName: string, extension: string) => {
    const trimmed = rawName.trim();
    const withoutExt = trimmed.replace(/\.[^.]+$/i, '');
    const safe = withoutExt.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
    const base = safe || `recording-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    return `${base}.${extension}`;
  };

  const getFilenameFromUser = (extension: string) => {
    const suggested = `recording-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
    const userInput = window.prompt('录音已结束，请修改或确认文件名：', suggested);
    return sanitizeFilename(userInput ?? suggested, extension);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const base64 = result.split(',')[1];
        if (!base64) {
          reject(new Error('无法转换录音数据'));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error ?? new Error('读取录音数据失败'));
      reader.readAsDataURL(blob);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await getUserMediaCompat({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: false,
          channelCount: 1,
        } as MediaTrackConstraints
      });
      // 检查设备是否存在音频输入设备，提前给出指引（模拟器或设备禁用麦克风时）
      try {
        const devices = await navigator.mediaDevices?.enumerateDevices?.();
        const hasAudioInput = Array.isArray(devices) && devices.some(d => d.kind === 'audioinput');
        if (!hasAudioInput) {
          toast.warning('未检测到音频输入设备：请检查模拟器/设备麦克风是否可用');
        }
      } catch { /* 枚举失败忽略 */ }

      mediaStreamRef.current = stream;
      const mimeType = selectSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options as any);
      const recordedMimeType = mimeType || recorder.mimeType || 'audio/webm';
      if (!recordedMimeType.includes('mp4')) {
        toast.warning('当前设备不支持 MP4 录音，已自动回退为其它音频格式');
      }
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      recorder.onstop = async () => {
        const extension = getFileExtension(recordedMimeType);
        const blob = new Blob(chunksRef.current, { type: recordedMimeType });
        const filename = getFilenameFromUser(extension);
        await saveRecording(blob, filename);
        const file = new File([blob], filename, { type: blob.type });
        onAddVoiceFiles([file]);
        onSavedToVoiceStorage?.();
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
      } else if (name === 'NotFoundError') {
        toast.error('未找到音频输入设备：请连接或启用麦克风');
      } else if (name === 'NotReadableError') {
        toast.error('麦克风忙或不可读：请关闭其它录音应用后重试');
      } else if (name === 'OverconstrainedError') {
        toast.error('当前录音参数不受支持：请使用默认音频约束');
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
      if (Capacitor.isNativePlatform()) {
        const base64Data = await blobToBase64(blob);
        await Filesystem.writeFile({
          path: `Recordings/${filename}`,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
        toast.success('录音已保存到手机本地');
        return true;
      }
    } catch (error) {
      console.warn('保存到手机本地失败，将回退到浏览器保存方式', error);
    }

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
