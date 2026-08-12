/**
 * useHydrated 계약 — `useState(false)` + `useEffect(setMounted(true))` 관용구의 대체물이므로
 * "서버 렌더는 false, 클라이언트 렌더 후 true" 두 값이 그대로 유지되는지만 못 박는다.
 */
import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { useHydrated } from '@/hooks/use-hydrated'

function Probe() {
  const hydrated = useHydrated()
  return <span data-testid="probe">{hydrated ? 'hydrated' : 'pending'}</span>
}

describe('useHydrated', () => {
  it('서버 렌더에서는 false 를 돌려준다 — SSR 마크업이 하이드레이션 전 상태와 같아야 한다', () => {
    expect(renderToString(<Probe />)).toContain('pending')
  })

  it('클라이언트 렌더 후에는 true 다', () => {
    render(<Probe />)
    expect(screen.getByTestId('probe').textContent).toBe('hydrated')
  })
})
