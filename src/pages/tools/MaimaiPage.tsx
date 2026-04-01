import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const MaimaiPage = () => {
  const [username, setUsername] = useState('');
  const [importToken, setImportToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 组件加载时检查本地存储
  useEffect(() => {
    document.title = '舞萌查分器 | Konita';
  }, []);

  // 组件加载时检查本地存储
  useEffect(() => {
    const savedUser = localStorage.getItem('maimaiUser');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUsername(userData.username);
        setImportToken(userData.importToken || '');
        setIsLoggedIn(true);
      } catch (error) {
        console.error('解析本地存储数据失败:', error);
        localStorage.removeItem('maimaiUser');
      }
    }
  }, []);

  const computeRa = (ds: number, achievement: number): number => {
    let baseRa = 22.4;
    if (achievement < 50) {
      baseRa = 7.0;
    } else if (achievement < 60) {
      baseRa = 8.0;
    } else if (achievement < 70) {
      baseRa = 9.6;
    } else if (achievement < 75) {
      baseRa = 11.2;
    } else if (achievement < 80) {
      baseRa = 12.0;
    } else if (achievement < 90) {
      baseRa = 13.6;
    } else if (achievement < 94) {
      baseRa = 15.2;
    } else if (achievement < 97) {
      baseRa = 16.8;
    } else if (achievement < 98) {
      baseRa = 20.0;
    } else if (achievement < 99) {
      baseRa = 20.3;
    } else if (achievement < 99.5) {
      baseRa = 20.8;
    } else if (achievement < 100) {
      baseRa = 21.1;
    } else if (achievement < 100.5) {
      baseRa = 21.6;
    }

    return Math.floor(ds * (Math.min(100.5, achievement) / 100) * baseRa);
  };

  const generateRecommendations = (sdCharts: any[], dxCharts: any[]) => {
    const allCharts = [...sdCharts, ...dxCharts];
    
    const filteredCharts = allCharts.filter(chart => {
      return chart.achievements < 99.5 && chart.ds >= 10;
    });

    const recommended = filteredCharts
      .map(chart => {
        // 计算潜在的RA值（假设达成率100%）
        const potentialRa = computeRa(chart.ds, 100);
        const currentRa = chart.ra;
        const raGap = potentialRa - currentRa;
        return {
          ...chart,
          raGap
        };
      })
      .sort((a, b) => b.raGap - a.raGap)
      .slice(0, 10);

    setRecommendations(recommended);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      setError('请输入用户名或ID');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setRecommendations([]);

    try {
      console.log('开始查询用户数据:', username);
      let data;
      
      if (importToken) {
        // 使用 /player/records 接口获取完整数据
        console.log('使用 /player/records 接口（带Import-Token）');
        const response = await fetch('https://www.diving-fish.com/api/maimaidxprober/player/records', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Import-Token': importToken,
          },
        });

        console.log('API响应状态:', response.status);
        
        if (response.status === 400) {
          setError('用户名或ID不存在');
          return;
        }

        if (response.status === 403) {
          setError('API访问受限，请检查Import-Token是否正确');
          return;
        }

        if (!response.ok) {
          throw new Error(`API响应错误: ${response.status}`);
        }

        data = await response.json();
        console.log('API返回数据:', data);
        
        // 处理 /player/records 接口的返回格式
        if (!data || !data.nickname || !data.records) {
          console.error('API返回数据格式错误:', data);
          setError('API返回数据格式错误');
          return;
        }

        // 分离SD和DX歌曲
        const allRecords = data.records;
        const sdCharts = allRecords
          .filter((record: any) => record.type === 'SD')
          .map((record: any, index: number) => {
            const ds = parseFloat(record.ds);
            const achievements = parseFloat(record.achievements);
            const raValue = computeRa(ds, achievements);
            console.log(`SD歌曲 ${index + 1}: ${record.title} - RA: ${raValue}`);
            return {
              ...record,
              ra: raValue
            };
          });

        const dxCharts = allRecords
          .filter((record: any) => record.type === 'DX')
          .map((record: any, index: number) => {
            const ds = parseFloat(record.ds);
            const achievements = parseFloat(record.achievements);
            const raValue = computeRa(ds, achievements);
            console.log(`DX歌曲 ${index + 1}: ${record.title} - RA: ${raValue}`);
            return {
              ...record,
              ra: raValue
            };
          });

        // 按RA值排序
        console.log('开始排序SD歌曲');
        sdCharts.sort((a: any, b: any) => b.ra - a.ra);
        console.log('开始排序DX歌曲');
        dxCharts.sort((a: any, b: any) => b.ra - a.ra);

        // 取前35首SD和前15首DX
        console.log('开始截取SD Best 35');
        const sdBest = sdCharts.slice(0, 35);
        console.log('开始截取DX Best 15');
        const dxBest = dxCharts.slice(0, 15);

        // 计算总分
        console.log('开始计算总分');
        const sdRating = sdBest.reduce((sum: number, chart: any) => sum + chart.ra, 0);
        const dxRating = dxBest.reduce((sum: number, chart: any) => sum + chart.ra, 0);
        const totalRating = sdRating + dxRating;

        console.log('计算结果: SD:', sdRating, 'DX:', dxRating, '总计:', totalRating);

        // 检查数据是否完整
        const isDataComplete = sdCharts.length >= 35 && dxCharts.length >= 15;
        console.log('数据完整性:', isDataComplete, 'SD数量:', sdCharts.length, 'DX数量:', dxCharts.length);

        setResult({
          nickname: data.nickname,
          sdBest,
          dxBest,
          sdRating,
          dxRating,
          totalRating,
          sdCount: sdCharts.length,
          dxCount: dxCharts.length,
          isDataComplete
        });

        console.log('开始生成推荐歌曲');
        generateRecommendations(sdCharts, dxCharts);
      } else {
        // 使用原有 /query/player 接口
        console.log('使用 /query/player 接口（无Import-Token）');
        const response = await fetch('https://www.diving-fish.com/api/maimaidxprober/query/player', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username }),
        });

        console.log('API响应状态:', response.status);
        
        if (response.status === 400) {
          setError('用户名或ID不存在');
          return;
        }

        if (response.status === 403) {
          setError('API访问受限，请稍后再试');
          return;
        }

        if (!response.ok) {
          throw new Error(`API响应错误: ${response.status}`);
        }

        data = await response.json();
        
        console.log('API返回数据:', data);
        
        // 确保charts和ra字段存在
        if (!data || !data.charts || !data.charts.sd || !data.charts.dx) {
          console.error('API返回数据格式错误:', data);
          setError('API返回数据格式错误');
          return;
        }
        
        console.log('SD歌曲数量:', data.charts.sd.length);
        console.log('DX歌曲数量:', data.charts.dx.length);
        
        // 重新计算RA值，与mai-bot-main保持一致
        const sdCharts = data.charts.sd.map((chart: any, index: number) => {
          // 确保ds和achievements是数字类型
          const ds = parseFloat(chart.ds);
          const achievements = parseFloat(chart.achievements);
          const raValue = computeRa(ds, achievements);
          console.log(`SD歌曲 ${index + 1}: ${chart.title} - RA: ${raValue} (API返回: ${chart.ra})`);
          return {
            ...chart,
            ra: raValue
          };
        });

        const dxCharts = data.charts.dx.map((chart: any, index: number) => {
          // 确保ds和achievements是数字类型
          const ds = parseFloat(chart.ds);
          const achievements = parseFloat(chart.achievements);
          const raValue = computeRa(ds, achievements);
          console.log(`DX歌曲 ${index + 1}: ${chart.title} - RA: ${raValue} (API返回: ${chart.ra})`);
          return {
            ...chart,
            ra: raValue
          };
        });

        // 按RA值排序
        console.log('开始排序SD歌曲');
        sdCharts.sort((a: any, b: any) => b.ra - a.ra);
        console.log('开始排序DX歌曲');
        dxCharts.sort((a: any, b: any) => b.ra - a.ra);

        // 取前35首SD和前15首DX
        console.log('开始截取SD Best 35');
        const sdBest = sdCharts.slice(0, 35);
        console.log('开始截取DX Best 15');
        const dxBest = dxCharts.slice(0, 15);

        // 计算总分
        console.log('开始计算总分');
        const sdRating = sdBest.reduce((sum: number, chart: any) => sum + chart.ra, 0);
        const dxRating = dxBest.reduce((sum: number, chart: any) => sum + chart.ra, 0);
        const totalRating = sdRating + dxRating;

        console.log('计算结果: SD:', sdRating, 'DX:', dxRating, '总计:', totalRating);

        // 检查数据是否完整
        const isDataComplete = sdCharts.length >= 35 && dxCharts.length >= 15;
        console.log('数据完整性:', isDataComplete, 'SD数量:', sdCharts.length, 'DX数量:', dxCharts.length);

        setResult({
          nickname: data.nickname,
          sdBest,
          dxBest,
          sdRating,
          dxRating,
          totalRating,
          sdCount: sdCharts.length,
          dxCount: dxCharts.length,
          isDataComplete
        });

        console.log('开始生成推荐歌曲');
        generateRecommendations(sdCharts, dxCharts);
      }

      // 保存用户信息到本地存储
      const userData = {
        username,
        importToken
      };
      localStorage.setItem('maimaiUser', JSON.stringify(userData));
      setIsLoggedIn(true);
    } catch (err) {
      console.error('查询错误:', err);
      setError('网络错误，请稍后再试');
    } finally {
      setLoading(false);
      console.log('查询完成');
    }
  };

  // 登出函数
  const handleLogout = () => {
    localStorage.removeItem('maimaiUser');
    setUsername('');
    setImportToken('');
    setIsLoggedIn(false);
    setResult(null);
    setRecommendations([]);
  };

  const exportB50Image = () => {
    if (!result || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 800;
    const height = 1100;
    canvas.width = width;
    canvas.height = height;

    const isDark = document.body.classList.contains('dark-mode');
    const primaryColor = '#60A5FA';
    const secondaryColor = '#34D399';
    const bgColor = isDark ? '#121212' : '#ffffff';
    const textColor = isDark ? '#f5f5f5' : '#334155';
    const lightTextColor = isDark ? '#9CA3AF' : '#94A3B8';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // 添加类似主页的背景效果
    const colors = [
      'rgba(96, 165, 250, 0.1)',   // 浅蓝色
      'rgba(52, 211, 153, 0.1)',   // 浅绿色
      'rgba(251, 191, 36, 0.1)',   // 浅黄色
      'rgba(236, 72, 153, 0.1)',   // 浅粉色
      'rgba(168, 85, 247, 0.1)',   // 浅紫色
      'rgba(249, 115, 22, 0.1)'     // 浅橙色
    ];

    // 绘制背景方块
    for (let i = 0; i < 15; i++) {
      const size = Math.random() * 150 + 50;
      const x = Math.random() * (width + size * 2) - size;
      const y = Math.random() * (height + size * 2) - size;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      ctx.fillStyle = color;
      ctx.fillRect(x, y, size, size);
    }

    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, width, 10);

    ctx.fillStyle = textColor;
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${result.nickname} 的 B50`, width / 2, 60);

    ctx.font = '16px Arial';
    ctx.fillText(`SD: ${result.sdRating} | DX: ${result.dxRating} | 总计: ${result.totalRating}`, width / 2, 90);

    ctx.strokeStyle = isDark ? '#374151' : '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 110);
    ctx.lineTo(width - 50, 110);
    ctx.stroke();

    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = primaryColor;
    ctx.fillText('SD Best 35', 50, 140);

    ctx.font = '14px Arial';
    ctx.fillStyle = textColor;

    let y = 170;
    result.sdBest.slice(0, 15).forEach((chart: any, index: number) => {
      ctx.fillStyle = index < 3 ? '#FBBF24' : textColor;
      ctx.fillText(`${index + 1}.`, 50, y);
      ctx.fillStyle = textColor;
      const levelInfo = chart.level_label || chart.level || '';
      ctx.fillText(`${chart.title} [${chart.type} ${levelInfo}]`, 80, y);
      ctx.textAlign = 'right';
      ctx.fillText(`${chart.achievements.toFixed(2)}%`, width - 150, y);
      ctx.fillText(`RA: ${chart.ra}`, width - 50, y);
      ctx.textAlign = 'left';
      y += 25;
    });

    ctx.strokeStyle = isDark ? '#374151' : '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(50, y + 10);
    ctx.lineTo(width - 50, y + 10);
    ctx.stroke();

    y += 40;
    ctx.font = '16px Arial';
    ctx.fillStyle = secondaryColor;
    ctx.fillText('DX Best 15', 50, y);

    ctx.font = '14px Arial';
    ctx.fillStyle = textColor;
    y += 30;

    result.dxBest.slice(0, 10).forEach((chart: any, index: number) => {
      ctx.fillStyle = index < 3 ? '#FBBF24' : textColor;
      ctx.fillText(`${index + 1}.`, 50, y);
      ctx.fillStyle = textColor;
      const levelInfo = chart.level_label || chart.level || '';
      ctx.fillText(`${chart.title} [${chart.type} ${levelInfo}]`, 80, y);
      ctx.textAlign = 'right';
      ctx.fillText(`${chart.achievements.toFixed(2)}%`, width - 150, y);
      ctx.fillText(`RA: ${chart.ra}`, width - 50, y);
      ctx.textAlign = 'left';
      y += 25;
    });

    ctx.strokeStyle = isDark ? '#374151' : '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(50, y + 10);
    ctx.lineTo(width - 50, y + 10);
    ctx.stroke();

    const now = new Date();
    const formattedDate = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    ctx.font = '12px Arial';
    ctx.fillStyle = lightTextColor;
    ctx.textAlign = 'center';
    ctx.fillText(`生成时间: ${formattedDate}`, width / 2, y + 40);
    ctx.fillText('舞萌查分器 - Konita Mainpage', width / 2, y + 60);

    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${result.nickname}_B50.png`;
    link.href = dataURL;
    link.click();
  };

  const isDarkMode = document.body.classList.contains('dark-mode');

  return (
    <section className={`maimai-page ${isDarkMode ? 'dark' : ''}`}>
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          舞萌查分器
        </motion.h2>

        <div className="maimai-container">
          <div className="maimai-content">
            <h3>舞萌查分器</h3>
            <form onSubmit={handleSubmit} className="maimai-form">
              <div className="form-group">
                <label htmlFor="username">用户名/ID</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入舞萌用户名或ID"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="importToken">Import-Token (可选，用于获取完整数据)</label>
                <input
                  type="text"
                  id="importToken"
                  value={importToken}
                  onChange={(e) => setImportToken(e.target.value)}
                  placeholder="输入水鱼查分器的Import-Token以获取完整数据"
                  className="form-input"
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button 
                  type="submit" 
                  className="submit-button"
                  disabled={loading}
                  style={{ flex: 1, minWidth: '150px' }}
                >
                  {loading ? '查询中...' : '生成B50'}
                </button>
                {isLoggedIn && (
                  <button 
                    type="button" 
                    onClick={handleLogout}
                    className="submit-button"
                    style={{ 
                      flex: 1, 
                      minWidth: '150px',
                      background: '#ef4444',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    登出
                  </button>
                )}
              </div>
            </form>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {result && (
              <div className="maimai-result">
                <div className="result-header">
                  <h4>{result.nickname} 的 B50</h4>
                  <div className="rating-info">
                    <span>SD: {result.sdRating}</span>
                    <span>DX: {result.dxRating}</span>
                    <span>总计: {result.totalRating}</span>
                  </div>
                  {!result.isDataComplete && (
                    <div className="data-warning">
                      <p>⚠️ 数据不完整：API仅返回了部分游玩记录</p>
                      <p>SD歌曲: {result.sdCount}/35首 | DX歌曲: {result.dxCount}/15首</p>
                      <p>建议：如需完整B50，请使用水鱼查分器同步完整数据</p>
                    </div>
                  )}
                  <button 
                    onClick={exportB50Image}
                    className="submit-button"
                    style={{ marginTop: '1rem' }}
                  >
                    导出B50图片
                  </button>
                </div>
                
                <div className="best-lists">
                  <div className="best-list sd-list">
                    <h5>SD Best 35</h5>
                    <div className="chart-grid">
                      {result.sdBest.map((chart: any, index: number) => (
                        <div key={`sd-${index}`} className="chart-item">
                          <div className="chart-rank">#{index + 1}</div>
                          <div className="chart-info">
                            <div className="chart-title">{chart.title} [{chart.type}]</div>
                            <div className="chart-stats">
                              <span>难度: {chart.level_label || chart.level} ({chart.ds})</span>
                              <span>达成率: {chart.achievements.toFixed(4)}%</span>
                              <span>RA: {chart.ra}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="best-list dx-list">
                    <h5>DX Best 15</h5>
                    <div className="chart-grid">
                      {result.dxBest.map((chart: any, index: number) => (
                        <div key={`dx-${index}`} className="chart-item">
                          <div className="chart-rank">#{index + 1}</div>
                          <div className="chart-info">
                            <div className="chart-title">{chart.title} [{chart.type}]</div>
                            <div className="chart-stats">
                              <span>难度: {chart.level_label || chart.level} ({chart.ds})</span>
                              <span>达成率: {chart.achievements.toFixed(4)}%</span>
                              <span>RA: {chart.ra}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {recommendations.length > 0 && (
                  <div className="recommendations">
                    <h5>推荐推分歌曲</h5>
                    <div className="chart-grid">
                      {recommendations.map((chart: any, index: number) => (
                        <div key={`rec-${index}`} className="chart-item">
                          <div className="chart-rank">#{index + 1}</div>
                          <div className="chart-info">
                            <div className="chart-title">{chart.title} [{chart.type}]</div>
                            <div className="chart-stats">
                              <span>难度: {chart.level_label || chart.level} ({chart.ds})</span>
                              <span>达成率: {chart.achievements.toFixed(4)}%</span>
                              <span>潜力RA提升: {chart.raGap}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </section>
  );
};

export default MaimaiPage;