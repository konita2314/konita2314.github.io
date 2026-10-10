// 舞萌 DX 查分：计算与 API 逻辑（原 MaimaiPage.tsx 内联逻辑迁移，清空全部 console.log）

export interface MaimaiChart {
  title: string
  ds: number
  level: string
  level_label?: string
  type: 'SD' | 'DX'
  achievements: number
  ra: number
}

export interface Recommendation extends MaimaiChart {
  raGap: number
}

export interface MaimaiResult {
  nickname: string
  sdBest: MaimaiChart[]
  dxBest: MaimaiChart[]
  sdRating: number
  dxRating: number
  totalRating: number
  sdCount: number
  dxCount: number
  isDataComplete: boolean
  recommendations: Recommendation[]
}

/** 用户可见的业务错误（400/403/格式错误）；其余异常由调用方统一显示"网络错误" */
export class ApiError extends Error {
  userFacing = true
}

export const SD_BEST_COUNT = 35
export const DX_BEST_COUNT = 15

export function computeRa(ds: number, achievement: number): number {
  let baseRa = 22.4
  if (achievement < 50) baseRa = 7.0
  else if (achievement < 60) baseRa = 8.0
  else if (achievement < 70) baseRa = 9.6
  else if (achievement < 75) baseRa = 11.2
  else if (achievement < 80) baseRa = 12.0
  else if (achievement < 90) baseRa = 13.6
  else if (achievement < 94) baseRa = 15.2
  else if (achievement < 97) baseRa = 16.8
  else if (achievement < 98) baseRa = 20.0
  else if (achievement < 99) baseRa = 20.3
  else if (achievement < 99.5) baseRa = 20.8
  else if (achievement < 100) baseRa = 21.1
  else if (achievement < 100.5) baseRa = 21.6

  return Math.floor(ds * (Math.min(100.5, achievement) / 100) * baseRa)
}

interface RawRecord {
  title?: string
  ds?: string | number
  level?: string
  level_label?: string
  type?: string
  achievements?: string | number
}

function normalize(record: RawRecord, type: 'SD' | 'DX'): MaimaiChart {
  const ds = parseFloat(String(record.ds ?? 0))
  const achievements = parseFloat(String(record.achievements ?? 0))
  return {
    title: record.title ?? '',
    ds,
    level: record.level ?? '',
    level_label: record.level_label,
    type,
    achievements,
    ra: computeRa(ds, achievements),
  }
}

export function generateRecommendations(
  sdCharts: MaimaiChart[],
  dxCharts: MaimaiChart[]
): Recommendation[] {
  return [...sdCharts, ...dxCharts]
    .filter((chart) => chart.achievements < 99.5 && chart.ds >= 10)
    .map((chart) => ({ ...chart, raGap: computeRa(chart.ds, 100) - chart.ra }))
    .sort((a, b) => b.raGap - a.raGap)
    .slice(0, 10)
}

export async function fetchPlayerData(username: string, importToken: string): Promise<MaimaiResult> {
  let sdCharts: MaimaiChart[]
  let dxCharts: MaimaiChart[]
  let nickname: string

  if (importToken) {
    // /player/records：带 Import-Token 获取完整数据
    const response = await fetch('https://www.diving-fish.com/api/maimaidxprober/player/records', {
      headers: { 'Import-Token': importToken },
    })
    if (response.status === 400) throw new ApiError('用户名或ID不存在')
    if (response.status === 403) throw new ApiError('API访问受限，请检查Import-Token是否正确')
    if (!response.ok) throw new Error(`API响应错误: ${response.status}`)

    const data: { nickname?: unknown; records?: RawRecord[] } = await response.json()
    if (!data?.nickname || !data.records) throw new ApiError('API返回数据格式错误')
    nickname = String(data.nickname)
    sdCharts = data.records.filter((r) => r.type === 'SD').map((r) => normalize(r, 'SD'))
    dxCharts = data.records.filter((r) => r.type === 'DX').map((r) => normalize(r, 'DX'))
  } else {
    // /query/player：无 token 的基础查询
    const response = await fetch('https://www.diving-fish.com/api/maimaidxprober/query/player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    if (response.status === 400) throw new ApiError('用户名或ID不存在')
    if (response.status === 403) throw new ApiError('API访问受限，请稍后再试')
    if (!response.ok) throw new Error(`API响应错误: ${response.status}`)

    const data: { nickname?: unknown; charts?: { sd?: RawRecord[]; dx?: RawRecord[] } } =
      await response.json()
    if (!data?.charts?.sd || !data.charts.dx) throw new ApiError('API返回数据格式错误')
    nickname = String(data.nickname)
    sdCharts = data.charts.sd.map((r) => normalize(r, 'SD'))
    dxCharts = data.charts.dx.map((r) => normalize(r, 'DX'))
  }

  sdCharts.sort((a, b) => b.ra - a.ra)
  dxCharts.sort((a, b) => b.ra - a.ra)
  const sdBest = sdCharts.slice(0, SD_BEST_COUNT)
  const dxBest = dxCharts.slice(0, DX_BEST_COUNT)
  const sdRating = sdBest.reduce((sum, chart) => sum + chart.ra, 0)
  const dxRating = dxBest.reduce((sum, chart) => sum + chart.ra, 0)

  return {
    nickname,
    sdBest,
    dxBest,
    sdRating,
    dxRating,
    totalRating: sdRating + dxRating,
    sdCount: sdCharts.length,
    dxCount: dxCharts.length,
    isDataComplete: sdCharts.length >= SD_BEST_COUNT && dxCharts.length >= DX_BEST_COUNT,
    recommendations: generateRecommendations(sdCharts, dxCharts),
  }
}

/** 导出 B50 图片：按需创建 canvas（不依赖模板中的隐藏 canvas），isDark 由调用方传入 */
export function exportB50Image(result: MaimaiResult, isDark: boolean) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = 800
  const height = 1100
  canvas.width = width
  canvas.height = height

  const primaryColor = '#60A5FA'
  const secondaryColor = '#34D399'
  const bgColor = isDark ? '#121212' : '#ffffff'
  const textColor = isDark ? '#f5f5f5' : '#334155'
  const lightTextColor = isDark ? '#9CA3AF' : '#94A3B8'

  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, width, height)

  // 主页风格的背景方块
  const colors = [
    'rgba(96, 165, 250, 0.1)',
    'rgba(52, 211, 153, 0.1)',
    'rgba(251, 191, 36, 0.1)',
    'rgba(236, 72, 153, 0.1)',
    'rgba(168, 85, 247, 0.1)',
    'rgba(249, 115, 22, 0.1)',
  ]
  for (let i = 0; i < 15; i++) {
    const size = Math.random() * 150 + 50
    const x = Math.random() * (width + size * 2) - size
    const y = Math.random() * (height + size * 2) - size
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
    ctx.fillRect(x, y, size, size)
  }

  ctx.fillStyle = primaryColor
  ctx.fillRect(0, 0, width, 10)

  ctx.fillStyle = textColor
  ctx.font = 'bold 28px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(`${result.nickname} 的 B50`, width / 2, 60)

  ctx.font = '16px Arial'
  ctx.fillText(`SD: ${result.sdRating} | DX: ${result.dxRating} | 总计: ${result.totalRating}`, width / 2, 90)

  ctx.strokeStyle = isDark ? '#374151' : '#E2E8F0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(50, 110)
  ctx.lineTo(width - 50, 110)
  ctx.stroke()

  ctx.font = '16px Arial'
  ctx.textAlign = 'left'
  ctx.fillStyle = primaryColor
  ctx.fillText('SD Best 35', 50, 140)

  ctx.font = '14px Arial'
  ctx.fillStyle = textColor

  let y = 170
  result.sdBest.slice(0, 15).forEach((chart, index) => {
    ctx.fillStyle = index < 3 ? '#FBBF24' : textColor
    ctx.fillText(`${index + 1}.`, 50, y)
    ctx.fillStyle = textColor
    const levelInfo = chart.level_label || chart.level
    ctx.fillText(`${chart.title} [${chart.type} ${levelInfo}]`, 80, y)
    ctx.textAlign = 'right'
    ctx.fillText(`${chart.achievements.toFixed(2)}%`, width - 150, y)
    ctx.fillText(`RA: ${chart.ra}`, width - 50, y)
    ctx.textAlign = 'left'
    y += 25
  })

  ctx.strokeStyle = isDark ? '#374151' : '#E2E8F0'
  ctx.beginPath()
  ctx.moveTo(50, y + 10)
  ctx.lineTo(width - 50, y + 10)
  ctx.stroke()

  y += 40
  ctx.font = '16px Arial'
  ctx.fillStyle = secondaryColor
  ctx.fillText('DX Best 15', 50, y)

  ctx.font = '14px Arial'
  ctx.fillStyle = textColor
  y += 30

  result.dxBest.slice(0, 10).forEach((chart, index) => {
    ctx.fillStyle = index < 3 ? '#FBBF24' : textColor
    ctx.fillText(`${index + 1}.`, 50, y)
    ctx.fillStyle = textColor
    const levelInfo = chart.level_label || chart.level
    ctx.fillText(`${chart.title} [${chart.type} ${levelInfo}]`, 80, y)
    ctx.textAlign = 'right'
    ctx.fillText(`${chart.achievements.toFixed(2)}%`, width - 150, y)
    ctx.fillText(`RA: ${chart.ra}`, width - 50, y)
    ctx.textAlign = 'left'
    y += 25
  })

  ctx.strokeStyle = isDark ? '#374151' : '#E2E8F0'
  ctx.beginPath()
  ctx.moveTo(50, y + 10)
  ctx.lineTo(width - 50, y + 10)
  ctx.stroke()

  const formattedDate = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  ctx.font = '12px Arial'
  ctx.fillStyle = lightTextColor
  ctx.textAlign = 'center'
  ctx.fillText(`生成时间: ${formattedDate}`, width / 2, y + 40)
  ctx.fillText('舞萌查分器 - Konita Mainpage', width / 2, y + 60)

  const dataURL = canvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.download = `${result.nickname}_B50.png`
  link.href = dataURL
  link.click()
}
