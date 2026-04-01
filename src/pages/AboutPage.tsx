import { motion } from 'framer-motion';

const AboutPage = () => {
  return (
    <section className="about-page" style={{ padding: '8rem 0 4rem', minHeight: '100vh' }}>
      <div className="container">
        {/* 个人简介部分 */}
        <motion.div 
          className="hero-content"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h1 className="hero-title">关于我</h1>
          <p className="hero-subtitle">-让世界再次可爱-</p>
          <div className="about-content" style={{ marginBottom: '4rem' }}>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '1.5rem' }}>你好，我是Konita！</p>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '1.5rem' }}>我是一名热爱编程、设计和创造的开发者。我喜欢构建实用的工具和有趣的项目，希望通过技术让世界变得更加美好。</p>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '1.5rem' }}>这个网站是我的个人空间，用于分享我的作品、想法和知识。我相信技术的力量可以解决很多问题，也希望我的分享能给你带来启发。</p>
          </div>
        </motion.div>

        {/* 联系方式 */}
        <motion.div 
          className="contact-section"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
        >
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <div className="contact-buttons" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.a 
                href="mailto:konita@163.com" 
                className="btn btn-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                发送邮件
              </motion.a>
              <motion.a 
                href="https://github.com/konita2314" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                GitHub
              </motion.a>
              <motion.a 
                href="/" 
                className="btn btn-secondary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                返回首页
              </motion.a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutPage;