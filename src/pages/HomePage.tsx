import { motion } from 'framer-motion';

const HomePage = () => {
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
            <motion.a 
              href="/tools" 
              className="btn btn-primary"
              whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(96, 165, 250, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
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
            </motion.a>
            <motion.a 
              href="/blog" 
              className="btn btn-secondary"
              whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(96, 165, 250, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
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
            </motion.a>
            <motion.a 
              href="/about" 
              className="btn btn-secondary"
              whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(96, 165, 250, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4, ease: "easeOut" }}
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
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HomePage;