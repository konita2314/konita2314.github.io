import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// 懒加载组件
const HomePage = lazy(() => import('./pages/HomePage'));
const ToolsPage = lazy(() => import('./pages/ToolsPage'));
const ClockPage = lazy(() => import('./pages/tools/ClockPage'));
const EditorPage = lazy(() => import('./pages/tools/EditorPage'));
const MaimaiPage = lazy(() => import('./pages/tools/MaimaiPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogPostPage = lazy(() => import('./pages/blog/BlogPostPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const RightSidebar = lazy(() => import('./components/RightSidebar'));

// 加载中组件
const Loading = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    fontSize: '18px'
  }}>
    加载中...
  </div>
);

// 性能优化弹窗组件
const PerformancePopup = ({ onDisableAnimation, onEnableAnimation, isDarkMode }: { onDisableAnimation: () => void, onEnableAnimation: () => void, isDarkMode: boolean }) => {
  const [isVisible, setIsVisible] = React.useState(() => {
    // 只有在本地存储中没有保存设置时才显示弹窗
    return localStorage.getItem('performanceOptimization') === null;
  });
  const [isContentVisible, setIsContentVisible] = React.useState(false);
  
  // 自动关闭弹窗
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible]);
  
  // 内容显示动画
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsContentVisible(true);
      }, 200);
      
      return () => clearTimeout(timer);
    } else {
      setIsContentVisible(false);
    }
  }, [isVisible]);
  
  if (!isVisible) return null;
  
  return (
    <motion.div 
      initial={{ width: 0, opacity: 1, y: 0 }}
      animate={{ width: 300, y: 0 }}
      exit={{ width: 0, opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: isDarkMode ? '#2d2d2d' : 'white',
        padding: '16px',
        boxShadow: isDarkMode ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
        maxWidth: '300px',
        zIndex: 99999,
        overflow: 'hidden',
        pointerEvents: 'auto'
      }}
    >
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: isContentVisible ? 0 : 20, opacity: isContentVisible ? 1 : 0 }}
        exit={{ x: 20, opacity: 0 }}
        transition={{ 
          duration: 0.4, 
          ease: 'easeOut',
          exit: { duration: 0.2, ease: 'easeIn' }
        }}
      >
        <h3 style={{ marginBottom: '8px', fontSize: '16px', color: isDarkMode ? '#f5f5f5' : 'inherit' }}>性能优化</h3>
        <p style={{ marginBottom: '16px', fontSize: '14px', color: isDarkMode ? '#aaa' : '#666' }}>保持网页原有动画效果可能影响性能。是否关闭动画以提升速度？</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button 
            onClick={() => {
              onDisableAnimation();
              // 保存设置到本地存储
              localStorage.setItem('performanceOptimization', 'disabled');
              setIsVisible(false);
            }}
            style={{
            padding: '6px 12px',
            backgroundColor: '#60A5FA',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            borderRadius: '2px',
            transition: 'background-color 0.2s ease'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#60A5FA';
            }}
          >
            关闭动画
          </button>
          <button 
            onClick={() => {
              onEnableAnimation();
              // 保存设置到本地存储
              localStorage.setItem('performanceOptimization', 'enabled');
              setIsVisible(false);
            }}
            style={{
            padding: '6px 12px',
            backgroundColor: 'transparent',
            color: '#60A5FA',
            border: '1px solid #60A5FA',
            cursor: 'pointer',
            fontSize: '14px',
            borderRadius: '2px',
            transition: 'all 0.2s ease'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(96, 165, 250, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            保持开启
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Canvas背景组件
const CanvasBackground = ({ isDarkMode, isAnimationEnabled }: { isDarkMode: boolean, isAnimationEnabled: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!isAnimationEnabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 强制设置canvas尺寸
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 设置canvas尺寸
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 生成随机颜色函数 - 根据模式使用不同的配色方案
    const generateRandomColor = () => {
      // 预定义柔和的颜色数组，确保颜色协调
      const colors = isDarkMode ? [
        'rgba(96, 165, 250, 0.15)',   // 浅蓝色（暗色模式下更明显）
        'rgba(52, 211, 153, 0.15)',   // 浅绿色（暗色模式下更明显）
        'rgba(251, 191, 36, 0.15)',   // 浅黄色（暗色模式下更明显）
        'rgba(236, 72, 153, 0.15)',   // 浅粉色（暗色模式下更明显）
        'rgba(168, 85, 247, 0.15)',   // 浅紫色（暗色模式下更明显）
        'rgba(249, 115, 22, 0.15)'     // 浅橙色（暗色模式下更明显）
      ] : [
        'rgba(96, 165, 250, 0.1)',   // 浅蓝色
        'rgba(52, 211, 153, 0.1)',   // 浅绿色
        'rgba(251, 191, 36, 0.1)',   // 浅黄色
        'rgba(236, 72, 153, 0.1)',   // 浅粉色
        'rgba(168, 85, 247, 0.1)',   // 浅紫色
        'rgba(249, 115, 22, 0.1)'     // 浅橙色
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    };
    
    // 正方形配置
    const squares: {x: number, y: number, size: number, color: string, speedX: number, speedY: number, baseX: number, baseY: number, floatOffset: number, targetX: number, targetY: number, ease: number}[] = [];
    
    // 创建正方形（全屏随机分布）- 进一步减少粒子数量，提高性能
    for (let i = 0; i < 18; i++) {
      const size = Math.random() * 300 + 100; // 增大粒子大小，进一步减少密度
      const x = Math.random() * (canvas.width + size * 2) - size;
      const y = Math.random() * (canvas.height + size * 2) - size;
      
      squares.push({
        x,
        y,
        size,
        color: generateRandomColor(),
        speedX: (Math.random() - 0.5) * 0.03, // 进一步降低速度
        speedY: (Math.random() - 0.5) * 0.02, // 进一步降低速度
        baseX: x, // 添加baseX属性
        baseY: y,
        floatOffset: Math.random() * Math.PI * 2,
        targetX: x,
        targetY: y,
        ease: 0.006 + Math.random() * 0.003 // 进一步减小缓动系数，使动画更稳定
      });
    }
    
    // 动画函数
    let lastMouseX = 0;
    let lastMouseY = 0;
    let mouseMoveSpeed = 0;
    
    // 鼠标移动事件 - 优化性能
    let lastMouseMoveTime = 0;
    const handleMouseMove = (e: MouseEvent) => {
      if (!isAnimationEnabled) return;
      
      const currentTime = performance.now();
      // 限制鼠标移动事件的处理频率，每20ms处理一次（约50fps），进一步减少计算量
      if (currentTime - lastMouseMoveTime < 20) return;
      lastMouseMoveTime = currentTime;
      
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      // 计算鼠标移动速度
      mouseMoveSpeed = Math.hypot(mouseX - lastMouseX, mouseY - lastMouseY) * 0.08; // 进一步降低鼠标移动速度影响
      
      lastMouseX = mouseX;
      lastMouseY = mouseY;
      
      // 鼠标交互 - 只处理屏幕内的粒子
      const screenSquares = squares.filter(square => 
        square.x >= -square.size && 
        square.x <= canvas.width && 
        square.y >= -square.size && 
        square.y <= canvas.height
      );
      
      // 批量处理鼠标交互
      screenSquares.forEach(square => {
        const dx = mouseX - (square.x + square.size / 2);
        const dy = mouseY - (square.y + square.size / 2);
        const distance = Math.hypot(dx, dy);
        
        if (distance < 150) {
          // 鼠标附近的粒子有更大的位移
          const force = (150 - distance) / 150 * 1.5 * mouseMoveSpeed; // 进一步降低鼠标交互强度
          const angle = Math.atan2(dy, dx);
          square.targetX = square.x - Math.cos(angle) * force;
          square.targetY = square.y - Math.sin(angle) * force;
        }
      });
    };
    
    // 动画函数
    const animate = () => {
      if (!isAnimationEnabled) return;
      
      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 只渲染屏幕内的粒子
      const screenSquares = squares.filter(square => 
        square.x >= -square.size && 
        square.x <= canvas.width && 
        square.y >= -square.size && 
        square.y <= canvas.height
      );
      
      // 批量处理屏幕内粒子的动画和渲染
      screenSquares.forEach(square => {
        // 液体感动画：使用缓动效果
        square.x += (square.targetX - square.x) * square.ease;
        square.y += (square.targetY - square.y) * square.ease;
        
        // 缓慢恢复到原始浮动状态
        square.targetX += (square.baseX + Math.sin(square.floatOffset) * 1.5 - square.targetX) * 0.0015; // 进一步减慢恢复速度，减小浮动范围
        square.targetY += (square.baseY + Math.cos(square.floatOffset) * 1.5 - square.targetY) * 0.0015; // 进一步减慢恢复速度，减小浮动范围
        
        // 更新浮动偏移
        square.floatOffset += 0.0006; // 进一步降低浮动速度
        square.baseX += Math.sin(square.floatOffset) * 0.03; // 进一步降低浮动幅度
        square.baseY += Math.cos(square.floatOffset) * 0.03; // 进一步降低浮动幅度
        
        // 绘制正方形
        ctx.fillStyle = square.color;
        ctx.fillRect(square.x, square.y, square.size, square.size);
      });
      
      // 边界检测（扩大到全屏范围）
      squares.forEach(square => {
        if (square.x > canvas.width + square.size) {
          square.x = -square.size;
          square.targetX = -square.size;
          square.baseX = -square.size;
          square.baseY = Math.random() * canvas.height;
          // 随机生成新的颜色和大小
          square.color = generateRandomColor();
          square.size = Math.random() * 300 + 100;
        }
        if (square.x < -square.size) {
          square.x = canvas.width + square.size;
          square.targetX = canvas.width + square.size;
          square.baseX = canvas.width + square.size;
          square.baseY = Math.random() * canvas.height;
          // 随机生成新的颜色和大小
          square.color = generateRandomColor();
          square.size = Math.random() * 300 + 100;
        }
        if (square.y > canvas.height + square.size) {
          square.y = -square.size;
          square.targetY = -square.size;
          square.baseY = -square.size;
          square.baseX = Math.random() * canvas.width;
          // 随机生成新的颜色和大小
          square.color = generateRandomColor();
          square.size = Math.random() * 300 + 100;
        }
        if (square.y < -square.size) {
          square.y = canvas.height + square.size;
          square.targetY = canvas.height + square.size;
          square.baseY = canvas.height + square.size;
          square.baseX = Math.random() * canvas.width;
          // 随机生成新的颜色和大小
          square.color = generateRandomColor();
          square.size = Math.random() * 300 + 100;
        }
      });
      
      requestAnimationFrame(animate);
    };
    
    // 滚动交互（增强交互性）
    const handleScroll = () => {
      if (!isAnimationEnabled) return;
      
      const scrollY = window.scrollY;
      squares.forEach(square => {
        square.baseY += scrollY * 0.002; // 增加滚动影响
        square.targetY += scrollY * 0.002;
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    animate(); // 直接调用动画函数
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isAnimationEnabled]);
  
  return (
    <>
      {isAnimationEnabled && <canvas ref={canvasRef} className="canvas-bg" style={{ display: 'block', width: '100%', height: '100%' }} />}
    </>
  );
};



function App() {
  const navbarRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = React.useState(() => {
    // 从本地存储中读取设置，如果没有则跟随系统
    const savedSetting = localStorage.getItem('darkMode');
    if (savedSetting !== null) {
      return savedSetting === 'true';
    }
    // 跟随系统设置
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isAnimationEnabled, setIsAnimationEnabled] = React.useState(() => {
    // 从本地存储中读取设置
    const savedSetting = localStorage.getItem('performanceOptimization');
    return savedSetting !== 'disabled';
  });

  // 监听滚动事件 - 使用节流优化性能
  useEffect(() => {
    let lastScrollY = 0;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // 避免频繁更新，只有当滚动超过10px时才更新
      if (Math.abs(currentScrollY - lastScrollY) > 10) {
        // 导航栏滚动效果
        if (navbarRef.current) {
          if (currentScrollY > 50) {
            navbarRef.current.style.background = isDarkMode ? 'rgba(26, 26, 26, 0.98)' : 'rgba(255, 255, 255, 0.98)';
            navbarRef.current.style.boxShadow = isDarkMode ? '0 4px 6px rgba(0, 0, 0, 0.4)' : '0 4px 6px rgba(0, 0, 0, 0.1)';
          } else {
            navbarRef.current.style.background = isDarkMode ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)';
            navbarRef.current.style.boxShadow = isDarkMode ? '0 2px 10px rgba(0, 0, 0, 0.4)' : '0 2px 10px rgba(0, 0, 0, 0.1)';
          }
        }
        lastScrollY = currentScrollY;
      }
    };

    // 使用requestAnimationFrame来优化滚动事件
    let frameId: number;
    const optimizedHandleScroll = () => {
      handleScroll();
      frameId = requestAnimationFrame(optimizedHandleScroll);
    };

    frameId = requestAnimationFrame(optimizedHandleScroll);
    return () => cancelAnimationFrame(frameId);
  }, [isDarkMode]);

  // 切换暗色模式
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    // 保存设置到本地存储
    localStorage.setItem('darkMode', newMode.toString());
  };

  // 应用暗色模式类
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // 切换低性能模式类
  useEffect(() => {
    if (!isAnimationEnabled) {
      document.body.classList.add('low-performance');
    } else {
      document.body.classList.remove('low-performance');
    }
  }, [isAnimationEnabled]);

  // 监听系统深色模式变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // 只有在本地存储没有保存设置时才跟随系统
      const savedSetting = localStorage.getItem('darkMode');
      if (savedSetting === null) {
        setIsDarkMode(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 处理动画禁用
  const handleDisableAnimation = () => {
    setIsAnimationEnabled(false);
  };

  // 处理动画启用
  const handleEnableAnimation = () => {
    setIsAnimationEnabled(true);
  };

  return (
    <Router>
      <div className="App">
        {/* 几何背景 */}
        <div className="geometric-bg">
          <CanvasBackground isDarkMode={isDarkMode} isAnimationEnabled={isAnimationEnabled} />
        </div>

        {/* 性能优化弹窗 */}
        <PerformancePopup 
          onDisableAnimation={handleDisableAnimation} 
          onEnableAnimation={handleEnableAnimation}
          isDarkMode={isDarkMode} 
        />

        {/* 导航栏 */}
        <nav ref={navbarRef} className="navbar">
          <div className="container navbar-container">
            <Link to="/" className="logo">Konita</Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <ul className="nav-links">
                <li><Link to="/" className="nav-link">首页</Link></li>
                <li><Link to="/tools" className="nav-link">工具</Link></li>
                <li><Link to="/blog" className="nav-link">博客</Link></li>
                <li><Link to="/about" className="nav-link">关于</Link></li>
              </ul>
              <button 
                onClick={toggleDarkMode}
                className="theme-toggle"
                aria-label={isDarkMode ? "切换到亮色模式" : "切换到暗色模式"}
              >
                {isDarkMode ? "☀️" : "🌙"}
              </button>
              <button 
                onClick={() => setIsRightSidebarOpen(true)}
                className="sidebar-toggle"
                aria-label="打开侧边栏"
              >
                ☰
              </button>
              <button 
                onClick={() => setIsRightSidebarOpen(true)}
                className="right-sidebar-toggle"
                aria-label="打开功能面板"
              >
                ⚙️
              </button>
            </div>
          </div>
        </nav>

        {/* 路由内容 */}
        <div className="main-content">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/tools/clock" element={<ClockPage />} />
              <Route path="/tools/editor" element={<EditorPage />} />
              <Route path="/tools/maimai" element={<MaimaiPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:id" element={<BlogPostPage />} />
              <Route path="/about" element={<AboutPage isDarkMode={isDarkMode} />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Suspense>
        </div>

        {/* 页脚 */}
        <footer className="footer">
          <div className="container">
            <div className="footer-content">
              <h3 className="logo">Konita</h3>
              <p>--让世界再次可爱--</p>
            </div>
            <ul className="footer-links">
              <li><Link to="/" className="footer-link">首页</Link></li>
              <li><Link to="/tools" className="footer-link">工具</Link></li>
              <li><Link to="/blog" className="footer-link">博客</Link></li>
              <li><Link to="/about" className="footer-link">关于</Link></li>
            </ul>
            <p className="footer-copyright">© {new Date().getFullYear()} Konita.</p>
          </div>
        </footer>



        {/* 右侧菜单栏 */}
        <Suspense fallback={null}>
          <RightSidebar 
            isOpen={isRightSidebarOpen} 
            onClose={() => setIsRightSidebarOpen(false)} 
            isDarkMode={isDarkMode} 
            onToggleDarkMode={toggleDarkMode}
            isAnimationEnabled={isAnimationEnabled}
            onToggleAnimation={setIsAnimationEnabled}
          />
        </Suspense>
      </div>
    </Router>
  );
}

export default App;