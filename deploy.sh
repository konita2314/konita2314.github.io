#!/bin/bash

# 构建项目
npm run build

# 复制构建产物到根目录
cp -r dist/* .

# 复制404.html和.nojekyll文件
cp dist/404.html .
cp dist/.nojekyll .

# 添加所有文件到暂存区
git add .

# 提交更改
git commit -m "Deploy to GitHub Pages"

# 推送到main分支
git push origin main
