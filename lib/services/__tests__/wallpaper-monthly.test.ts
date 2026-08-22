/**
 * 「이달의 복」 월간 크론 절차 — 멱등과 순서.
 *
 * 크론은 배포 뒤에나 실기동한다. 그래서 «맞게 도는지»를 실행 전에 볼 방법은 이것뿐이다.
 * 🔴 지키는 것은 하나다 — **같은 달에 두 번 그리지 않는다.** 스케줄이 1·2·3일 세 번 돌기 때문에
 *    이 검사가 빠지면 매달 그림값을 세 번 낸다.
 */
import { runMonthlyWallpaperJob, type MonthlyWallpaperDeps } from '../wallpaper-monthly'

interface Spy {
  deps: MonthlyWallpaperDeps
  calls: { generate: string[]; upload: string[]; record: Array<[string, string]> }
}

function makeDeps(existing: Set<string>): Spy {
  const calls: Spy['calls'] = { generate: [], upload: [], record: [] }
  return {
    calls,
    deps: {
      hasEdition: async (ym) => existing.has(ym),
      generateImage: async (prompt) => {
        calls.generate.push(prompt)
        return new Uint8Array([1, 2, 3])
      },
      toWallpaper: async (raw) => new Uint8Array([...raw, 9]),
      upload: async (objectName) => {
        calls.upload.push(objectName)
        return `https://cdn.example.com/${objectName}`
      },
      recordEdition: async (ym, url) => {
        calls.record.push([ym, url])
        existing.add(ym)
      },
    },
  }
}

const SEP_1 = new Date('2026-09-01T01:00:00Z')

describe('멱등 — 이미 있는 달은 아무것도 하지 않는다', () => {
  it('그 달 행이 있으면 no-op 이고 그림을 만들지 않는다', async () => {
    const spy = makeDeps(new Set(['202609']))

    const result = await runMonthlyWallpaperJob(SEP_1, spy.deps)

    expect(result).toEqual({ status: 'noop', ym: '202609' })
    expect(spy.calls.generate).toHaveLength(0)
    expect(spy.calls.upload).toHaveLength(0)
    expect(spy.calls.record).toHaveLength(0)
  })

  it('1·2·3일 세 번 들어와도 그림은 한 번만 만든다', async () => {
    const spy = makeDeps(new Set())

    await runMonthlyWallpaperJob(new Date('2026-09-01T01:00:00Z'), spy.deps)
    await runMonthlyWallpaperJob(new Date('2026-09-02T01:00:00Z'), spy.deps)
    await runMonthlyWallpaperJob(new Date('2026-09-03T01:00:00Z'), spy.deps)

    expect(spy.calls.generate).toHaveLength(1)
    expect(spy.calls.record).toHaveLength(1)
  })
})

describe('생성 경로 — 없는 달이면 그리고, 올리고, 기록한다', () => {
  it('세 단계를 모두 거쳐 created 를 돌려준다', async () => {
    const spy = makeDeps(new Set())

    const result = await runMonthlyWallpaperJob(SEP_1, spy.deps)

    expect(result).toEqual({
      status: 'created',
      ym: '202609',
      url: 'https://cdn.example.com/monthly-202609.webp',
    })
    expect(spy.calls.upload).toEqual(['monthly-202609.webp'])
    expect(spy.calls.record).toEqual([['202609', 'https://cdn.example.com/monthly-202609.webp']])
  })

  it('그 달 소재로 프롬프트를 만든다 (9월이면 한가위)', async () => {
    const spy = makeDeps(new Set())

    await runMonthlyWallpaperJob(SEP_1, spy.deps)

    expect(spy.calls.generate[0]).toMatch(/harvest full moon|silver-grass/i)
    expect(spy.calls.generate[0]?.toLowerCase()).not.toContain('wallpaper')
  })

  it('달은 KST 로 센다 — UTC 로 8월 31일 저녁은 서울에서 이미 9월이다', async () => {
    const spy = makeDeps(new Set())

    const result = await runMonthlyWallpaperJob(new Date('2026-08-31T16:00:00Z'), spy.deps)

    expect(result.ym).toBe('202609')
  })
})

describe('실패 — 던져서 라우트가 500 으로 올린다', () => {
  it('조회가 깨지면 «없다»로 넘겨 중복 생성하지 않는다', async () => {
    const spy = makeDeps(new Set())
    spy.deps.hasEdition = async () => {
      throw new Error('DB 다운')
    }

    await expect(runMonthlyWallpaperJob(SEP_1, spy.deps)).rejects.toThrow('DB 다운')
    expect(spy.calls.generate).toHaveLength(0)
  })

  it('업로드가 깨지면 기록하지 않는다 (없는 그림을 가리키는 행이 남지 않는다)', async () => {
    const spy = makeDeps(new Set())
    spy.deps.upload = async () => {
      throw new Error('Storage 다운')
    }

    await expect(runMonthlyWallpaperJob(SEP_1, spy.deps)).rejects.toThrow('Storage 다운')
    expect(spy.calls.record).toHaveLength(0)
  })
})
