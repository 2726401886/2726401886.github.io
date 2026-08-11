# 效率盒子 · 在线工具箱

免费静态在线工具箱，31 个工具 + 知命八字馆 + 开发者解锁码生成器。纯静态站点，零后端。

## 目录结构
```
index.html                  首页
css/ style.js               共享样式/脚本
js/main.js                  工具列表配置
tools/                      各工具页（31 个）
bazi-pro/                   知命八字馆（首页 + 详批 + 学堂）
images/                     二维码等图片
sitemap.xml / robots.txt    SEO
effbox2026.txt              IndexNow 验证密钥文件
```

## 发布到 GitHub Pages（零代码改动）
本仓库所有资源均使用相对路径，GitHub Pages 用户页（根目录托管）与原 Surge 行为一致，**无需修改任何路径**。

### 方式一：GitHub 用户页（推荐，地址最干净）
1. 在 GitHub 新建仓库，仓库名**必须**为 `<你的用户名>.github.io`（例如用户名是 `zhangsan`，仓库就叫 `zhangsan.github.io`）。
2. 把本仓库全部内容推送到该仓库的 `main` 分支。
3. 仓库 Settings → Pages → Source 选 `main` 分支 / `(root)` → Save。
4. 等待 1~2 分钟，访问 `https://<你的用户名>.github.io/` 即可。

### 方式二：GitHub 项目页（任意仓库名）
仓库名可任意（如 `effbox`）。发布后地址为 `https://<用户名>.github.io/<仓库名>/`。
由于全站使用相对路径，本项目在子路径下同样正常。

## 上线后必做：替换域名
搜索并替换所有 `toolshe.cn` 为新地址（sitemap.xml、robots.txt、index.html 的 og:url 等）：
```
node ../migrate-domain.js <你的新域名>
# 例如：node ../migrate-domain.js zhangsan.github.io
# 或项目页：node ../migrate-domain.js zhangsan.github.io/effbox
```
改完重新提交推送，然后运行 `node ../submit-seo.js` 重新提交搜索引擎收录。

## 本地预览
直接用浏览器打开 `index.html` 即可（部分浏览器对本地 file:// 限制 crypto 接口，开发者生成器页面需经 http 访问）。
