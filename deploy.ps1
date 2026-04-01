# 构建项目
npm run build

# 复制404.html和.nojekyll文件到dist目录
Copy-Item -Path "404.html" -Destination "dist" -Force
Copy-Item -Path ".nojekyll" -Destination "dist" -Force

# 复制构建产物到根目录
Copy-Item -Path "dist\*" -Destination "." -Recurse -Force

# 添加所有文件到暂存区
git add .

# 提交更改
git commit -m "Deploy to GitHub Pages"

# 推送到main分支
git push origin main
