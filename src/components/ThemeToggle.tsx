import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Theme = 'light' | 'dark'

const applyTheme = (theme: Theme) => {
  const el = document.documentElement
  el.classList.remove('light', 'dark')
  el.classList.add(theme)
  localStorage.setItem('theme', theme)
}

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const stored = (localStorage.getItem('theme') as Theme) || 'light'
    setTheme(stored)
    applyTheme(stored)
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="切换主题"
      className="hover:bg-secondary"
      onClick={toggle}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  )
}

export default ThemeToggle