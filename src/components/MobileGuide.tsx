import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Volume2, 
  Wifi, 
  Battery, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Info
} from 'lucide-react';
import { cn } from '@/lib/Utils';

interface MobileGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileGuide = ({ isOpen, onClose }: MobileGuideProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "设备要求",
      icon: Smartphone,
      content: [
        "使用现代浏览器（Chrome、Safari、Firefox）",
        "确保设备有足够的内存（建议2GB以上）",
        "关闭其他占用内存的应用",
        "使用WiFi连接以确保稳定性"
      ],
      tips: "较老的设备可能无法处理大型音频文件"
    },
    {
      title: "音频文件准备",
      icon: Volume2,
      content: [
        "单个文件大小建议不超过10MB",
        "总时长控制在5分钟以内",
        "使用MP3、WAV或M4A格式",
        "避免同时上传过多文件"
      ],
      tips: "文件越小，合成速度越快，成功率越高"
    },
    {
      title: "操作步骤",
      icon: CheckCircle,
      content: [
        "首先点击屏幕任意位置激活音频系统",
        "上传语音文件到左侧区域",
        "上传背景音乐到右侧区域",
        "调整音量和增益设置",
        "点击合成按钮并耐心等待"
      ],
      tips: "合成过程中请勿切换应用或锁屏"
    },
    {
      title: "常见问题解决",
      icon: AlertTriangle,
      content: [
        "合成失败：减少文件数量或时长",
        "播放无声：检查设备音量和静音设置",
        "页面卡顿：刷新页面重新开始",
        "内存不足：关闭其他应用释放内存"
      ],
      tips: "遇到问题时，刷新页面通常能解决大部分问题"
    }
  ];

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const IconComponent = currentStepData.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-background border-border max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">移动端使用指南</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-2 flex-1 rounded-full transition-colors",
                  index <= currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Step Content */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-full">
                <IconComponent className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{currentStepData.title}</h3>
            </div>

            <ul className="space-y-3 mb-4">
              {currentStepData.content.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {currentStepData.tips}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="flex-1 mr-2"
            >
              上一步
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                className="flex-1 ml-2"
              >
                下一步
              </Button>
            ) : (
              <Button
                onClick={onClose}
                className="flex-1 ml-2"
              >
                开始使用
              </Button>
            )}
          </div>

          {/* Quick Tips */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300">
                快速提示
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Battery className="w-3 h-3 text-green-500" />
                <span>保持充足电量</span>
              </div>
              <div className="flex items-center gap-2">
                <Wifi className="w-3 h-3 text-blue-500" />
                <span>使用稳定网络</span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="w-3 h-3 text-purple-500" />
                <span>检查音量设置</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-yellow-500" />
                <span>避免切换应用</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MobileGuide;