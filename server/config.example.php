<?php
/**
 * SAMMLocker Backend API Configuration (Template Example)
 * คัดลอกไฟล์นี้เป็น config.php และกรอกรหัสผ่านฐานข้อมูลของท่าน
 */

// Set PHP Default Timezone to Thailand (Asia/Bangkok UTC+7)
date_default_timezone_set('Asia/Bangkok');

// Allow CORS from any origin
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';

header("Access-Control-Allow-Origin: {$origin}");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Origin, Accept");
header("Access-Control-Max-Age: 86400");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database Connection Configuration
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'sammlocker');
define('DB_USER', 'root');
define('DB_PASS', ''); // กรอกรหัสผ่าน MySQL root ของเซิร์ฟเวอร์
define('DB_CHARSET', 'utf8mb4');

/**
 * Get PDO Database Connection
 * @return PDO
 */
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Database connection failed: ' . $e->getMessage(),
                'hint' => 'กรุณาตรวจสอบ DB_USER / DB_PASS ใน config.php และรัน migrate.php เพื่อสร้างฐานข้อมูล'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    return $pdo;
}

/**
 * Return JSON or JSONP response
 */
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    $callback = isset($_GET['callback']) ? preg_replace('/[^a-zA-Z0-9_]/', '', $_GET['callback']) : null;
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
    if ($callback) {
        header('Content-Type: application/javascript; charset=utf-8');
        echo "{$callback}({$json});";
    } else {
        header('Content-Type: application/json; charset=utf-8');
        echo $json;
    }
    exit;
}

