/**
 * SAMMLocker High-Performance REST API Service
 * Connected directly to MariaDB / PHP Backend (dashboard.bcnlp.ac.th)
 * with LocalStorage resilience and in-memory request deduplication.
 */

const API_URL_KEY = 'secure_exam_api_url';
const LOCAL_ROOMS_KEY = 'secure_exam_rooms';
const LOCAL_STUDENTS_KEY = 'secure_exam_students';
const LOCAL_LOGS_KEY = 'secure_exam_logs';

export const DEFAULT_API_URL = 'https://dashboard.bcnlp.ac.th/api/SammLocker/index.php';

export const normalizeApiUrl = (url) => {
  let trimmed = (url || '').trim();
  if (!trimmed) return DEFAULT_API_URL;

  trimmed = trimmed.replace(/\.{2,}$/, '').replace(/\/+$/, '');
  if (!trimmed.endsWith('.php')) {
    trimmed = `${trimmed}/index.php`;
  }
  return trimmed;
};

// Aliased for backward compatibility
export const normalizeGasUrl = normalizeApiUrl;

export const getApiUrl = () => {
  const stored = localStorage.getItem(API_URL_KEY) || localStorage.getItem('secure_exam_gas_url');
  if (!stored || stored.includes('script.google.com') || stored === 'https://dashboard.bcnlp.ac.th/api/SammLocker' || stored === 'https://dashboard.bcnlp.ac.th/api/SammLocker/') {
    localStorage.setItem(API_URL_KEY, DEFAULT_API_URL);
    return DEFAULT_API_URL;
  }
  const normalized = normalizeApiUrl(stored);
  if (normalized !== stored) localStorage.setItem(API_URL_KEY, normalized);
  return normalized;
};

export const setApiUrl = (url) => {
  const norm = normalizeApiUrl(url);
  localStorage.setItem(API_URL_KEY, norm);
  localStorage.setItem('secure_exam_gas_url', norm);
};

// Aliased for existing component imports
export const getGasUrl = getApiUrl;
export const setGasUrl = setApiUrl;

// In-memory cache & In-flight request deduplication
const inFlightRequests = new Map();
const memoryCache = new Map();

const getCache = (key) => {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    memoryCache.delete(key);
    return null;
  }
  return item.value;
};

const setCache = (key, value, ttlMs = 5000) => {
  memoryCache.set(key, { value, expiry: Date.now() + ttlMs });
};

export const invalidateCache = (prefix) => {
  for (const key of memoryCache.keys()) {
    if (!prefix || key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
};

/**
 * Universal API GET request with deduplication
 */
const apiGet = async (params = {}) => {
  const apiUrl = getApiUrl();
  const query = new URLSearchParams(params).toString();
  const fullUrl = `${apiUrl}?${query}`;

  if (inFlightRequests.has(fullUrl)) {
    return inFlightRequests.get(fullUrl);
  }

  const promise = (async () => {
    try {
      const res = await fetch(fullUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } finally {
      inFlightRequests.delete(fullUrl);
    }
  })();

  inFlightRequests.set(fullUrl, promise);
  return promise;
};

/**
 * Universal API POST request
 */
const apiPost = async (payload = {}) => {
  const apiUrl = getApiUrl();
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      keepalive: true,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.warn('API POST error:', err);
    return { success: false, error: err.message };
  }
};

// Initial local store
const initLocalStore = () => {
  if (!localStorage.getItem(LOCAL_ROOMS_KEY)) {
    localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(LOCAL_STUDENTS_KEY)) {
    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(LOCAL_LOGS_KEY)) {
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify([]));
  }
};
initLocalStore();

/**
 * Test Connection
 */
export const testApiConnection = async (urlToTest) => {
  const target = normalizeApiUrl(urlToTest || getApiUrl());
  try {
    const res = await fetch(`${target}?action=ping`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const data = await res.json();
    if (data && data.success) {
      return data;
    }
    throw new Error(data?.error || 'เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง');
  } catch (err) {
    throw new Error(`ไม่สามารถเชื่อมต่อ API ได้ (${err.message}): กรุณาตรวจสอบ URL หรือสถานะเซิร์ฟเวอร์`);
  }
};

// Alias for existing component imports
export const testGasConnection = testApiConnection;

/**
 * Admin Login
 */
export const adminLogin = async (username, password) => {
  try {
    const data = await apiPost({
      action: 'adminLogin',
      username: username.trim(),
      password: password,
    });

    if (data && data.success && data.user) {
      return data;
    }
    return {
      success: false,
      error: data?.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง (ตรวจสอบในตาราง admins)',
    };
  } catch (err) {
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' };
  }
};

// Alias for existing component imports
export const adminLoginSheet = adminLogin;

/**
 * List all rooms
 */
export const listRooms = async () => {
  const cached = getCache('rooms_list');
  if (cached) return { success: true, rooms: cached };

  try {
    const data = await apiGet({ action: 'listRooms' });
    if (data && data.success && Array.isArray(data.rooms)) {
      setCache('rooms_list', data.rooms, 10000);
      localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(data.rooms));
      return { success: true, rooms: data.rooms };
    }
  } catch (err) {
    console.warn('listRooms network fallback to local:', err);
  }

  const rooms = JSON.parse(localStorage.getItem(LOCAL_ROOMS_KEY) || '[]');
  return { success: true, rooms };
};

/**
 * Create a new exam room
 */
export const createRoom = async ({ roomCode, title, examUrl, exitPin, maxViolations = 3 }) => {
  const normalizedCode = (roomCode || `ROOM-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase();
  const roomObj = {
    roomCode: normalizedCode,
    title: title || 'ห้องสอบออนไลน์',
    examUrl: examUrl || '',
    exitPin: exitPin || '1234',
    maxViolations: Number(maxViolations) || 3,
    status: 'ACTIVE',
    createdAt: new Date().toLocaleString('th-TH'),
  };

  invalidateCache('rooms_list');
  invalidateCache('room_' + normalizedCode);

  // 1. Optimistic local save
  const rooms = JSON.parse(localStorage.getItem(LOCAL_ROOMS_KEY) || '[]');
  const existingIdx = rooms.findIndex((r) => r.roomCode.toUpperCase() === normalizedCode);
  if (existingIdx >= 0) {
    rooms[existingIdx] = roomObj;
  } else {
    rooms.unshift(roomObj);
  }
  localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));

  // 2. Server Sync
  apiPost({
    action: 'createRoom',
    ...roomObj,
  });

  return { success: true, room: roomObj };
};

/**
 * Get room info
 */
export const getRoom = async (roomCode) => {
  if (!roomCode) return { success: false, error: 'Missing room code' };
  const normalized = roomCode.toUpperCase().trim();

  const cached = getCache('room_' + normalized);
  if (cached) return { success: true, room: cached };

  try {
    const data = await apiGet({ action: 'getRoom', roomCode: normalized });
    if (data && data.success && data.room) {
      setCache('room_' + normalized, data.room, 20000);
      return data;
    }
  } catch (err) {
    console.warn('getRoom network fallback to local:', err);
  }

  const rooms = JSON.parse(localStorage.getItem(LOCAL_ROOMS_KEY) || '[]');
  const localMatch = rooms.find((r) => r.roomCode.toUpperCase() === normalized);
  if (localMatch) {
    return { success: true, room: localMatch };
  }

  return { success: false, error: 'ไม่พบรหัสห้องสอบนี้ในฐานข้อมูล' };
};

/**
 * Update room
 */
export const updateRoom = async (roomCode, updatedFields) => {
  const normalized = roomCode.toUpperCase().trim();
  invalidateCache('rooms_list');
  invalidateCache('room_' + normalized);

  const rooms = JSON.parse(localStorage.getItem(LOCAL_ROOMS_KEY) || '[]');
  const idx = rooms.findIndex((r) => r.roomCode.toUpperCase() === normalized);
  if (idx >= 0) {
    rooms[idx] = { ...rooms[idx], ...updatedFields };
    localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));
  }

  apiPost({
    action: 'updateRoom',
    roomCode: normalized,
    ...updatedFields,
  });

  return { success: true };
};

/**
 * Delete room
 */
export const deleteRoom = async (roomCode) => {
  const normalized = roomCode.toUpperCase().trim();
  invalidateCache('rooms_list');
  invalidateCache('room_' + normalized);

  const rooms = JSON.parse(localStorage.getItem(LOCAL_ROOMS_KEY) || '[]');
  const filtered = rooms.filter((r) => r.roomCode.toUpperCase() !== normalized);
  localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(filtered));

  apiPost({
    action: 'deleteRoom',
    roomCode: normalized,
  });

  return { success: true };
};

/**
 * Student joins room
 */
export const joinRoom = async (roomCode, studentId, studentName) => {
  const normalized = roomCode.toUpperCase();
  const now = new Date().toLocaleString('th-TH');

  const students = JSON.parse(localStorage.getItem(LOCAL_STUDENTS_KEY) || '[]');
  let student = students.find(
    (s) => s.roomCode.toUpperCase() === normalized && s.studentId === studentId
  );

  if (student) {
    student.studentName = studentName;
    student.status = 'ACTIVE';
    student.lastPing = now;
  } else {
    student = {
      roomCode: normalized,
      studentId: studentId.trim(),
      studentName: studentName.trim(),
      joinedAt: now,
      status: 'ACTIVE',
      violations: 0,
      lastPing: now,
      submittedAt: null,
    };
    students.push(student);
  }
  localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(students));
  logAuditLocal(normalized, studentId, studentName, 'STUDENT_JOINED', 'เข้าสู่ห้องสอบ');

  apiPost({
    action: 'joinRoom',
    roomCode: normalized,
    studentId,
    studentName,
  });

  return { success: true, student };
};

// Throttle tracking for student violations
const lastViolationSent = new Map();
const violationTimers = new Map();

export const getLocalMysqlTimestamp = () => {
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/**
 * Log violation with client-side burst throttling & local optimistic update
 */
export const logViolation = async (roomCode, studentId, studentName, eventType, details) => {
  const normalized = roomCode.toUpperCase();
  const mysqlTime = getLocalMysqlTimestamp();
  const now = new Date().toLocaleString('th-TH');

  const students = JSON.parse(localStorage.getItem(LOCAL_STUDENTS_KEY) || '[]');
  const student = students.find(
    (s) => s.roomCode.toUpperCase() === normalized && s.studentId === studentId
  );

  let violations = 1;
  if (student) {
    student.violations = (student.violations || 0) + 1;
    student.status = eventType;
    student.lastPing = now;
    violations = student.violations;
    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(students));
  }

  logAuditLocal(normalized, studentId, studentName, eventType, details || 'พบการละเมิดกฎการสอบ');

  const throttleKey = `${normalized}_${studentId}`;
  const lastTime = lastViolationSent.get(throttleKey) || 0;
  const nowMs = Date.now();

  if (nowMs - lastTime > 2000) {
    lastViolationSent.set(throttleKey, nowMs);
    apiPost({
      action: 'logViolation',
      roomCode: normalized,
      studentId,
      studentName,
      eventType,
      details,
      clientTimestamp: mysqlTime,
    });
  } else {
    if (violationTimers.has(throttleKey)) {
      clearTimeout(violationTimers.get(throttleKey));
    }
    const timer = setTimeout(() => {
      lastViolationSent.set(throttleKey, Date.now());
      violationTimers.delete(throttleKey);
      apiPost({
        action: 'logViolation',
        roomCode: normalized,
        studentId,
        studentName,
        eventType,
        details: `${details} (สะสม ${violations} ครั้ง)`,
        clientTimestamp: getLocalMysqlTimestamp(),
      });
    }, 2100);
    violationTimers.set(throttleKey, timer);
  }

  return { success: true, violations, status: eventType };
};

export const updateStudentStatus = async (roomCode, studentId, status) => {
  const normalized = roomCode.toUpperCase();
  const now = new Date().toLocaleString('th-TH');

  const students = JSON.parse(localStorage.getItem(LOCAL_STUDENTS_KEY) || '[]');
  const student = students.find(
    (s) => s.roomCode.toUpperCase() === normalized && s.studentId === studentId
  );

  if (student) {
    student.status = status;
    student.lastPing = now;
    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(students));
  }
};

/**
 * Submit exam & verify Exit PIN
 */
export const submitExam = async (roomCode, studentId, studentName, pin) => {
  const normalized = roomCode.toUpperCase();
  const now = new Date().toLocaleString('th-TH');

  const rooms = JSON.parse(localStorage.getItem(LOCAL_ROOMS_KEY) || '[]');
  const room = rooms.find((r) => r.roomCode.toUpperCase() === normalized);

  if (room && room.exitPin) {
    if (String(room.exitPin).trim() !== String(pin).trim()) {
      logAuditLocal(normalized, studentId, studentName, 'EXIT_PIN_FAILED', `รหัส Exit PIN ผิด: "${pin}"`);
      return { success: false, error: 'รหัสปลดล็อก (Exit PIN) ไม่ถูกต้อง กรุณาติดต่ออาจารย์ประจำวิชา' };
    }
  }

  const students = JSON.parse(localStorage.getItem(LOCAL_STUDENTS_KEY) || '[]');
  const student = students.find(
    (s) => s.roomCode.toUpperCase() === normalized && s.studentId === studentId
  );

  if (student) {
    student.status = 'SUBMITTED';
    student.submittedAt = now;
    student.lastPing = now;
    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(students));
  }

  logAuditLocal(normalized, studentId, studentName, 'SUBMITTED', 'ส่งข้อสอบสำเร็จและปลดล็อกหน้าจอ');

  apiPost({
    action: 'submitExam',
    roomCode: normalized,
    studentId,
    studentName,
    pin,
  });

  return { success: true, message: 'ส่งข้อสอบและปลดล็อกเรียบร้อยแล้ว' };
};

/**
 * Reset student violations
 */
export const resetStudentViolations = async (roomCode, studentId) => {
  const normalized = roomCode.toUpperCase();
  const students = JSON.parse(localStorage.getItem(LOCAL_STUDENTS_KEY) || '[]');
  const student = students.find(
    (s) => s.roomCode.toUpperCase() === normalized && s.studentId === studentId
  );

  if (student) {
    student.violations = 0;
    student.status = 'ACTIVE';
    student.lastPing = new Date().toLocaleString('th-TH');
    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(students));
    logAuditLocal(normalized, studentId, student.studentName, 'RESET_WARNING', 'อาจารย์ผู้คุมสอบรีเซ็ตสถานะและล้างการเตือน');
  }

  apiPost({
    action: 'resetStudent',
    roomCode: normalized,
    studentId,
  });

  return { success: true };
};

/**
 * Force submit student
 */
export const forceSubmitStudent = async (roomCode, studentId) => {
  const normalized = roomCode.toUpperCase();
  const students = JSON.parse(localStorage.getItem(LOCAL_STUDENTS_KEY) || '[]');
  const student = students.find(
    (s) => s.roomCode.toUpperCase() === normalized && s.studentId === studentId
  );

  if (student) {
    student.status = 'SUBMITTED';
    student.submittedAt = new Date().toLocaleString('th-TH');
    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(students));
    logAuditLocal(normalized, studentId, student.studentName, 'FORCE_SUBMITTED', 'อาจารย์ผู้คุมสอบสั่งส่งข้อสอบแทน (Teacher Override)');
  }

  apiPost({
    action: 'forceSubmit',
    roomCode: normalized,
    studentId,
  });

  return { success: true };
};

/**
 * Fetch real-time dashboard data from MariaDB Backend
 */
export const getDashboardData = async (roomCode, bypassCache = false) => {
  const normalized = roomCode ? roomCode.toUpperCase().trim() : '';
  const cacheKey = 'dash_' + normalized;

  if (!bypassCache) {
    const cached = getCache(cacheKey);
    if (cached) return cached;
  }

  try {
    const data = await apiGet({
      action: 'getDashboard',
      roomCode: normalized,
    });

    if (data && data.success) {
      if (data.students) localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(data.students));
      if (data.logs) localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(data.logs));

      const result = {
        success: true,
        students: data.students || [],
        logs: data.logs || [],
        source: 'MARIADB_API',
      };

      setCache(cacheKey, result, 2000);
      return result;
    }
  } catch (err) {
    console.warn('getDashboardData network fallback to local:', err);
  }

  const allStudents = JSON.parse(localStorage.getItem(LOCAL_STUDENTS_KEY) || '[]');
  const allLogs = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');

  const filteredStudents = normalized
    ? allStudents.filter((s) => s.roomCode.toUpperCase() === normalized)
    : allStudents;

  const filteredLogs = normalized
    ? allLogs.filter((l) => l.roomCode.toUpperCase() === normalized)
    : allLogs;

  return {
    success: true,
    students: filteredStudents,
    logs: filteredLogs.slice(-50).reverse(),
    source: 'LOCAL_SYNC',
  };
};

export const clearAuditLogs = async (roomCode) => {
  localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify([]));
  apiPost({
    action: 'clearLogs',
    roomCode: roomCode || '',
  });
  return { success: true };
};

function logAuditLocal(roomCode, studentId, studentName, eventType, details) {
  const logs = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
  logs.unshift({
    timestamp: new Date().toLocaleString('th-TH'),
    roomCode,
    studentId,
    studentName,
    eventType,
    details,
  });
  if (logs.length > 300) logs.pop();
  localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs));
}
