// GitHub OAuth配置
export const GITHUB_CONFIG = {
  clientId: 'Iv23liOPbpgDL5IKqgiw',
  clientSecret: '325a0b9990528eb38960b1716a62509a0a9cc18d',
  redirectUri: 'http://localhost:5177/auth/github/callback',
  scope: 'user:email'
};

// GitHub API endpoints
export const GITHUB_API = {
  authorize: 'https://github.com/login/oauth/authorize',
  token: 'https://github.com/login/oauth/access_token',
  user: 'https://api.github.com/user'
};
