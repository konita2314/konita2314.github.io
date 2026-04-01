import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isAnimationEnabled: boolean;
  onToggleAnimation: (enabled: boolean) => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ isOpen, onClose, isDarkMode, onToggleDarkMode, isAnimationEnabled, onToggleAnimation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('zh-CN');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('搜索:', searchQuery);
      // 这里可以添加搜索逻辑
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div 
            className="right-sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClose}
          />

          {/* 右侧边栏 */}
          <motion.div 
            className={`right-sidebar ${isDarkMode ? 'dark' : ''}`}
            key="right-sidebar"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="right-sidebar-header">
              <motion.h2
                key="header-title"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.15, delay: 0.05, ease: "easeInOut" }}
              >
                功能面板
              </motion.h2>
              <motion.button 
                key="close-btn"
                className="close-btn" 
                onClick={onClose}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.15, delay: 0.1, ease: "easeInOut" }}
              >
                ×
              </motion.button>
            </div>

            {/* 搜索功能 */}
            <motion.div 
              key="search-section"
              className="search-section"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.15, delay: 0.15, ease: "easeInOut" }}
            >
              <form onSubmit={(e) => {
                e.stopPropagation();
                handleSearchSubmit(e);
              }} className="search-form" onClick={(e) => e.stopPropagation()}>
                <div className={`search-input-container ${isSearchFocused ? 'focused' : ''}`}>
                  <input
                    type="text"
                    placeholder="搜索..."
                    value={searchQuery}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSearchChange(e);
                    }}
                    onFocus={(e) => {
                      e.stopPropagation();
                      setIsSearchFocused(true);
                    }}
                    onBlur={(e) => {
                      e.stopPropagation();
                      setIsSearchFocused(false);
                    }}
                    className="search-input"
                  />
                  <button type="submit" className="search-btn" onClick={(e) => e.stopPropagation()}>
                    🔍
                  </button>
                </div>
              </form>
            </motion.div>

            {/* 快捷工具 */}
            <div className="tools-section">
              <motion.h3
                key="tools-title"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.15, delay: 0.2, ease: "easeInOut" }}
              >
                快捷工具
              </motion.h3>
              <ul className="tools-list">
                {[
                  { path: '/tools/clock', icon: '🕒', name: '时钟' },
                  { path: '/tools/editor', icon: '✏️', name: '编辑器' },
                  { path: '/tools/maimai', icon: '🎵', name: '舞萌查分' }
                ].map((item, index) => (
                  <motion.li
                    key={`tool-${item.path}`}
                    className="tool-item"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{
                      duration: 0.15,
                      delay: 0.25 + index * 0.06,
                      ease: "easeInOut"
                    }}
                  >
                    <a href={item.path} onClick={onClose}>
                      <span className="tool-icon">{item.icon}</span>
                      <span className="tool-name">{item.name}</span>
                    </a>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* 最近访问 */}
            <div className="recent-section">
              <motion.h3
                key="recent-title"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.15, delay: 0.4, ease: "easeInOut" }}
              >
                最近访问
              </motion.h3>
              <ul className="recent-list">
                {[
                  { path: '/', icon: '🏠', name: '首页' },
                  { path: '/tools', icon: '🛠️', name: '工具' },
                  { path: '/blog', icon: '📝', name: '博客' }
                ].map((item, index) => (
                  <motion.li
                    key={`recent-${item.path}`}
                    className="recent-item"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{
                      duration: 0.15,
                      delay: 0.45 + index * 0.06,
                      ease: "easeInOut"
                    }}
                  >
                    <a href={item.path} onClick={onClose}>
                      <span className="recent-icon">{item.icon}</span>
                      <span className="recent-name">{item.name}</span>
                    </a>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* 系统设置 */}
            <div className="settings-section">
              <motion.h3
                key="settings-title"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.15, delay: 0.6, ease: "easeInOut" }}
              >
                系统设置
              </motion.h3>
              {[
                {
                  label: '深色模式',
                  checked: isDarkMode,
                  onChange: onToggleDarkMode
                },
                {
                  label: '低性能模式',
                  checked: !isAnimationEnabled,
                  onChange: () => onToggleAnimation(!isAnimationEnabled)
                }
              ].map((item, index) => (
                <motion.div
                  key={`setting-${item.label}`}
                  className="setting-item"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{
                    duration: 0.15,
                    delay: 0.65 + index * 0.06,
                    ease: "easeInOut"
                  }}
                >
                  <span className="setting-label">{item.label}</span>
                  <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="toggle-input" 
                      checked={item.checked} 
                      onChange={(e) => {
                        e.stopPropagation();
                        item.onChange();
                        if (item.label === '低性能模式') {
                          localStorage.setItem('performanceOptimization', e.target.checked ? 'disabled' : 'enabled');
                        }
                      }} 
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </motion.div>
              ))}
            </div>

            {/* 语言设置 */}
            <div className="language-section">
              <motion.h3
                key="language-title"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.15, delay: 0.75, ease: "easeInOut" }}
              >
                语言设置
              </motion.h3>
              <motion.div 
                key="language-selector"
                className="language-selector"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.15, delay: 0.8, ease: "easeInOut" }}
              >
                <select 
                  value={selectedLanguage} 
                  onChange={(e) => {
                    e.stopPropagation();
                    setSelectedLanguage(e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="language-select"
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="zh-TW">繁体中文</option>
                  <option value="en-US">English</option>
                  <option value="ja-JP">日本语</option>
                </select>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RightSidebar;