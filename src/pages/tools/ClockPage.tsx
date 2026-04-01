import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ClockPage = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 控制导航栏和页脚的显示
  useEffect(() => {
    const navbar = document.querySelector('.navbar') as HTMLElement | null;
    const footer = document.querySelector('.footer') as HTMLElement | null;
    if (isFullscreen) {
      if (navbar) navbar.style.display = 'none';
      if (footer) footer.style.display = 'none';
    } else {
      if (navbar) navbar.style.display = '';
      if (footer) footer.style.display = '';
    }
  }, [isFullscreen]);

  // 模拟天气数据
  const weather = {
    temperature: 22,
    condition: '晴',
    location: '北京'
  };

  // 模拟日出日落时间
  const sunriseSunset = {
    sunrise: '06:30',
    sunset: '18:45'
  };

  // 模拟农历日期
  const lunarDate = '甲辰年 三月初十';

  // 全屏功能
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // 星期几
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const weekday = weekdays[currentTime.getDay()];

  // 月份
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const month = months[currentTime.getMonth()];

  if (isFullscreen) {

    return (
      <div className="clock-fullscreen">
        <div className="container">
          <motion.h2 
            className="section-title"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            桌面时钟
          </motion.h2>

          <div className="clock-container">
            <div className="clock-display">
              <h3>当前时间</h3>
              <div className="time">{currentTime.toLocaleTimeString('zh-CN', { hour12: false })}</div>
              <div className="date">{currentTime.getFullYear()}年 {month} {currentTime.getDate()}日</div>
              <div className="weekday">{weekday}</div>
              <div className="lunar">{lunarDate}</div>
              <div className="timezone">时区: {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
              <div className="weather">
                天气: {weather.condition} {weather.temperature}°C
              </div>
              <div className="sunrise-sunset">
                日出: {sunriseSunset.sunrise} | 日落: {sunriseSunset.sunset}
              </div>
            </div>
            <button 
              className="fullscreen-btn"
              onClick={toggleFullScreen}
            >
              退出全屏
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="clock-page">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          桌面时钟
        </motion.h2>

        <div className="clock-container">
          <div className="clock-display">
            <h3>当前时间</h3>
            <div className="time">{currentTime.toLocaleTimeString('zh-CN', { hour12: false })}</div>
            <div className="date">{currentTime.getFullYear()}年 {month} {currentTime.getDate()}日</div>
            <div className="weekday">{weekday}</div>
            <div className="lunar">{lunarDate}</div>
            <div className="timezone">时区: {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
            <div className="weather">
              天气: {weather.condition} {weather.temperature}°C
            </div>
            <div className="sunrise-sunset">
              日出: {sunriseSunset.sunrise} | 日落: {sunriseSunset.sunset}
            </div>
          </div>
          <button 
            className="fullscreen-btn"
            onClick={toggleFullScreen}
          >
            全屏
          </button>
        </div>
      </div>
    </section>
  );
};

export default ClockPage;