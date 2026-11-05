# 🔒 Secure Exam LockScreen (Senior Full Stack Edition)

ระบบสอบออนไลน์แบบควบคุมความปลอดภัย (Secure Proctoring Shell) พัฒนาด้วย **React + Vite + Tailwind CSS + Material UI (MUI)** โดยไม่มีการใช้ Bootstrap ออกแบบตามมาตรฐานการเข้าถึง **WCAG AA** และทฤษฎีสี **60-30-10** รองรับการทำงานแบบ **Progressive Web App (PWA)** พร้อมระบบล็อกอินหลังบ้านและหน้าศูนย์จัดการแยกส่วน เชื่อมต่อฐานข้อมูล **Google Sheets ทั้งหมด 4 ชีต**

---

## 🌟 ฟังก์ชันหลักและการทำงานร่วมกับ Google Sheets (4 Sheets)

ระบบดึงและบันทึกข้อมูลแบบเรียลไทม์ตรงกับ Google Sheets ผ่าน Google Apps Script Web App:
URL Google Sheet: [https://docs.google.com/spreadsheets/d/1ymUruyobCQTdvyJ6X1uhoU5Zys9wulF4bciYvD1PRH4/edit](https://docs.google.com/spreadsheets/d/1ymUruyobCQTdvyJ6X1uhoU5Zys9wulF4bciYvD1PRH4/edit?gid=0#gid=0)

### 1. Sheet `Rooms` (ข้อมูลห้องสอบและ Exit PIN)
- `RoomCode`: รหัสห้องสอบ เช่น `CS101`, `EXAM-8291`
- `Title`: ชื่อวิชา / ชื่อการสอบ
- `ExamURL`: URL ลิงก์ข้อสอบสำหรับฝังใน `<iframe>`
- `ExitPIN`: รหัสปลดล็อกสำหรับอาจารย์
- `MaxViolations`: เกณฑ์จำนวนครั้งเตือน
- `Status`: สถานะห้องสอบ (`ACTIVE`, `PAUSED`, `CLOSED`)
- `CreatedAt`: วันเวลาที่สร้างห้อง

### 2. Sheet `Students` (รายชื่อและสถานะนักศึกษาเรียลไทม์)
- `RoomCode`: รหัสห้องสอบ
- `StudentId`: รหัสนักศึกษา
- `StudentName`: ชื่อ - นามสกุล
- `JoinedAt`: เวลาที่เข้าสู่ห้องสอบ
- `Status`: สถานะปัจจุบัน (`ACTIVE`, `LEFT_FULLSCREEN`, `TAB_SWITCH`, `BLUR`, `SUBMITTED`)
- `Violations`: จำนวนครั้งที่ทำผิดกฎสะสม
- `LastPing`: เวลาที่ส่งสัญญาณล่าสุด
- `SubmittedAt`: เวลาที่ส่งข้อสอบและปลดล็อก

### 3. Sheet `Logs` (ประวัติการกระทำความปลอดภัย - Audit Trail)
- `Timestamp`: วันและเวลาที่เกิดเหตุการณ์
- `RoomCode`: รหัสห้องสอบ
- `StudentId`: รหัสนักศึกษา
- `StudentName`: ชื่อนักศึกษา
- `EventType`: ชนิดเหตุการณ์ (`STUDENT_JOINED`, `LEFT_FULLSCREEN`, `TAB_SWITCH`, `BLUR`, `SUBMITTED`, `EXIT_PIN_FAILED`, `RESET_WARNING`, `FORCE_SUBMITTED`)
- `Details`: รายละเอียดเพิ่มเติม

### 4. Sheet `Admin` (ข้อมูลผู้ดูแลระบบและอาจารย์)
- `Username`: อีเมลหรือบัญชีผู้ใช้ เช่น `teacher@exam.edu`, `admin@exam.edu`
- `Password`: รหัสผ่านสำหรับล็อกอินเข้าระบบหลังบ้าน
- `Name`: ชื่อ-นามสกุล เช่น `ผศ.ดร. นภัสสร วงศ์พัฒนา`
- `Role`: ตำแหน่ง เช่น `อาจารย์ผู้สอนประจำวิชา`, `หัวหน้าฝ่ายวัดผลและประเมินผล`
- `Department`: สังกัด/ภาควิชา
- `Avatar`: รูปโปรไฟล์
- `Status`: สถานะการใช้งาน (`ACTIVE`, `INACTIVE`)
- `CreatedAt`: วันที่สร้างบัญชี

---

## 🎨 การออกแบบ Layout หลังบ้านใหม่ (Matching Master Mockup)

1. **Left Sidebar Navigation (แถบเมนูด้านซ้ายสี Deep Midnight Navy `#0a1026`):**
   - ตราโลโก้ Shield + Secure Exam PWA Badge
   - เมนูนำทางแบบ Active Curved Pill Gradient พร้อมแสงเรืองรอง:
     - 🏠 **แดชบอร์ดคุมสอบ**
     - 🖥️ **จัดการห้องสอบ**
     - 👥 **จัดการนักศึกษา**
     - 📝 **ข้อสอบและคลังข้อสอบ**
     - 📊 **รายงานและสถิติ**
     - ⚙️ **ตั้งค่าระบบ**
   - ส่วนล่าง: คู่มือการใช้งาน, ติดต่อผู้ดูแล, และสถานะความพร้อมของระบบ
2. **Top App Bar (แถบด้านบนสีขาวสะอาดตา):**
   - Breadcrumb ระบุหน้าปัจจุบัน
   - ปุ่มแจ้งเตือน (Notification Bell), ปุ่มช่วยเหลือ (Help)
   - การ์ดโปรไฟล์อาจารย์: รูป Avatar, ชื่อ-นามสกุล, ตำแหน่ง และเมนูออกจากระบบ
3. **Hero Monitoring Banner:**
   - แบนเนอร์สีเข้มสไตล์ Cyber Security พร้อมสถานะ `🟢 LIVE MONITORING` และ `ROOM: CS101`
   - การ์ด Exit PIN สีเหลือง พร้อมปุ่มกดคัดลอกในคลิกเดียว
   - ปุ่มดำเนินการครบครัน: `+ สร้างห้องสอบ`, `QR Code`, `ฉายจอโปรเจกเตอร์`
4. **4 Metric KPI Cards:**
   - แสดงสถิติสำคัญ 4 ด้าน: ทั้งหมด, ปกติ (เขียว), หลุดจอ (แดง), ส่งแล้ว (ฟ้า)
5. **Two-Column Lower Section:**
   - **ด้านซ้าย:** ตารางรายชื่อนักศึกษา ค้นหา กรองสถานะ และปุ่มคำสั่งจัดการ (ล้างเตือน / ส่งแทน)
   - **ด้านขวา:** ไทม์ไลน์บันทึกเหตุการณ์สด (Live Audit Feed) มีเส้นเชื่อมและจุดสีระบุความเร่งด่วน

---

## 💻 วิธีการรันระบบ

```bash
# รันโหมด Development
npm run dev

# ทดสอบ Build เป็น Production Bundle
npm run build
```

เปิดเบราว์เซอร์ไปที่: `http://localhost:3000`
