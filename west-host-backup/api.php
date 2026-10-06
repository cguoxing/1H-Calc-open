<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if (!defined('JSON_UNESCAPED_UNICODE')) {
    define('JSON_UNESCAPED_UNICODE', 0);
}
if (!defined('JSON_PRETTY_PRINT')) {
    define('JSON_PRETTY_PRINT', 0);
}

// ---- 可选配置的默认值 ----
if (!defined('YICALC_MAX_BYTES')) define('YICALC_MAX_BYTES', 2 * 1024 * 1024);
if (!defined('YICALC_MIN_INTERVAL_SEC')) define('YICALC_MIN_INTERVAL_SEC', 60);
if (!defined('YICALC_KEEP_PER_USER')) define('YICALC_KEEP_PER_USER', 20);
if (!defined('YICALC_MAX_TOTAL_BYTES')) define('YICALC_MAX_TOTAL_BYTES', 200 * 1024 * 1024);
if (!defined('YICALC_WX_AUTH_URL')) define('YICALC_WX_AUTH_URL', 'https://api.weixin.qq.com/sns/jscode2session');

function set_status_code($status) {
    if (function_exists('http_response_code')) {
        http_response_code($status);
        return;
    }
    $texts = array(
        200 => 'OK',
        400 => 'Bad Request',
        401 => 'Unauthorized',
        404 => 'Not Found',
        405 => 'Method Not Allowed',
        413 => 'Payload Too Large',
        429 => 'Too Many Requests',
        500 => 'Internal Server Error',
        502 => 'Bad Gateway',
        507 => 'Insufficient Storage'
    );
    $text = isset($texts[$status]) ? $texts[$status] : 'OK';
    header('HTTP/1.1 ' . $status . ' ' . $text);
}

function respond($payload, $status = 200) {
    set_status_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function get_header_value($name) {
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    return isset($_SERVER[$key]) ? $_SERVER[$key] : '';
}

// ---- 鉴权：wx.login code -> openid（code 一次性、5 分钟有效） ----
function http_get($url) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        $body = curl_exec($ch);
        curl_close($ch);
        return $body === false ? '' : $body;
    }
    $ctx = stream_context_create(array('http' => array('timeout' => 8)));
    $body = @file_get_contents($url, false, $ctx);
    return $body === false ? '' : $body;
}

function require_openid() {
    if (!defined('YICALC_WX_APPID') || !YICALC_WX_APPID || !defined('YICALC_WX_SECRET') || !YICALC_WX_SECRET) {
        respond(array('success' => false, 'error' => 'Server not configured'), 500);
    }
    $code = get_header_value('X-Yicalc-Code');
    if (!$code || !preg_match('/^[A-Za-z0-9_-]{8,128}$/', $code)) {
        respond(array('success' => false, 'error' => 'Unauthorized'), 401);
    }
    $url = YICALC_WX_AUTH_URL
        . '?appid=' . urlencode(YICALC_WX_APPID)
        . '&secret=' . urlencode(YICALC_WX_SECRET)
        . '&js_code=' . urlencode($code)
        . '&grant_type=authorization_code';
    $body = http_get($url);
    if (!$body) {
        respond(array('success' => false, 'error' => 'WeChat auth unavailable'), 502);
    }
    $res = json_decode($body, true);
    if (!is_array($res) || empty($res['openid'])) {
        respond(array('success' => false, 'error' => 'Unauthorized'), 401);
    }
    return (string)$res['openid'];
}

// 文件名只用 openid 的加盐哈希，不在磁盘文件名里暴露 openid
function user_key($openid) {
    $salt = defined('YICALC_OPENID_SALT') ? YICALC_OPENID_SALT : '';
    return 'wx_' . substr(hash('sha256', $salt . '|' . $openid), 0, 32);
}

// ---- 存储 ----
function ensure_backup_dir() {
    if (!is_dir(YICALC_BACKUP_DIR)) {
        if (!mkdir(YICALC_BACKUP_DIR, 0755, true)) {
            respond(array('success' => false, 'error' => 'Cannot create backup directory'), 500);
        }
    }
    if (!is_writable(YICALC_BACKUP_DIR)) {
        respond(array('success' => false, 'error' => 'Backup directory is not writable'), 500);
    }
    // 禁止通过 URL 直接下载备份文件
    $htaccess = YICALC_BACKUP_DIR . '/.htaccess';
    if (!is_file($htaccess)) {
        file_put_contents($htaccess, "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nOrder allow,deny\nDeny from all\n</IfModule>\n");
    }
    $index = YICALC_BACKUP_DIR . '/index.html';
    if (!is_file($index)) {
        file_put_contents($index, '');
    }
}

function read_json_body() {
    $length = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
    if ($length > YICALC_MAX_BYTES) {
        respond(array('success' => false, 'error' => 'Payload too large'), 413);
    }
    $raw = file_get_contents('php://input', false, null, 0, YICALC_MAX_BYTES + 1);
    if ($raw === false || $raw === '') {
        return null;
    }
    if (strlen($raw) > YICALC_MAX_BYTES) {
        respond(array('success' => false, 'error' => 'Payload too large'), 413);
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function total_backup_bytes() {
    $total = 0;
    foreach (glob(YICALC_BACKUP_DIR . '/*.json') as $file) {
        $total += (int)filesize($file);
    }
    return $total;
}

function prune_user_backups($key) {
    $files = glob(YICALC_BACKUP_DIR . '/backup_' . $key . '_*.json');
    if (!$files || count($files) <= YICALC_KEEP_PER_USER) return;
    sort($files); // 文件名含时间戳，按名称排序即按时间排序
    $remove = array_slice($files, 0, count($files) - YICALC_KEEP_PER_USER);
    foreach ($remove as $file) {
        @unlink($file);
    }
}

// ---- 审计 ----
function count_items($value) {
    return is_array($value) ? count($value) : 0;
}

function get_summary_number($data, $key, $fallback) {
    if (isset($data['summary']) && is_array($data['summary']) && isset($data['summary'][$key])) {
        return (int)$data['summary'][$key];
    }
    return (int)$fallback;
}

function get_profile_summary($data) {
    if (isset($data['profileSummary']) && is_array($data['profileSummary'])) {
        return $data['profileSummary'];
    }
    return array('name' => '', 'phone' => '', 'company' => '', 'openid' => '');
}

function append_audit_log($data, $deviceId, $fileName, $bytes) {
    $profile = get_profile_summary($data);
    $entry = array(
        'savedAt' => isset($data['savedAt']) ? $data['savedAt'] : gmdate('c'),
        'deviceId' => $deviceId,
        'deviceLabel' => isset($data['deviceLabel']) ? (string)$data['deviceLabel'] : '',
        'clientId' => isset($data['clientId']) ? (string)$data['clientId'] : '',
        'accountName' => isset($profile['name']) ? (string)$profile['name'] : '',
        'accountPhone' => isset($profile['phone']) ? (string)$profile['phone'] : '',
        'company' => isset($profile['company']) ? (string)$profile['company'] : '',
        'projectCount' => get_summary_number($data, 'projectCount', count_items(isset($data['projects']) ? $data['projects'] : array())),
        'historyCount' => get_summary_number($data, 'historyCount', count_items(isset($data['history']) ? $data['history'] : array())),
        'draftCount' => get_summary_number($data, 'draftCount', count_items(isset($data['drafts']) ? $data['drafts'] : array())),
        'usageCount' => get_summary_number($data, 'usageCount', 0),
        'fingerprint' => isset($data['fingerprint']) ? (string)$data['fingerprint'] : '',
        'file' => $fileName,
        'bytes' => (int)$bytes,
        'ip' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : ''
    );
    $line = json_encode($entry, JSON_UNESCAPED_UNICODE);
    if ($line !== false) {
        file_put_contents(YICALC_BACKUP_DIR . '/audit.ndjson', $line . "\n", FILE_APPEND | LOCK_EX);
    }
}

// ---- 路由 ----
$action = isset($_GET['action']) ? $_GET['action'] : 'health';

if ($action === 'health') {
    respond(array(
        'success' => true,
        'service' => 'yicalc-backup',
        'storage' => 'json-file',
        'time' => gmdate('c')
    ));
}

if ($action === 'backup') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(array('success' => false, 'error' => 'Method not allowed'), 405);
    }
    ensure_backup_dir();

    // 先校验请求体大小，再调用微信接口，避免无效请求消耗 code2session 额度
    $data = read_json_body();
    if (!$data) {
        respond(array('success' => false, 'error' => 'Empty request body'), 400);
    }

    $openid = require_openid();
    $deviceId = user_key($openid);
    $latest = YICALC_BACKUP_DIR . '/latest_' . $deviceId . '.json';

    // 限流：同一用户最短间隔
    if (is_file($latest) && (time() - filemtime($latest)) < YICALC_MIN_INTERVAL_SEC) {
        respond(array('success' => false, 'error' => 'Too many requests'), 429);
    }
    // 总容量上限，防止写满虚拟主机
    if (total_backup_bytes() > YICALC_MAX_TOTAL_BYTES) {
        respond(array('success' => false, 'error' => 'Backup storage full'), 507);
    }

    // 服务端决定身份，不信任客户端传来的 deviceId / openid
    $data['deviceId'] = $deviceId;
    if (isset($data['profile']) && is_array($data['profile'])) {
        $data['profile']['openid'] = $openid;
    }
    // 内容哈希由服务端计算（不信任客户端指纹），只覆盖业务数据，不含时间戳
    $contentHash = hash('sha256', json_encode(array(
        isset($data['profile']) ? $data['profile'] : null,
        isset($data['projects']) ? $data['projects'] : null,
        isset($data['history']) ? $data['history'] : null,
        isset($data['drafts']) ? $data['drafts'] : null,
        isset($data['settings']) ? $data['settings'] : null
    ), JSON_UNESCAPED_UNICODE));

    // 内容与最新备份相同：不新建历史文件，只刷新 latest 的时间（心跳）
    if (is_file($latest)) {
        $prev = json_decode((string)file_get_contents($latest), true);
        if (is_array($prev) && isset($prev['contentHash']) && $prev['contentHash'] === $contentHash) {
            touch($latest);
            respond(array(
                'success' => true,
                'unchanged' => true,
                'savedAt' => isset($prev['savedAt']) ? $prev['savedAt'] : ''
            ));
        }
    }

    $data['contentHash'] = $contentHash;
    $data['savedAt'] = gmdate('c');
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        respond(array('success' => false, 'error' => 'Cannot encode JSON'), 500);
    }

    $stamp = gmdate('Ymd_His');
    $file = YICALC_BACKUP_DIR . '/backup_' . $deviceId . '_' . $stamp . '.json';

    if (file_put_contents($file, $json, LOCK_EX) === false) {
        respond(array('success' => false, 'error' => 'Cannot write backup file'), 500);
    }
    if (file_put_contents($latest, $json, LOCK_EX) === false) {
        respond(array('success' => false, 'error' => 'Cannot write latest file'), 500);
    }
    append_audit_log($data, $deviceId, basename($file), strlen($json));
    prune_user_backups($deviceId);

    respond(array(
        'success' => true,
        'file' => basename($file),
        'bytes' => strlen($json),
        'savedAt' => $data['savedAt']
    ));
}

if ($action === 'latest') {
    // 只能取回自己的备份：身份来自 wx.login code，而不是请求参数
    $openid = require_openid();
    $deviceId = user_key($openid);
    $latest = YICALC_BACKUP_DIR . '/latest_' . $deviceId . '.json';
    if (!is_file($latest)) {
        respond(array('success' => false, 'error' => 'No backup found'), 404);
    }

    $json = file_get_contents($latest);
    if ($json === false) {
        respond(array('success' => false, 'error' => 'Cannot read backup'), 500);
    }

    $data = json_decode($json, true);
    if (!is_array($data)) {
        respond(array('success' => false, 'error' => 'Backup file is invalid'), 500);
    }

    respond(array('success' => true, 'backup' => $data));
}

if ($action === 'delete') {
    // 用户行使删除权：删除自己的全部备份及审计记录
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(array('success' => false, 'error' => 'Method not allowed'), 405);
    }
    $openid = require_openid();
    $deviceId = user_key($openid);
    $removed = 0;
    if (is_dir(YICALC_BACKUP_DIR)) {
        $files = glob(YICALC_BACKUP_DIR . '/backup_' . $deviceId . '_*.json');
        $files[] = YICALC_BACKUP_DIR . '/latest_' . $deviceId . '.json';
        foreach ($files as $file) {
            if (is_file($file) && @unlink($file)) {
                $removed++;
            }
        }
        $auditFile = YICALC_BACKUP_DIR . '/audit.ndjson';
        if (is_file($auditFile)) {
            $kept = array();
            foreach (file($auditFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                $entry = json_decode($line, true);
                if (is_array($entry) && isset($entry['deviceId']) && $entry['deviceId'] === $deviceId) {
                    continue;
                }
                $kept[] = $line;
            }
            file_put_contents($auditFile, $kept ? implode("\n", $kept) . "\n" : '', LOCK_EX);
        }
    }
    respond(array('success' => true, 'removed' => $removed));
}

respond(array('success' => false, 'error' => 'Unknown action'), 404);
