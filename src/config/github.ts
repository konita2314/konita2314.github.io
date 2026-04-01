// GitHub OAuth配置
export const GITHUB_CONFIG = {
  clientId: 'YOUR_GITHUB_CLIENT_ID',
  clientSecret: 'YOUR_GITHUB_CLIENT_SECRET',
  redirectUri: 'http://localhost:5177/auth/github/callback',
  scope: 'user:email'
};

// GitHub API endpoints
export const GITHUB_API = {
  authorize: 'https://github.com/login/oauth/authorize',
  token: 'https://github.com/login/oauth/access_token',
  user: 'https://api.github.com/user'
};
