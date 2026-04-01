import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 懒加载ReactMarkdown组件
const ReactMarkdown = lazy(() => import('react-markdown'));

// 正常导入非React组件依赖
import rehypeHighlight from 'rehype-highlight';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
  description: string;
}

interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  sha: string;
  download_url?: string;
}

// 获取代码语言标识符用于语法高亮
const getCodeLanguage = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const langMap: { [key: string]: string } = {
    'js': 'javascript', 'jsx': 'javascript',
    'ts': 'typescript', 'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'c': 'c', 'h': 'c',
    'cpp': 'cpp', 'hpp': 'cpp', 'cc': 'cpp',
    'csharp': 'csharp', 'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'r': 'r',
    'lua': 'lua',
    'html': 'html',
    'css': 'css',
    'scss': 'scss', 'sass': 'scss',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml', 'yml': 'yaml',
    'sql': 'sql',
    'sh': 'bash', 'bash': 'bash', 'zsh': 'bash',
    'ps1': 'powershell',
    'bat': 'batch', 'cmd': 'batch',
    'dockerfile': 'dockerfile',
    'vue': 'vue',
    'svelte': 'svelte',
    'graphql': 'graphql',
    'toml': 'toml',
    'md': 'markdown', 'markdown': 'markdown',
  };
  return langMap[ext || ''] || 'plaintext';
};

const EditorPage = () => {
  // 编辑器核心状态
  const [editorContent, setEditorContent] = useState('');
  const [fileName, setFileName] = useState('untitled.md');
  const [lineNumbers, setLineNumbers] = useState<number[]>([1]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isOpeningFile = useRef(false);

  useEffect(() => {
    document.title = '编辑器 | Konita';
  }, []);



  // 视图状态 - 对于非md文件，强制使用编辑模式
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');

  // 从文件名获取扩展名
  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  // 判断是否为Markdown文件
  const isMarkdownFile = (filename: string): boolean => {
    const ext = getFileExtension(filename);
    return ['md', 'markdown', 'mdx'].includes(ext);
  };

  // 计算当前是否应该显示视图控制
  const shouldShowViewControls = isMarkdownFile(fileName);

  // GitHub相关状态
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [githubToken, setGithubToken] = useState<string>('');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [recentFiles, setRecentFiles] = useState<GitHubFile[]>([]);
  const [fileHistory, setFileHistory] = useState<string[]>([]);

  // 模态框状态
  const [activeModal, setActiveModal] = useState<'repo' | 'commit' | null>(null);
  const [modalView, setModalView] = useState<'repoList' | 'fileBrowser' | 'fileSearch'>('repoList');

  // 操作状态
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setEditorContent(content);
      };
      reader.readAsText(file);
      showStatus('文件上传成功', 'success');
    }
  };

  // 保存文件到本地
  const saveFile = () => {
    const blob = new Blob([editorContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('文件已保存到本地', 'success');
  };

  // 显示状态消息
  const showStatus = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => {
      setStatusMessage('');
    }, 3000);
  };



  // 处理GitHub OAuth回调
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      // 实际应用中，这里应该发送code到后端换取access_token
      // 由于纯前端实现限制，这里使用Personal Access Token方式
      const token = localStorage.getItem('github_token');
      if (token) {
        setGithubToken(token);
        fetchGitHubUser(token);
      }
    }
  }, []);

  // 获取GitHub用户信息
  const fetchGitHubUser = async (token: string) => {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (response.ok) {
        const user = await response.json();
        setGithubUser(user);
        fetchRepos(token);
        showStatus(`欢迎回来，${user.login}！`, 'success');
      } else {
        showStatus('GitHub登录失败，请检查Token是否有效', 'error');
      }
    } catch (error) {
      console.error('Failed to fetch GitHub user:', error);
      showStatus('网络错误，请稍后重试', 'error');
    }
  };

  // 获取用户仓库列表
  const fetchRepos = async (token: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (response.ok) {
        const repos = await response.json();
        setRepos(repos);
      }
    } catch (error) {
      console.error('Failed to fetch repos:', error);
      showStatus('获取仓库列表失败', 'error');
    }
    setIsLoading(false);
  };

  // 获取仓库文件列表
  const fetchRepoFiles = async (repoFullName: string, path: string = '', branch: string = 'main') => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.github.com/repos/${repoFullName}/contents/${path}?ref=${branch}`,
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      if (response.ok) {
        const files = await response.json();
        const fileList = Array.isArray(files) ? files : [files];
        setFiles(fileList);
        setModalView('fileBrowser');
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
      showStatus('获取文件列表失败', 'error');
    }
    setIsLoading(false);
  };

  // 读取文件内容
  const fetchFileContent = async (file: GitHubFile) => {
    if (file.type !== 'file') {
      // 如果是目录，进入目录
      setCurrentPath(file.path);
      addToFileHistory(file.path);
      fetchRepoFiles(selectedRepo, file.path, selectedBranch);
      return;
    }

    // 标记正在打开文件
    isOpeningFile.current = true;
    setIsLoading(true);
    try {
      // 检查必要参数
      if (!selectedRepo) {
        showStatus('请先选择仓库', 'error');
        setIsLoading(false);
        isOpeningFile.current = false;
        return;
      }

      if (!githubToken) {
        showStatus('请先登录GitHub', 'error');
        setIsLoading(false);
        isOpeningFile.current = false;
        return;
      }

      if (!file.path) {
        showStatus('文件路径无效', 'error');
        setIsLoading(false);
        isOpeningFile.current = false;
        return;
      }

      // 尝试使用GitHub API获取文件内容（更可靠的方式）
      const encodedFilePath = encodeURIComponent(file.path).replace(/%2F/g, '/');
      const apiUrl = `https://api.github.com/repos/${selectedRepo}/contents/${encodedFilePath}?ref=${selectedBranch}`;
      
      console.log('Fetching file from API:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.ok) {
        const fileData = await response.json();
        if (fileData.content) {
          try {
            // 解码base64内容
            const base64Content = fileData.content.replace(/\s/g, '');
            const decodedBytes = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
            const content = new TextDecoder('utf-8').decode(decodedBytes);
            console.log('File name from GitHub API:', file.name);
            setEditorContent(content);
            setFileName(file.name);
            console.log('Set file name to:', file.name);
            setActiveModal(null);
            addToRecentFiles(file);
            showStatus('文件加载成功', 'success');
          } catch (decodeError) {
            console.error('Failed to decode file content:', decodeError);
            // 尝试使用不同的编码解码
            try {
              const base64Content = fileData.content.replace(/\s/g, '');
              const content = atob(base64Content);
              setEditorContent(content);
              setFileName(file.name);
              setActiveModal(null);
              addToRecentFiles(file);
              showStatus('文件加载成功（使用备用解码方式）', 'success');
            } catch (fallbackError) {
              console.error('Fallback decode failed:', fallbackError);
              showStatus('文件内容解码失败', 'error');
            }
          }
        } else {
          showStatus('文件内容为空', 'error');
        }
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.message || `HTTP错误: ${response.status} ${response.statusText}`;
          console.error('API error:', errorMessage);
          showStatus(`文件加载失败: ${errorMessage}`, 'error');
        } catch (jsonError) {
          console.error('Failed to parse error response:', jsonError);
          showStatus(`文件加载失败: ${response.status} ${response.statusText}`, 'error');
        }
      }
    } catch (error) {
      console.error('Failed to fetch file content:', error);
      let errorMessage = '网络错误';
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = '网络连接失败，请检查网络设置';
        } else if (error.message.includes('CORS')) {
          errorMessage = '跨域访问被拒绝，请检查GitHub Token权限';
        } else {
          errorMessage = error.message;
        }
      }
      showStatus(`文件加载失败: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
      // 重置标记
      isOpeningFile.current = false;
    }
  };

  // 保存文件到GitHub
  const saveToGitHub = async () => {
    if (!githubUser) {
      showStatus('请先登录GitHub', 'error');
      return;
    }
    if (!selectedRepo) {
      showStatus('请先选择仓库', 'error');
      return;
    }
    setActiveModal('commit');
  };

  // 提交文件到GitHub
  const commitFile = async () => {
    if (!commitMessage.trim()) {
      showStatus('请输入提交信息', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // 首先获取文件的当前SHA（如果存在）
      let sha = '';
      const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
      
      try {
        const getFileResponse = await fetch(
          `https://api.github.com/repos/${selectedRepo}/contents/${filePath}?ref=${selectedBranch}`,
          {
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        if (getFileResponse.ok) {
          const fileData = await getFileResponse.json();
          sha = fileData.sha;
        }
      } catch (e) {
        // 文件不存在，继续创建新文件
      }

      // 创建或更新文件
      const content = btoa(unescape(encodeURIComponent(editorContent)));
      const body: any = {
        message: commitMessage,
        content: content,
        branch: selectedBranch
      };
      
      if (sha) {
        body.sha = sha;
      }

      const response = await fetch(
        `https://api.github.com/repos/${selectedRepo}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );

      if (response.ok) {
        showStatus('文件已成功保存到GitHub！', 'success');
        setActiveModal(null);
        setCommitMessage('');
      } else {
        const error = await response.json();
        showStatus('保存失败: ' + (error.message || '未知错误'), 'error');
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      showStatus('保存失败，请检查网络连接', 'error');
    }
    setIsLoading(false);
  };

  // 手动输入Token
  const handleTokenInput = () => {
    const token = prompt('请输入您的GitHub Personal Access Token:');
    if (token) {
      localStorage.setItem('github_token', token);
      setGithubToken(token);
      fetchGitHubUser(token);
    }
  };





  // 处理内容变化，更新行号
  useEffect(() => {
    const lines = editorContent.split('\n').length;
    setLineNumbers(Array.from({ length: lines }, (_, i) => i + 1));
  }, [editorContent]);

  // 处理代码高亮
  useEffect(() => {
    if (viewMode !== 'edit') {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  }, [viewMode, editorContent, fileName]);



  // 同步滚动
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const lineNumbersElement = textarea.previousElementSibling as HTMLElement;
    if (lineNumbersElement) {
      lineNumbersElement.scrollTop = textarea.scrollTop;
    }
  };

  // 选择仓库
  const handleRepoSelect = (repoFullName: string) => {
    setSelectedRepo(repoFullName);
    const repo = repos.find(r => r.full_name === repoFullName);
    if (repo) {
      setSelectedBranch(repo.default_branch);
      setCurrentPath('');
      setFileHistory([]);
      fetchRepoFiles(repoFullName, '', repo.default_branch);
    }
  };

  // 返回上级目录
  const goBack = () => {
    if (!currentPath) return;
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    setCurrentPath(parentPath);
    removeFromFileHistory();
    fetchRepoFiles(selectedRepo, parentPath, selectedBranch);
  };



  // 添加到文件历史
  const addToFileHistory = (path: string) => {
    setFileHistory(prev => [...prev, path]);
  };

  // 从文件历史移除
  const removeFromFileHistory = () => {
    setFileHistory(prev => prev.slice(0, -1));
  };

  // 添加到最近文件
  const addToRecentFiles = (file: GitHubFile) => {
    setRecentFiles(prev => {
      const existingIndex = prev.findIndex(f => f.path === file.path);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated.splice(existingIndex, 1);
        return [file, ...updated].slice(0, 10);
      }
      return [file, ...prev].slice(0, 10);
    });
  };

  // 快速跳转到历史路径
  const navigateToHistory = (index: number) => {
    const path = fileHistory[index];
    setCurrentPath(path);
    setFileHistory(fileHistory.slice(0, index + 1));
    fetchRepoFiles(selectedRepo, path, selectedBranch);
  };

  return (
    <section className="editor-page">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          编辑器
        </motion.h2>

        {/* 状态消息 */}
        {statusMessage && (
          <motion.div 
            className={`status-message ${statusType}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {statusMessage}
          </motion.div>
        )}

        <div className="editor-container">
          {/* 操作指南 */}
          <div className="editor-guide">
            <div className="guide-section">
              <h4>📝 基本操作</h4>
              <ul>
                <li>在编辑器中输入内容</li>
                <li>选择文件格式</li>
                <li>保存到本地或GitHub</li>
              </ul>
            </div>
            <div className="guide-section">
              <h4>🌐 GitHub操作</h4>
              <ul>
                <li>登录GitHub账号</li>
                <li>选择仓库和文件</li>
                <li>编辑后提交更改</li>
              </ul>
            </div>
          </div>

          {/* 编辑器工具栏 */}
          <div className="editor-toolbar">
            <div className="toolbar-section">
              <input 
                type="text" 
                value={fileName} 
                onChange={(e) => {
                  setFileName(e.target.value);
                }}
                className="file-name"
                placeholder="文件名"
              />
            </div>

            {shouldShowViewControls && (
              <div className="toolbar-section">
                <div className="view-controls">
                  <button 
                    className={`btn view-btn ${viewMode === 'edit' ? 'active' : ''}`}
                    onClick={() => setViewMode('edit')}
                  >
                    编辑
                  </button>
                  <button 
                    className={`btn view-btn ${viewMode === 'preview' ? 'active' : ''}`}
                    onClick={() => setViewMode('preview')}
                  >
                    预览
                  </button>
                  <button 
                    className={`btn view-btn ${viewMode === 'split' ? 'active' : ''}`}
                    onClick={() => setViewMode('split')}
                  >
                    分屏
                  </button>
                </div>
              </div>
            )}

            <div className="toolbar-section">
              <input 
                type="file" 
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
                id="file-upload"
              />
              <label htmlFor="file-upload" className="btn">
                📁 上传
              </label>
              <button className="btn" onClick={saveFile}>
                💾 保存
              </button>
              {githubUser && (
                <button className="btn btn-primary" onClick={saveToGitHub}>
                  🚀 保存到GitHub
                </button>
              )}
            </div>

            <div className="toolbar-section">
              {githubUser ? (
                <div className="github-user-info">
                  <img src={githubUser.avatar_url} alt={githubUser.login} className="github-avatar" />
                  <span className="github-username">{githubUser.login}</span>
                  <button className="btn btn-github" onClick={() => {
                    setActiveModal('repo');
                    setModalView('repoList');
                  }}>
                    📚 仓库
                  </button>
                </div>
              ) : (
                <button className="btn btn-github" onClick={handleTokenInput}>
                  🔑 登录
                </button>
              )}
            </div>
          </div>

          {/* 编辑器内容区域 */}
          <div className="editor-content">
            {!isMarkdownFile(fileName) ? (
              /* 非md文件 - 强制使用编辑模式并显示实时语法高亮 */
              <div className="editor-with-line-numbers">
                <div className="line-numbers">
                  {lineNumbers.map(num => (
                    <div key={num} className="line-number">{num}</div>
                  ))}
                </div>
                <div className="code-editor-container">
                  <textarea 
                    ref={textareaRef}
                    className="editor-textarea"
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    onScroll={handleScroll}
                    placeholder={`请输入内容...`}
                  ></textarea>
                  <div className="syntax-highlight-overlay">
                    <pre className={`language-${getCodeLanguage(fileName)}`}>
                      <code>{editorContent}</code>
                    </pre>
                  </div>
                </div>
              </div>
            ) : viewMode === 'split' ? (
              /* md文件 - 分屏模式 */
              <div className="split-view">
                <div className="editor-with-line-numbers">
                  <div className="line-numbers">
                    {lineNumbers.map(num => (
                      <div key={num} className="line-number">{num}</div>
                    ))}
                  </div>
                  <textarea 
                    ref={textareaRef}
                    className="editor-textarea"
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    onScroll={handleScroll}
                    placeholder={`请输入内容...`}
                  ></textarea>
                </div>
                <div className="editor-preview">
                  <h4>预览</h4>
                  <div className="preview-content">
                    <div className="markdown-content">
                      <Suspense fallback={<div>加载中...</div>}>
                        <ReactMarkdown 
                          rehypePlugins={[rehypeHighlight]}
                        >
                          {editorContent}
                        </ReactMarkdown>
                      </Suspense>
                    </div>
                  </div>
                </div>
              </div>
            ) : viewMode === 'edit' ? (
              /* md文件 - 编辑模式 */
              <div className="editor-with-line-numbers">
                <div className="line-numbers">
                  {lineNumbers.map(num => (
                    <div key={num} className="line-number">{num}</div>
                  ))}
                </div>
                <textarea 
                  ref={textareaRef}
                  className="editor-textarea"
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  onScroll={handleScroll}
                  placeholder={`请输入内容...`}
                ></textarea>
              </div>
            ) : (
              /* md文件 - 预览模式 */
              <div className="editor-preview">
                <h4>预览</h4>
                <div className="preview-content">
                  <div className="markdown-content">
                    <Suspense fallback={<div>加载中...</div>}>
                      <ReactMarkdown 
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {editorContent}
                      </ReactMarkdown>
                    </Suspense>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 操作统计 */}
          <div className="editor-stats">
            <div className="stat-item">
              <span className="stat-label">字符数:</span>
              <span className="stat-value">{editorContent.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">行数:</span>
              <span className="stat-value">{lineNumbers.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">文件格式:</span>
              <span className="stat-value">{getFileExtension(fileName).toUpperCase()}</span>
            </div>
            {selectedRepo && (
              <div className="stat-item">
                <span className="stat-label">当前仓库:</span>
                <span className="stat-value">{selectedRepo}</span>
              </div>
            )}
            {currentPath && (
              <div className="stat-item">
                <span className="stat-label">当前路径:</span>
                <span className="stat-value">{currentPath}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 仓库管理弹窗 */}
      <AnimatePresence>
        {activeModal === 'repo' && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveModal(null)}
          >
            <motion.div 
              className="modal-content repo-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>GitHub 仓库管理</h3>
                <button className="close-btn" onClick={() => setActiveModal(null)}>×</button>
              </div>
              
              {/* 模态框导航 */}
              <div className="modal-nav">
                <button 
                  className={`nav-btn ${modalView === 'repoList' ? 'active' : ''}`}
                  onClick={() => setModalView('repoList')}
                >
                  仓库列表
                </button>
                <button 
                  className={`nav-btn ${modalView === 'fileBrowser' ? 'active' : ''}`}
                  onClick={() => setModalView('fileBrowser')}
                  disabled={!selectedRepo}
                >
                  文件浏览器
                </button>
              </div>
              
              <div className="repo-management">
                {/* 仓库列表视图 */}
                {modalView === 'repoList' && (
                  <div className="repo-list">
                    {isLoading ? (
                      <div className="loading">加载中...</div>
                    ) : repos.length === 0 ? (
                      <div className="empty-state">
                        <p>暂无仓库数据</p>
                        <p className="empty-hint">请确保您的GitHub Token有正确的权限</p>
                      </div>
                    ) : (
                      <AnimatePresence>
                        {repos.map((repo, index) => (
                          <motion.div 
                            key={repo.id} 
                            className={`repo-item ${selectedRepo === repo.full_name ? 'selected' : ''}`}
                            onClick={() => handleRepoSelect(repo.full_name)}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="repo-name">{repo.name}</div>
                            <div className="repo-description">{repo.description || '无描述'}</div>
                            <div className="repo-branch">默认分支: {repo.default_branch}</div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                )}
                
                {/* 文件浏览器视图 */}
                {modalView === 'fileBrowser' && (
                  <div className="file-browser">
                    {/* 路径导航 */}
                    <div className="file-browser-header">
                      <button className="btn btn-small" onClick={goBack} disabled={!currentPath}>
                        ← 返回
                      </button>
                      <div className="path-nav">
                        <span className="path-segment" onClick={() => {
                          setCurrentPath('');
                          setFileHistory([]);
                          fetchRepoFiles(selectedRepo, '', selectedBranch);
                        }}>
                          根目录
                        </span>
                        {fileHistory.map((path, index) => {
                          const pathSegments = path.split('/');
                          const segmentName = pathSegments[pathSegments.length - 1];
                          return (
                            <>
                              <span className="path-separator">/</span>
                              <span 
                                key={index} 
                                className="path-segment"
                                onClick={() => navigateToHistory(index)}
                              >
                                {segmentName}
                              </span>
                            </>
                          );
                        })}
                      </div>
                      <div className="branch-selector">
                        <select 
                          value={selectedBranch}
                          onChange={(e) => {
                            setSelectedBranch(e.target.value);
                            fetchRepoFiles(selectedRepo, currentPath, e.target.value);
                          }}
                          className="branch-select"
                        >
                          <option value="main">main</option>
                          <option value="master">master</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* 最近文件 */}
                    {recentFiles.length > 0 && (
                      <div className="recent-files-section">
                        <h4>最近编辑</h4>
                        <div className="recent-files-list">
                          <AnimatePresence>
                            {recentFiles.map((file, index) => (
                              <motion.div 
                                key={file.path} 
                                className="recent-file-item"
                                onClick={() => fetchFileContent(file)}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2, delay: index * 0.05, ease: "easeOut" }}
                                whileHover={{ scale: 1.02, x: 4 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <span className="file-icon">📄</span>
                                <span className="file-name-text">{file.name}</span>
                                <span className="file-path">{file.path}</span>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                    
                    {/* 文件列表 */}
                    <div className="file-list">
                      {isLoading ? (
                        <div className="loading">加载中...</div>
                      ) : files.length === 0 ? (
                        <div className="empty-state">
                          <p>当前目录为空</p>
                        </div>
                      ) : (
                        <AnimatePresence>
                          {files.map(file => (
                            <motion.div 
                              key={file.sha} 
                              className="file-item"
                              onClick={() => {
                                console.log('Opening file:', file.name);
                                fetchFileContent(file);
                              }}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.2, delay: Math.random() * 0.1, ease: "easeOut" }}
                              whileHover={{ scale: 1.02, x: 4 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <span className="file-icon">
                                {file.type === 'dir' ? '📁' : '📄'}
                              </span>
                              <span className="file-name-text">{file.name}</span>
                              {file.type === 'file' && (
                                <span className="file-size">{file.download_url ? '文件' : '未知'}</span>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  </div>
                )}
                

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 提交信息弹窗 */}
      <AnimatePresence>
        {activeModal === 'commit' && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveModal(null)}
          >
            <motion.div 
              className="modal-content commit-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>提交到GitHub</h3>
                <button className="close-btn" onClick={() => setActiveModal(null)}>×</button>
              </div>
              <div className="commit-form">
                <div className="form-group">
                  <label>仓库:</label>
                  <span className="form-value">{selectedRepo}</span>
                </div>
                <div className="form-group">
                  <label>分支:</label>
                  <span className="form-value">{selectedBranch}</span>
                </div>
                <div className="form-group">
                  <label>文件路径:</label>
                  <span className="form-value">{currentPath ? `${currentPath}/` : ''}{fileName}</span>
                </div>
                <div className="form-group">
                  <label>提交信息:</label>
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="例如: 更新文件内容"
                    className="commit-input"
                  />
                </div>
                <div className="form-actions">
                  <button className="btn" onClick={() => setActiveModal(null)}>取消</button>
                  <button className="btn btn-primary" onClick={commitFile} disabled={isLoading}>
                    {isLoading ? '提交中...' : '确认提交'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default EditorPage;
