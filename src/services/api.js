/**
 * Service to handle data persistence:
 * Connected directly to SAMMLocker MariaDB/PHP REST API (dashboard.bcnlp.ac.th)
 * with backward-compatible Google Apps Script (GAS) Web App fallback.
 */

const GAS_URL_KEY = 'secure_exam_gas_url';
const LOCAL_ROOMS_KEY = 'secure_exam_rooms';
const LOCAL_STUDENTS_KEY = 'secure_exam_students';
const LOCAL_LOGS_KEY = 'secure_exam_logs';

export const DEFAULT_API_URL = 'https://dashboard.bcnlp.ac.th/api/SammLocker';
const LEGACY_DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwSASTBGD_mcK796wybE6DOQqkdojhfPf7Yes8BZJGMJrqguPNE-900uacOzHKmpbP6/exec';

export const isGasUrl = (url) => {
  return Boolean(url && url.includes('script.google.com'));
};

export const normalizeGasUrl = (url) => {
  let trimmed = (url || '').trim();
  if (!trimmed) return DEFAULT_API_URL;

  // If user pasted just deployment ID (starts with AKfycb...)
  if (trimmed.startsWith('AKfycb') && !trimmed.includes('/')) {
    trimmed = `https://script.google.com/macros/s/${trimmed}/exec`;
  }

  // Remove trailing ellipsis if inadvertently copied with ...
  trimmed = trimmed.replace(/\.{2,}$/, '');

  // Strip /dev or /echo and ensure /exec for Google Apps Script
  if (trimmed.includes('script.google.com')) {
    trimmed = trimmed.replace(/\/dev(\?.*)?$/, '/exec');
    trimmed = trimmed.replace(/\/echo(\?.*)?$/, '/exec');
    if (!trimmed.endsWith('/exec')) {
      trimmed = trimmed.replace(/\/+$/, '') + '/exec';
    }
  } else {
    // For standard PHP/REST endpoints, strip trailing slashes or index.php
    trimmed = trimmed.replace(/\/+$/, '').replace(/\/index\.php$/i, '');
  }

  return trimmed;
};

export const getGasUrl = () => {
  const stored = localStorage.getItem(GAS_URL_KEY);
  if (!stored || stored === LEGACY_DEFAULT_GAS_URL) {
    localStorage.setItem(GAS_URL_KEY, DEFAULT_API_URL);
    return DEFAULT_API_URL;
  }

  const normalized = normalizeGasUrl(stored);
  if (normalized !== stored) localStorage.setItem(GAS_URL_KEY, normalized);
  return normalized;
};

export const setGasUrl = (url) => {
  const norm = normalizeGasUrl(url);
  localStorage.setItem(GAS_URL_KEY, norm);
};

// In-memory cache & In-flight request deduplication for high concurrency
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

// Safe JSONP Client with Request Deduplication for Google Apps Script
const fetchJsonp = (baseUrl, params = {}, timeout = 20000) => {
  const queryString = new URLSearchParams(params).toString();
  const dedupKey = `${baseUrl}?${queryString}`;

  if (inFlightRequests.has(dedupKey)) {
    return inFlightRequests.get(dedupKey);
  }

  const promise = new Promise((resolve) => {
    const callbackName = 'gas_cb_' + Math.random().toString(36).substring(2, 9);
    const script = document.createElement('script');
    let timer = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      inFlightRequests.delete(dedupKey);
    };

    window[callbackName] = (data) => {
      cleanup();
      resolve(data || { success: true });
    };

    timer = setTimeout(() => {
      cleanup();
      resolve({ success: false, error: 'TIMEOUT' });
    }, timeout);

    script.onerror = () => {
      cleanup();
      resolve({ success: false, error: 'SCRIPT_ERROR' });
    };

    try {
      const fullQuery = new URLSearchParams({ ...params, callback: callbackName }).toString();
      script.src = `${baseUrl}?${fullQuery}`;
      document.body.appendChild(script);
    } catch (e) {
      cleanup();
      resolve({ success: false, error: e.message });
    }
  });

  inFlightRequests.set(dedupKey, promise);
  return promise;
};

// Safe background write: Supports PHP REST API & Google Apps Script
const sendApiPost = async (data) => {
  const apiUrl = getGasUrl();
  if (!apiUrl) return;

  if (isGasUrl(apiUrl)) {
    // Google Apps Script keepalive no-cors
    try {
      fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data),
      }).catch(() => {});
    } catch (e) {}
    return;
  }

  // High-speed PHP REST Backend
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      keepalive: true,
      body: JSON.stringify(data),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('API POST warn (will rely on local optimistic cache):', e);
  }
};

// Initial local store: Pure empty state (NO mock data)
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

export const testGasConnection = async (urlToTest) => {
  const target = normalizeGasUrl(urlToTest || getGasUrl());
  if (!target) {
    throw new Error('กรุณาระบุ URL ของ SAMMLocker API หรือ Google Apps Script');
  }

  let data;
  if (isGasUrl(target)) {
    data = await fetchJsonp(target, { action: 'ping' });
  } else {
    try {
      const res = await fetch(`${target}?action=ping`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      data = await res.json();
    } catch (e) {
      throw new Error(`ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ API ได้ (${e.message}): กรุณาตรวจสอบว่าได้อัปโหลดไฟล์ไปยัง ${target} แล้ว`);
    }
  }

  if (data && data.success) {
    return data;
  }

  const reason = data?.error;
  if (reason === 'TIMEOUT') {
    throw new Error('เชื่อมต่อไม่ทันเวลา (Timeout): กรุณาตรวจสอบสถานะเซิร์ฟเวอร์');
  }
  if (reason === 'SCRIPT_ERROR') {
    throw new Error('เปิด Web App ไม่สำเร็จ: ตรวจสอบสิทธิ์ Anyone และ Executions');
  }
  throw new Error(reason || 'API ตอบกลับไม่ถูกต้อง: กรุณาตรวจสอบ URL');
};

/**
 * Admin Login: validates against MariaDB `admins` table or Google Sheets
 */
export const adminLoginSheet = async (username, password) => {
  const apiUrl = getGasUrl();
  if (!apiUrl) {
    return { success: false, error: 'ยังไม่ได้ระบุ API URL สำหรับเชื่อมต่อระบบ' };
  }

  try {
    let data;
    if (isGasUrl(apiUrl)) {
      data = await fetchJsonp(apiUrl, {
        action: 'adminLogin',
        username: username.trim(),
        password: password,
      });
    } else {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          action: 'adminLogin',
          username: username.trim(),
          password: password,
        }),
      });
      data = await res.json();
    }

    if (data && data.success && data.user) {
      return data;
    }
    if (data && data.error && data.error !== 'SCRIPT_ERROR' && data.error !== 'TIMEOUT') {
      return data;
    }
    if (data && (data.error === 'SCRIPT_ERROR' || data.error === 'TIMEOUT')) {
      return {
        success: false,
        error: data.error === 'TIMEOUT'
          ? 'หมดเวลารอเซิร์ฟเวอร์: ตรวจสอบสถานะเครือข่ายและการเชื่อมต่อเซิร์ฟเวอร์'
          : 'เบราว์เซอร์ไม่สามารถติดต่อ API ได้: ตรวจสอบ URL และการเชื่อมต่ออินเทอร์เน็ต',
      };
    }
  } catch (e) {
    return { success: false, error: e.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' };
  }

  return { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง (ตรวจสอบในตาราง admins)' };
};

/**
 * List all rooms from MariaDB / Google Sheet
 */
export const listRooms = async () => {
  const cached = getCache('rooms_list');
  if (cached) return { success: true, rooms: cached };

  const apiUrl = getGasUrl();
  if (apiUrl) {
    try {
      let data;
      if (isGasUrl(apiUrl)) {
        data = await fetchJsonp(apiUrl, { action: 'listRooms' });
      } else {
        const res = await fetch(`${apiUrl}?action=listRooms`, {
          headers: { 'Accept': 'application/json' },
        });
        data = await res.json();
      }

      if (data && data.success && Array.isArray(data.rooms)) {
        setCache('rooms_list', data.rooms, 15000);
        localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(data.rooms));
        return { success: true, rooms: data.rooms };
      }
    } catch (e) {}
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

  // Invalidate cache
  invalidateCache('rooms_list');
  invalidateCache('room_' + normalizedCode);

  // 1. Save locally
  const rooms = JSON.parse(localStorage.getItem(LOCAL_ROOMS_KEY) || '[]');
  const existingIdx = rooms.findIndex((r) => r.roomCode.toUpperCase() === normalizedCode);
  if (existingIdx >= 0) {
    rooms[existingIdx] = roomObj;
  } else {
    rooms.unshift(roomObj);
  }
  localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));

  // 2. Safe background sync to Backend
  sendApiPost({
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

  const apiUrl = getGasUrl();
  if (apiUrl) {
    try {
      let data;
      if (isGasUrl(apiUrl)) {
        data = await fetchJsonp(apiUrl, { action: 'getRoom', roomCode: normalized });
      } else {
        const res = await fetch(`${apiUrl}?action=getRoom&roomCode=${encodeURIComponent(normalized)}`, {
          headers: { 'Accept': 'application/json' },
        });
        data = await res.json();
      }

      if (data && data.success && data.room) {
        setCache('room_' + normalized, data.room, 30000);
        return data;
      }
    } catch (e) {}
  }

  const rooms = JSON.parse(localStorage.getItem(LOCAL_ROOMS_KEY) || '[]');
  const localMatch = rooms.find((r) => r.roomCode.toUpperCase() === normalized);
  if (localMatch) {
    return { success: true, room: localMatch };
  }

  return { success: false, error: 'ไม่พบรหัสห้องสอบนี้ในฐานข้อมูล' };
};

/**
 * Update an existing room
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

  sendApiPost({
    action: 'updateRoom',
    roomCode: normalized,
    ...updatedFields,
  });

  return { success: true };
};

/**
 * Delete a room
 */
export const deleteRoom = async (roomCode) => {
  const normalized = roomCode.toUpperCase().trim();
  invalidateCache('rooms_list');
  invalidateCache('room_' + normalized);

  const rooms = JSON.parse(localStorage.getItem(LOCAL_ROOMS_KEY) || '[]');
  const filtered = rooms.filter((r) => r.roomCode.toUpperCase() !== normalized);
  localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(filtered));

  sendApiPost({
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

  sendApiPost({
    action: 'joinRoom',
    roomCode: normalized,
    studentId,
    studentName,
  });

  return { success: true, student };
};

// Throttle tracking for student violations to protect backend from client burst
const lastViolationSent = new Map();
const violationTimers = new Map();

/**
 * Log violation with client-side burst throttling & local optimistic update
 */
export const logViolation = async (roomCode, studentId, studentName, eventType, details) => {
  const normalized = roomCode.toUpperCase();
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

  // Throttle network writes to at most 1 per 2.5 seconds per student
  const throttleKey = `${normalized}_${studentId}`;
  const lastTime = lastViolationSent.get(throttleKey) || 0;
  const nowMs = Date.now();

  if (nowMs - lastTime > 2500) {
    lastViolationSent.set(throttleKey, nowMs);
    sendApiPost({
      action: 'logViolation',
      roomCode: normalized,
      studentId,
      studentName,
      eventType,
      details,
    });
  } else {
    // Debounce delayed batch send
    if (violationTimers.has(throttleKey)) {
      clearTimeout(violationTimers.get(throttleKey));
    }
    const timer = setTimeout(() => {
      lastViolationSent.set(throttleKey, Date.now());
      violationTimers.delete(throttleKey);
      sendApiPost({
        action: 'logViolation',
        roomCode: normalized,
        studentId,
        studentName,
        eventType,
        details: `${details} (สะสม ${violations} ครั้ง)`,
      });
    }, 2600);
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

  sendApiPost({
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

  sendApiPost({
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

  sendApiPost({
    action: 'forceSubmit',
    roomCode: normalized,
    studentId,
  });

  return { success: true };
};

/**
 * Fetch real-time dashboard data directly from Backend (MariaDB / Sheets)
 * Protected with memory cache to prevent duplicate requests across components
 */
export const getDashboardData = async (roomCode, bypassCache = false) => {
  const normalized = roomCode ? roomCode.toUpperCase().trim() : '';
  const cacheKey = 'dash_' + normalized;

  if (!bypassCache) {
    const cached = getCache(cacheKey);
    if (cached) return cached;
  }

  const apiUrl = getGasUrl();
  if (apiUrl) {
    try {
      let data;
      if (isGasUrl(apiUrl)) {
        data = await fetchJsonp(apiUrl, {
          action: 'getDashboard',
          roomCode: normalized,
        });
      } else {
        const res = await fetch(`${apiUrl}?action=getDashboard&roomCode=${encodeURIComponent(normalized)}`, {
          headers: { 'Accept': 'application/json' },
        });
        data = await res.json();
      }

      if (data && data.success) {
        if (data.students) localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(data.students));
        if (data.logs) localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(data.logs));

        const result = {
          success: true,
          students: data.students || [],
          logs: data.logs || [],
          source: isGasUrl(apiUrl) ? 'GOOGLE_SHEET' : 'MARIADB_API',
        };

        // Cache for 2.5 seconds to protect backend
        setCache(cacheKey, result, 2500);
        return result;
      }
    } catch (e) {}
  }

  const allStudents = JSON.parse(localStorage.getItem(LOCAL_STUDENTS_KEY) || '[]');
  const allLogs = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');

  const filteredStudents = normalized
    ? allStudents.filter((s) => s.roomCode.toUpperCase() === normalized)
    : allStudents;

  const filteredLogs = normalized
    ? allLogs.filter((l) => l.roomCode.toUpperCase() === normalized)
    : allLogs;

  const localResult = {
    success: true,
    students: filteredStudents,
    logs: filteredLogs.slice(-50).reverse(),
    source: 'LOCAL_SYNC',
  };

  return localResult;
};

export const clearAuditLogs = async (roomCode) => {
  localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify([]));
  sendApiPost({
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
