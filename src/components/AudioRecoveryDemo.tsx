import React from 'react';
import { Button } from '@/components/ui/button';
import { useAudioManager } from '@/hooks/useAudioManager';
import { toast } from 'sonner';

/**
 * 音频恢复功能演示组件
 * 展示如何使用新增的URL管理和自动恢复功能
 */
export const AudioRecoveryDemo: React.FC = () => {
  const {
    voiceFiles,
    musicFiles,
    validateBlobUrl,
    recoverFailedUrl,
    checkAndRecoverAudioFiles,
    logActiveUrls
  } = useAudioManager();

  // 手动检查所有音频文件状态
  const handleCheckAllFiles = async () => {
    toast.info('开始检查所有音频文件状态...');
    await checkAndRecoverAudioFiles();
    toast.success('音频文件状态检查完成');
  };

  // 手动恢复特定文件
  const handleRecoverFile = async (file: any) => {
    if (!file.file) {
      toast.error('无法恢复：原始文件对象不存在');
      return;
    }

    toast.info(`正在恢复文件: ${file.name}`);
    const newUrl = await recoverFailedUrl(file);
    
    if (newUrl) {
      toast.success(`文件恢复成功: ${file.name}`);
    } else {
      toast.error(`文件恢复失败: ${file.name}`);
    }
  };

  // 验证URL状态
  const handleValidateUrl = (file: any) => {
    const isValid = validateBlobUrl(file.url);
    toast.info(`文件 "${file.name}" URL状态: ${isValid ? '有效' : '失效'}`);
  };

  // 显示活跃URL日志
  const handleShowActiveUrls = () => {
    logActiveUrls();
    toast.info('活跃URL信息已输出到控制台');
  };

  const allFiles = [...voiceFiles, ...musicFiles];

  return null;
};

export default AudioRecoveryDemo;