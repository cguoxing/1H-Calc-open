<?php
// 上传后将本文件改名为 config.php，并填写下面的值。
// config.php 只放在服务器上，不要提交到 git。

// 小程序 AppID 与 AppSecret（微信公众平台 → 开发管理 → 开发设置）。
// 服务端用它们把 wx.login 的 code 换成 openid，AppSecret 绝不能出现在小程序代码里。
define('YICALC_WX_APPID', 'wx_your_appid_here');
define('YICALC_WX_SECRET', 'REPLACE_WITH_APPSECRET');

// 文件名哈希用的随机盐，部署时生成一次后不要再改（改了会导致已有备份对不上用户）：
//   php -r "echo bin2hex(random_bytes(16));"
define('YICALC_OPENID_SALT', 'REPLACE_WITH_RANDOM_HEX');

// 监控页密码的 SHA-256 哈希。生成方法：
//   node -e "console.log(require('crypto').createHash('sha256').update('你的监控密码').digest('hex'))"
define('YICALC_MONITOR_PASSWORD_HASH', 'REPLACE_WITH_SHA256_OF_YOUR_PASSWORD');

// 备份文件目录。api.php 会在目录内自动生成 .htaccess 禁止直接访问。
// 更安全的做法：指向网站根目录（wwwroot）之外的目录。
define('YICALC_BACKUP_DIR', __DIR__ . '/data');

// 单次请求体上限：2 MB
define('YICALC_MAX_BYTES', 2 * 1024 * 1024);
// 同一用户两次备份的最短间隔（秒）
define('YICALC_MIN_INTERVAL_SEC', 60);
// 每个用户保留的历史备份份数
define('YICALC_KEEP_PER_USER', 20);
// 全部备份的总容量上限：200 MB
define('YICALC_MAX_TOTAL_BYTES', 200 * 1024 * 1024);
