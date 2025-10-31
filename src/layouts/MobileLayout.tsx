import { ReactNode } from 'react'
import { NavBar, SafeArea } from 'antd-mobile'
import ThemeToggle from '@/components/ThemeToggle'

interface MobileLayoutProps {
  title?: string
  children: ReactNode
}

// 移动端基础布局：包含顶部安全区与导航栏，并提供统一内边距与响应式容器
export const MobileLayout = ({ title = '音频合成工作站', children }: MobileLayoutProps) => {
  return (
    <div className="min-h-svh flex flex-col bg-background text-foreground">
      {/* 顶部安全区，适配刘海屏/挖孔屏 */}
      <SafeArea position='top' />
      <div className="safe-area-top" />



      {/* 头部品牌区：仅图标 */}
      <header className="w-full border-b border-border bg-secondary/40 relative">
        <div className="container mx-auto px-3 py-3 lg:px-4 lg:py-4">
          <div className="flex items-center justify-center">
            <div className="brand-image-wrap">
              <img
                src="/splash-icon.png"
                alt="splash icon"
                className="h-12 w-12 brand-image"
              />
            </div>
          </div>
          {/* 品牌小标题：置于logo下方，小字号与柔和前景色 */}
          <div className="mt-1 text-xs text-muted-foreground text-center">
            猛犸音频合成
          </div>
          {/* 主题切换按钮：右上角悬浮，不影响居中图标 */}
          <div className="absolute right-3 top-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

  {/* 内容区 */}
  <main className="safe-area-padding flex-1 container mx-auto px-3 py-4 lg:px-4 lg:py-6">
    {children}
  </main>

  {/* 页脚开源地址 */}
  <footer className="container mx-auto px-3 pb-3 text-center text-xs text-muted-foreground">
    开源地址：
    <a
      href="https://github.com/dynamor2019/mengma-audio"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      https://github.com/dynamor2019/mengma-audio
    </a>
  </footer>

  {/* 底部安全区 */}
  <SafeArea position='bottom' />
  <div className="safe-area-bottom" />
    </div>
  )
}

export default MobileLayout