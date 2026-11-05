<?php
/**
 * SAMMLocker Database Migration Script
 * รันไฟล์นี้ผ่านเบราว์เซอร์: https://dashboard.bcnlp.ac.th/api/SammLocker/migrate.php
 * หรือผ่าน Command Line: php migrate.php
 */

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
} else {
    require_once __DIR__ . '/config.example.php';
}

$isCli = (php_sapi_name() === 'cli');
$results = [];

try {
    // 1. Connect without selecting database first (in case database does not exist yet)
    $dsnNoDb = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=" . DB_CHARSET;
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET
    ];
    $rootPdo = new PDO($dsnNoDb, DB_USER, DB_PASS, $options);
    $results[] = ["type" => "success", "title" => "เชื่อมต่อ MySQL Server สำเร็จ", "msg" => "Host: " . DB_HOST . ":" . DB_PORT];

    // 2. Create Database if not exists
    $dbName = DB_NAME;
    $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci");
    $results[] = ["type" => "success", "title" => "สร้างฐานข้อมูล `{$dbName}` สำเร็จ", "msg" => "Character Set: utf8mb4 / Collation: utf8mb4_unicode_ci"];

    // 3. Connect to the newly created / existing database
    $pdo = getDB();

    // 4. Create Table `admins`
    $pdo->exec("CREATE TABLE IF NOT EXISTS `admins` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `username` VARCHAR(191) NOT NULL,
        `password` VARCHAR(255) NOT NULL,
        `name` VARCHAR(191) NOT NULL,
        `role` VARCHAR(100) DEFAULT 'เจ้าหน้าที่ดูแลระบบ',
        `department` VARCHAR(191) DEFAULT 'สำนักวิทยบริการฯ',
        `avatar` TEXT DEFAULT NULL,
        `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `idx_username` (`username`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    $results[] = ["type" => "success", "title" => "ตาราง `admins` พร้อมใช้งาน", "msg" => "จัดเก็บข้อมูลผู้ดูแลระบบและอาจารย์ผู้คุมสอบ"];

    // 5. Create Table `rooms`
    $pdo->exec("CREATE TABLE IF NOT EXISTS `rooms` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `room_code` VARCHAR(50) NOT NULL,
        `title` VARCHAR(255) NOT NULL,
        `exam_url` TEXT NOT NULL,
        `exit_pin` VARCHAR(50) NOT NULL DEFAULT '1234',
        `max_violations` INT(11) NOT NULL DEFAULT 3,
        `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        `created_at` DATETIME NULL DEFAULT NULL,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `idx_room_code` (`room_code`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    $results[] = ["type" => "success", "title" => "ตาราง `rooms` พร้อมใช้งาน", "msg" => "จัดเก็บข้อมูลห้องสอบ URL ข้อสอบ และ Exit PIN"];

    // 6. Create Table `students`
    $pdo->exec("CREATE TABLE IF NOT EXISTS `students` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `room_code` VARCHAR(50) NOT NULL,
        `student_id` VARCHAR(50) NOT NULL,
        `student_name` VARCHAR(191) NOT NULL,
        `joined_at` DATETIME NULL DEFAULT NULL,
        `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        `violations` INT(11) NOT NULL DEFAULT 0,
        `last_ping` DATETIME NULL DEFAULT NULL,
        `submitted_at` DATETIME DEFAULT NULL,
        PRIMARY KEY (`id`),
        UNIQUE KEY `uk_room_student` (`room_code`, `student_id`),
        KEY `idx_room_code` (`room_code`),
        KEY `idx_student_id` (`student_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    $results[] = ["type" => "success", "title" => "ตาราง `students` พร้อมใช้งาน", "msg" => "จัดเก็บรายชื่อนักศึกษาที่เข้าสอบและสถานะปัจจุบัน"];

    // 7. Create Table `logs`
    $pdo->exec("CREATE TABLE IF NOT EXISTS `logs` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `timestamp` DATETIME NULL DEFAULT NULL,
        `room_code` VARCHAR(50) NOT NULL,
        `student_id` VARCHAR(50) NOT NULL,
        `student_name` VARCHAR(191) NOT NULL,
        `event_type` VARCHAR(100) NOT NULL,
        `details` TEXT DEFAULT NULL,
        PRIMARY KEY (`id`),
        KEY `idx_room_code` (`room_code`),
        KEY `idx_timestamp` (`timestamp`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    $results[] = ["type" => "success", "title" => "ตาราง `logs` พร้อมใช้งาน", "msg" => "จัดเก็บบันทึกประวัติ Audit Trail และการละเมิดกฎ"];

    // 8. Seed Initial Admins
    $stmtAdmin = $pdo->prepare("INSERT INTO `admins` (`username`, `password`, `name`, `role`, `department`, `avatar`, `status`)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
        ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `department` = VALUES(`department`);");
    
    $stmtAdmin->execute([
        'thanakorn.sammer@gmail.com',
        'password123',
        'Thanakorn Sammer',
        'ผู้ดูแลระบบสูงสุด',
        'สำนักวิทยบริการและเทคโนโลยีสารสนเทศ',
        ''
    ]);
    $stmtAdmin->execute([
        'teacher@exam.edu',
        'password123',
        'ผศ.ดร. นภัสสร วงศ์พัฒนา',
        'อาจารย์ผู้สอนประจำวิชา',
        'สาขาวิชาวิทยาการคอมพิวเตอร์',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
    ]);
    $stmtAdmin->execute([
        'admin@exam.edu',
        'admin123',
        'ดร. กิตติศักดิ์ ธรรมวิวัฒน์',
        'หัวหน้าฝ่ายวัดผลและประเมินผล',
        'สำนักส่งเสริมวิชาการและการสอบ',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    ]);
    $results[] = ["type" => "success", "title" => "สร้างบัญชี Admin เริ่มต้นเรียบร้อย", "msg" => "3 บัญชี: thanakorn.sammer@gmail.com, teacher@exam.edu, admin@exam.edu"];

    // 9. Seed Initial Demo Room
    $stmtRoom = $pdo->prepare("INSERT INTO `rooms` (`room_code`, `title`, `exam_url`, `exit_pin`, `max_violations`, `status`, `created_at`)
        VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)
        ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);");
    $stmtRoom->execute([
        'CS101',
        'การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น (Midterm Exam)',
        'https://forms.gle/KUdRrgSRwybbnDVV6',
        '9988',
        3,
        date('Y-m-d H:i:s')
    ]);
    $results[] = ["type" => "success", "title" => "สร้างห้องสอบเริ่มต้น CS101 สำเร็จ", "msg" => "Exit PIN: 9988 / ข้อสอบ: Google Forms"];

} catch (Exception $e) {
    $results[] = ["type" => "danger", "title" => "เกิดข้อผิดพลาดในการ Migration", "msg" => $e->getMessage()];
}

// Return JSON if requested
if (isset($_GET['format']) && $_GET['format'] === 'json' || $isCli) {
    if ($isCli) {
        echo "=== SAMMLocker Migration Results ===\n";
        foreach ($results as $res) {
            echo "[" . strtoupper($res['type']) . "] " . $res['title'] . " - " . $res['msg'] . "\n";
        }
    } else {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['results' => $results], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
    exit;
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SAMMLocker - Database Migration</title>
    <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Prompt', sans-serif; }
        body { background: #0b132b; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .card { background: #1c2541; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; width: 100%; max-width: 680px; padding: 36px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        .badge { background: #3a86ff; color: white; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: 700; display: inline-block; margin-bottom: 12px; }
        h1 { font-size: 24px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
        p.subtitle { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
        .item { display: flex; align-items: flex-start; gap: 14px; padding: 14px 18px; border-radius: 10px; margin-bottom: 12px; }
        .item.success { background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.3); }
        .item.danger { background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); }
        .icon { width: 22px; height: 22px; flex-shrink: 0; margin-top: 2px; }
        .item.success .icon { color: #4ade80; }
        .item.danger .icon { color: #f87171; }
        .item-content h3 { font-size: 15px; font-weight: 600; color: #ffffff; margin-bottom: 2px; }
        .item-content p { font-size: 13px; color: #94a3b8; }
        .actions { margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 12px; }
        a.btn { flex: 1; text-align: center; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600; font-size: 14px; transition: all 0.2s; }
        .btn-primary { background: #3a86ff; color: white; }
        .btn-primary:hover { background: #2563eb; }
        .btn-outline { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #cbd5e1; }
        .btn-outline:hover { background: rgba(255,255,255,0.05); }
    </style>
</head>
<body>
    <div class="card">
        <span class="badge">SAMMLocker System Migration</span>
        <h1>สถานะการติดตั้งฐานข้อมูล (Database Migration)</h1>
        <p class="subtitle">เซิร์ฟเวอร์: dashboard.bcnlp.ac.th | ฐานข้อมูล: <?php echo htmlspecialchars(DB_NAME); ?></p>

        <div class="results">
            <?php foreach ($results as $res): ?>
                <div class="item <?php echo $res['type']; ?>">
                    <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <?php if ($res['type'] === 'success'): ?>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        <?php else: ?>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        <?php endif; ?>
                    </svg>
                    <div class="item-content">
                        <h3><?php echo htmlspecialchars($res['title']); ?></h3>
                        <p><?php echo htmlspecialchars($res['msg']); ?></p>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>

        <div class="actions">
            <a href="index.php?action=ping" target="_blank" class="btn btn-outline">ทดสอบ API (Ping)</a>
            <a href="index.php?action=listRooms" target="_blank" class="btn btn-primary">ดูรายการห้องสอบ (List Rooms)</a>
        </div>
    </div>
</body>
</html>

