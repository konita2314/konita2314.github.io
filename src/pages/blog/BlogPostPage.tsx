import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import GitHubLoginButton from '../../components/Auth/GitHubLoginButton';

interface Comment {
  id: number;
  content: string;
  author: string;
  avatar: string;
  date: string;
  replies?: Comment[];
}

interface BlogPost {
  id: number;
  title: string;
  cover: string;
  content: string;
  comments: Comment[];
  publishDate: string;
  lastModifiedDate: string;
}

const BlogPostPage = () => {
  const params = useParams<{ id: string }>();
  const postId = parseInt(params.id || '1');
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showToc, setShowToc] = useState(false);
  const [toc, setToc] = useState<{id: string, title: string, level: number}[]>([]);

  useEffect(() => {
    // 设置默认标题
    document.title = '博客文章 | Konita';
  }, []);

  // 当文章加载完成后，更新标题
  useEffect(() => {
    if (post) {
      document.title = `${post.title} | Konita`;
    }
  }, [post]);

  useEffect(() => {
    const loadBlogPost = async () => {
      try {
        // 使用Vite的glob功能加载所有博客文件
        const blogFiles = import.meta.glob('../../../blog/*/info.md', { as: 'raw' });
        const infoFiles = import.meta.glob('../../../blog/*/info.txt', { as: 'raw' });
        const commentFiles = import.meta.glob('../../../blog/*/comment.json', { as: 'raw' });
        
        // 构建文件路径
        const contentPath = `../../../blog/${postId}/info.md`;
        const infoPath = `../../../blog/${postId}/info.txt`;
        const commentsPath = `../../../blog/${postId}/comment.json`;
        
        // 检查文件是否存在
        if (blogFiles[contentPath] && infoFiles[infoPath] && commentFiles[commentsPath]) {
          const content = await (blogFiles[contentPath] as () => Promise<string>)();
        const infoContent = await (infoFiles[infoPath] as () => Promise<string>)();
        const commentsData = JSON.parse(await (commentFiles[commentsPath] as () => Promise<string>)());
        
        const lines = infoContent.split('\n');
        const title = lines[0]?.trim() || '';
        const cover = lines[1]?.trim() || '';
        const publishDate = lines[2]?.trim() || '';
        const lastModifiedDate = lines[3]?.trim() || publishDate;
        
        setPost({
          id: postId,
          title: title,
          cover: cover,
          content,
          comments: commentsData,
          publishDate: publishDate,
          lastModifiedDate: lastModifiedDate
        });
          
          setComments(commentsData);
        } else {
          console.error('Blog post not found:', postId);
        }
      } catch (error) {
        console.error('Error loading blog post:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBlogPost();
  }, [postId]);

  // 提取标题生成目录
  useEffect(() => {
    if (post) {
      const content = post.content;
      const lines = content.split('\n');
      const tableOfContents: {id: string, title: string, level: number}[] = [];
      
      lines.forEach(line => {
        const match = line.match(/^(#{1,6})\s+(.*)$/);
        if (match) {
          const level = match[1].length;
          const title = match[2].trim();
          const id = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          tableOfContents.push({id, title, level});
        }
      });
      
      setToc(tableOfContents);
    }
  }, [post]);

  interface User {
    name: string;
    avatar: string;
    login: string;
  }

  const [user, setUser] = useState<User | null>(null);

  // 处理GitHub登录成功
  const handleGitHubLoginSuccess = (githubUser: any) => {
    const user: User = {
      name: githubUser.name,
      avatar: githubUser.avatar_url,
      login: githubUser.login
    };
    setUser(user);
    setIsLoggedIn(true);
  };

  // 处理GitHub登录错误
  const handleGitHubLoginError = (error: string) => {
    console.error('GitHub登录错误:', error);
    // 可以在这里显示错误提示
  };

  // 登出
  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
  };

  // 提交评论
  const handleSubmitComment = () => {
    if (comment.trim() && isLoggedIn && user) {
      const newComment: Comment = {
        id: comments.length + 1,
        content: comment,
        author: user.name,
        avatar: user.avatar,
        date: new Date().toISOString().split('T')[0]
      };
      setComments([...comments, newComment]);
      setComment('');
    }
  };

  // 开始回复
  const handleStartReply = (commentId: number) => {
    setReplyingTo(commentId);
    setReplyContent('');
  };

  // 提交回复
  const handleSubmitReply = (commentId: number) => {
    if (replyContent.trim() && isLoggedIn && user) {
      const newReply: Comment = {
        id: Math.max(...comments.flatMap(c => [c.id, ...(c.replies?.map(r => r.id) || [])]) || [0]) + 1,
        content: replyContent,
        author: user.name,
        avatar: user.avatar,
        date: new Date().toISOString().split('T')[0]
      };

      const updatedComments = comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), newReply]
          };
        }
        return comment;
      });

      setComments(updatedComments);
      setReplyingTo(null);
      setReplyContent('');
    }
  };

  if (loading) {
    return (
      <section className="blog-post-page">
        <div className="container">
          <div className="loading">加载中...</div>
        </div>
      </section>
    );
  }

  if (!post) {
    return (
      <section className="blog-post-page">
        <div className="container">
          <div className="error">博客不存在</div>
        </div>
      </section>
    );
  }

  // 滚动到指定标题
  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setShowToc(false);
  };

  return (
    <section className="blog-post-page">
      <div className="container">
        <div className="blog-content">
          <div className="markdown-content">
            <ReactMarkdown 
              rehypePlugins={[rehypeHighlight]}
              components={{
                h1: ({ children }) => {
                  const id = React.Children.toArray(children).join('').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                  
                  // 计算是否需要显示提醒
                  const isOverAYearOld = () => {
                    if (!post?.lastModifiedDate) return false;
                    const lastModified = new Date(post.lastModifiedDate);
                    const now = new Date();
                    const diffTime = Math.abs(now.getTime() - lastModified.getTime());
                    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
                    return diffYears > 1;
                  };
                  
                  return (
                    <>
                      <motion.h1 
                        id={id}
                        className="blog-title"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                      >
                        {children}
                      </motion.h1>
                      <blockquote className="blog-meta">
                        <p>
                          发布日期: {post?.publishDate || '未知'} | 最后修改日期: {post?.lastModifiedDate || '未知'}
                        </p>
                        {isOverAYearOld() && (
                          <p className="blog-warning">
                            文章已超过一年未更新，可能无法提供准确的信息，请仔细甄别
                          </p>
                        )}
                      </blockquote>
                    </>
                  );
                },
                h2: ({ children }) => {
                  const id = React.Children.toArray(children).join('').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                  return <h2 id={id} className="blog-section-title">{children}</h2>;
                },
                h3: ({ children }) => {
                  const id = React.Children.toArray(children).join('').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                  return <h3 id={id}>{children}</h3>;
                },
                h4: ({ children }) => {
                  const id = React.Children.toArray(children).join('').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                  return <h4 id={id}>{children}</h4>;
                },
                h5: ({ children }) => {
                  const id = React.Children.toArray(children).join('').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                  return <h5 id={id}>{children}</h5>;
                },
                h6: ({ children }) => {
                  const id = React.Children.toArray(children).join('').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                  return <h6 id={id}>{children}</h6>;
                }
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          {/* 评论区 */}
          <div className="comments-section">
            <div className="comments-header">
              <h3>评论</h3>
            </div>
            {comments.map((comment) => (
              <div key={comment.id} className="comment">
                <div className="comment-header">
                  <img src={comment.avatar} alt={comment.author} className="comment-avatar" />
                  <div className="comment-author-container">
                    <span className={`comment-author ${comment.author === 'Konita' ? 'author-badge' : ''}`}>
                      {comment.author}
                      {comment.author === 'Konita' && <span className="author-label">作者</span>}
                    </span>
                  </div>
                  <span className="comment-date">{comment.date}</span>
                </div>
                <div className="comment-content">{comment.content}</div>
                <div className="comment-actions">
                  {isLoggedIn ? (
                    <button 
                      className="btn btn-sm"
                      onClick={() => handleStartReply(comment.id)}
                    >
                      回复
                    </button>
                  ) : (
                    <GitHubLoginButton 
                      onLogin={handleGitHubLoginSuccess}
                      onError={handleGitHubLoginError}
                      size="sm"
                      label="登录回复"
                    />
                  )}
                </div>
                {replyingTo === comment.id && (
                  <div className="reply-form">
                    <textarea 
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="写下你的回复..."
                      className="reply-textarea"
                    ></textarea>
                    <div className="reply-actions">
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => setReplyingTo(null)}
                      >
                        取消
                      </button>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => handleSubmitReply(comment.id)}
                      >
                        提交回复
                      </button>
                    </div>
                  </div>
                )}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="comment-replies">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="comment reply">
                        <div className="comment-header">
                          <img src={reply.avatar} alt={reply.author} className="comment-avatar" />
                          <div className="comment-author-container">
                            <span className={`comment-author ${reply.author === 'Konita' ? 'author-badge' : ''}`}>
                              {reply.author}
                              {reply.author === 'Konita' && <span className="author-label">作者</span>}
                            </span>
                          </div>
                          <span className="comment-date">{reply.date}</span>
                        </div>
                        <div className="comment-content">{reply.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* 评论表单 */}
            <div className="comment-form">
              {!isLoggedIn ? (
                <GitHubLoginButton 
                  onLogin={handleGitHubLoginSuccess}
                  onError={handleGitHubLoginError}
                  label="使用GitHub登录评论"
                />
              ) : (
                <div>
                  <div className="user-info">
                    {user && (
                      <div className="user-details">
                        <img src={user.avatar} alt={user.name} className="user-avatar" />
                        <span className="user-name">{user.name}</span>
                        <button 
                          className="btn btn-secondary"
                          onClick={handleLogout}
                        >
                          登出
                        </button>
                      </div>
                    )}
                  </div>
                  <textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="写下你的评论..."
                    className="comment-textarea"
                  ></textarea>
                  <button 
                    className="btn btn-primary"
                    onClick={handleSubmitComment}
                  >
                    提交评论
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 悬浮目录按钮 */}
      <div className="toc-container">
        <button 
          className="toc-button"
          onClick={() => setShowToc(!showToc)}
          aria-label="目录"
        >
          📑
        </button>
        {showToc && (
          <div className="toc-panel">
            <h4>目录</h4>
            <ul className="toc-list">
              {toc.map((item) => (
                <li 
                  key={item.id}
                  className={`toc-item level-${item.level}`}
                  onClick={() => scrollToHeading(item.id)}
                >
                  {item.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogPostPage;