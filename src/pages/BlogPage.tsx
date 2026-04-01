import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface BlogPost {
  id: number;
  title: string;
  cover: string;
  excerpt: string;
  content: string;
}

const BlogPage = () => {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = '博客 | Konita';
  }, []);

  useEffect(() => {
    const loadBlogPosts = async () => {
      try {
        // 使用 Vite 的 glob 功能动态导入博客文件
        const blogFiles = import.meta.glob('../../blog/*/info.txt', { as: 'raw' });
        const contentFiles = import.meta.glob('../../blog/*/info.md', { as: 'raw' });
        
        const posts: BlogPost[] = [];
        
        for (const [path, loader] of Object.entries(blogFiles)) {
          const parts = path.split('/');
          const id = parseInt(parts[parts.length - 2] || '0');
          const contentPath = path.replace('info.txt', 'info.md');
          
          const infoContent = await (loader as () => Promise<string>)();
          const contentLoader = contentFiles[contentPath];
          const content = contentLoader ? await (contentLoader as () => Promise<string>)() : '';
          
          const [title, cover, excerpt] = infoContent.split('\n');
          
          posts.push({
            id,
            title: title.trim(),
            cover: cover.trim(),
            excerpt: excerpt.trim(),
            content
          });
        }
        
        // 按ID排序
        posts.sort((a, b) => b.id - a.id);
        setBlogPosts(posts);
      } catch (error) {
        console.error('Error loading blog posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBlogPosts();
  }, []);

  return (
    <section className="blog-page">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          博客
        </motion.h2>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : blogPosts.length === 0 ? (
          <div className="no-posts">暂无博客</div>
        ) : (
          <div className="blog-grid">
            {blogPosts.map((post, index) => (
              <motion.div
                key={post.id}
                className="blog-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.2, ease: "easeOut" }}
                whileHover={{ y: -5 }}
              >
                <div className="blog-image">📝</div>
                <div className="blog-content">
                  <h3 className="blog-title">{post.title}</h3>
                  <p className="blog-excerpt">{post.excerpt.substring(0, 100)}...</p>
                  <motion.div 
                    className="blog-link"
                    whileHover={{ x: 5 }}
                  >
                    <Link to={`/blog/${post.id}`}>阅读更多 →</Link>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogPage;