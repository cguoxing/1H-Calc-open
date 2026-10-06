<?php
require_once __DIR__ . '/config.php';

session_start();

header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function h($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function safe_hash_equals($known, $user) {
    if (function_exists('hash_equals')) {
        return hash_equals($known, $user);
    }
    if (!is_string($known) || !is_string($user) || strlen($known) !== strlen($user)) {
        return false;
    }
    $result = 0;
    for ($i = 0; $i < strlen($known); $i++) {
        $result |= ord($known[$i]) ^ ord($user[$i]);
    }
    return $result === 0;
}

function verify_monitor_password($password) {
    if (!defined('YICALC_MONITOR_PASSWORD_HASH') || !YICALC_MONITOR_PASSWORD_HASH) {
        return false;
    }
    return safe_hash_equals(YICALC_MONITOR_PASSWORD_HASH, hash('sha256', (string)$password));
}

function render_login($error) {
    echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
    echo '<title>易计算备份监控</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f7fb;margin:0;color:#172033}.login{max-width:360px;margin:12vh auto;background:#fff;padding:24px;border-radius:10px;box-shadow:0 8px 30px rgba(20,35,60,.08)}input,button{box-sizing:border-box;width:100%;height:42px;border-radius:8px;border:1px solid #d8dee9;padding:0 12px;font-size:15px}button{margin-top:12px;background:#102744;color:#fff;border:0}.err{color:#b42318;margin:0 0 12px}</style></head><body>';
    echo '<form class="login" method="post"><h2>易计算备份监控</h2>';
    if ($error) echo '<p class="err">' . h($error) . '</p>';
    echo '<input type="password" name="password" placeholder="监控密码" autofocus><button type="submit">进入监控</button></form></body></html>';
    exit;
}

if (isset($_GET['logout'])) {
    $_SESSION['yicalc_monitor_ok'] = false;
    render_login('');
}
if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($_SESSION['yicalc_monitor_ok'])) {
    if (verify_monitor_password(isset($_POST['password']) ? $_POST['password'] : '')) {
        $_SESSION['yicalc_monitor_ok'] = true;
    } else {
        render_login('密码不正确');
    }
}
if (empty($_SESSION['yicalc_monitor_ok'])) {
    render_login('');
}

$backupDir = defined('YICALC_BACKUP_DIR') ? YICALC_BACKUP_DIR : (__DIR__ . '/data');
if (empty($_SESSION['yicalc_monitor_csrf'])) {
    $_SESSION['yicalc_monitor_csrf'] = function_exists('random_bytes')
        ? bin2hex(random_bytes(16))
        : sha1(uniqid('', true));
}
$csrfToken = $_SESSION['yicalc_monitor_csrf'];

function read_json_file($file) {
    $text = @file_get_contents($file);
    if ($text === false) return null;
    $data = json_decode($text, true);
    if (is_array($data)) return $data;

    $rows = array();
    $lines = preg_split('/\r\n|\r|\n/', trim($text));
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '') continue;
        if (substr($line, -1) === ',') $line = rtrim($line, ',');
        $row = json_decode($line, true);
        if (!is_array($row)) return null;
        $rows[] = $row;
    }
    return $rows ? $rows : null;
}

function read_json_document($file) {
    $text = @file_get_contents($file);
    if ($text === false) return null;
    $data = json_decode($text, true);
    if (is_array($data)) {
        return array('type' => 'json', 'data' => $data);
    }

    $rows = array();
    $lines = preg_split('/\r\n|\r|\n/', trim($text));
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '') continue;
        if (substr($line, -1) === ',') $line = rtrim($line, ',');
        $row = json_decode($line, true);
        if (!is_array($row)) return null;
        $rows[] = $row;
    }
    return $rows ? array('type' => 'jsonl', 'data' => $rows) : null;
}

function is_list_array($value) {
    if (!is_array($value)) return false;
    $i = 0;
    foreach ($value as $key => $_) {
        if ($key !== $i) return false;
        $i++;
    }
    return true;
}

function write_json_document($file, $document) {
    if (!$document || !isset($document['type']) || !isset($document['data'])) return false;
    if ($document['type'] === 'jsonl') {
        $lines = array();
        foreach ($document['data'] as $row) {
            $line = json_encode($row, JSON_UNESCAPED_UNICODE);
            if ($line === false) return false;
            $lines[] = $line;
        }
        return file_put_contents($file, implode("\n", $lines) . ($lines ? "\n" : ''), LOCK_EX) !== false;
    }
    $json = json_encode($document['data'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) return false;
    return file_put_contents($file, $json . "\n", LOCK_EX) !== false;
}

function first_array_value($data, $keys) {
    foreach ($keys as $key) {
        if (isset($data[$key]) && is_array($data[$key])) return $data[$key];
    }
    return array();
}

function looks_like_project($value) {
    return is_array($value) && (isset($value['stages']) || isset($value['totalInvestment']) || isset($value['location']));
}

function looks_like_history_record($value) {
    return is_array($value) && (isset($value['calcDetail']) || isset($value['stageName']) || isset($value['amount']));
}

function user_label($row) {
    if (!is_array($row)) return '';
    $name = isset($row['name']) ? (string)$row['name'] : '';
    $phone = isset($row['phone']) ? (string)$row['phone'] : '';
    $company = isset($row['company']) ? (string)$row['company'] : '';
    $text = trim($name . ' ' . $phone);
    if ($company) $text = trim($text . ' ' . $company);
    return $text;
}

function collect_cloud_export_users($rows) {
    $users = array();
    if (!is_array($rows)) return $users;
    foreach ($rows as $rowIndex => $row) {
        if (!is_array($row)) continue;
        if (isset($row['name']) || isset($row['phone']) || isset($row['_openid']) || isset($row['projects'])) {
            $users[] = array(
                'rowIndex' => $rowIndex,
                'userPath' => 'row',
                'name' => isset($row['name']) ? (string)$row['name'] : '',
                'phone' => isset($row['phone']) ? (string)$row['phone'] : '',
                'company' => isset($row['company']) ? (string)$row['company'] : '',
                'openid' => isset($row['_openid']) ? (string)$row['_openid'] : '',
                'projectCount' => isset($row['projects']) && is_array($row['projects']) ? count($row['projects']) : 0,
                'updatedAt' => isset($row['updatedAt']['$date']) ? $row['updatedAt']['$date'] : (isset($row['updatedAt']) ? (string)$row['updatedAt'] : '')
            );
        }
    }
    return $users;
}

function merge_cloud_export_projects($rows) {
    $projects = array();
    if (!is_array($rows)) return $projects;
    foreach ($rows as $rowIndex => $row) {
        if (!is_array($row)) continue;
        $owner = user_label($row);
        $ownerOpenid = isset($row['_openid']) ? (string)$row['_openid'] : '';
        if (looks_like_project($row)) {
            $project = $row;
            if ($owner) $project['__owner'] = $owner;
            if ($ownerOpenid) $project['__ownerOpenid'] = $ownerOpenid;
            $project['__rowIndex'] = $rowIndex;
            $project['__projectIndex'] = $rowIndex;
            $project['__projectPath'] = 'row';
            $projects[] = $project;
        }
        if (isset($row['projects']) && is_array($row['projects'])) {
            foreach ($row['projects'] as $projectIndex => $project) {
                if (is_array($project)) {
                    if ($owner) $project['__owner'] = $owner;
                    if ($ownerOpenid) $project['__ownerOpenid'] = $ownerOpenid;
                    $project['__rowIndex'] = $rowIndex;
                    $project['__projectIndex'] = $projectIndex;
                    $project['__projectPath'] = 'row.projects';
                    $projects[] = $project;
                }
            }
        }
        if (isset($row['yicalc_projects']) && is_array($row['yicalc_projects'])) {
            foreach ($row['yicalc_projects'] as $projectIndex => $project) {
                if (is_array($project)) {
                    if ($owner) $project['__owner'] = $owner;
                    if ($ownerOpenid) $project['__ownerOpenid'] = $ownerOpenid;
                    $project['__rowIndex'] = $rowIndex;
                    $project['__projectIndex'] = $projectIndex;
                    $project['__projectPath'] = 'row.yicalc_projects';
                    $projects[] = $project;
                }
            }
        }
    }
    return $projects;
}

function merge_cloud_export_history($rows) {
    $history = array();
    if (!is_array($rows)) return $history;
    foreach ($rows as $row) {
        if (!is_array($row)) continue;
        if (looks_like_history_record($row)) {
            $history[] = $row;
        }
        if (isset($row['history']) && is_array($row['history'])) {
            foreach ($row['history'] as $record) {
                if (is_array($record)) $history[] = $record;
            }
        }
        if (isset($row['yicalc_history']) && is_array($row['yicalc_history'])) {
            foreach ($row['yicalc_history'] as $record) {
                if (is_array($record)) $history[] = $record;
            }
        }
    }
    return $history;
}

function normalize_backup_data($data, $fileName) {
    if (!is_array($data)) return null;

    $raw = isset($data['raw']) && is_array($data['raw']) ? $data['raw'] : array();
    $projectPath = 'projects';
    $projects = first_array_value($data, array('projects', 'yicalc_projects'));
    if (!$projects && isset($data['yicalc_projects']) && is_array($data['yicalc_projects'])) $projectPath = 'yicalc_projects';
    if (!$projects && $raw) {
        if (isset($raw['yicalc_projects']) && is_array($raw['yicalc_projects'])) {
            $projects = $raw['yicalc_projects'];
            $projectPath = 'raw.yicalc_projects';
        } elseif (isset($raw['projects']) && is_array($raw['projects'])) {
            $projects = $raw['projects'];
            $projectPath = 'raw.projects';
        }
    }
    if (!$projects && isset($data['data']) && is_array($data['data'])) {
        if (isset($data['data']['projects']) && is_array($data['data']['projects'])) {
            $projects = $data['data']['projects'];
            $projectPath = 'data.projects';
        } elseif (isset($data['data']['yicalc_projects']) && is_array($data['data']['yicalc_projects'])) {
            $projects = $data['data']['yicalc_projects'];
            $projectPath = 'data.yicalc_projects';
        }
    }
    if (!$projects && isset($data[0]) && looks_like_project($data[0])) {
        $projects = $data;
        $projectPath = 'list.projects';
    }
    if (!$projects && isset($data[0]) && is_array($data[0])) {
        $projects = merge_cloud_export_projects($data);
        $projectPath = 'cloud.rows';
    }
    if ($projects && is_array($projects) && $projectPath !== 'cloud.rows') {
        foreach ($projects as $projectIndex => $project) {
            if (is_array($project)) {
                $projects[$projectIndex]['__projectIndex'] = $projectIndex;
                $projects[$projectIndex]['__projectPath'] = $projectPath;
            }
        }
    }

    $history = first_array_value($data, array('history', 'yicalc_history', 'records', 'calc_history'));
    if (!$history && $raw) $history = first_array_value($raw, array('yicalc_history', 'history', 'records', 'calc_history'));
    if (!$history && isset($data['data']) && is_array($data['data'])) {
        $history = first_array_value($data['data'], array('history', 'yicalc_history', 'records', 'calc_history'));
    }
    if (!$history && isset($data[0]) && is_array($data[0])) {
        $history = merge_cloud_export_history($data);
    }

    $drafts = array();
    if (isset($data['drafts']) && is_array($data['drafts'])) $drafts = $data['drafts'];
    elseif (isset($data['yicalc_calc_drafts']) && is_array($data['yicalc_calc_drafts'])) $drafts = $data['yicalc_calc_drafts'];
    elseif ($raw && isset($raw['yicalc_calc_drafts']) && is_array($raw['yicalc_calc_drafts'])) $drafts = $raw['yicalc_calc_drafts'];

    $profile = array();
    if (isset($data['profileSummary']) && is_array($data['profileSummary'])) $profile = $data['profileSummary'];
    elseif (isset($data['profile']) && is_array($data['profile'])) $profile = $data['profile'];
    elseif ($raw && isset($raw['yicalc_cloud_account']) && is_array($raw['yicalc_cloud_account'])) $profile = $raw['yicalc_cloud_account'];
    elseif ($raw && isset($raw['yicalc_user_profile']) && is_array($raw['yicalc_user_profile'])) $profile = $raw['yicalc_user_profile'];
    elseif (isset($data[0]) && is_array($data[0])) {
        foreach ($data as $row) {
            if (is_array($row) && (isset($row['name']) || isset($row['phone']) || isset($row['company']))) {
                $profile = $row;
                break;
            }
        }
    }
    $users = isset($data[0]) && is_array($data[0]) ? collect_cloud_export_users($data) : array();
    if (!$users && $profile) {
        $users[] = array(
            'rowIndex' => -1,
            'userPath' => 'root.profile',
            'name' => isset($profile['name']) ? (string)$profile['name'] : '',
            'phone' => isset($profile['phone']) ? (string)$profile['phone'] : '',
            'company' => isset($profile['company']) ? (string)$profile['company'] : '',
            'openid' => isset($profile['openid']) ? (string)$profile['openid'] : (isset($profile['_openid']) ? (string)$profile['_openid'] : ''),
            'projectCount' => count_items($projects),
            'updatedAt' => isset($data['updatedAt']) ? (is_array($data['updatedAt']) && isset($data['updatedAt']['$date']) ? $data['updatedAt']['$date'] : (string)$data['updatedAt']) : ''
        );
    }

    $deviceId = isset($data['deviceId']) ? (string)$data['deviceId'] : '';
    if (!$deviceId && isset($data['_openid'])) $deviceId = 'cloud_' . substr(preg_replace('/[^a-zA-Z0-9_-]/', '_', (string)$data['_openid']), 0, 48);
    if (!$deviceId) $deviceId = 'legacy_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($fileName, PATHINFO_FILENAME));

    return array(
        'savedAt' => isset($data['savedAt']) ? $data['savedAt'] : (isset($data['exportedAt']) ? $data['exportedAt'] : (isset($data['updatedAt']) ? $data['updatedAt'] : '')),
        'deviceId' => $deviceId,
        'deviceLabel' => isset($data['deviceLabel']) ? (string)$data['deviceLabel'] : 'legacy-json',
        'clientId' => isset($data['clientId']) ? (string)$data['clientId'] : '',
        'profile' => $profile,
        'users' => $users,
        'projects' => is_array($projects) ? $projects : array(),
        'history' => is_array($history) ? $history : array(),
        'drafts' => is_array($drafts) ? $drafts : array(),
        'fingerprint' => isset($data['fingerprint']) ? (string)$data['fingerprint'] : '',
        'sourceType' => isset($data['app']) && $data['app'] === 'yicalc' ? 'backup' : 'legacy-json'
    );
}

function backup_file_path($fileName) {
    $name = basename((string)$fileName);
    if ($name === '') return '';
    $path = (defined('YICALC_BACKUP_DIR') ? YICALC_BACKUP_DIR : (__DIR__ . '/data')) . '/' . $name;
    return is_file($path) ? $path : '';
}

function remove_audit_entries_for_file($backupDir, $fileName) {
    $auditFile = $backupDir . '/audit.ndjson';
    if (!is_file($auditFile)) return true;
    $lines = file($auditFile, FILE_IGNORE_NEW_LINES);
    if (!is_array($lines)) return false;
    $kept = array();
    foreach ($lines as $line) {
        if (trim($line) === '') continue;
        $row = json_decode($line, true);
        if (is_array($row) && isset($row['file']) && basename((string)$row['file']) === $fileName) {
            continue;
        }
        $kept[] = $line;
    }
    $content = $kept ? implode("\n", $kept) . "\n" : '';
    return file_put_contents($auditFile, $content, LOCK_EX) !== false;
}

function clear_root_user_data(&$data) {
    if (isset($data['profile'])) $data['profile'] = null;
    if (isset($data['profileSummary'])) $data['profileSummary'] = array();
    if (isset($data['projects'])) $data['projects'] = array();
    if (isset($data['history'])) $data['history'] = array();
    if (isset($data['drafts'])) $data['drafts'] = array();
    if (isset($data['summary']) && is_array($data['summary'])) {
        $data['summary']['projectCount'] = 0;
        $data['summary']['historyCount'] = 0;
        $data['summary']['draftCount'] = 0;
    }
    if (isset($data['raw']) && is_array($data['raw'])) {
        $data['raw']['yicalc_cloud_account'] = null;
        $data['raw']['yicalc_user_profile'] = null;
        $data['raw']['yicalc_projects'] = array();
        $data['raw']['yicalc_history'] = array();
        $data['raw']['yicalc_calc_drafts'] = array();
    }
    if (isset($data['data']) && is_array($data['data'])) {
        if (isset($data['data']['profile'])) $data['data']['profile'] = null;
        if (isset($data['data']['projects'])) $data['data']['projects'] = array();
        if (isset($data['data']['yicalc_projects'])) $data['data']['yicalc_projects'] = array();
        if (isset($data['data']['history'])) $data['data']['history'] = array();
        if (isset($data['data']['yicalc_history'])) $data['data']['yicalc_history'] = array();
    }
}

function delete_user_from_json($backupDir, $fileName, $rowIndex, $userPath) {
    $path = $backupDir . '/' . $fileName;
    $document = read_json_document($path);
    if (!$document) return array(false, '无法读取或解析 JSON 文件。');
    $index = (int)$rowIndex;
    if ($userPath === 'root.profile') {
        if ($document['type'] !== 'json') {
            return array(false, '该记录不是根级用户资料，不能按此方式删除。');
        }
        clear_root_user_data($document['data']);
        return write_json_document($path, $document)
            ? array(true, '已清空用户数据：' . $fileName)
            : array(false, '写回 JSON 文件失败，请检查权限。');
    }
    if ($document['type'] !== 'jsonl' && !is_list_array($document['data'])) {
        return array(false, '该文件不是用户列表导出，不能按用户删除。');
    }
    if (!isset($document['data'][$index])) {
        return array(false, '用户记录不存在或已删除。');
    }
    array_splice($document['data'], $index, 1);
    return write_json_document($path, $document)
        ? array(true, '已删除用户记录：' . $fileName)
        : array(false, '写回 JSON 文件失败，请检查权限。');
}

function delete_project_from_json($backupDir, $fileName, $projectPath, $rowIndex, $projectIndex) {
    $path = $backupDir . '/' . $fileName;
    $document = read_json_document($path);
    if (!$document) return array(false, '无法读取或解析 JSON 文件。');
    $row = (int)$rowIndex;
    $project = (int)$projectIndex;
    $data =& $document['data'];

    if ($projectPath === 'row.projects') {
        if (!isset($data[$row]['projects'][$project])) return array(false, '项目不存在或已删除。');
        array_splice($data[$row]['projects'], $project, 1);
    } elseif ($projectPath === 'row.yicalc_projects') {
        if (!isset($data[$row]['yicalc_projects'][$project])) return array(false, '项目不存在或已删除。');
        array_splice($data[$row]['yicalc_projects'], $project, 1);
    } elseif ($projectPath === 'projects') {
        if (!isset($data['projects'][$project])) return array(false, '项目不存在或已删除。');
        array_splice($data['projects'], $project, 1);
    } elseif ($projectPath === 'yicalc_projects') {
        if (!isset($data['yicalc_projects'][$project])) return array(false, '项目不存在或已删除。');
        array_splice($data['yicalc_projects'], $project, 1);
    } elseif ($projectPath === 'raw.yicalc_projects') {
        if (!isset($data['raw']['yicalc_projects'][$project])) return array(false, '项目不存在或已删除。');
        array_splice($data['raw']['yicalc_projects'], $project, 1);
    } elseif ($projectPath === 'raw.projects') {
        if (!isset($data['raw']['projects'][$project])) return array(false, '项目不存在或已删除。');
        array_splice($data['raw']['projects'], $project, 1);
    } elseif ($projectPath === 'data.projects') {
        if (!isset($data['data']['projects'][$project])) return array(false, '项目不存在或已删除。');
        array_splice($data['data']['projects'], $project, 1);
    } elseif ($projectPath === 'data.yicalc_projects') {
        if (!isset($data['data']['yicalc_projects'][$project])) return array(false, '项目不存在或已删除。');
        array_splice($data['data']['yicalc_projects'], $project, 1);
    } elseif ($projectPath === 'list.projects') {
        if (!isset($data[$project])) return array(false, '项目不存在或已删除。');
        array_splice($data, $project, 1);
    } else {
        return array(false, '暂不支持该项目来源的删除。');
    }

    return write_json_document($path, $document)
        ? array(true, '已删除项目记录：' . $fileName)
        : array(false, '写回 JSON 文件失败，请检查权限。');
}

function decode_bulk_items($encodedItems) {
    $items = array();
    if (!is_array($encodedItems)) return $items;
    foreach ($encodedItems as $encoded) {
        $json = base64_decode((string)$encoded, true);
        if ($json === false) continue;
        $item = json_decode($json, true);
        if (is_array($item) && isset($item['file'])) $items[] = $item;
    }
    return $items;
}

function bulk_delete_users($backupDir, $items) {
    $byFile = array();
    foreach ($items as $item) {
        $fileName = basename((string)$item['file']);
        if ($fileName === '' || strtolower(pathinfo($fileName, PATHINFO_EXTENSION)) !== 'json') continue;
        if (!isset($byFile[$fileName])) $byFile[$fileName] = array();
        $byFile[$fileName][] = $item;
    }

    $deleted = 0;
    foreach ($byFile as $fileName => $fileItems) {
        $path = $backupDir . '/' . $fileName;
        if (!is_file($path)) continue;
        $document = read_json_document($path);
        if (!$document) continue;

        $rootClear = false;
        $rows = array();
        foreach ($fileItems as $item) {
            $userPath = isset($item['path']) ? (string)$item['path'] : '';
            if ($userPath === 'root.profile') {
                $rootClear = true;
            } elseif ($userPath === 'row' && isset($item['row'])) {
                $rows[] = (int)$item['row'];
            }
        }

        if ($rootClear && $document['type'] === 'json') {
            clear_root_user_data($document['data']);
            $deleted++;
        }
        $rows = array_values(array_unique($rows));
        rsort($rows, SORT_NUMERIC);
        foreach ($rows as $rowIndex) {
            if (($document['type'] === 'jsonl' || is_list_array($document['data'])) && isset($document['data'][$rowIndex])) {
                array_splice($document['data'], $rowIndex, 1);
                $deleted++;
            }
        }
        if (write_json_document($path, $document)) {
            remove_audit_entries_for_file($backupDir, $fileName);
        }
    }
    return $deleted;
}

function bulk_delete_projects($backupDir, $items) {
    $byFile = array();
    foreach ($items as $item) {
        $fileName = basename((string)$item['file']);
        if ($fileName === '' || strtolower(pathinfo($fileName, PATHINFO_EXTENSION)) !== 'json') continue;
        if (!isset($byFile[$fileName])) $byFile[$fileName] = array();
        $byFile[$fileName][] = $item;
    }

    $deleted = 0;
    foreach ($byFile as $fileName => $fileItems) {
        $path = $backupDir . '/' . $fileName;
        if (!is_file($path)) continue;
        $document = read_json_document($path);
        if (!$document) continue;
        $data =& $document['data'];

        $groups = array();
        foreach ($fileItems as $item) {
            $projectPath = isset($item['path']) ? (string)$item['path'] : '';
            if ($projectPath === 'row') continue;
            $row = isset($item['row']) ? (int)$item['row'] : -1;
            $project = isset($item['project']) ? (int)$item['project'] : -1;
            if ($project < 0) continue;
            $key = $projectPath . '|' . $row;
            if (!isset($groups[$key])) $groups[$key] = array('path' => $projectPath, 'row' => $row, 'projects' => array());
            $groups[$key]['projects'][] = $project;
        }

        foreach ($groups as $group) {
            $indexes = array_values(array_unique($group['projects']));
            rsort($indexes, SORT_NUMERIC);
            foreach ($indexes as $projectIndex) {
                $projectPath = $group['path'];
                $row = $group['row'];
                if ($projectPath === 'row.projects' && isset($data[$row]['projects'][$projectIndex])) {
                    array_splice($data[$row]['projects'], $projectIndex, 1);
                    $deleted++;
                } elseif ($projectPath === 'row.yicalc_projects' && isset($data[$row]['yicalc_projects'][$projectIndex])) {
                    array_splice($data[$row]['yicalc_projects'], $projectIndex, 1);
                    $deleted++;
                } elseif ($projectPath === 'projects' && isset($data['projects'][$projectIndex])) {
                    array_splice($data['projects'], $projectIndex, 1);
                    $deleted++;
                } elseif ($projectPath === 'yicalc_projects' && isset($data['yicalc_projects'][$projectIndex])) {
                    array_splice($data['yicalc_projects'], $projectIndex, 1);
                    $deleted++;
                } elseif ($projectPath === 'raw.yicalc_projects' && isset($data['raw']['yicalc_projects'][$projectIndex])) {
                    array_splice($data['raw']['yicalc_projects'], $projectIndex, 1);
                    $deleted++;
                } elseif ($projectPath === 'raw.projects' && isset($data['raw']['projects'][$projectIndex])) {
                    array_splice($data['raw']['projects'], $projectIndex, 1);
                    $deleted++;
                } elseif ($projectPath === 'data.projects' && isset($data['data']['projects'][$projectIndex])) {
                    array_splice($data['data']['projects'], $projectIndex, 1);
                    $deleted++;
                } elseif ($projectPath === 'data.yicalc_projects' && isset($data['data']['yicalc_projects'][$projectIndex])) {
                    array_splice($data['data']['yicalc_projects'], $projectIndex, 1);
                    $deleted++;
                } elseif ($projectPath === 'list.projects' && isset($data[$projectIndex])) {
                    array_splice($data, $projectIndex, 1);
                    $deleted++;
                }
            }
        }
        if (write_json_document($path, $document)) {
            remove_audit_entries_for_file($backupDir, $fileName);
        }
    }
    return $deleted;
}

function count_items($value) {
    return is_array($value) ? count($value) : 0;
}

function amount_value($value) {
    return is_numeric($value) ? (float)$value : 0.0;
}

function project_item_count($project) {
    $count = 0;
    $stages = isset($project['stages']) && is_array($project['stages']) ? $project['stages'] : array();
    foreach ($stages as $stage) {
        $items = isset($stage['items']) && is_array($stage['items']) ? $stage['items'] : array();
        $count += count($items);
    }
    return $count;
}

function project_fee_total($project) {
    $total = 0.0;
    $stages = isset($project['stages']) && is_array($project['stages']) ? $project['stages'] : array();
    foreach ($stages as $stage) {
        $items = isset($stage['items']) && is_array($stage['items']) ? $stage['items'] : array();
        foreach ($items as $item) {
            if (isset($item['calcResult']) && is_array($item['calcResult']) && isset($item['calcResult']['total'])) {
                $total += amount_value($item['calcResult']['total']);
            }
        }
    }
    return $total;
}

function format_amount($value) {
    return rtrim(rtrim(number_format((float)$value, 2, '.', ''), '0'), '.');
}

function summary_value($data, $key, $fallback) {
    if (isset($data['summary']) && is_array($data['summary']) && isset($data['summary'][$key])) {
        return (int)$data['summary'][$key];
    }
    return (int)$fallback;
}

function audit_from_backup($file, $data) {
    $normalized = normalize_backup_data($data, basename($file));
    if (!$normalized) return null;
    $profile = $normalized['profile'];
    return array(
        'savedAt' => $normalized['savedAt'],
        'deviceId' => $normalized['deviceId'],
        'deviceLabel' => $normalized['deviceLabel'],
        'clientId' => $normalized['clientId'],
        'accountName' => isset($profile['name']) ? (string)$profile['name'] : '',
        'accountPhone' => isset($profile['phone']) ? (string)$profile['phone'] : '',
        'company' => isset($profile['company']) ? (string)$profile['company'] : '',
        'projectCount' => summary_value($data, 'projectCount', count_items($normalized['projects'])),
        'historyCount' => summary_value($data, 'historyCount', count_items($normalized['history'])),
        'draftCount' => summary_value($data, 'draftCount', count_items($normalized['drafts'])),
        'userCount' => count_items($normalized['users']),
        'usageCount' => summary_value($data, 'usageCount', 0),
        'fingerprint' => $normalized['fingerprint'],
        'file' => basename($file),
        'bytes' => filesize($file),
        'sourceType' => $normalized['sourceType']
    );
}

$deleteMessage = '';
$deleteError = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && in_array($_POST['action'], array('delete_user', 'delete_project', 'bulk_delete_users', 'bulk_delete_projects'), true)) {
    $postedToken = isset($_POST['csrf']) ? (string)$_POST['csrf'] : '';
    $fileName = basename(isset($_POST['file']) ? (string)$_POST['file'] : '');
    if (!safe_hash_equals($csrfToken, $postedToken)) {
        $deleteError = '删除请求已过期，请刷新页面后重试。';
    } elseif ($_POST['action'] === 'bulk_delete_users') {
        $count = bulk_delete_users($backupDir, decode_bulk_items(isset($_POST['items']) ? $_POST['items'] : array()));
        $deleteMessage = $count > 0 ? '已批量删除用户记录：' . $count . ' 条' : '';
        if (!$deleteMessage) $deleteError = '没有可删除的用户记录。';
    } elseif ($_POST['action'] === 'bulk_delete_projects') {
        $count = bulk_delete_projects($backupDir, decode_bulk_items(isset($_POST['items']) ? $_POST['items'] : array()));
        $deleteMessage = $count > 0 ? '已批量删除项目记录：' . $count . ' 条' : '';
        if (!$deleteMessage) $deleteError = '没有可删除的项目记录。';
    } elseif ($fileName === '' || strtolower(pathinfo($fileName, PATHINFO_EXTENSION)) !== 'json') {
        $deleteError = '只能删除 data 目录下的 JSON 文件。';
    } else {
        $targetPath = $backupDir . '/' . $fileName;
        if (!is_file($targetPath)) {
            $deleteError = '文件不存在或已被删除。';
        } else {
            if ($_POST['action'] === 'delete_user') {
                list($ok, $message) = delete_user_from_json(
                    $backupDir,
                    $fileName,
                    isset($_POST['row']) ? $_POST['row'] : -1,
                    isset($_POST['path']) ? (string)$_POST['path'] : ''
                );
            } else {
                list($ok, $message) = delete_project_from_json(
                    $backupDir,
                    $fileName,
                    isset($_POST['path']) ? (string)$_POST['path'] : '',
                    isset($_POST['row']) ? $_POST['row'] : -1,
                    isset($_POST['project']) ? $_POST['project'] : -1
                );
            }
            if ($ok) {
                remove_audit_entries_for_file($backupDir, $fileName);
                $deleteMessage = $message;
            } else {
                $deleteError = $message;
            }
        }
    }
}

$entries = array();
$invalidFiles = array();
$seenFiles = array();

if (is_dir($backupDir)) {
    $auditFile = $backupDir . '/audit.ndjson';
    if (is_file($auditFile)) {
        $lines = file($auditFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (is_array($lines)) {
            foreach ($lines as $line) {
                $row = json_decode($line, true);
                if (is_array($row)) {
                    $entries[] = $row;
                    if (!empty($row['file'])) $seenFiles[(string)$row['file']] = true;
                }
            }
        }
    }

    foreach (glob($backupDir . '/*.json') as $file) {
        $data = read_json_file($file);
        if (!$data) {
            $invalidFiles[] = basename($file);
            continue;
        }
        if (!isset($seenFiles[basename($file)])) {
            $entries[] = audit_from_backup($file, $data);
        }
    }
}

usort($entries, function ($a, $b) {
    return strcmp(isset($b['savedAt']) ? $b['savedAt'] : '', isset($a['savedAt']) ? $a['savedAt'] : '');
});

$latestByDevice = array();
$daily = array();
$accounts = array();
$userRows = array();
foreach ($entries as $entry) {
    $deviceId = isset($entry['deviceId']) ? $entry['deviceId'] : 'local';
    if (!isset($latestByDevice[$deviceId])) $latestByDevice[$deviceId] = $entry;
    $day = substr(isset($entry['savedAt']) ? $entry['savedAt'] : '', 0, 10);
    if ($day) $daily[$day] = isset($daily[$day]) ? $daily[$day] + 1 : 1;
    $accountKey = trim((isset($entry['accountName']) ? $entry['accountName'] : '') . ' ' . (isset($entry['accountPhone']) ? $entry['accountPhone'] : ''));
    if ($accountKey) $accounts[$accountKey] = true;
}
ksort($daily);
$daily = array_slice($daily, -14, 14, true);

$jsonFiles = array();
if (is_dir($backupDir)) {
    foreach (glob($backupDir . '/*.json') as $file) {
        $fileName = basename($file);
        $jsonFiles[] = array(
            'file' => $fileName,
            'bytes' => filesize($file),
            'modifiedAt' => date('Y-m-d H:i:s', filemtime($file)),
            'status' => in_array($fileName, $invalidFiles, true) ? '解析异常' : '可识别'
        );
    }
}
usort($jsonFiles, function ($a, $b) {
    return strcmp(isset($b['modifiedAt']) ? $b['modifiedAt'] : '', isset($a['modifiedAt']) ? $a['modifiedAt'] : '');
});

$projectRows = array();
foreach ($latestByDevice as $entry) {
    $path = backup_file_path(isset($entry['file']) ? $entry['file'] : '');
    if (!$path) continue;
    $backup = read_json_file($path);
    $normalized = $backup ? normalize_backup_data($backup, basename($path)) : null;
    if ($normalized && isset($normalized['users']) && is_array($normalized['users'])) {
        foreach ($normalized['users'] as $user) {
            $userRows[] = array(
                'file' => isset($entry['file']) ? $entry['file'] : '',
                'rowIndex' => isset($user['rowIndex']) ? (int)$user['rowIndex'] : -1,
                'userPath' => isset($user['userPath']) ? $user['userPath'] : 'root.profile',
                'canDelete' => isset($user['userPath']),
                'deviceId' => isset($entry['deviceId']) ? $entry['deviceId'] : '',
                'name' => isset($user['name']) ? $user['name'] : '',
                'phone' => isset($user['phone']) ? $user['phone'] : '',
                'company' => isset($user['company']) ? $user['company'] : '',
                'openid' => isset($user['openid']) ? $user['openid'] : '',
                'projectCount' => isset($user['projectCount']) ? (int)$user['projectCount'] : 0,
                'updatedAt' => isset($user['updatedAt']) ? $user['updatedAt'] : ''
            );
        }
    }
    if (!$normalized || !isset($normalized['projects']) || !is_array($normalized['projects'])) continue;
    foreach ($normalized['projects'] as $project) {
        if (!is_array($project)) continue;
        $stages = isset($project['stages']) && is_array($project['stages']) ? $project['stages'] : array();
        $projectRows[] = array(
            'file' => isset($entry['file']) ? $entry['file'] : '',
            'rowIndex' => isset($project['__rowIndex']) ? (int)$project['__rowIndex'] : -1,
            'projectIndex' => isset($project['__projectIndex']) ? (int)$project['__projectIndex'] : count($projectRows),
            'projectPath' => isset($project['__projectPath']) ? $project['__projectPath'] : 'projects',
            'deviceId' => isset($entry['deviceId']) ? $entry['deviceId'] : '',
            'account' => isset($project['__owner']) ? $project['__owner'] : trim((isset($entry['accountName']) ? $entry['accountName'] : '') . ' ' . (isset($entry['accountPhone']) ? $entry['accountPhone'] : '')),
            'name' => isset($project['name']) ? $project['name'] : '未命名项目',
            'location' => isset($project['location']) ? $project['location'] : '',
            'totalInvestment' => isset($project['totalInvestment']) ? $project['totalInvestment'] : 0,
            'stageCount' => count($stages),
            'itemCount' => project_item_count($project),
            'feeTotal' => project_fee_total($project),
            'updatedAt' => isset($project['updatedAt']) ? $project['updatedAt'] : (isset($project['createdAt']) ? $project['createdAt'] : '')
        );
    }
}
usort($projectRows, function ($a, $b) {
    return strcmp(isset($b['updatedAt']) ? $b['updatedAt'] : '', isset($a['updatedAt']) ? $a['updatedAt'] : '');
});
usort($userRows, function ($a, $b) {
    return strcmp(isset($b['updatedAt']) ? $b['updatedAt'] : '', isset($a['updatedAt']) ? $a['updatedAt'] : '');
});

echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
echo '<title>易计算备份监控</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f7fb;margin:0;color:#172033}.wrap{max-width:1180px;margin:0 auto;padding:24px}.top{display:flex;justify-content:space-between;align-items:center}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0}.card,table{background:#fff;border-radius:10px;box-shadow:0 6px 22px rgba(20,35,60,.06)}.card{padding:16px}.num{font-size:28px;font-weight:700}.label{color:#64748b;font-size:13px}table{width:100%;border-collapse:collapse;margin:14px 0;overflow:hidden}th,td{text-align:left;padding:10px;border-bottom:1px solid #eef2f7;font-size:13px}th{background:#f8fafc;color:#475569}.warn{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:8px;padding:10px;margin:12px 0}.ok{background:#ecfdf3;border:1px solid #bbf7d0;color:#166534;border-radius:8px;padding:10px;margin:12px 0}.bar{display:inline-block;height:10px;background:#102744;border-radius:999px;min-width:2px}.delete-form{margin:0}.delete-btn,.batch-btn{height:30px;border:0;border-radius:6px;background:#b42318;color:#fff;padding:0 10px;cursor:pointer}.batch-btn{margin:4px 0 0}.status-ok{color:#166534}.status-bad{color:#b42318}.muted{color:#94a3b8}.select-col{width:36px;text-align:center}.batch-toolbar{margin:4px 0 8px}a{color:#102744}@media(max-width:800px){.cards{grid-template-columns:repeat(2,1fr)}.wrap{padding:14px}table{display:block;overflow:auto}}</style></head><body><div class="wrap">';
echo '<div class="top"><h1>易计算备份监控</h1><a href="?logout=1">退出</a></div>';
if ($deleteMessage) echo '<div class="ok">' . h($deleteMessage) . '</div>';
if ($deleteError) echo '<div class="warn">' . h($deleteError) . '</div>';
if (!is_dir($backupDir)) echo '<div class="warn">备份目录不存在：' . h($backupDir) . '</div>';
if ($invalidFiles) echo '<div class="warn">发现损坏备份文件：' . h(implode(', ', $invalidFiles)) . '</div>';
echo '<div class="cards"><div class="card"><div class="num">' . count($entries) . '</div><div class="label">总备份次数</div></div>';
echo '<div class="card"><div class="num">' . count($latestByDevice) . '</div><div class="label">设备/客户端数</div></div>';
echo '<div class="card"><div class="num">' . max(count($accounts), count($userRows)) . '</div><div class="label">用户/账户数</div></div>';
echo '<div class="card"><div class="num">' . count($invalidFiles) . '</div><div class="label">异常文件</div></div></div>';

echo '<h2>备份文件管理</h2><table><tr><th>文件</th><th>大小</th><th>修改时间</th><th>状态</th></tr>';
foreach ($jsonFiles as $row) {
    $bad = $row['status'] !== '可识别';
    echo '<tr><td>' . h($row['file']) . '</td><td>' . (int)$row['bytes'] . '</td><td>' . h($row['modifiedAt']) . '</td><td class="' . ($bad ? 'status-bad' : 'status-ok') . '">' . h($row['status']) . '</td></tr>';
}
if (!$jsonFiles) echo '<tr><td colspan="4">暂无 JSON 文件</td></tr>';
echo '</table>';

echo '<h2>近 14 日备份趋势</h2><table><tr><th>日期</th><th>次数</th><th>趋势</th></tr>';
$maxDaily = $daily ? max($daily) : 1;
foreach ($daily as $day => $count) {
    $width = max(2, (int)round($count / $maxDaily * 180));
    echo '<tr><td>' . h($day) . '</td><td>' . (int)$count . '</td><td><span class="bar" style="width:' . $width . 'px"></span></td></tr>';
}
if (!$daily) echo '<tr><td colspan="3">暂无数据</td></tr>';
echo '</table>';

echo '<h2>各设备最新备份</h2><table><tr><th>时间</th><th>设备</th><th>账户</th><th>项目</th><th>历史</th><th>草稿</th><th>文件</th><th>大小</th></tr>';
foreach ($latestByDevice as $entry) {
    echo '<tr><td>' . h(isset($entry['savedAt']) ? $entry['savedAt'] : '') . '</td><td>' . h(isset($entry['deviceId']) ? $entry['deviceId'] : '') . '</td><td>' . h(trim((isset($entry['accountName']) ? $entry['accountName'] : '') . ' ' . (isset($entry['accountPhone']) ? $entry['accountPhone'] : ''))) . '</td><td>' . (int)(isset($entry['projectCount']) ? $entry['projectCount'] : 0) . '</td><td>' . (int)(isset($entry['historyCount']) ? $entry['historyCount'] : 0) . '</td><td>' . (int)(isset($entry['draftCount']) ? $entry['draftCount'] : 0) . '</td><td>' . h(isset($entry['file']) ? $entry['file'] : '') . '</td><td>' . (int)(isset($entry['bytes']) ? $entry['bytes'] : 0) . '</td></tr>';
}
if (!$latestByDevice) echo '<tr><td colspan="8">暂无数据</td></tr>';
echo '</table>';

echo '<h2>最新备份用户列表</h2>';
echo '<form id="bulk-user-form" method="post" onsubmit="return confirm(\'确定批量删除选中的用户记录吗？此操作会改写 JSON 内容。\');"><input type="hidden" name="action" value="bulk_delete_users"><input type="hidden" name="csrf" value="' . h($csrfToken) . '"><div class="batch-toolbar"><button class="batch-btn" type="submit">批量删除选中用户</button></div></form>';
echo '<table><tr><th class="select-col">选择</th><th>姓名</th><th>手机号</th><th>公司</th><th>项目数</th><th>更新时间</th><th>OpenID</th><th>来源设备</th><th>操作</th></tr>';
foreach (array_slice($userRows, 0, 200) as $row) {
    $userPayload = base64_encode(json_encode(array(
        'file' => $row['file'],
        'path' => $row['userPath'],
        'row' => (int)$row['rowIndex']
    ), JSON_UNESCAPED_UNICODE));
    echo '<tr><td class="select-col">';
    if (!empty($row['canDelete'])) {
        echo '<input form="bulk-user-form" type="checkbox" name="items[]" value="' . h($userPayload) . '">';
    }
    echo '</td><td>' . h($row['name']) . '</td><td>' . h($row['phone']) . '</td><td>' . h($row['company']) . '</td><td>' . (int)$row['projectCount'] . '</td><td>' . h($row['updatedAt']) . '</td><td>' . h($row['openid']) . '</td><td>' . h($row['deviceId']) . '</td><td>';
    if (!empty($row['canDelete'])) {
        echo '<form class="delete-form" method="post" onsubmit="return confirm(\'确定删除这个用户记录及其全部项目吗？此操作会改写 JSON 内容。\');"><input type="hidden" name="action" value="delete_user"><input type="hidden" name="csrf" value="' . h($csrfToken) . '"><input type="hidden" name="file" value="' . h($row['file']) . '"><input type="hidden" name="path" value="' . h($row['userPath']) . '"><input type="hidden" name="row" value="' . (int)$row['rowIndex'] . '"><button class="delete-btn" type="submit">删除用户</button></form>';
    } else {
        echo '<span class="muted">不可单独删除</span>';
    }
    echo '</td></tr>';
}
if (!$userRows) echo '<tr><td colspan="9">暂无用户数据</td></tr>';
echo '</table>';

echo '<h2>最新备份项目列表</h2>';
echo '<form id="bulk-project-form" method="post" onsubmit="return confirm(\'确定批量删除选中的项目记录吗？此操作会改写 JSON 内容。\');"><input type="hidden" name="action" value="bulk_delete_projects"><input type="hidden" name="csrf" value="' . h($csrfToken) . '"><div class="batch-toolbar"><button class="batch-btn" type="submit">批量删除选中项目</button></div></form>';
echo '<table><tr><th class="select-col">选择</th><th>项目名称</th><th>地区</th><th>总投资(万元)</th><th>阶段</th><th>子项</th><th>取费合计(万元)</th><th>更新时间</th><th>来源</th><th>操作</th></tr>';
foreach (array_slice($projectRows, 0, 200) as $row) {
    $canDeleteProject = $row['file'] && $row['projectPath'] !== 'row';
    $projectPayload = base64_encode(json_encode(array(
        'file' => $row['file'],
        'path' => $row['projectPath'],
        'row' => (int)$row['rowIndex'],
        'project' => (int)$row['projectIndex']
    ), JSON_UNESCAPED_UNICODE));
    echo '<tr><td class="select-col">';
    if ($canDeleteProject) {
        echo '<input form="bulk-project-form" type="checkbox" name="items[]" value="' . h($projectPayload) . '">';
    }
    echo '</td><td>' . h($row['name']) . '</td><td>' . h($row['location']) . '</td><td>' . h(format_amount($row['totalInvestment'])) . '</td><td>' . (int)$row['stageCount'] . '</td><td>' . (int)$row['itemCount'] . '</td><td>' . h(format_amount($row['feeTotal'])) . '</td><td>' . h($row['updatedAt']) . '</td><td>' . h($row['account'] ? $row['account'] : $row['deviceId']) . '</td><td>';
    if ($canDeleteProject) {
        echo '<form class="delete-form" method="post" onsubmit="return confirm(\'确定删除这个项目记录吗？此操作会改写 JSON 内容。\');"><input type="hidden" name="action" value="delete_project"><input type="hidden" name="csrf" value="' . h($csrfToken) . '"><input type="hidden" name="file" value="' . h($row['file']) . '"><input type="hidden" name="path" value="' . h($row['projectPath']) . '"><input type="hidden" name="row" value="' . (int)$row['rowIndex'] . '"><input type="hidden" name="project" value="' . (int)$row['projectIndex'] . '"><button class="delete-btn" type="submit">删除项目</button></form>';
    } else {
        echo '<span class="muted">不可单独删除</span>';
    }
    echo '</td></tr>';
}
if (!$projectRows) echo '<tr><td colspan="10">暂无项目数据</td></tr>';
echo '</table>';

echo '<h2>最近备份</h2><table><tr><th>时间</th><th>设备</th><th>账户</th><th>项目</th><th>历史</th><th>使用次数</th><th>指纹</th></tr>';
foreach (array_slice($entries, 0, 50) as $entry) {
    echo '<tr><td>' . h(isset($entry['savedAt']) ? $entry['savedAt'] : '') . '</td><td>' . h(isset($entry['deviceId']) ? $entry['deviceId'] : '') . '</td><td>' . h(trim((isset($entry['accountName']) ? $entry['accountName'] : '') . ' ' . (isset($entry['accountPhone']) ? $entry['accountPhone'] : ''))) . '</td><td>' . (int)(isset($entry['projectCount']) ? $entry['projectCount'] : 0) . '</td><td>' . (int)(isset($entry['historyCount']) ? $entry['historyCount'] : 0) . '</td><td>' . (int)(isset($entry['usageCount']) ? $entry['usageCount'] : 0) . '</td><td>' . h(isset($entry['fingerprint']) ? $entry['fingerprint'] : '') . '</td></tr>';
}
if (!$entries) echo '<tr><td colspan="7">暂无数据</td></tr>';
echo '</table></div></body></html>';
