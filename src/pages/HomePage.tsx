import { motion, useEffect } from 'framer-motion';
import { Link } from 'react-router-dom';

const HomePage = () => {
  useEffect(() => {
    document.title = 'Konita | 个人主页';
  }, []);

  return (
    <section id="home" className="hero">
      <div className="container">
        <motion.div 
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h1 className="hero-title">你好！</h1>
          <h1 className="hero-title">我是Konita！</h1>
          <p className="hero-subtitle">欢迎来到我的个人主页！</p>
          <div className="hero-buttons" style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
            <motion.div
              whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(96, 165, 250, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
            >
              <Link 
                to="/tools" 
                className="btn btn-primary"
                style={{ 
                  padding: '1rem 2rem', 
                  fontSize: '1.1rem', 
                  borderRadius: '2px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                🛠️ 小工具
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(96, 165, 250, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
            >
              <Link 
                to="/blog" 
                className="btn btn-secondary"
                style={{ 
                  padding: '1rem 2rem', 
                  fontSize: '1.1rem', 
                  borderRadius: '2px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                📝 博客
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(96, 165, 250, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4, ease: "easeOut" }}
            >
              <Link 
                to="/about" 
                className="btn btn-secondary"
                style={{ 
                  padding: '1rem 2rem', 
                  fontSize: '1.1rem', 
                  borderRadius: '2px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                👤 关于我
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HomePage;