import React, { useEffect } from 'react';
import { GITHUB_CONFIG, GITHUB_API } from '../../config/github';

interface GitHubAuthProps {
  onLogin: (user: any) => void;
  onError: (error: string) => void;
}

const GitHubAuth: React.FC<GitHubAuthProps> = ({ onLogin, onError }) => {
  // 生成随机状态值，用于防止CSRF攻击
  const generateState = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // 处理GitHub登录
  const handleGitHubLogin = () => {
    const state = generateState();
    localStorage.setItem('github_oauth_state', state);
    
    const authUrl = `${GITHUB_API.authorize}?client_id=${GITHUB_CONFIG.clientId}&redirect_uri=${GITHUB_CONFIG.redirectUri}&scope=${GITHUB_CONFIG.scope}&state=${state}`;
    window.location.href = authUrl;
  };

  // 处理回调
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('github_oauth_state');

    if (code && state && state === storedState) {
      // 清除存储的状态
      localStorage.removeItem('github_oauth_state');
      
      // 这里应该发送请求到后端获取token
      // 由于是前端演示，我们模拟这个过程
      simulateGitHubLogin(code).then(user => {
        onLogin(user);
        // 清除URL中的参数
        window.history.replaceState({}, document.title, window.location.pathname);
      }).catch(error => {
        onError(error.message);
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    }
  }, [onLogin, onError]);

  // 模拟GitHub登录过程
  const simulateGitHubLogin = async (_code: string) => {
    // 实际项目中，这里应该调用后端API获取token
    // 然后使用token获取用户信息
    
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 模拟用户数据
    return {
      id: 123456,
      name: 'Konita',
      login: 'konita2314',
      avatar_url: 'https://github.com/konita2314.png',
      email: 'konita@example.com'
    };
  };

  return (
    <button 
      className="btn btn-primary"
      onClick={handleGitHubLogin}
    >
      使用GitHub登录
    </button>
  );
};

export default GitHubAuth;
