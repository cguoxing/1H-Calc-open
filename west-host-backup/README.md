# 易计算西部数码虚拟主机备份接口

这套文件用于把易计算的小数据无感备份到西部数码 Linux + PHP 虚拟主机。默认使用 JSON 文件保存，不依赖 CloudBase，也不强制使用 MySQL，并提供一个独立密码保护的监控页。

## 适合场景

- 易计算数据量很小，不值得长期支付 CloudBase 月费。
- 主数据仍在小程序本地缓存。
- 虚拟主机做无感备份、恢复、迁移兜底和备份统计监控。

## 部署步骤

1. 在虚拟主机 `/wwwroot/` 下新建目录：`yicalc-backup`
2. 上传本目录内的 `api.php`、`monitor.php`、`config.sample.php`
3. 将 `config.sample.php` 改名为 `config.php`
4. 在 `config.php` 填写 `YICALC_WX_APPID`、`YICALC_WX_SECRET`（小程序 AppSecret），并生成一次 `YICALC_OPENID_SALT`
5. 设置 `YICALC_MONITOR_PASSWORD_HASH`（见下文），不要使用弱密码
6. 确保虚拟主机已部署 SSL，小程序正式版只能请求 HTTPS 域名
7. 在微信公众平台把接口域名加入 `request 合法域名`
8. 浏览器访问：

```text
https://你的域名/yicalc-backup/api.php?action=health
```

看到 `{"success":true,...}` 表示接口可用。

## 生成监控密码哈希

`monitor.php` 使用独立监控密码。用本机 Node.js 生成 SHA-256 哈希：

```bash
node -e "console.log(require('crypto').createHash('sha256').update('你的监控密码').digest('hex'))"
```

将输出写入 `config.php`：

```php
define('YICALC_MONITOR_PASSWORD_HASH', '上一步输出的哈希');
```

访问监控页：

```text
https://你的域名/yicalc-backup/monitor.php
```

## 小程序配置

部署成功后，修改小程序文件：

```text
miniprogram/utils/server-backup-config.js
```

示例：

```js
module.exports = {
  enabled: true,
  apiUrl: 'https://你的域名/yicalc-backup/api.php?action=backup',
  deviceId: 'harry-main',
  heartbeatMs: 24 * 60 * 60 * 1000
};
```

小程序端不再保存任何密钥。每次备份前调用 `wx.login` 取得一次性 code，服务端用 AppSecret 换取 openid，并按 openid 的加盐哈希存档。

只有已注册且勾选同意隐私政策的用户才会备份（本地账户含 `privacyAgreedAt` 或 `registeredAt`）。配置后，小程序启动、再次回到前台、以及运行期间每 10 分钟都会在本机静默检查：只有未备份过或数据有变化时才上传；数据没变时，每 `heartbeatMs`（默认 24 小时）发一次心跳。服务端收到与最新备份内容相同的数据时，不新建历史文件，只刷新 `latest` 的时间，返回 `"unchanged": true`。因此保留的历史备份每份内容都不同。自动备份不弹窗、不 toast、不阻断页面；设置页仍可点“备份到服务器”立即强制备份。

## 接口说明

### 健康检查

```text
GET /yicalc-backup/api.php?action=health
```

### 写入备份

```text
POST /yicalc-backup/api.php?action=backup
Header: X-Yicalc-Code: wx.login 返回的 code
Content-Type: application/json
```

请求体示例：

服务端会忽略请求体中的 `deviceId`，以 openid 决定存档身份。同一用户 60 秒内只能写一次（429），单次请求体最大 2 MB（413），总容量超过上限返回 507，每个用户只保留最近 20 份历史。

```json
{
  "profile": { "name": "张三" },
  "projects": [],
  "history": [],
  "exportedAt": "2026-07-07T12:00:00.000Z"
}
```

### 读取最近备份

```text
GET /yicalc-backup/api.php?action=latest
Header: X-Yicalc-Code: wx.login 返回的 code
```

只能读取当前微信用户自己的最近一份备份。

### 删除自己的备份（用户注销）

```text
POST /yicalc-backup/api.php?action=delete
Header: X-Yicalc-Code: wx.login 返回的 code
```

删除当前微信用户的全部历史备份、最新备份和审计记录，不影响其他用户。小程序入口：「账户设置 → 注销并删除云端备份」。

### 监控页面

```text
GET /yicalc-backup/monitor.php
```

监控页面会读取 `data/audit.ndjson` 和 `data/*.json`，可识别当前小程序备份 JSON，也会尽量识别旧云端导出的 JSON 文件，包括微信云数据库常见的逐行 JSON/JSON Lines 导出。页面展示总备份数、设备/客户端数、账户摘要数、最近备份、近 14 日趋势、各设备最新数据规模、最新备份项目列表和损坏 JSON 文件提示。项目列表会列出项目名称、地区、总投资、阶段数、子项数、取费合计、更新时间和来源。

监控页可以在“最新备份用户列表”和“最新备份项目列表”中单条或批量删除 JSON 内部的测试用户/测试项目，用于清理误录入内容。云数据库 JSON Lines 会删除对应用户行；本地标准备份会清空该 JSON 内的用户资料、项目、历史和草稿，但不删除 JSON 文件本身。删除会改写对应 JSON 文件内容，并同步移除 `audit.ndjson` 中该文件的旧审计记录，页面会重新从 JSON 内容生成统计。“备份文件管理”只展示文件状态，不删除整个 JSON 文件。

## 安全提醒

- `config.php` 含 AppSecret，只放服务器，不进 git；AppSecret 泄露时到公众平台重置。
- `api.php` 会在 `data/` 内生成 `.htaccess` 禁止直接下载备份。更稳妥的做法是把 `YICALC_BACKUP_DIR` 指到网站根目录之外。部署后用浏览器访问 `https://你的域名/yicalc-backup/data/audit.ndjson`，应返回 403。
- 真实备份数据和数据库导出不要放进代码仓库（`west-host-backup/data/` 已加入 `.gitignore`）。
