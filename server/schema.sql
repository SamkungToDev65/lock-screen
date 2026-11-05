-- ========================================================
-- SAMMLocker Database Schema for MariaDB 5.5+ / MySQL 5.7+
-- Host: dashboard.bcnlp.ac.th
-- Database: sammlocker
-- ========================================================

CREATE DATABASE IF NOT EXISTS `sammlocker` 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `sammlocker`;

-- --------------------------------------------------------
-- 1. Table: admins (ข้อมูลผู้ดูแลระบบและอาจารย์ผู้คุมสอบ)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admins` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Table: rooms (ข้อมูลห้องสอบ)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rooms` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Table: students (ข้อมูลนักศึกษาที่เข้าสอบแต่ละห้อง)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `students` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Table: logs (ประวัติการตรวจจับการทุจริตและ Audit Trail)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `logs` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Initial Seed Data: ข้อมูลเริ่มต้นสำหรับทดสอบระบบ
-- --------------------------------------------------------

-- Initial Admins
INSERT INTO `admins` (`username`, `password`, `name`, `role`, `department`, `avatar`, `status`)
VALUES 
  ('thanakorn.sammer@gmail.com', 'password123', 'Thanakorn Sammer', 'ผู้ดูแลระบบสูงสุด', 'สำนักวิทยบริการและเทคโนโลยีสารสนเทศ', '', 'ACTIVE'),
  ('teacher@exam.edu', 'password123', 'ผศ.ดร. นภัสสร วงศ์พัฒนา', 'อาจารย์ผู้สอนประจำวิชา', 'สาขาวิชาวิทยาการคอมพิวเตอร์', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', 'ACTIVE'),
  ('admin@exam.edu', 'admin123', 'ดร. กิตติศักดิ์ ธรรมวิวัฒน์', 'หัวหน้าฝ่ายวัดผลและประเมินผล', 'สำนักส่งเสริมวิชาการและการสอบ', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Initial Demo Room
INSERT INTO `rooms` (`room_code`, `title`, `exam_url`, `exit_pin`, `max_violations`, `status`, `created_at`)
VALUES 
  ('CS101', 'การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น (Midterm Exam)', 'https://forms.gle/KUdRrgSRwybbnDVV6', '9988', 3, 'ACTIVE', NOW())
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);
