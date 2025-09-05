import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { AudioFile } from '@/components/AudioTrack';

export const useAudioManager = () => {
  const [voiceFiles, setVoiceFiles] = useState<AudioFile[]>([]);
  const [musicFiles, setMusicFiles] = useState<AudioFile[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [voiceVolume, setVoiceVolume] = useState(70);
  const [musicVolume, setMusicVolume] = useState(30);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [composedAudioUrl, setComposedAudioUrl] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  
  // Audio enhancement states
  const [voiceGain, setVoiceGain] = useState(100);
  const [musicGain, setMusicGain] = useState(100);
  const [voicePitch, setVoicePitch] = useState(100);
  const [voiceFileGains, setVoiceFileGains] = useState<Record<string, number>>({});
  const [isNormalizingVolume, setIsNormalizingVolume] = useState(false);

  
  const audioContextRef = useRef<AudioContext | null>(null);
  const voiceSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const musicSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (error) {
          console.warn('AudioContext already closed during initialization cleanup:', error);
        }
      }
    };
   }, []);

  const createAudioFile = useCallback(async (file: File): Promise<AudioFile> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      
      audio.addEventListener('loadedmetadata', () => {
        resolve({
          id: Math.random().toString(36).substr(2, 9),
          file,
          duration: audio.duration,
          name: file.name,
          url
        });
      });
      
      audio.addEventListener('error', () => {
        // Clean up the blob URL if audio loading fails
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load audio file'));
      });
      
      // Add timeout to prevent hanging promises
      setTimeout(() => {
        if (audio.readyState === 0) {
          URL.revokeObjectURL(url);
          reject(new Error('Audio file loading timeout'));
        }
      }, 10000); // 10 second timeout
    });
  }, []);

  const handleFilesUpload = useCallback(async (files: File[], type: 'voice' | 'music') => {
    const successfulFiles: AudioFile[] = [];
    const failedFiles: string[] = [];
    
    // Process files individually to handle partial failures
    for (const file of files) {
      try {
        const audioFile = await createAudioFile(file);
        successfulFiles.push(audioFile);
      } catch (error) {
        failedFiles.push(file.name);
        console.error(`Failed to process file ${file.name}:`, error);
      }
    }
    
    // Add successful files to state
    if (successfulFiles.length > 0) {
      if (type === 'voice') {
        setVoiceFiles(prev => [...prev, ...successfulFiles]);
        // 为新语音文件初始化增益为1
        const newGains = successfulFiles.reduce((acc, file) => {
          acc[file.id] = 1;
          return acc;
        }, {} as Record<string, number>);
        setVoiceFileGains(prev => ({ ...prev, ...newGains }));
        toast.success(`成功添加了 ${successfulFiles.length} 个语音文件`);
      } else {
        setMusicFiles(prev => [...prev, ...successfulFiles]);
        toast.success(`成功添加了 ${successfulFiles.length} 个背景音乐文件`);
      }
    }
    
    // Show error for failed files
    if (failedFiles.length > 0) {
      toast.error(`${failedFiles.length} 个文件上传失败: ${failedFiles.join(', ')}`);
    }
    
    // Show general error if no files were processed successfully
    if (successfulFiles.length === 0 && failedFiles.length > 0) {
      toast.error('所有文件上传失败，请检查文件格式');
    }
  }, [createAudioFile]);

  const removeFile = useCallback((id: string, type: 'voice' | 'music') => {
    if (type === 'voice') {
      setVoiceFiles(prev => {
        const file = prev.find(f => f.id === id);
        if (file) URL.revokeObjectURL(file.url);
        return prev.filter(f => f.id !== id);
      });
      setVoiceFileGains(prev => {
        const { [id]: removed, ...rest } = prev;
        return rest;
      });
    } else {
      setMusicFiles(prev => {
        const file = prev.find(f => f.id === id);
        if (file) URL.revokeObjectURL(file.url);
        return prev.filter(f => f.id !== id);
      });
    }
  }, []);

  const reorderFiles = useCallback((startIndex: number, endIndex: number, type: 'voice' | 'music') => {
    const setFiles = type === 'voice' ? setVoiceFiles : setMusicFiles;
    
    setFiles(prev => {
      const newFiles = [...prev];
      const [removed] = newFiles.splice(startIndex, 1);
      newFiles.splice(endIndex, 0, removed);
      return newFiles;
    });
  }, []);

  const getTotalDuration = useCallback(() => {
    const voiceDuration = voiceFiles.reduce((total, file) => total + file.duration, 0);
    // 时长根据语音轨道的长度确定
    return voiceDuration > 0 ? voiceDuration : 60; // 默认60秒如果没有语音文件
  }, [voiceFiles]);

  const playAudio = useCallback(async () => {
    if (!audioContextRef.current || (voiceFiles.length === 0 && musicFiles.length === 0)) {
      toast.error('请先上传音频文件');
      return;
    }

    try {
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const context = audioContextRef.current;
      startTimeRef.current = context.currentTime;
      setIsPlaying(true);

      // Create gain nodes for volume and enhancement control
      const voiceGainNode = context.createGain();
      const musicGainNode = context.createGain();
      voiceGainNode.gain.value = voiceMuted ? 0 : (voiceVolume / 100) * (voiceGain / 100);
      musicGainNode.gain.value = musicMuted ? 0 : (musicVolume / 100) * (musicGain / 100);
      voiceGainNode.connect(context.destination);
      musicGainNode.connect(context.destination);

      // Play voice files sequentially with noise removal
      let voiceOffset = 0;
      for (const file of voiceFiles) {
        try {
          const response = await fetch(file.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch audio file: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          let audioBuffer = await context.decodeAudioData(arrayBuffer);
          
          // Apply advanced noise reduction to voice files
          const channels = [];
          for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const inputData = audioBuffer.getChannelData(channel);
            const outputData = new Float32Array(inputData.length);
            
            // 高级噪音门限设置
            const noiseThreshold = 0.01; // 降低噪音阈值
            const ratio = 3.0; // 压缩比例
            const attackTime = 0.003; // 3ms 攻击时间
            const releaseTime = 0.1; // 100ms 释放时间
            const sampleRate = audioBuffer.sampleRate;
            
            // 计算攻击和释放系数
            const attackCoeff = Math.exp(-1 / (attackTime * sampleRate));
            const releaseCoeff = Math.exp(-1 / (releaseTime * sampleRate));
            
            let envelope = 0;
            let gain = 1;
            
            for (let i = 0; i < inputData.length; i++) {
              const currentSample = inputData[i];
              const amplitude = Math.abs(currentSample);
              
              // 包络跟随
              const targetEnvelope = amplitude;
              if (targetEnvelope > envelope) {
                envelope = targetEnvelope + (envelope - targetEnvelope) * attackCoeff;
              } else {
                envelope = targetEnvelope + (envelope - targetEnvelope) * releaseCoeff;
              }
              
              // 计算增益减少
              let targetGain = 1;
              if (envelope < noiseThreshold) {
                // 使用更平滑的增益减少曲线
                const gateRatio = Math.max(0, envelope / noiseThreshold);
                targetGain = Math.pow(gateRatio, 1 / ratio);
                targetGain = Math.max(0.05, targetGain); // 最小增益为5%而不是10%
              }
              
              // 平滑增益变化
              if (targetGain < gain) {
                gain = targetGain + (gain - targetGain) * attackCoeff;
              } else {
                gain = targetGain + (gain - targetGain) * releaseCoeff;
              }
              
              // 应用增益并添加轻微的高频滤波
              outputData[i] = currentSample * gain;
              
              // 添加轻微的反混叠滤波
              if (i > 0) {
                outputData[i] = outputData[i] * 0.9 + outputData[i - 1] * 0.1;
              }
            }
            
            channels.push(outputData);
          }
          
          // 创建新的音频缓冲区
          const cleanBuffer = context.createBuffer(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
          );
          
          channels.forEach((channelData, index) => {
            cleanBuffer.copyToChannel(channelData, index);
          });
          
          audioBuffer = cleanBuffer;
          
          const source = context.createBufferSource();
          source.buffer = audioBuffer;
          
          // Apply pitch shift for voice if needed
          if (voicePitch !== 100) {
            source.playbackRate.value = voicePitch / 100;
          }
          
          // Apply individual file gain
          const fileGain = voiceFileGains[file.id] || 1;
          const individualGainNode = context.createGain();
          individualGainNode.gain.value = fileGain;
          
          source.connect(individualGainNode);
          individualGainNode.connect(voiceGainNode);
          source.start(context.currentTime + voiceOffset);
          voiceSourcesRef.current.push(source);
          
          voiceOffset += file.duration;
        } catch (error) {
          console.error('Error playing voice file:', error);
        }
      }

      // Play music files with looping to fill total duration
      const targetDuration = getTotalDuration();
      const musicTotalDuration = musicFiles.reduce((total, file) => total + file.duration, 0);
      
      if (musicFiles.length > 0 && musicTotalDuration > 0) {
        let musicOffset = 0;
        const loops = Math.ceil(targetDuration / musicTotalDuration);
        
        for (let loop = 0; loop < loops; loop++) {
          for (const file of musicFiles) {
            if (musicOffset >= targetDuration) break;
            
            try {
              const response = await fetch(file.url);
              if (!response.ok) {
                throw new Error(`Failed to fetch music file: ${response.status}`);
              }
              const arrayBuffer = await response.arrayBuffer();
              const audioBuffer = await context.decodeAudioData(arrayBuffer);
              
              const source = context.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(musicGainNode);
              
              // 如果这个文件会超过目标时长，截断它
              const remainingTime = targetDuration - musicOffset;
              if (remainingTime < file.duration) {
                source.start(context.currentTime + musicOffset, 0, remainingTime);
                musicOffset = targetDuration;
              } else {
                source.start(context.currentTime + musicOffset);
                musicOffset += file.duration;
              }
              
              musicSourcesRef.current.push(source);
            } catch (error) {
              console.error('Error playing music file:', error);
            }
          }
        }
      }

      // Update time
      const updateTime = () => {
        if (audioContextRef.current && isPlaying) {
          setCurrentTime(audioContextRef.current.currentTime - startTimeRef.current);
          animationFrameRef.current = requestAnimationFrame(updateTime);
        }
      };
      updateTime();

      toast.success('开始播放');
    } catch (error) {
      toast.error('播放失败');
      setIsPlaying(false);
    }
  }, [voiceFiles, musicFiles, voiceVolume, musicVolume, voiceGain, musicGain, voicePitch, isPlaying, voiceFileGains]);

  const stopAudio = useCallback(() => {
    // Stop all sources
    [...voiceSourcesRef.current, ...musicSourcesRef.current].forEach(source => {
      try {
        source.stop();
      } catch (error) {
        // Source might already be stopped
      }
    });
    
    voiceSourcesRef.current = [];
    musicSourcesRef.current = [];
    setIsPlaying(false);
    setCurrentTime(0);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    toast.success('播放已停止');
  }, []);


  const composeAudio = useCallback(async () => {
    if (voiceFiles.length === 0 && musicFiles.length === 0) {
      toast.error('请先上传音频文件');
      return;
    }

    setIsComposing(true);
    toast.info('开始合成音频...');

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      const context = audioContextRef.current;
      const voiceBuffers: AudioBuffer[] = [];
      const musicBuffers: AudioBuffer[] = [];

      // Load voice files with noise removal
      for (const file of voiceFiles) {
        try {
          const response = await fetch(file.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch voice file for composition: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await context.decodeAudioData(arrayBuffer);
          
          // Apply advanced noise reduction inline
          const channels = [];
          for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const inputData = audioBuffer.getChannelData(channel);
            const outputData = new Float32Array(inputData.length);
            
            // 高级噪音门限设置
            const noiseThreshold = 0.01; // 降低噪音阈值
            const ratio = 3.0; // 压缩比例
            const attackTime = 0.003; // 3ms 攻击时间
            const releaseTime = 0.1; // 100ms 释放时间
            const sampleRate = audioBuffer.sampleRate;
            
            // 计算攻击和释放系数
            const attackCoeff = Math.exp(-1 / (attackTime * sampleRate));
            const releaseCoeff = Math.exp(-1 / (releaseTime * sampleRate));
            
            let envelope = 0;
            let gain = 1;
            
            for (let i = 0; i < inputData.length; i++) {
              const currentSample = inputData[i];
              const amplitude = Math.abs(currentSample);
              
              // 包络跟随
              const targetEnvelope = amplitude;
              if (targetEnvelope > envelope) {
                envelope = targetEnvelope + (envelope - targetEnvelope) * attackCoeff;
              } else {
                envelope = targetEnvelope + (envelope - targetEnvelope) * releaseCoeff;
              }
              
              // 计算增益减少
              let targetGain = 1;
              if (envelope < noiseThreshold) {
                // 使用更平滑的增益减少曲线
                const gateRatio = Math.max(0, envelope / noiseThreshold);
                targetGain = Math.pow(gateRatio, 1 / ratio);
                targetGain = Math.max(0.05, targetGain); // 最小增益为5%而不是10%
              }
              
              // 平滑增益变化
              if (targetGain < gain) {
                gain = targetGain + (gain - targetGain) * attackCoeff;
              } else {
                gain = targetGain + (gain - targetGain) * releaseCoeff;
              }
              
              // 应用增益并添加轻微的高频滤波
              outputData[i] = currentSample * gain;
              
              // 添加轻微的反混叠滤波
              if (i > 0) {
                outputData[i] = outputData[i] * 0.9 + outputData[i - 1] * 0.1;
              }
            }
            
            channels.push(outputData);
          }
          
          // 创建新的音频缓冲区
          const cleanBuffer = context.createBuffer(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
          );
          
          channels.forEach((channelData, index) => {
            cleanBuffer.copyToChannel(channelData, index);
          });
          
          voiceBuffers.push(cleanBuffer);
        } catch (error) {
          console.error('Error loading voice file:', error);
        }
      }

      // Load music files
      for (const file of musicFiles) {
        try {
          const response = await fetch(file.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch music file for composition: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await context.decodeAudioData(arrayBuffer);
          musicBuffers.push(audioBuffer);
        } catch (error) {
          console.error('Error loading music file:', error);
        }
      }

      // Calculate total duration
      const totalDuration = getTotalDuration();

      if (totalDuration === 0) {
        throw new Error('No valid audio content found');
      }

      // Create output buffer
      const sampleRate = context.sampleRate;
      const outputBuffer = context.createBuffer(2, Math.ceil(totalDuration * sampleRate), sampleRate);
      const leftChannel = outputBuffer.getChannelData(0);
      const rightChannel = outputBuffer.getChannelData(1);

      // Mix voice files with enhancement and individual gains
      let voiceOffset = 0;
      const effectiveVoiceVolume = voiceMuted ? 0 : (voiceVolume / 100) * (voiceGain / 100);
      const pitchRate = voicePitch / 100;
      
      voiceBuffers.forEach((buffer, index) => {
        // Apply individual file gain
        const fileId = voiceFiles[index]?.id;
        const individualGain = fileId ? (voiceFileGains[fileId] || 1) : 1;
        const startSample = Math.floor(voiceOffset * sampleRate);
        const originalLength = buffer.length;
        const adjustedLength = Math.floor(originalLength / pitchRate); // Adjust for pitch change
        
        for (let channel = 0; channel < Math.min(2, buffer.numberOfChannels); channel++) {
          const channelData = buffer.getChannelData(channel);
          const outputChannel = channel === 0 ? leftChannel : rightChannel;
          
          for (let i = 0; i < adjustedLength && startSample + i < outputChannel.length; i++) {
            // Simple pitch shifting by sample rate adjustment
            const sourceIndex = Math.floor(i * pitchRate);
            if (sourceIndex < originalLength) {
              // Apply both volume and individual gain
              outputChannel[startSample + i] += channelData[sourceIndex] * effectiveVoiceVolume * individualGain;
            }
          }
        }
        
        voiceOffset += buffer.duration / pitchRate; // Adjust duration for pitch change
      });

      // Mix music files with looping to fill total duration
      const effectiveMusicVolume = musicMuted ? 0 : (musicVolume / 100) * (musicGain / 100);
      if (musicBuffers.length > 0 && effectiveMusicVolume > 0) {
        const musicTotalDuration = musicBuffers.reduce((total, buffer) => total + buffer.duration, 0);
        let currentMusicTime = 0;
        
        while (currentMusicTime < totalDuration) {
          for (const buffer of musicBuffers) {
            if (currentMusicTime >= totalDuration) break;
            
            const startSample = Math.floor(currentMusicTime * sampleRate);
            const bufferLength = buffer.length;
            const remainingDuration = totalDuration - currentMusicTime;
            const actualLength = Math.min(bufferLength, Math.floor(remainingDuration * sampleRate));
            
            for (let channel = 0; channel < Math.min(2, buffer.numberOfChannels); channel++) {
              const channelData = buffer.getChannelData(channel);
              const outputChannel = channel === 0 ? leftChannel : rightChannel;
              
              for (let i = 0; i < actualLength && startSample + i < outputChannel.length; i++) {
                outputChannel[startSample + i] += channelData[i] * effectiveMusicVolume;
              }
            }
            
            currentMusicTime += buffer.duration;
          }
        }
      }

      // Convert to WAV
      const wavData = audioBufferToWav(outputBuffer);
      const blob = new Blob([wavData], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      setComposedAudioUrl(url);
      toast.success('音频合成完成！');
    } catch (error) {
      console.error('Audio composition error:', error);
      toast.error('音频合成失败');
    } finally {
      setIsComposing(false);
    }
  }, [voiceFiles, musicFiles, voiceVolume, musicVolume, voiceMuted, musicMuted, voiceGain, musicGain, voicePitch, voiceFileGains]);

  const downloadComposedAudio = useCallback(async (formats: string[] = ['wav']) => {
    if (!composedAudioUrl) {
      toast.error('没有可下载的音频');
      return;
    }

    try {
      // Get the audio buffer from the composed audio URL
      const response = await fetch(composedAudioUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch composed audio: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Download each selected format
      for (const format of formats) {
        let blob: Blob;
        let extension: string;

        switch (format) {
          case 'wav': {
            const wavData = audioBufferToWav(audioBuffer);
            blob = new Blob([wavData], { type: 'audio/wav' });
            extension = 'wav';
            break;
          }
          case 'mp3':
            // For MP3, we'll use the MediaRecorder API as a fallback
            blob = await convertToFormat(audioBuffer, 'audio/mp3');
            extension = 'mp3';
            break;
          case 'ogg':
            blob = await convertToFormat(audioBuffer, 'audio/ogg');
            extension = 'ogg';
            break;
          case 'aac':
            blob = await convertToFormat(audioBuffer, 'audio/aac');
            extension = 'aac';
            break;
          default:
            continue;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `composed-audio-${new Date().getTime()}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      // Close audio context safely
      try {
        audioContext.close();
      } catch (error) {
        console.warn('AudioContext already closed during download:', error);
      }
      toast.success(`已开始下载 ${formats.length} 个音频文件`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('音频下载失败');
    }
  }, [composedAudioUrl]);

  // 分析文件音量
  const analyzeFileVolume = async (audioBuffer: AudioBuffer): Promise<number> => {
    const channelData = audioBuffer.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += Math.abs(channelData[i]);
    }
    return sum / channelData.length; // 返回平均音量
  };

  const normalizeVoiceVolumes = useCallback(async () => {
    if (voiceFiles.length === 0) return;
    
    setIsNormalizingVolume(true);
    
    try {
      const volumeData: { id: string; volume: number }[] = [];
      
      // 分析并处理每个语音文件
      for (const file of voiceFiles) {
        const arrayBuffer = await file.file.arrayBuffer();
        const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
        
        // Apply advanced noise reduction inline
        const channels = [];
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
          const inputData = audioBuffer.getChannelData(channel);
          const outputData = new Float32Array(inputData.length);
          
          // 高级噪音门限设置
          const noiseThreshold = 0.01; // 降低噪音阈值
          const ratio = 3.0; // 压缩比例
          const attackTime = 0.003; // 3ms 攻击时间
          const releaseTime = 0.1; // 100ms 释放时间
          const sampleRate = audioBuffer.sampleRate;
          
          // 计算攻击和释放系数
          const attackCoeff = Math.exp(-1 / (attackTime * sampleRate));
          const releaseCoeff = Math.exp(-1 / (releaseTime * sampleRate));
          
          let envelope = 0;
          let gain = 1;
          
          for (let i = 0; i < inputData.length; i++) {
            const currentSample = inputData[i];
            const amplitude = Math.abs(currentSample);
            
            // 包络跟随
            const targetEnvelope = amplitude;
            if (targetEnvelope > envelope) {
              envelope = targetEnvelope + (envelope - targetEnvelope) * attackCoeff;
            } else {
              envelope = targetEnvelope + (envelope - targetEnvelope) * releaseCoeff;
            }
            
            // 计算增益减少
            let targetGain = 1;
            if (envelope < noiseThreshold) {
              // 使用更平滑的增益减少曲线
              const gateRatio = Math.max(0, envelope / noiseThreshold);
              targetGain = Math.pow(gateRatio, 1 / ratio);
              targetGain = Math.max(0.05, targetGain); // 最小增益为5%而不是10%
            }
            
            // 平滑增益变化
            if (targetGain < gain) {
              gain = targetGain + (gain - targetGain) * attackCoeff;
            } else {
              gain = targetGain + (gain - targetGain) * releaseCoeff;
            }
            
            // 应用增益并添加轻微的高频滤波
            outputData[i] = currentSample * gain;
            
            // 添加轻微的反混叠滤波
            if (i > 0) {
              outputData[i] = outputData[i] * 0.9 + outputData[i - 1] * 0.1;
            }
          }
          
          channels.push(outputData);
        }
        
        // 创建新的音频缓冲区
        const cleanBuffer = audioContextRef.current!.createBuffer(
          audioBuffer.numberOfChannels,
          audioBuffer.length,
          audioBuffer.sampleRate
        );
        
        channels.forEach((channelData, index) => {
          cleanBuffer.copyToChannel(channelData, index);
        });
        
        // 分析处理后的音量
        const volume = await analyzeFileVolume(cleanBuffer);
        volumeData.push({ id: file.id, volume });
      }
      
      // 找到最大音量
      const maxVolume = Math.max(...volumeData.map(v => v.volume));
      
      // 计算每个文件的标准化增益
      const newGains: Record<string, number> = {};
      volumeData.forEach(({ id, volume }) => {
        // 计算需要的增益来匹配最大音量
        const gain = maxVolume > 0 ? maxVolume / volume : 1;
        newGains[id] = Math.min(gain, 5); // 限制最大增益为5倍
      });
      
      setVoiceFileGains(newGains);
      toast.success('语音文件音量已标准化并已去除噪音');
    } catch (error) {
      console.error('音量标准化失败:', error);
      toast.error('音量标准化失败');
    } finally {
      setIsNormalizingVolume(false);
    }
  }, [voiceFiles]);

  const resetAll = useCallback(() => {
    stopAudio();
    
    // Clean up all voice file URLs
    voiceFiles.forEach(file => {
      if (file.url) {
        URL.revokeObjectURL(file.url);
      }
    });
    
    // Clean up all music file URLs
    musicFiles.forEach(file => {
      if (file.url) {
        URL.revokeObjectURL(file.url);
      }
    });
    
    setVoiceFiles([]);
    setMusicFiles([]);
    setCurrentTime(0);
    setVoiceFileGains({});
    
    if (composedAudioUrl) {
      URL.revokeObjectURL(composedAudioUrl);
      setComposedAudioUrl(null);
    }
    
    toast.success('已重置所有内容');
  }, [stopAudio, composedAudioUrl, voiceFiles, musicFiles]);

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Clean up all voice file URLs on unmount
      voiceFiles.forEach(file => {
        if (file.url) {
          URL.revokeObjectURL(file.url);
        }
      });
      
      // Clean up all music file URLs on unmount
      musicFiles.forEach(file => {
        if (file.url) {
          URL.revokeObjectURL(file.url);
        }
      });
      
      // Clean up composed audio URL on unmount
      if (composedAudioUrl) {
        URL.revokeObjectURL(composedAudioUrl);
      }
      
      // Stop any ongoing audio playback
      [...voiceSourcesRef.current, ...musicSourcesRef.current].forEach(source => {
        try {
          source.stop();
        } catch (error) {
          // Source might already be stopped
        }
      });
      
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Close audio context safely
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (error) {
          console.warn('AudioContext already closed:', error);
        }
      }
    };
  }, [voiceFiles, musicFiles, composedAudioUrl]);

  return {
    voiceFiles,
    musicFiles,
    isPlaying,
    currentTime,
    voiceVolume,
    musicVolume,
    voiceMuted,
    musicMuted,
    composedAudioUrl,
    isComposing,
    voiceGain,
    musicGain,
    voicePitch,
    totalDuration: getTotalDuration(),
    handleFilesUpload,
    removeFile,
    reorderFiles,
    playAudio,
    stopAudio,
    resetAll,
    composeAudio,
    downloadComposedAudio,
    setVoiceVolume,
    setMusicVolume,
    setVoiceMuted,
    setMusicMuted,
    setVoiceGain,
    setMusicGain,
    setVoicePitch,
    setCurrentTime,
    normalizeVoiceVolumes,
    isNormalizingVolume,
    voiceFileGains
  };
};

// Helper function to convert audio to different formats
async function convertToFormat(audioBuffer: AudioBuffer, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // For MP3 and AAC, we'll use a different approach since MediaRecorder doesn't support them directly
      if (mimeType === 'audio/mp3' || mimeType === 'audio/aac') {
        // Convert to WAV first, then let the browser handle it as best as possible
        const wavData = audioBufferToWav(audioBuffer);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        resolve(blob);
        return;
      }

      // Create a new audio context for playback
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const source = audioContext.createBufferSource();
      const destination = audioContext.createMediaStreamDestination();
      
      source.buffer = audioBuffer;
      source.connect(destination);
      
      // Map MIME types to supported formats
      const formatMap: { [key: string]: string } = {
        'audio/ogg': 'audio/ogg; codecs=opus',
        'audio/webm': 'audio/webm; codecs=opus',
        'audio/wav': 'audio/wav'
      };
      
      let finalMimeType = formatMap[mimeType] || mimeType;
      
      // Check if the MIME type is supported, fallback to webm
      if (!MediaRecorder.isTypeSupported(finalMimeType)) {
        const supportedTypes = ['audio/webm; codecs=opus', 'audio/ogg; codecs=opus', 'audio/webm'];
        finalMimeType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
      }
      
      const mediaRecorder = new MediaRecorder(destination.stream, { mimeType: finalMimeType });
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: finalMimeType });
        audioContext.close();
        resolve(blob);
      };
      
      mediaRecorder.onerror = (error) => {
        audioContext.close();
        reject(error);
      };
      
      mediaRecorder.start();
      source.start();
      
      // Stop recording after the audio duration
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
        if (source.context.state !== 'closed') {
          source.stop();
        }
      }, (audioBuffer.duration * 1000) + 200);
      
    } catch (error) {
      reject(error);
    }
  });
}

// Helper function to convert AudioBuffer to WAV
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(arrayBuffer);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * numberOfChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * numberOfChannels * 2, true);

  // Convert audio data
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = buffer.getChannelData(channel)[i];
      const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}