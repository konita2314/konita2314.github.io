import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const AboutPage = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const [githubAvatar, setGithubAvatar] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 获取GitHub用户头像
  useEffect(() => {
    const fetchGithubAvatar = async () => {
      try {
        const response = await fetch('https://api.github.com/users/konita2314');
        if (response.ok) {
          const data = await response.json();
          setGithubAvatar(data.avatar_url);
        }
      } catch (error) {
        console.error('Error fetching GitHub avatar:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGithubAvatar();
  }, []);

  return (
    <section className="about-page" style={{ padding: '8rem 0 4rem', minHeight: '100vh' }}>
      <div className="container">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4rem' }}>
          {/* 头像部分 */}
          <motion.div 
            className="avatar-section"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}
          >
            <div style={{ 
              width: '180px', 
              height: '180px', 
              borderRadius: '50%', 
              overflow: 'hidden',
              boxShadow: isDarkMode ? '0 10px 30px rgba(0, 0, 0, 0.5)' : '0 10px 30px rgba(0, 0, 0, 0.2)',
              border: `3px solid ${isDarkMode ? '#60A5FA' : '#60A5FA'}`
            }}>
              {isLoading ? (
                <div style={{ 
                  width: '100%', 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#333' : '#f0f0f0'
                }}>
                  <div style={{ fontSize: '2rem' }}>👤</div>
                </div>
              ) : (
                <img 
                  src={githubAvatar} 
                  alt="Konita's GitHub Avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <motion.h1 
                className="hero-title"
                style={{ 
                  fontSize: '2.5rem', 
                  marginBottom: '0.5rem',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Konita
              </motion.h1>
              <p className="hero-subtitle" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                -让世界再次可爱-
              </p>
              <p style={{ fontSize: '1rem', color: isDarkMode ? '#b0b0b0' : '#666' }}>
                热爱编程、设计和创造的开发者
              </p>
            </div>
          </motion.div>

          {/* 个人简介部分 */}
          <motion.div 
            className="about-content-section"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ 
              maxWidth: '800px', 
              textAlign: 'center',
              padding: '2rem',
              backgroundColor: isDarkMode ? 'rgba(35, 35, 35, 0.8)' : 'rgba(255, 255, 255, 0.8)',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}
          >
            <p style={{ fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '1.5rem' }}>
              你好，我是Konita！
            </p>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '1.5rem' }}>
              我是一名热爱编程、设计和创造的开发者。我喜欢构建实用的工具和有趣的项目，希望通过技术让世界变得更加美好。
            </p>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '1.5rem' }}>
              这个网站是我的个人空间，用于分享我的作品、想法和知识。我相信技术的力量可以解决很多问题，也希望我的分享能给你带来启发。
            </p>
          </motion.div>

          {/* 联系方式 */}
          <motion.div 
            className="contact-section"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            style={{ width: '100%', maxWidth: '600px' }}
          >
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <h3 style={{ 
                fontSize: '1.5rem', 
                marginBottom: '2rem',
                color: isDarkMode ? '#f0f0f0' : '#333'
              }}>
                联系我
              </h3>
              <div className="contact-buttons" style={{ 
                display: 'flex', 
                gap: '1.5rem', 
                justifyContent: 'center', 
                flexWrap: 'wrap'
              }}>
                <motion.a 
                  href="mailto:konita@163.com" 
                  className="btn btn-primary"
                  whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(96, 165, 250, 0.3)' }}
                  whileTap={{ scale: 0.95 }}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    fontSize: '1rem', 
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  📧 发送邮件
                </motion.a>
                <motion.a 
                  href="https://github.com/konita2314" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(96, 165, 250, 0.3)' }}
                  whileTap={{ scale: 0.95 }}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    fontSize: '1rem', 
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  🐙 GitHub
                </motion.a>
                <motion.a 
                  href="/" 
                  className="btn btn-secondary"
                  whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(96, 165, 250, 0.3)' }}
                  whileTap={{ scale: 0.95 }}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    fontSize: '1rem', 
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  🏠 返回首页
                </motion.a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutPage;