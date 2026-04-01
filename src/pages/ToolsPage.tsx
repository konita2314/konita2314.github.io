import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const ToolsPage = () => {
  return (
    <section className="tools-page">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          工具页
        </motion.h2>

        <div className="tools-grid">
          <motion.div
            className="tool-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            whileHover={{ y: -10 }}
          >
            <div className="tool-icon">🕰️</div>
            <h3 className="tool-title">桌面时钟</h3>
            <p className="tool-description">显示当前时间、日期、时区和天气，支持全屏功能。</p>
            <motion.div 
              className="tool-link"
              whileHover={{ x: 8, scale: 1.05 }}
              style={{ marginTop: '1.5rem' }}
            >
              <Link to="/tools/clock" style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                fontWeight: '600', 
                fontSize: '1rem',
                textDecoration: 'none',
                color: 'var(--primary)',
                transition: 'all 0.3s ease'
              }}>
                立即使用 🕰️
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="tool-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
            whileHover={{ y: -10 }}
          >
            <div className="tool-icon">💻</div>
            <h3 className="tool-title">编辑器</h3>
            <p className="tool-description">支持多种文件格式，包括markdown、HTML、CSS等，支持文件上传和保存。</p>
            <motion.div 
              className="tool-link"
              whileHover={{ x: 8, scale: 1.05 }}
              style={{ marginTop: '1.5rem' }}
            >
              <Link to="/tools/editor" style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                fontWeight: '600', 
                fontSize: '1rem',
                textDecoration: 'none',
                color: 'var(--primary)',
                transition: 'all 0.3s ease'
              }}>
                立即使用 💻
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="tool-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
            whileHover={{ y: -10 }}
          >
            <div className="tool-icon">📱</div>
            <h3 className="tool-title">舞萌查分器</h3>
            <p className="tool-description">舞萌查分器，功能开发中...</p>
            <motion.div 
              className="tool-link"
              whileHover={{ x: 8, scale: 1.05 }}
              style={{ marginTop: '1.5rem' }}
            >
              <Link to="/tools/maimai" style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                fontWeight: '600', 
                fontSize: '1rem',
                textDecoration: 'none',
                color: 'var(--primary)',
                transition: 'all 0.3s ease'
              }}>
                立即使用 📱
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ToolsPage;