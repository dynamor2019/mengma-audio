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
  
  // 新增的音频增强控制状态
  const [voiceGain, setVoiceGain] = useState(100);
  const [musicGain, setMusicGain] = useState(100);
  const [voicePitch, setVoicePitch] = useState(100);
  const [voiceFileGains, setVoiceFileGains] = useState<Record<string, number>>({});
  const [isNormalizingVolume, setIsNormalizingVolume] = useState(false);

  // 音频上下文和源节点引用
  const audioContextRef = useRef<AudioContext | null>(null);
  const voiceSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const musicSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();
  const activeUrlsRef = useRef<Set<string>>(new Set()); // 跟踪所有活跃的blob URL
  const urlRefCountRef = useRef<Map<string, number>>(new Map()); // URL引用计数
  // 每轨道主增益节点引用，支持播放中实时调节音量/增益/静音
  const voiceMasterGainRef = useRef<GainNode | null>(null);
  const musicMasterGainRef = useRef<GainNode | null>(null);

  // 调试函数：记录当前活跃的URL
  const logActiveUrls = useCallback(() => {
    if (activeUrlsRef.current.size > 0) {
      console.log('🔗 当前活跃的blob URLs:', Array.from(activeUrlsRef.current));
      console.log('📊 URL引用计数:', Object.fromEntries(urlRefCountRef.current));
    }
  }, []);

  // 添加URL引用
  const addUrlRef = useCallback((url: string) => {
    const currentCount = urlRefCountRef.current.get(url) || 0;
    urlRefCountRef.current.set(url, currentCount + 1);
    activeUrlsRef.current.add(url);
  }, []);

  const removeUrlRef = useCallback((url: string) => {
    const currentCount = urlRefCountRef.current.get(url) || 0;
    if (currentCount <= 1) {
      urlRefCountRef.current.delete(url);
      activeUrlsRef.current.delete(url);
      try {
        URL.revokeObjectURL(url);
        console.log('🗑️ 已释放blob URL:', url);
      } catch (error) {
        console.warn('释放URL时出错:', error);
      }
    } else {
      urlRefCountRef.current.set(url, currentCount - 1);
    }
  }, []);

  // 验证blob URL是否有效
  const validateBlobUrl = useCallback((url: string): boolean => {
    try {
      // 检查URL格式
      if (!url || !url.startsWith('blob:')) {
        return false;
      }
      
      // 检查是否在活跃URL集合中
      return activeUrlsRef.current.has(url);
    } catch (error) {
      console.warn('验证blob URL时出错:', error);
      return false;
    }
  }, []);

  // 自动恢复失效的URL
  const recoverFailedUrl = useCallback(async (audioFile: AudioFile): Promise<string | null> => {
    try {
      if (!audioFile.file) {
        console.warn('⚠️ 无法恢复URL：原始文件对象不存在');
        return null;
      }

      console.log('🔄 尝试恢复失效的URL:', audioFile.name);
      
      // 移除旧的URL引用
      if (audioFile.url) {
        removeUrlRef(audioFile.url);
      }
      
      // 创建新的blob URL
      const newUrl = URL.createObjectURL(audioFile.file);
      addUrlRef(newUrl);
      
      // 验证新URL是否可用
      return new Promise((resolve) => {
        const testAudio = new Audio();
        
        const cleanup = () => {
          testAudio.removeEventListener('loadedmetadata', onSuccess);
          testAudio.removeEventListener('error', onError);
        };
        
        const onSuccess = () => {
          cleanup();
          console.log('✅ URL恢复成功:', newUrl);
          resolve(newUrl);
        };
        
        const onError = () => {
          cleanup();
          removeUrlRef(newUrl);
          console.warn('❌ URL恢复失败');
          resolve(null);
        };
        
        testAudio.addEventListener('loadedmetadata', onSuccess);
        testAudio.addEventListener('error', onError);
        testAudio.src = newUrl;
        testAudio.load();
        
        // 5秒超时
        setTimeout(() => {
          cleanup();
          removeUrlRef(newUrl);
          resolve(null);
        }, 5000);
      });
    } catch (error) {
      console.error('恢复URL时出错:', error);
      return null;
    }
  }, [addUrlRef, removeUrlRef]);

  // 检查并自动恢复失效的音频文件
  const checkAndRecoverAudioFiles = useCallback(async () => {
    const checkFiles = async (files: AudioFile[], setFiles: React.Dispatch<React.SetStateAction<AudioFile[]>>) => {
      const updatedFiles = await Promise.all(
        files.map(async (file) => {
          if (!validateBlobUrl(file.url)) {
            console.log('🔍 检测到失效URL，尝试自动恢复:', file.name);
            const recoveredUrl = await recoverFailedUrl(file);
            
            if (recoveredUrl) {
              return { ...file, url: recoveredUrl };
            } else {
              // 恢复失败，显示友好提示
              toast.error(
                `音频文件 "${file.name}" 已失效，请重新上传或刷新页面后重新选择音频文件`,
                {
                  duration: 5000,
                  action: {
                    label: '了解更多',
                    onClick: () => {
                      toast.info(
                        '音频文件失效通常发生在页面刷新或长时间未使用后。重新上传文件即可解决此问题。',
                        { duration: 8000 }
                      );
                    }
                  }
                }
              );
              return file; // 保留原文件，让用户决定是否删除
            }
          }
          return file;
        })
      );
      
      // 只有在有变化时才更新状态
      const hasChanges = updatedFiles.some((file, index) => file.url !== files[index].url);
      if (hasChanges) {
        setFiles(updatedFiles);
      }
    };

    await Promise.all([
      checkFiles(voiceFiles, setVoiceFiles),
      checkFiles(musicFiles, setMusicFiles)
    ]);
  }, [voiceFiles, musicFiles, validateBlobUrl, recoverFailedUrl]);

  // 清理所有URL引用
  const cleanupAllUrls = useCallback(() => {
    // 开发模式下跳过URL清理，避免HMR时文件失效
  // @ts-ignore
  if ((import.meta as any).env?.DEV && (import.meta as any).hot) {
      console.log('🔧 开发模式：跳过URL清理以支持热重载');
      return;
    }
    
    console.log('🧹 开始清理所有blob URLs...');
    const urls = Array.from(activeUrlsRef.current);
    urls.forEach(url => {
      try {
        URL.revokeObjectURL(url);
        console.log('🗑️ 已释放blob URL:', url);
      } catch (error) {
        console.warn('释放URL时出错:', error);
      }
    });
    activeUrlsRef.current.clear();
    urlRefCountRef.current.clear();
    console.log('✅ 所有blob URLs已清理完成');
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanupAllUrls();
    };
  }, [cleanupAllUrls]);

  // 开发模式下的HMR支持
  useEffect(() => {
  // @ts-ignore
  if ((import.meta as any).env?.DEV && (import.meta as any).hot) {
      // HMR时自动检查并恢复音频文件
      const handleHMR = () => {
        console.log('🔥 检测到热重载，检查音频文件状态...');
        setTimeout(() => {
          checkAndRecoverAudioFiles();
        }, 1000); // 延迟1秒确保组件完全重新渲染
      };

  // @ts-ignore
  (import.meta as any).hot.on('vite:beforeUpdate', handleHMR);
      
      return () => {
  // @ts-ignore
  (import.meta as any).hot?.off('vite:beforeUpdate', handleHMR);
      };
    }
  }, [checkAndRecoverAudioFiles]);

  // 定期检查音频文件状态（生产环境）
  useEffect(() => {
  // @ts-ignore
  if (!(import.meta as any).env?.DEV) {
      const interval = setInterval(() => {
        checkAndRecoverAudioFiles();
      }, 30000); // 每30秒检查一次

      return () => clearInterval(interval);
    }
  }, [checkAndRecoverAudioFiles]);

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        
        console.log('🎵 音频上下文初始化成功');
      } catch (error) {
        console.error('❌ 音频上下文初始化失败:', error);
        throw error;
      }
    }
    return audioContextRef.current;
  }, []);

  const createAudioFile = useCallback(async (file: File): Promise<AudioFile> => {
    console.log('📁 开始处理文件:', file.name);
    
    let timeoutId: NodeJS.Timeout;
    
    return new Promise(async (resolve, reject) => {
      try {
        // 创建blob URL并添加引用
        const url = URL.createObjectURL(file);
        addUrlRef(url);
        console.log('🔗 创建blob URL:', url);
        
        // 验证URL
        if (!validateBlobUrl(url)) {
          throw new Error('创建的blob URL无效');
        }
        
        const setupAudioLoading = () => {
          const audio = new Audio();
          let isResolved = false;
          
          const handleError = (error: any) => {
            if (isResolved) return;
            
            console.warn('⚠️ 音频加载出错，尝试恢复:', error);
            
            // 如果URL加载失败，尝试重新创建
            if (!validateBlobUrl(url)) {
              console.log('🔄 URL已失效，重新创建...');
              const newUrl = URL.createObjectURL(file);
              addUrlRef(newUrl);
              
              // 重新创建Audio对象并设置事件监听
              const newAudio = new Audio();
              newAudio.addEventListener('loadedmetadata', () => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timeoutId);
                
                const audioFile: AudioFile = {
                  id: Date.now().toString(),
                  name: file.name,
                  url: newUrl,
                  duration: newAudio.duration || 0,
                  file: file
                };
                
                console.log('✅ 音频文件创建成功 (恢复):', audioFile);
                resolve(audioFile);
              });
              
              newAudio.addEventListener('error', () => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timeoutId);
                removeUrlRef(newUrl);
                reject(new Error(`无法加载音频文件: ${file.name}`));
              });
              
              newAudio.src = newUrl;
              newAudio.load();
            } else {
              isResolved = true;
              clearTimeout(timeoutId);
              removeUrlRef(url);
              reject(error);
            }
          };
          
          // 音频元数据加载完成
          audio.addEventListener('loadedmetadata', async () => {
            if (isResolved) return;
            clearTimeout(timeoutId);

            const finalize = (finalDuration: number) => {
              if (isResolved) return;
              isResolved = true;
              const audioFile: AudioFile = {
                id: Date.now().toString(),
                name: file.name,
                url: url,
                duration: finalDuration || 0,
                file: file
              };
              console.log('✅ 音频文件创建成功:', audioFile);
              resolve(audioFile);
            };

            let duration = audio.duration || 0;
            // 处理部分录音（如 webm）出现 duration 为 0 或 Infinity 的情况
            if (!isFinite(duration) || duration === 0) {
              try {
                const arrayBuffer = await file.arrayBuffer();
                const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
                if (Ctx) {
                  const ctx = new Ctx();
                  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                  duration = audioBuffer.duration;
                  ctx.close?.();
                }
              } catch (e) {
                console.warn('使用 AudioContext 解码时长失败，将尝试 timeupdate 回退', e);
              }
            }

            if (!isFinite(duration) || duration === 0) {
              const onTimeUpdate = () => {
                if (!isResolved && isFinite(audio.duration) && audio.duration > 0) {
                  audio.removeEventListener('timeupdate', onTimeUpdate);
                  finalize(audio.duration);
                }
              };
              audio.addEventListener('timeupdate', onTimeUpdate);
              try { audio.currentTime = 1e101; } catch {}
            } else {
              finalize(duration);
            }
          });
          
          // 音频可以播放
          audio.addEventListener('canplaythrough', () => {
            console.log('🎵 音频可以播放:', file.name);
          });
          
          // 音频加载错误
          audio.addEventListener('error', (e) => {
            handleError(e);
          });
          
          // 设置超时
          timeoutId = setTimeout(() => {
            if (!isResolved) {
              handleError(new Error('音频加载超时'));
            }
          }, 10000);
          
          // 开始加载
          audio.preload = 'metadata';
          audio.src = url;
          audio.load();
        };
        
        try {
          setupAudioLoading();
        } catch (error) {
          console.error('❌ 音频加载初始化失败:', error);
          removeUrlRef(url);
          reject(error);
        }
        
      } catch (error) {
        console.error('❌ 创建音频文件失败:', error);
        reject(error);
      } finally {
        // 清理超时
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    });
  }, [addUrlRef, validateBlobUrl, logActiveUrls]);

  const handleFilesUpload = useCallback(async (files: File[], type: 'voice' | 'music') => {
    console.log(`开始处理${type}文件上传:`, files.map(f => f.name));
    if (!files || files.length === 0) {
      toast.error('未选择任何文件');
      return;
    }
    const successfulFiles: AudioFile[] = [];
    const failedFiles: string[] = [];
    for (const file of files) {
      try {
        console.log(`正在处理文件: ${file.name}`);
        const audioFile = await createAudioFile(file);
        successfulFiles.push(audioFile);
        console.log(`✅ 文件处理成功: ${file.name}`);
      } catch (error: any) {
        let reason = '未知错误';
        if (error instanceof Error) {
          reason = error.message;
        } else if (typeof error === 'string') {
          reason = error;
        }
        console.error(`❌ 文件处理失败: ${file.name}`, reason);
        toast.error(`文件 ${file.name} 上传失败: ${reason}`);
        failedFiles.push(file.name);
      }
    }
    if (successfulFiles.length > 0) {
      if (type === 'voice') {
        setVoiceFiles(prev => [...prev, ...successfulFiles]);
      } else {
        setMusicFiles(prev => [...prev, ...successfulFiles]);
      }
      toast.success(`成功添加 ${successfulFiles.length} 个${type === 'voice' ? '语音' : '音乐'}文件`);
    }
    if (failedFiles.length > 0) {
      toast.error(
        `${failedFiles.length} 个文件上传失败: ${failedFiles.join(', ')}`,
        {
          duration: 6000,
          action: {
            label: '重试',
            onClick: () => {
              toast.info('请重新选择失败的文件进行上传');
            }
          }
        }
      );
    }
    if (successfulFiles.length === 0 && failedFiles.length > 0) {
      toast.error('所有文件上传失败，请检查文件格式、大小（小于100MB）、浏览器兼容性或刷新页面重试');
    }
  }, [createAudioFile]);

  const removeFile = useCallback((id: string, type: 'voice' | 'music') => {
    if (type === 'voice') {
      setVoiceFiles(prev => {
        const fileToRemove = prev.find(f => f.id === id);
        if (fileToRemove?.url) {
          removeUrlRef(fileToRemove.url);
        }
        return prev.filter(f => f.id !== id);
      });
    } else {
      setMusicFiles(prev => {
        const fileToRemove = prev.find(f => f.id === id);
        if (fileToRemove?.url) {
          removeUrlRef(fileToRemove.url);
        }
        return prev.filter(f => f.id !== id);
      });
    }
  }, [removeUrlRef]);

  // 重新排序文件（支持语音/音乐轨道）
  const reorderFiles = useCallback((startIndex: number, endIndex: number, type: 'voice' | 'music') => {
    try {
      const move = (list: AudioFile[]) => {
        if (startIndex === endIndex) return list;
        if (startIndex < 0 || endIndex < 0 || startIndex >= list.length || endIndex >= list.length) {
          console.warn('reorderFiles: 索引越界', { startIndex, endIndex, length: list.length });
          return list;
        }
        const next = list.slice();
        const [moved] = next.splice(startIndex, 1);
        next.splice(endIndex, 0, moved);
        return next;
      };

      if (type === 'voice') {
        setVoiceFiles(prev => move(prev));
      } else {
        setMusicFiles(prev => move(prev));
      }
    } catch (error) {
      console.error('重新排序失败:', error);
      toast.error('重新排序失败');
    }
  }, []);

  const clearAllFiles = useCallback(() => {
    // 清理所有文件的URL引用
    [...voiceFiles, ...musicFiles].forEach(file => {
      if (file.url) {
        removeUrlRef(file.url);
      }
    });
    
    setVoiceFiles([]);
    setMusicFiles([]);
    setComposedAudioUrl(null);
    toast.success('已清空所有文件');
  }, [voiceFiles, musicFiles, removeUrlRef]);

  const stopPlayback = useCallback(() => {
    // 停止所有音频源
    voiceSourcesRef.current.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (error) {
        // 忽略已经停止的源的错误
      }
    });
    
    musicSourcesRef.current.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (error) {
        // 忽略已经停止的源的错误
      }
    });
    
    // 清空源数组
    voiceSourcesRef.current = [];
    musicSourcesRef.current = [];

    // 断开并清空主增益节点
    try { voiceMasterGainRef.current?.disconnect(); } catch {}
    try { musicMasterGainRef.current?.disconnect(); } catch {}
    voiceMasterGainRef.current = null;
    musicMasterGainRef.current = null;
    
    // 取消动画帧
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsPlaying(false);
    setCurrentTime(0);
    startTimeRef.current = 0;
  }, []);

  const playAudio = useCallback(async () => {
    try {
      const audioContext = await initAudioContext();
      stopPlayback();
      if (voiceFiles.length === 0 && musicFiles.length === 0) {
        toast.error('请先添加音频文件');
        return;
      }
      // 设置播放起始时间用于进度更新
      startTimeRef.current = audioContext.currentTime;
      // 1. 语音轨道顺序拼接
      let voiceDuration = 0;
      const voiceBufferList: { buffer: AudioBuffer; gain: number; duration: number }[] = [];
      for (const file of voiceFiles) {
        try {
          const response = await fetch(file.url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const individualGain = voiceFileGains[file.id] || 100;
          // 单文件增益仅保留文件级差异，轨道级音量/增益/静音由主增益节点统一控制
          voiceBufferList.push({
            buffer: audioBuffer,
            gain: (individualGain / 100),
            duration: audioBuffer.duration
          });
          voiceDuration += audioBuffer.duration;
        } catch (error) {
          console.error(`加载语音文件失败: ${file.name}`, error);
        }
      }
      // 2. 合成总时长改为语音总时长，音乐循环陪衬语音
      const totalDuration = voiceDuration;
      // 3. 背景音乐循环
      const musicBufferList: { buffer: AudioBuffer; gain: number }[] = [];
      for (const file of musicFiles) {
        try {
          const response = await fetch(file.url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          // 音乐文件不区分单文件增益，轨道级由主增益节点统一控制
          musicBufferList.push({
            buffer: audioBuffer,
            gain: 1
          });
        } catch (error) {
          console.error(`加载音乐文件失败: ${file.name}`, error);
        }
      }
      if (voiceBufferList.length === 0 && musicBufferList.length === 0) {
        toast.error('没有可播放的音频文件');
        return;
      }
      // 创建并配置每轨道主增益节点（用于实时联动）
      const voiceMasterGain = audioContext.createGain();
      voiceMasterGain.gain.value = (voiceVolume / 100) * (voiceGain / 100) * (voiceMuted ? 0 : 1);
      voiceMasterGain.connect(audioContext.destination);
      voiceMasterGainRef.current = voiceMasterGain;

      const musicMasterGain = audioContext.createGain();
      musicMasterGain.gain.value = (musicVolume / 100) * (musicGain / 100) * (musicMuted ? 0 : 1);
      musicMasterGain.connect(audioContext.destination);
      musicMasterGainRef.current = musicMasterGain;
      // 4. 播放语音轨道（顺序拼接）
      let offset = 0;
      voiceBufferList.forEach(({ buffer, gain, duration }) => {
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        source.buffer = buffer;
        // 实时音调控制：使用 playbackRate 映射 50%~200% 到 0.5~2.0
        try {
          source.playbackRate.value = (voicePitch / 100);
        } catch {}
        gainNode.gain.value = gain;
        source.connect(gainNode);
        // 接入语音主增益节点
        gainNode.connect(voiceMasterGainRef.current!);
        source.start(audioContext.currentTime + offset);
        voiceSourcesRef.current.push(source);
        offset += duration;
      });
      // 5. 循环播放背景音乐，填满 totalDuration
      if (musicBufferList.length > 0) {
        let musicOffset = 0;
        while (musicOffset < totalDuration) {
          for (const { buffer, gain } of musicBufferList) {
            const source = audioContext.createBufferSource();
            const gainNode = audioContext.createGain();
            source.buffer = buffer;
            gainNode.gain.value = gain;
            source.connect(gainNode);
            // 接入音乐主增益节点
            gainNode.connect(musicMasterGainRef.current!);
            const playDuration = Math.min(buffer.duration, totalDuration - musicOffset);
            source.start(audioContext.currentTime + musicOffset);
            // 如果最后一段不足一首，提前 stop
            if (playDuration < buffer.duration) {
              source.stop(audioContext.currentTime + musicOffset + playDuration);
            }
            musicSourcesRef.current.push(source);
            musicOffset += playDuration;
            if (musicOffset >= totalDuration) break;
          }
        }
      }
      setIsPlaying(true);
      // 更新播放时间
      const updateTime = () => {
        if (audioContext && startTimeRef.current) {
          const elapsed = audioContext.currentTime - startTimeRef.current;
          setCurrentTime(elapsed);
          
          if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(updateTime);
          }
        }
      };
      
      updateTime();
      
    } catch (error) {
      console.error('播放失败:', error);
      toast.error('播放失败');
    }
  }, [voiceFiles, musicFiles, voiceVolume, musicVolume, voiceGain, musicGain, voiceMuted, musicMuted, voiceFileGains, isPlaying, initAudioContext, stopPlayback]);

  // 播放中实时联动：更新主增益节点的值
  useEffect(() => {
    const ctx = audioContextRef.current;
    const node = voiceMasterGainRef.current;
    if (!ctx || !node) return;
    node.gain.value = (voiceVolume / 100) * (voiceGain / 100) * (voiceMuted ? 0 : 1);
  }, [voiceVolume, voiceGain, voiceMuted]);

  useEffect(() => {
    const ctx = audioContextRef.current;
    const node = musicMasterGainRef.current;
    if (!ctx || !node) return;
    node.gain.value = (musicVolume / 100) * (musicGain / 100) * (musicMuted ? 0 : 1);
  }, [musicVolume, musicGain, musicMuted]);

  // 播放中实时联动：更新语音音调（playbackRate）
  useEffect(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    const rate = Math.max(0.5, Math.min(2.0, voicePitch / 100));
    try {
      voiceSourcesRef.current.forEach((src) => {
        // 更新已在播放或尚未开始的 source 的 playbackRate
        if (src && src.playbackRate) {
          src.playbackRate.value = rate;
        }
      });
    } catch (e) {
      console.warn('更新音调失败:', e);
    }
  }, [voicePitch]);

  const pauseAudio = useCallback(() => {
    stopPlayback();
    toast.info('已暂停播放');
  }, [stopPlayback]);

  const normalizeVolume = useCallback(async () => {
    if (voiceFiles.length === 0) {
      toast.error('没有语音文件需要标准化');
      return;
    }
    
    setIsNormalizingVolume(true);
    
    try {
      const audioContext = await initAudioContext();
      const newGains: Record<string, number> = {};
      
      // 分析每个语音文件的音量
      for (const file of voiceFiles) {
        try {
          const response = await fetch(file.url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // 计算RMS音量
          let sum = 0;
          let sampleCount = 0;
          
          for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
              sum += channelData[i] * channelData[i];
              sampleCount++;
            }
          }
          
          const rms = Math.sqrt(sum / sampleCount);
          const targetRMS = 0.1; // 目标RMS值
          const gain = Math.min(targetRMS / rms, 3); // 限制最大增益为3倍
          
          newGains[file.id] = Math.round(gain * 100);
          
        } catch (error) {
          console.error(`分析文件音量失败: ${file.name}`, error);
          newGains[file.id] = 100; // 默认增益
        }
      }
      
      setVoiceFileGains(newGains);
      toast.success('音量标准化完成');
      
    } catch (error) {
      console.error('音量标准化失败:', error);
      toast.error('音量标准化失败');
    } finally {
      setIsNormalizingVolume(false);
    }
  }, [voiceFiles, initAudioContext]);

  const composeAudio = useCallback(async () => {
    if (voiceFiles.length === 0 && musicFiles.length === 0) {
      toast.error('请先添加音频文件');
      return;
    }
    setIsComposing(true);
    try {
      const audioContext = await initAudioContext();
      // 1. 加载语音文件，顺序拼接
      let voiceTotalDuration = 0;
      const voiceBufferList: { buffer: AudioBuffer; gain: number; duration: number }[] = [];
      for (const file of voiceFiles) {
        try {
          // Android WebView/Capacitor 上对 blob:URL 的 fetch 可能失败，优先使用原始 File 对象读取
          const arrayBuffer = file.file
            ? await file.file.arrayBuffer()
            : await (await fetch(file.url)).arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const individualGain = voiceFileGains[file.id] || 100;
          voiceBufferList.push({
            buffer: audioBuffer,
            gain: (voiceVolume / 100) * (voiceGain / 100) * (individualGain / 100) * (voiceMuted ? 0 : 1),
            duration: audioBuffer.duration
          });
          voiceTotalDuration += audioBuffer.duration;
        } catch (error) {
          console.error(`加载语音文件失败: ${file.name}`, error);
        }
      }
      // Android 环境下如果没有语音文件而只有音乐，总时长为0会导致离线渲染报错，这里直接提示并中止
      if (voiceBufferList.length === 0) {
        toast.error('合成需要至少一个语音文件（仅有音乐会导致失败）');
        setIsComposing(false);
        return;
      }
      // 2. 合成总时长改为语音总时长，音乐循环陪衬语音
      const totalDuration = voiceTotalDuration;
      if (!totalDuration || totalDuration <= 0) {
        toast.error('合成时长为0，请检查语音文件是否有效');
        setIsComposing(false);
        return;
      }
      // 3. 加载背景音乐文件
      const musicBufferList: { buffer: AudioBuffer; gain: number }[] = [];
      for (const file of musicFiles) {
        try {
          const arrayBuffer = file.file
            ? await file.file.arrayBuffer()
            : await (await fetch(file.url)).arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          musicBufferList.push({
            buffer: audioBuffer,
            gain: (musicVolume / 100) * (musicGain / 100) * (musicMuted ? 0 : 1)
          });
        } catch (error) {
          console.error(`加载音乐文件失败: ${file.name}`, error);
        }
      }
      if (voiceBufferList.length === 0 && musicBufferList.length === 0) {
        toast.error('没有可合成的音频文件');
        return;
      }
      // 4. 创建离线音频上下文，时长为 totalDuration
      if (typeof OfflineAudioContext === 'undefined') {
        toast.error('当前环境不支持离线合成（OfflineAudioContext）。请更新系统WebView或使用浏览器');
        setIsComposing(false);
        return;
      }
      const sampleRate = audioContext.sampleRate;
      const length = Math.ceil(totalDuration * sampleRate);
      const offlineContext = new OfflineAudioContext(2, length, sampleRate);
      // 5. 顺序拼接语音轨道
      let offset = 0;
      for (const { buffer, gain, duration } of voiceBufferList) {
        const source = offlineContext.createBufferSource();
        const gainNode = offlineContext.createGain();
        source.buffer = buffer;
        gainNode.gain.value = gain;
        source.connect(gainNode);
        gainNode.connect(offlineContext.destination);
        source.start(offset);
        offset += duration;
      }
      // 6. 循环填充背景音乐
      if (musicBufferList.length > 0) {
        let musicOffset = 0;
        while (musicOffset < totalDuration) {
          for (const { buffer, gain } of musicBufferList) {
            const source = offlineContext.createBufferSource();
            const gainNode = offlineContext.createGain();
            source.buffer = buffer;
            gainNode.gain.value = gain;
            source.connect(gainNode);
            gainNode.connect(offlineContext.destination);
            const playDuration = Math.min(buffer.duration, totalDuration - musicOffset);
            source.start(musicOffset);
            // 如果最后一段不足一首，提前 stop
            if (playDuration < buffer.duration) {
              source.stop(musicOffset + playDuration);
            }
            musicOffset += playDuration;
            if (musicOffset >= totalDuration) break;
          }
        }
      }
      // 7. 渲染音频
      let renderedBuffer: AudioBuffer;
      try {
        renderedBuffer = await offlineContext.startRendering();
      } catch (renderErr: any) {
        console.error('离线渲染失败:', renderErr);
        toast.error(`音频合成失败（渲染错误）：${renderErr?.message || '未知原因'}`);
        setIsComposing(false);
        return;
      }
      
      // 转换为WAV格式
      const wavBuffer = audioBufferToWav(renderedBuffer);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      
      // 清理旧的合成音频URL
      if (composedAudioUrl) {
        removeUrlRef(composedAudioUrl);
      }
      
      // 创建新的URL
      const url = URL.createObjectURL(blob);
      addUrlRef(url);
      setComposedAudioUrl(url);
      
      toast.success('音频合成完成！');
      
    } catch (error: any) {
      console.error('音频合成失败:', error);
      // 提供更明确的错误提示，便于 Android 环境定位问题
      const msg = typeof error?.message === 'string' ? error.message : '未知原因';
      toast.error(`音频合成失败：${msg}`);
    } finally {
      setIsComposing(false);
    }
  }, [voiceFiles, musicFiles, voiceVolume, musicVolume, voiceGain, musicGain, voiceMuted, musicMuted, voiceFileGains, composedAudioUrl, initAudioContext, addUrlRef, removeUrlRef]);

  const downloadComposedAudio = useCallback(() => {
    if (!composedAudioUrl) {
      toast.error('没有可下载的合成音频');
      return;
    }
    
    const link = document.createElement('a');
    link.href = composedAudioUrl;
    link.download = `合成音频_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('开始下载合成音频');
  }, [composedAudioUrl]);

  return {
    // 状态
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
    voiceFileGains,
    isNormalizingVolume,
    
    // 控制函数
    setVoiceVolume,
    setMusicVolume,
    setVoiceMuted,
    setMusicMuted,
    setVoiceGain,
    setMusicGain,
    setVoicePitch,
    setVoiceFileGains,
    
    // 操作函数
    handleFilesUpload,
    removeFile,
    clearAllFiles,
    playAudio,
    pauseAudio,
    normalizeVolume,
    composeAudio,
    downloadComposedAudio,
    reorderFiles,
    
    // 新增的URL管理和恢复功能
    validateBlobUrl,
    recoverFailedUrl,
    checkAndRecoverAudioFiles,
    
    // 调试函数
    logActiveUrls
  };
};

// 辅助函数：将AudioBuffer转换为WAV格式
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(arrayBuffer);
  
  // WAV文件头
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
  
  // 音频数据
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
  }
  
  return arrayBuffer;
}