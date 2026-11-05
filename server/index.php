<?php
/**
 * SAMMLocker High-Performance REST API Router
 * Server: Apache / PHP 7.4+ / MariaDB 5.5+
 * Endpoint: https://dashboard.bcnlp.ac.th/api/SammLocker
 */

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
} else {
    require_once __DIR__ . '/config.example.php';
}

// Parse incoming request parameters (JSON body, POST form, or GET query)
$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true);
if (!is_array($jsonInput)) {
    $jsonInput = [];
}

$params = array_merge($_GET, $_POST, $jsonInput);
$action = isset($params['action']) ? trim($params['action']) : '';

if (empty($action)) {
    sendResponse([
        'success' => false,
        'error' => 'Missing action parameter',
        'available_actions' => [
            'ping', 'adminLogin', 'getRoom', 'listRooms', 'createRoom',
            'updateRoom', 'deleteRoom', 'joinRoom', 'logViolation',
            'submitExam', 'resetStudent', 'forceSubmit', 'getDashboard', 'clearLogs'
        ]
    ], 400);
}

$pdo = getDB();

switch ($action) {

    // ----------------------------------------------------
    // 1. Ping / Health check
    // ----------------------------------------------------
    case 'ping':
        sendResponse([
            'success' => true,
            'message' => 'SAMMLocker MariaDB/PHP API is connected and ready!',
            'timestamp' => date('c'),
            'server' => 'dashboard.bcnlp.ac.th',
            'database' => DB_NAME
        ]);
        break;

    // ----------------------------------------------------
    // 2. Admin Login
    // ----------------------------------------------------
    case 'adminLogin':
        $username = isset($params['username']) ? trim($params['username']) : (isset($params['email']) ? trim($params['email']) : '');
        $password = isset($params['password']) ? trim($params['password']) : '';

        if (empty($username) || empty($password)) {
            sendResponse(['success' => false, 'error' => 'กรุณากรอกอีเมลและรหัสผ่าน'], 400);
        }

        $stmt = $pdo->prepare("SELECT * FROM `admins` WHERE LOWER(`username`) = LOWER(?) LIMIT 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user) {
            sendResponse(['success' => false, 'error' => 'อีเมลหรือรหัสผ่านไม่ถูกต้อง (ไม่พบบัญชีผู้ใช้)']);
        }

        // Support both plain text and password_hash
        $isMatch = ($password === $user['password']) || (password_verify($password, $user['password']));
        if (!$isMatch) {
            sendResponse(['success' => false, 'error' => 'รหัสผ่านไม่ถูกต้อง']);
        }

        if (strtoupper($user['status']) === 'INACTIVE') {
            sendResponse(['success' => false, 'error' => 'บัญชีผู้ใช้นี้ถูกระงับการใช้งาน (INACTIVE)']);
        }

        sendResponse([
            'success' => true,
            'user' => [
                'email' => $user['username'],
                'name' => $user['name'] ?: $user['username'],
                'role' => $user['role'] ?: 'อาจารย์ผู้สอน',
                'department' => $user['department'] ?: 'สำนักวิทยบริการฯ',
                'avatar' => $user['avatar'] ?: '',
                'status' => $user['status'] ?: 'ACTIVE'
            ]
        ]);
        break;

    // ----------------------------------------------------
    // 3. Get Room Details
    // ----------------------------------------------------
    case 'getRoom':
        $roomCode = isset($params['roomCode']) ? strtoupper(trim($params['roomCode'])) : '';
        if (empty($roomCode)) {
            sendResponse(['success' => false, 'error' => 'Missing roomCode'], 400);
        }

        $stmt = $pdo->prepare("SELECT * FROM `rooms` WHERE UPPER(`room_code`) = ? LIMIT 1");
        $stmt->execute([$roomCode]);
        $row = $stmt->fetch();

        if (!$row) {
            sendResponse(['success' => false, 'error' => 'ไม่พบห้องสอบนี้ในฐานข้อมูล']);
        }

        sendResponse([
            'success' => true,
            'room' => [
                'roomCode' => $row['room_code'],
                'title' => $row['title'],
                'examUrl' => $row['exam_url'],
                'exitPin' => $row['exit_pin'],
                'maxViolations' => (int)$row['max_violations'],
                'status' => $row['status'],
                'createdAt' => $row['created_at']
            ]
        ]);
        break;

    // ----------------------------------------------------
    // 4. List All Rooms
    // ----------------------------------------------------
    case 'listRooms':
        $stmt = $pdo->query("SELECT * FROM `rooms` ORDER BY `id` DESC");
        $rooms = [];
        while ($row = $stmt->fetch()) {
            $rooms[] = [
                'roomCode' => $row['room_code'],
                'title' => $row['title'],
                'examUrl' => $row['exam_url'],
                'exitPin' => $row['exit_pin'],
                'maxViolations' => (int)$row['max_violations'],
                'status' => $row['status'],
                'createdAt' => $row['created_at']
            ];
        }
        sendResponse(['success' => true, 'rooms' => $rooms]);
        break;

    // ----------------------------------------------------
    // 5. Create Room
    // ----------------------------------------------------
    case 'createRoom':
        $roomCode = !empty($params['roomCode']) 
            ? strtoupper(trim($params['roomCode'])) 
            : 'ROOM-' . rand(1000, 9999);
        $title = !empty($params['title']) ? trim($params['title']) : 'แบบทดสอบออนไลน์';
        $examUrl = !empty($params['examUrl']) ? trim($params['examUrl']) : '';
        $exitPin = !empty($params['exitPin']) ? trim($params['exitPin']) : '1234';
        $maxViolations = !empty($params['maxViolations']) ? (int)$params['maxViolations'] : 3;
        $status = !empty($params['status']) ? trim($params['status']) : 'ACTIVE';
        $now = date('Y-m-d H:i:s');

        $stmt = $pdo->prepare("INSERT INTO `rooms` (`room_code`, `title`, `exam_url`, `exit_pin`, `max_violations`, `status`, `created_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                `title` = VALUES(`title`),
                `exam_url` = VALUES(`exam_url`),
                `exit_pin` = VALUES(`exit_pin`),
                `max_violations` = VALUES(`max_violations`),
                `status` = VALUES(`status`)");
        $stmt->execute([$roomCode, $title, $examUrl, $exitPin, $maxViolations, $status, $now]);

        sendResponse([
            'success' => true,
            'room' => [
                'roomCode' => $roomCode,
                'title' => $title,
                'examUrl' => $examUrl,
                'exitPin' => $exitPin,
                'maxViolations' => $maxViolations,
                'status' => $status,
                'createdAt' => $now
            ]
        ]);
        break;

    // ----------------------------------------------------
    // 6. Update Room
    // ----------------------------------------------------
    case 'updateRoom':
        $roomCode = isset($params['roomCode']) ? strtoupper(trim($params['roomCode'])) : '';
        if (empty($roomCode)) {
            sendResponse(['success' => false, 'error' => 'Missing roomCode'], 400);
        }

        $fields = [];
        $values = [];

        if (isset($params['title'])) { $fields[] = "`title` = ?"; $values[] = trim($params['title']); }
        if (isset($params['examUrl'])) { $fields[] = "`exam_url` = ?"; $values[] = trim($params['examUrl']); }
        if (isset($params['exitPin'])) { $fields[] = "`exit_pin` = ?"; $values[] = trim($params['exitPin']); }
        if (isset($params['maxViolations'])) { $fields[] = "`max_violations` = ?"; $values[] = (int)$params['maxViolations']; }
        if (isset($params['status'])) { $fields[] = "`status` = ?"; $values[] = trim($params['status']); }

        if (empty($fields)) {
            sendResponse(['success' => true, 'message' => 'No changes made']);
        }

        $values[] = $roomCode;
        $sql = "UPDATE `rooms` SET " . implode(', ', $fields) . " WHERE UPPER(`room_code`) = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);

        sendResponse(['success' => true, 'message' => 'อัปเดตห้องสอบสำเร็จ']);
        break;

    // ----------------------------------------------------
    // 7. Delete Room
    // ----------------------------------------------------
    case 'deleteRoom':
        $roomCode = isset($params['roomCode']) ? strtoupper(trim($params['roomCode'])) : '';
        if (empty($roomCode)) {
            sendResponse(['success' => false, 'error' => 'Missing roomCode'], 400);
        }

        $stmt = $pdo->prepare("DELETE FROM `rooms` WHERE UPPER(`room_code`) = ?");
        $stmt->execute([$roomCode]);

        sendResponse(['success' => true, 'message' => 'ลบห้องสอบเรียบร้อย']);
        break;

    // ----------------------------------------------------
    // 8. Join Room
    // ----------------------------------------------------
    case 'joinRoom':
        $roomCode = isset($params['roomCode']) ? strtoupper(trim($params['roomCode'])) : '';
        $studentId = isset($params['studentId']) ? trim($params['studentId']) : '';
        $studentName = isset($params['studentName']) ? trim($params['studentName']) : '';
        $now = date('Y-m-d H:i:s');

        if (empty($roomCode) || empty($studentId)) {
            sendResponse(['success' => false, 'error' => 'Missing roomCode or studentId'], 400);
        }

        $stmt = $pdo->prepare("INSERT INTO `students` (`room_code`, `student_id`, `student_name`, `joined_at`, `status`, `violations`, `last_ping`)
            VALUES (?, ?, ?, ?, 'ACTIVE', 0, ?)
            ON DUPLICATE KEY UPDATE 
                `student_name` = VALUES(`student_name`),
                `status` = 'ACTIVE',
                `last_ping` = VALUES(`last_ping`)");
        $stmt->execute([$roomCode, $studentId, $studentName, $now, $now]);

        // Audit Log
        logAudit($pdo, $roomCode, $studentId, $studentName, 'STUDENT_JOINED', 'เข้าสู่ระบบห้องสอบ');

        sendResponse([
            'success' => true,
            'student' => [
                'roomCode' => $roomCode,
                'studentId' => $studentId,
                'studentName' => $studentName,
                'status' => 'ACTIVE',
                'violations' => 0,
                'joinedAt' => $now
            ]
        ]);
        break;

    // ----------------------------------------------------
    // 9. Log Violation
    // ----------------------------------------------------
    case 'logViolation':
        $roomCode = isset($params['roomCode']) ? strtoupper(trim($params['roomCode'])) : '';
        $studentId = isset($params['studentId']) ? trim($params['studentId']) : '';
        $studentName = isset($params['studentName']) ? trim($params['studentName']) : '';
        $eventType = isset($params['eventType']) ? trim($params['eventType']) : 'WINDOW_BLUR';
        $details = isset($params['details']) ? trim($params['details']) : 'ตรวจพบการละเมิดกฎการสอบ';
        $now = date('Y-m-d H:i:s');

        if (empty($roomCode) || empty($studentId)) {
            sendResponse(['success' => false, 'error' => 'Missing roomCode or studentId'], 400);
        }

        // Fetch current violations
        $stmt = $pdo->prepare("SELECT `violations`, `student_name` FROM `students` WHERE UPPER(`room_code`) = ? AND `student_id` = ? LIMIT 1");
        $stmt->execute([$roomCode, $studentId]);
        $existing = $stmt->fetch();

        $violations = 1;
        if ($existing) {
            $violations = (int)$existing['violations'] + 1;
            if (empty($studentName)) $studentName = $existing['student_name'];

            $update = $pdo->prepare("UPDATE `students` SET `violations` = ?, `status` = ?, `last_ping` = ? WHERE UPPER(`room_code`) = ? AND `student_id` = ?");
            $update->execute([$violations, $eventType, $now, $roomCode, $studentId]);
        } else {
            $insert = $pdo->prepare("INSERT INTO `students` (`room_code`, `student_id`, `student_name`, `joined_at`, `status`, `violations`, `last_ping`) VALUES (?, ?, ?, ?, ?, 1, ?)");
            $insert->execute([$roomCode, $studentId, $studentName, $now, $eventType, $now]);
        }

        logAudit($pdo, $roomCode, $studentId, $studentName, $eventType, $details);

        sendResponse([
            'success' => true,
            'violations' => $violations,
            'status' => $eventType,
            'timestamp' => $now
        ]);
        break;

    // ----------------------------------------------------
    // 10. Submit Exam (Exit PIN verification)
    // ----------------------------------------------------
    case 'submitExam':
        $roomCode = isset($params['roomCode']) ? strtoupper(trim($params['roomCode'])) : '';
        $studentId = isset($params['studentId']) ? trim($params['studentId']) : '';
        $studentName = isset($params['studentName']) ? trim($params['studentName']) : '';
        $pin = isset($params['pin']) ? trim($params['pin']) : '';
        $now = date('Y-m-d H:i:s');

        if (empty($roomCode) || empty($studentId)) {
            sendResponse(['success' => false, 'error' => 'Missing roomCode or studentId'], 400);
        }

        // Check Exit PIN from room
        $stmtRoom = $pdo->prepare("SELECT `exit_pin` FROM `rooms` WHERE UPPER(`room_code`) = ? LIMIT 1");
        $stmtRoom->execute([$roomCode]);
        $room = $stmtRoom->fetch();

        if ($room && !empty($room['exit_pin'])) {
            if ($pin !== trim($room['exit_pin'])) {
                logAudit($pdo, $roomCode, $studentId, $studentName, 'EXIT_PIN_FAILED', "ใส่ Exit PIN ไม่ถูกต้อง: {$pin}");
                sendResponse(['success' => false, 'error' => 'Exit PIN ไม่ถูกต้อง กรุณาติดต่ออาจารย์ผู้คุมสอบ']);
            }
        }

        $stmt = $pdo->prepare("UPDATE `students` SET `status` = 'SUBMITTED', `submitted_at` = ?, `last_ping` = ? WHERE UPPER(`room_code`) = ? AND `student_id` = ?");
        $stmt->execute([$now, $now, $roomCode, $studentId]);

        logAudit($pdo, $roomCode, $studentId, $studentName, 'SUBMITTED', 'ส่งข้อสอบและปลดล็อกเรียบร้อย');

        sendResponse(['success' => true, 'message' => 'บันทึกการส่งข้อสอบสำเร็จ']);
        break;

    // ----------------------------------------------------
    // 11. Reset Student Violations
    // ----------------------------------------------------
    case 'resetStudent':
        $roomCode = isset($params['roomCode']) ? strtoupper(trim($params['roomCode'])) : '';
        $studentId = isset($params['studentId']) ? trim($params['studentId']) : '';
        $now = date('Y-m-d H:i:s');

        $stmt = $pdo->prepare("UPDATE `students` SET `violations` = 0, `status` = 'ACTIVE', `last_ping` = ? WHERE UPPER(`room_code`) = ? AND `student_id` = ?");
        $stmt->execute([$now, $roomCode, $studentId]);

        logAudit($pdo, $roomCode, $studentId, '', 'RESET_WARNING', 'อาจารย์รีเซ็ตสถานะและล้างการเตือน');

        sendResponse(['success' => true, 'message' => 'รีเซ็ตสถานะสำเร็จ']);
        break;

    // ----------------------------------------------------
    // 12. Force Submit Student
    // ----------------------------------------------------
    case 'forceSubmit':
        $roomCode = isset($params['roomCode']) ? strtoupper(trim($params['roomCode'])) : '';
        $studentId = isset($params['studentId']) ? trim($params['studentId']) : '';
        $now = date('Y-m-d H:i:s');

        $stmt = $pdo->prepare("UPDATE `students` SET `status` = 'SUBMITTED', `submitted_at` = ?, `last_ping` = ? WHERE UPPER(`room_code`) = ? AND `student_id` = ?");
        $stmt->execute([$now, $now, $roomCode, $studentId]);

        logAudit($pdo, $roomCode, $studentId, '', 'FORCE_SUBMITTED', 'อาจารย์สั่งส่งข้อสอบแทน (Teacher Override)');

        sendResponse(['success' => true, 'message' => 'ส่งข้อสอบแทนสำเร็จ']);
        break;

    // ----------------------------------------------------
    // 13. Get Real-Time Dashboard
    // ----------------------------------------------------
    case 'getDashboard':
        $roomCode = isset($params['roomCode']) ? strtoupper(trim($params['roomCode'])) : '';

        // Query Students
        if (!empty($roomCode)) {
            $stmtStudents = $pdo->prepare("SELECT * FROM `students` WHERE UPPER(`room_code`) = ? ORDER BY `id` DESC");
            $stmtStudents->execute([$roomCode]);
        } else {
            $stmtStudents = $pdo->query("SELECT * FROM `students` ORDER BY `id` DESC");
        }

        $students = [];
        while ($row = $stmtStudents->fetch()) {
            $students[] = [
                'roomCode' => $row['room_code'],
                'studentId' => $row['student_id'],
                'studentName' => $row['student_name'],
                'joinedAt' => $row['joined_at'],
                'status' => $row['status'],
                'violations' => (int)$row['violations'],
                'lastPing' => $row['last_ping'],
                'submittedAt' => $row['submitted_at']
            ];
        }

        // Query Logs (Limit 60 newest)
        if (!empty($roomCode)) {
            $stmtLogs = $pdo->prepare("SELECT * FROM `logs` WHERE UPPER(`room_code`) = ? ORDER BY `id` DESC LIMIT 60");
            $stmtLogs->execute([$roomCode]);
        } else {
            $stmtLogs = $pdo->query("SELECT * FROM `logs` ORDER BY `id` DESC LIMIT 60");
        }

        $logs = [];
        while ($l = $stmtLogs->fetch()) {
            $logs[] = [
                'timestamp' => $l['timestamp'],
                'roomCode' => $l['room_code'],
                'studentId' => $l['student_id'],
                'studentName' => $l['student_name'],
                'eventType' => $l['event_type'],
                'details' => $l['details']
            ];
        }

        sendResponse([
            'success' => true,
            'roomCode' => $roomCode,
            'students' => $students,
            'logs' => $logs
        ]);
        break;

    // ----------------------------------------------------
    // 14. Clear Logs
    // ----------------------------------------------------
    case 'clearLogs':
        $roomCode = isset($params['roomCode']) ? strtoupper(trim($params['roomCode'])) : '';
        if (!empty($roomCode)) {
            $stmt = $pdo->prepare("DELETE FROM `logs` WHERE UPPER(`room_code`) = ?");
            $stmt->execute([$roomCode]);
        } else {
            $pdo->exec("TRUNCATE TABLE `logs`");
        }
        sendResponse(['success' => true, 'message' => 'ล้างบันทึกเรียบร้อย']);
        break;

    default:
        sendResponse(['success' => false, 'error' => "Unknown action: {$action}"], 404);
}

/**
 * Helper to record audit events into logs table
 */
function logAudit($pdo, $roomCode, $studentId, $studentName, $eventType, $details) {
    try {
        $now = date('Y-m-d H:i:s');
        $stmt = $pdo->prepare("INSERT INTO `logs` (`timestamp`, `room_code`, `student_id`, `student_name`, `event_type`, `details`) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$now, $roomCode, $studentId, $studentName, $eventType, $details]);
    } catch (Exception $e) {
        // Silently ignore log errors to avoid blocking core user flow
    }
}

