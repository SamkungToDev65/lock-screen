# 🚀 SAMMLocker Backend & Database Migration Guide

คู่มือการติดตั้งระบบ Backend API (PHP 7.4+ & MariaDB 5.5+) สำหรับเซิร์ฟเวอร์ `dashboard.bcnlp.ac.th`

---

## 📁 ไฟล์ทั้งหมดในโฟลเดอร์ `server/`

| ไฟล์ | หน้าที่ |
|---|---|
| `config.php` | กำหนดค่าการเชื่อมต่อฐานข้อมูล MariaDB/MySQL และ CORS Headers |
| `index.php` | REST API Router หลัก รองรับทุกคำสั่ง (`ping`, `adminLogin`, `getRoom`, `listRooms`, `joinRoom`, `logViolation`, `submitExam`, `getDashboard` ฯลฯ) |
| `migrate.php` | สคริปต์สร้างฐานข้อมูล `sammlocker` และตารางทั้งหมดอัตโนมัติ พร้อมใส่ข้อมูลเริ่มต้น |
| `schema.sql` | ไฟล์ SQL สำหรับนำเข้า (Import) โดยตรงผ่าน phpMyAdmin |
| `.htaccess` | ตั้งค่า Apache รองรับ CORS และ Header ต่างๆ |

---

## 🛠️ ขั้นตอนการติดตั้งบนเซิร์ฟเวอร์

### ขั้นตอนที่ 1: อัปโหลดไฟล์ผ่าน WinSCP
1. เปิด **WinSCP** และเชื่อมต่อไปยังเซิร์ฟเวอร์ (`root@58.137.201.249`)
2. เข้าไปที่โฟลเดอร์:
   ```bash
   /var/www/html/api/SammLocker/
   ```
   *(หรือ `/var/www/html/api/SamLocker/` ตามที่ท่านตั้งชื่อโฟลเดอร์ไว้)*
3. ลากไฟล์ทั้งหมดในโฟลเดอร์ `server/` (ทั้ง 5 ไฟล์: `config.php`, `index.php`, `migrate.php`, `schema.sql`, `.htaccess`) ขึ้นไปไว้ในโฟลเดอร์นี้

---

### ขั้นตอนที่ 2: ตรวจสอบรหัสผ่านฐานข้อมูลใน `config.php`
เปิดไฟล์ `config.php` บนเซิร์ฟเวอร์ และตรวจสอบ:
```php
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'sammlocker');
define('DB_USER', 'root');
define('DB_PASS', ''); // << ใส่รหัสผ่าน MySQL root ของท่าน (หากมี)
```

---

### ขั้นตอนที่ 3: รันคำสั่งสร้างฐานข้อมูล (Migration)

เลือกวิธีที่สะดวกได้ **2 ช่องทาง**:

#### 👉 ช่องทางที่ 1 (สะดวกที่สุด): รันผ่าน Web Browser
เปิดเบราว์เซอร์ไปที่:
```text
https://dashboard.bcnlp.ac.th/api/SammLocker/migrate.php
```
*(ระบบจะแสดงหน้าจอสรุปผลสีเขียวว่าสร้างฐานข้อมูล ตาราง 4 ตาราง และ Admin เรียบร้อยแล้ว)*

#### 👉 ช่องทางที่ 2: นำเข้าผ่าน phpMyAdmin
1. เปิด **phpMyAdmin** (`https://dashboard.bcnlp.ac.th/phpmyadmin/`)
2. ไปที่แท็บ **Import** (นำเข้า)
3. เลือกไฟล์ `server/schema.sql` แล้วกด **Go** (ดำเนินการ)

---

## 👤 บัญชีผู้ใช้เริ่มต้นหลัง Migration

| อีเมล (Email) | รหัสผ่าน (Password) | บทบาท |
|---|---|---|
| `thanakorn.sammer@gmail.com` | `password123` | ผู้ดูแลระบบสูงสุด |
| `teacher@exam.edu` | `password123` | ผศ.ดร. นภัสสร วงศ์พัฒนา (อาจารย์) |
| `admin@exam.edu` | `admin123` | ดร. กิตติศักดิ์ ธรรมวิวัฒน์ (ฝ่ายวัดผล) |

*ห้องสอบตัวอย่าง: รหัส `CS101` / Exit PIN: `9988`*

---

## 🔗 ทดสอบ API Endpoint
- **Ping Check:** `https://dashboard.bcnlp.ac.th/api/SammLocker/index.php?action=ping`
- **List Rooms:** `https://dashboard.bcnlp.ac.th/api/SammLocker/index.php?action=listRooms`

