import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isDarkMode }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div 
            className="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClose}
          />

          {/* 侧边栏 */}
          <motion.div 
            className={`sidebar ${isDarkMode ? 'dark' : ''}`}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className="sidebar-header">
              <motion.h2
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.2, delay: 0.05, ease: "easeInOut" }}
              >
                Konita
              </motion.h2>
              <motion.button 
                className="close-btn" 
                onClick={onClose}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.2, delay: 0.1, ease: "easeInOut" }}
              >
                ×
              </motion.button>
            </div>
            <nav className="sidebar-nav">
              <ul>
                {[
                  { path: '/', label: '首页' },
                  { path: '/tools', label: '工具' },
                  { path: '/blog', label: '博客' },
                  { path: '/about', label: '关于' }
                ].map((item, index) => (
                  <motion.li
                    key={item.path}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{
                      duration: 0.2,
                      delay: 0.15 + index * 0.08,
                      ease: "easeInOut"
                    }}
                  >
                    <a href={item.path} onClick={onClose}>{item.label}</a>
                  </motion.li>
                ))}
              </ul>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;