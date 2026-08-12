'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Laptop, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useHydrated } from '@/hooks/use-hydrated'

const ThemeSwitcher = () => {
  // 테마는 클라이언트에서만 확정된다 — 하이드레이션 전에는 렌더하지 않는다.
  const mounted = useHydrated()
  const { theme, setTheme } = useTheme()

  if (!mounted) {
    return null
  }

  const ICON_SIZE = 16

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={'sm'}>
          {theme === 'light' ? (
            <Sun key="light" size={ICON_SIZE} className={'text-muted-foreground'} />
          ) : theme === 'dark' ? (
            <Moon key="dark" size={ICON_SIZE} className={'text-muted-foreground'} />
          ) : (
            <Laptop key="system" size={ICON_SIZE} className={'text-muted-foreground'} />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-content" align="start">
        <DropdownMenuRadioGroup value={theme} onValueChange={(e) => setTheme(e)}>
          <DropdownMenuRadioItem className="flex gap-2" value="light">
            <Sun size={ICON_SIZE} className="text-muted-foreground" /> <span>밝게</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex gap-2" value="dark">
            <Moon size={ICON_SIZE} className="text-muted-foreground" /> <span>어둡게</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex gap-2" value="system">
            <Laptop size={ICON_SIZE} className="text-muted-foreground" /> <span>시스템</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { ThemeSwitcher }
