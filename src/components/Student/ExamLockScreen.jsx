import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Stack,
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Maximize2,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff,
  Info,
  Volume2,
  Eye,
  EyeOff,
  Hash,
  BookOpen,
  X,
  ShieldAlert,
  Menu as MenuIcon,
  Search,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { logViolation, submitExam, updateStudentStatus } from '../../services/api';
import { playViolationSound, playSuccessSound } from '../../utils/sound';

const normalizeExamEmbedUrl = (value) => {
  try {
    const url = new URL(value);
    if (url.hostname !== 'drive.google.com') return value;

    const filePathMatch = url.pathname.match(/^\/file\/d\/([^/]+)/i);
    const fileId = filePathMatch?.[1] || url.searchParams.get('id');
    if (!fileId) return value;

    url.pathname = `/file/d/${fileId}/preview`;
    return url.toString();
  } catch (_) {
    return value;
  }
};

export default function ExamLockScreen({ room = {}, student = {}, onExitExam }) {
  // Check actual browser fullscreen status
  const checkIsFullscreen = () => {
    return Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  };

  // Mobile Safari/iPadOS changes the browser viewport as its toolbar appears
  // and disappears while scrolling, and does not consistently expose the
  // Fullscreen API. Treat touch devices as having no enforceable fullscreen.
  const isTouchDevice = Boolean(
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.('(pointer: coarse)').matches
  );

  const [isFullscreen, setIsFullscreen] = useState(() => checkIsFullscreen() || isTouchDevice);
  const [violations, setViolations] = useState(student.violations || 0);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningReason, setWarningReason] = useState('ออกจากโหมดเต็มจอ หรือสลับหน้าต่าง');
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [exitPinInput, setExitPinInput] = useState('');
  const [exitError, setExitError] = useState('');
  const [showExitPin, setShowExitPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [documentZoom, setDocumentZoom] = useState(1);
  const [toolsMenuAnchor, setToolsMenuAnchor] = useState(null);

  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const timerRef = useRef(null);
  const heartbeatRef = useRef(null);
  const isHandlingViolationRef = useRef(false);
  const departureTimerRef = useRef(null);
  const departureViolationLoggedRef = useRef(false);
  const splitScreenDetectedRef = useRef(false);

  // Lock Escape key using Chrome/Edge Keyboard Lock API if available
  const lockKeyboardKeys = async () => {
    if (navigator.keyboard && navigator.keyboard.lock) {
      try {
        await navigator.keyboard.lock(['Escape', 'F11']);
      } catch (e) {
        console.warn('Keyboard Lock API:', e);
      }
    }
  };

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Exam Elapsed Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Periodic Proctor Heartbeat (Every 15s)
  useEffect(() => {
    if (submitted) return;
    const sendHeartbeat = () => {
      if (room.roomCode && student.studentId) {
        updateStudentStatus(room.roomCode, student.studentId, 'ACTIVE');
      }
    };
    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, 15000);
    return () => clearInterval(heartbeatRef.current);
  }, [room.roomCode, student.studentId, submitted]);

  // Online / Offline monitor
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fullscreen Enforcer: Re-enter Fullscreen (Triggered by user click)
  const requestFullScreen = async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }

      await lockKeyboardKeys();
      setIsFullscreen(true);
      setWarningModalOpen(false);

      if (room.roomCode && student.studentId) {
        updateStudentStatus(room.roomCode, student.studentId, 'ACTIVE');
      }
    } catch (err) {
      console.warn('Fullscreen request prompt:', err);
      // If browser rejected fullscreen without gesture, user MUST click again
    }
  };

  // Trigger Violation Event & Popup Alert
  const handleViolationTrigger = useCallback(async (type, reason) => {
    if (submitted) return;

    // Play warning sound & mobile vibration
    if (soundEnabled) {
      playViolationSound();
    }
    if (navigator.vibrate) {
      navigator.vibrate([250, 100, 250]);
    }

    setWarningReason(reason);
    setWarningModalOpen(true);
    setViolations((prev) => prev + 1);

    try {
      const res = await logViolation(
        room.roomCode,
        student.studentId,
        student.studentName,
        type,
        reason
      );
      if (res && res.violations !== undefined) {
        setViolations(res.violations);
      }
    } catch (e) {
      console.warn('Log violation error:', e);
    }
  }, [room.roomCode, student.studentId, student.studentName, submitted, soundEnabled]);

  // Anti-Cheat & Lockdown Event Listeners
  useEffect(() => {
    // Attempt fullscreen and keyboard lock on mount
    requestFullScreen();

    // 1. Fullscreen change listener (Catches ESC key, F11, or browser exit button)
    const onFullscreenChange = () => {
      const isNowFs = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      setIsFullscreen(isNowFs || isTouchDevice);

      if (!isNowFs && !isTouchDevice && !submitted) {
        // Immediate violation trigger on ESC / Fullscreen exit
        handleViolationTrigger('LEFT_FULLSCREEN', 'ออกจากโหมดเต็มจอ (Exited Fullscreen)');
      } else if (isNowFs) {
        lockKeyboardKeys();
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);

    // 2. Distinguish a tab/app switch from a real page departure. Browsers
    // often emit visibilitychange immediately before pagehide when closing.
    const onVisibilityChange = () => {
      if (submitted) return;

      if (document.hidden) {
        clearTimeout(departureTimerRef.current);
        departureTimerRef.current = setTimeout(() => {
          departureViolationLoggedRef.current = true;
          handleViolationTrigger('TAB_SWITCH', 'สลับแท็บเบราว์เซอร์ หรือยุบหน้าจอสอบ');
          departureTimerRef.current = null;
        }, 900);
      } else {
        if (departureTimerRef.current) {
          clearTimeout(departureTimerRef.current);
          departureTimerRef.current = null;
          departureViolationLoggedRef.current = true;
          handleViolationTrigger('TAB_SWITCH', 'สลับแท็บเบราว์เซอร์ หรือยุบหน้าจอสอบ');
        }
        departureViolationLoggedRef.current = false;
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // pagehide fires after the user confirms leaving in the browser's
    // beforeunload prompt. A persisted page is being cached, so count it as
    // a tab switch instead of a browser exit.
    const onPageHide = (event) => {
      clearTimeout(departureTimerRef.current);
      departureTimerRef.current = null;
      if (submitted || departureViolationLoggedRef.current) return;

      departureViolationLoggedRef.current = true;
      if (event.persisted) {
        handleViolationTrigger('TAB_SWITCH', 'ออกจากหน้าสอบชั่วคราว หรือสลับแท็บเบราว์เซอร์');
      } else {
        handleViolationTrigger('BROWSER_EXIT', 'ปิดแท็บหรือออกจากหน้าสอบ');
      }
    };
    window.addEventListener('pagehide', onPageHide);

    // 3. Smart Window Blur listener (with iframe activeElement filter)
    const onWindowBlur = () => {
      if (isTouchDevice || submitted || exitModalOpen || infoModalOpen) return;

      setTimeout(() => {
        if (submitted || exitModalOpen || infoModalOpen) return;

        // If focus shifted to our exam iframe, student is typing answers in Google Forms (NOT a violation)
        if (document.activeElement === iframeRef.current) {
          return;
        }

        // If focus is truly outside window (Alt+Tab, dual monitor, or clicked desktop application)
        if (!document.hasFocus() || document.hidden) {
          handleViolationTrigger('BLUR', 'คลิกออกนอกหน้าต่างสอบ หรือเปิดโปรแกรมอื่น');
        }
      }, 120);
    };
    window.addEventListener('blur', onWindowBlur);

    // 4. Block Context Menu (Right Click)
    const onContextMenu = (e) => {
      e.preventDefault();
      return false;
    };
    window.addEventListener('contextmenu', onContextMenu);

    // 5. Block Keyboard Shortcuts & Prevent ESC
    const onKeyDown = (e) => {
      // Enter key to quickly re-enter fullscreen when warning is up
      if (e.key === 'Enter' && (!isFullscreen || warningModalOpen)) {
        e.preventDefault();
        requestFullScreen();
        return;
      }

      // Escape key: block default behavior
      if (e.key === 'Escape') {
        if (!submitted) {
          e.preventDefault();
          handleViolationTrigger('LEFT_FULLSCREEN', 'กดปุ่ม Escape (ออกจากโหมดเต็มจอ)');
          return false;
        }
      }

      // PrintScreen / Screenshot shortcut
      if (
        e.key === 'PrintScreen' ||
        (e.shiftKey && e.metaKey && ['3', '4', 's', 'S'].includes(e.key))
      ) {
        e.preventDefault();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('');
          }
        } catch (_) {}
        handleViolationTrigger('SCREENSHOT_ATTEMPT', 'ตรวจพบการพยายามจับภาพหน้าจอ (PrintScreen)');
        return false;
      }

      // F12 or DevTools (Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C)
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key))
      ) {
        e.preventDefault();
        handleViolationTrigger('DEVTOOLS', 'ตรวจพบการพยายามเปิด Developer Tools');
        return false;
      }

      // Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        return false;
      }

      // Ctrl+P (Print)
      if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        return false;
      }

      // Ctrl+S (Save)
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        return false;
      }

      // Refresh F5, Ctrl+R
      if (e.key === 'F5' || (e.ctrlKey && (e.key === 'r' || e.key === 'R'))) {
        e.preventDefault();
        return false;
      }

      // New tab Ctrl+T, New window Ctrl+N
      if (e.ctrlKey && (e.key === 't' || e.key === 'T' || e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        return false;
      }
    };
    window.addEventListener('keydown', onKeyDown);

    // 6. Window resize / split screen detection
    let resizeTimer = null;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (submitted) return;

        // Touch browsers change viewport height as their chrome appears while
        // scrolling, so use width only on phones/tablets. Side-by-side split
        // view substantially reduces the available width without reacting to
        // normal page scrolling or the on-screen keyboard.
        const screenW = (isTouchDevice ? window.screen.width : window.screen.availWidth) || window.screen.width;
        const screenH = window.screen.availHeight || window.screen.height;
        const isSplitScreen = isTouchDevice
          ? window.innerWidth < screenW * 0.8
          : window.innerWidth < screenW * 0.65 || window.innerHeight < screenH * 0.65;

        if (isSplitScreen && !splitScreenDetectedRef.current) {
          splitScreenDetectedRef.current = true;
          handleViolationTrigger('SPLIT_SCREEN', 'ตรวจพบการย่อหรือแบ่งหน้าจอ (Split Screen)');
        } else if (!isSplitScreen) {
          splitScreenDetectedRef.current = false;
        }
      }, 500);
    };
    window.addEventListener('resize', onResize);
    onResize();

    // 7. Prevent Unload / Back navigation
    const onBeforeUnload = (e) => {
      if (!submitted) {
        e.preventDefault();
        e.returnValue = 'คุณกำลังอยู่ในระหว่างการสอบ ห้ามปิดหน้าต่างนี้';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    // History popstate trap
    window.history.pushState(null, '', window.location.href);
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', onPopState);

    // 8. Block Copy / Cut / Paste / Drag on wrapper
    const onCopy = (e) => e.preventDefault();
    const onPaste = (e) => e.preventDefault();
    const onDragStart = (e) => e.preventDefault();

    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('dragstart', onDragStart);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('mozfullscreenchange', onFullscreenChange);
      document.removeEventListener('MSFullscreenChange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      clearTimeout(departureTimerRef.current);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      clearTimeout(resizeTimer);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('dragstart', onDragStart);
    };
  }, [submitted, exitModalOpen, infoModalOpen, handleViolationTrigger, isTouchDevice]);

  const openExitModal = () => {
    setShowExitPin(false);
    setExitModalOpen(true);
  };

  const closeExitModal = () => {
    setShowExitPin(false);
    setExitModalOpen(false);
  };

  // Handle Exit PIN verify
  const handleVerifyExitPin = async (e) => {
    e.preventDefault();
    setExitError('');
    setSubmitting(true);

    try {
      const res = await submitExam(
        room.roomCode,
        student.studentId,
        student.studentName,
        exitPinInput.trim()
      );

      if (res.success) {
        playSuccessSound();
        setSubmitted(true);
        closeExitModal();
        setWarningModalOpen(false);

        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } else {
        setExitError(res.error || 'รหัส Exit PIN ไม่ถูกต้อง กรุณาติดต่ออาจารย์ผู้คุมสอบ');
      }
    } catch (err) {
      setExitError(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบ Exit PIN');
    } finally {
      setSubmitting(false);
    }
  };

  // Whether student is currently locked out (MUST return to fullscreen)
  const isLockedOut = (!isFullscreen || warningModalOpen) && !submitted;

  // ----------------------------------------------------
  // VIEW: Exam Submitted Successfully
  // ----------------------------------------------------
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />

          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-pulse">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-[11px] font-mono tracking-wider font-bold text-emerald-400 uppercase bg-emerald-950/70 border border-emerald-800/60 px-3 py-1 rounded-full">
              Submitted & Unlocked
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-3">
              ส่งข้อสอบและปลดล็อกเรียบร้อย
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              ระบบได้บันทึกเวลาและสถิติการสอบส่งไปยังอาจารย์ผู้คุมสอบเรียบร้อยแล้ว
            </p>
          </div>

          <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800 text-left text-xs space-y-2.5 font-mono">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                <BookOpen className="w-3.5 h-3.5 text-slate-500" /> วิชาสอบ
              </span>
              <span className="text-white font-bold truncate max-w-[200px] text-right font-sans">
                {room.title || 'ห้องสอบออนไลน์'}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                <Hash className="w-3.5 h-3.5 text-slate-500" /> รหัสห้อง
              </span>
              <span className="text-brand-400 font-bold">{room.roomCode}</span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                <User className="w-3.5 h-3.5 text-slate-500" /> นักศึกษา
              </span>
              <span className="text-white font-bold font-sans">
                {student.studentName} ({student.studentId})
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                <Clock className="w-3.5 h-3.5 text-slate-500" /> เวลาที่ใช้สอบ
              </span>
              <span className="text-emerald-400 font-bold">{formatTime(elapsedSeconds)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-500" /> บันทึกหลุดจอ
              </span>
              <span className={violations > 0 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                {violations} ครั้ง
              </span>
            </div>
          </div>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            onClick={onExitExam}
            sx={{
              py: 1.5,
              borderRadius: 3,
              fontWeight: 800,
              fontSize: '0.95rem',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
            }}
          >
            เสร็จสิ้น (กลับสู่หน้าหลัก)
          </Button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW: Active Proctor Lockdown Shell
  // ----------------------------------------------------
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col no-select overflow-hidden select-none"
      style={{ height: '100dvh' }}
    >
      {/* ========================================================= */}
      {/* TOP RESPONSIVE PROCTOR HUD BAR */}
      {/* ========================================================= */}
      <header className="h-14 sm:h-16 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-2.5 sm:px-4 flex items-center justify-between text-white shrink-0 z-30 shadow-lg">
        {/* LEFT: Room Title, Room Code, and Student Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Lock className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
          </div>

          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center space-x-1.5 truncate">
              <span className="font-bold text-xs sm:text-sm text-white truncate max-w-[120px] xs:max-w-[160px] sm:max-w-[220px] md:max-w-[320px]">
                {room.title || 'ห้องสอบออนไลน์'}
              </span>
              <span className="font-mono text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-brand-300 border border-slate-700 font-bold shrink-0">
                {room.roomCode}
              </span>
            </div>

            <div className="flex items-center space-x-1.5 text-[10px] sm:text-[11px] text-slate-400">
              <span className="truncate max-w-[120px] sm:max-w-[180px] text-slate-300 font-medium hidden xs:inline">
                {student.studentName}
              </span>
              <span className="font-mono text-slate-400 font-semibold">
                ({student.studentId})
              </span>
            </div>
          </div>
        </div>

        {/* CENTER: Live Timer & Connection Status */}
        <div className="flex items-center space-x-2 shrink-0 mx-1">
          <div className="flex items-center space-x-1.5 bg-slate-800/90 px-2 sm:px-3 py-1 rounded-full border border-slate-700 text-slate-200 shadow-inner">
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400 shrink-0" />
            <span className="text-[11px] sm:text-xs font-mono font-bold tracking-tight">
              {formatTime(elapsedSeconds)}
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-1 px-2 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-[10px] font-mono">
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-bold">ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-400 animate-pulse" />
                <span className="text-amber-400 font-bold">RECONNECTING</span>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Exam Info, Tools Menu & Exit PIN Button */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <Tooltip title={watermarkEnabled ? 'ซ่อนลายน้ำนิรภัย' : 'แสดงลายน้ำนิรภัย'}>
            <IconButton
              size="small"
              onClick={() => setWatermarkEnabled((prev) => !prev)}
              sx={{
                color: watermarkEnabled ? '#60a5fa' : '#64748b',
                display: { xs: 'none', lg: 'inline-flex' },
                p: 0.8,
              }}
            >
              {watermarkEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </IconButton>
          </Tooltip>

          <Tooltip title="ข้อมูลและกฎการสอบ">
            <IconButton
              size="small"
              onClick={() => setInfoModalOpen(true)}
              sx={{
                color: '#94a3b8',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' },
                p: { xs: 0.8, sm: 1 },
                borderRadius: 2,
              }}
            >
              <Info className="w-4 h-4" />
            </IconButton>
          </Tooltip>

          <Tooltip title="เมนูเครื่องมือ">
            <IconButton
              size="small"
              aria-label="เปิดเมนูเครื่องมือ"
              onClick={(e) => setToolsMenuAnchor(e.currentTarget)}
              sx={{
                color: '#cbd5e1',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' },
                p: { xs: 0.8, sm: 1 },
                borderRadius: 2,
              }}
            >
              <MenuIcon className="w-4 h-4" />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={toolsMenuAnchor}
            open={Boolean(toolsMenuAnchor)}
            onClose={() => setToolsMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{ sx: { width: 260, borderRadius: 2.5, p: 0.5 } }}
          >
            <MenuItem
              onClick={() => {
                setToolsMenuAnchor(null);
                setInfoModalOpen(true);
              }}
              sx={{ gap: 1.25, borderRadius: 1.5, color: violations > 0 ? '#dc2626' : '#059669', fontWeight: 700 }}
            >
              {violations > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {violations > 0 ? `การแจ้งเตือน ${violations} ครั้ง` : 'สถานะปกติ · ไม่มีการแจ้งเตือน'}
            </MenuItem>
            <Box sx={{ px: 1.5, pt: 1, pb: 0.5, display: 'flex', alignItems: 'center', gap: 1, color: '#475569', fontSize: '0.85rem', fontWeight: 700 }}>
              <Search size={17} /> ซูมเนื้อหาเอกสาร
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, pb: 1 }}>
              <IconButton
                size="small"
                aria-label="ซูมออก"
                title="ซูมออก"
                disabled={documentZoom <= 0.7}
                onClick={() => setDocumentZoom((zoom) => Math.max(0.7, Number((zoom - 0.1).toFixed(1))))}
              >
                <ZoomOut size={19} />
              </IconButton>
              <Typography variant="body2" sx={{ minWidth: 48, textAlign: 'center', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(documentZoom * 100)}%
              </Typography>
              <IconButton
                size="small"
                aria-label="ซูมเข้า"
                title="ซูมเข้า"
                disabled={documentZoom >= 2.5}
                onClick={() => setDocumentZoom((zoom) => Math.min(2.5, Number((zoom + 0.1).toFixed(1))))}
              >
                <ZoomIn size={19} />
              </IconButton>
              <Button size="small" onClick={() => setDocumentZoom(1)} sx={{ ml: 0.5, textTransform: 'none', fontWeight: 700 }}>
                รีเซ็ต
              </Button>
            </Box>
          </Menu>

          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={openExitModal}
            startIcon={<Unlock className="w-3.5 h-3.5" />}
            sx={{
              fontWeight: 800,
              fontSize: { xs: '0.75rem', sm: '0.8rem' },
              borderRadius: 2,
              px: { xs: 1.2, sm: 2 },
              py: { xs: 0.6, sm: 0.8 },
              whiteSpace: 'nowrap',
              minWidth: 'auto',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
            }}
          >
            <span className="hidden xs:inline">ส่งข้อสอบ</span>
            <span className="xs:hidden">ส่ง</span>
            <span className="hidden md:inline">&nbsp;(Exit PIN)</span>
          </Button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN EXAM CANVAS & SECURE SHELL */}
      {/* ========================================================= */}
      <div
        className={`flex-1 relative w-full h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)] bg-white overflow-hidden transition-all duration-300 ${
          isLockedOut ? 'filter blur-md pointer-events-none select-none opacity-40' : ''
        }`}
      >
        {/* Dynamic Watermark Protection Overlay */}
        {watermarkEnabled && (
          <div
            className="absolute inset-0 pointer-events-none z-20 select-none overflow-hidden opacity-25"
            style={{
              backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
                <svg xmlns='http://www.w3.org/2000/svg' width='320' height='160'>
                  <text x='20' y='80' fill='#0f172a' opacity='0.25' font-size='12' font-family='monospace' font-weight='bold' transform='rotate(-20 20 80)'>
                    ${student.studentName} • ${student.studentId} • ${room.roomCode}
                  </text>
                </svg>
              `)}")`,
            }}
          />
        )}

        {/* Offline Alert Strip */}
        {!isOnline && (
          <div className="absolute top-0 left-0 right-0 z-30 bg-amber-500 text-slate-950 px-4 py-1 text-xs font-bold text-center flex items-center justify-center space-x-2 shadow-md">
            <WifiOff className="w-3.5 h-3.5 animate-pulse" />
            <span>สัญญาณอินเทอร์เน็ตขาดหาย! ระบบยังคงบันทึกข้อมูลและรอเชื่อมต่อให้อัตโนมัติ</span>
          </div>
        )}

        {/* Secure Exam Iframe Shell */}
        {room.examUrl ? (
          <div className="absolute inset-0 overflow-auto bg-white">
            <div
              style={{
                width: `${Math.max(1, documentZoom) * 100}%`,
                height: `${Math.max(1, documentZoom) * 100}%`,
              }}
            >
              <iframe
                ref={iframeRef}
                src={normalizeExamEmbedUrl(room.examUrl)}
                title="Online Exam Sheet"
                className="block border-0 select-none bg-white"
                style={{
                  width: `${100 / Math.max(1, documentZoom)}%`,
                  height: `${100 / Math.max(1, documentZoom)}%`,
                  transform: `scale(${documentZoom})`,
                  transformOrigin: 'top left',
                }}
                allow="fullscreen; clipboard-read; clipboard-write; microphone; camera"
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3 p-6 text-center">
            <AlertCircle className="w-12 h-12 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-700">ไม่พบ URL ข้อสอบ</h2>
            <p className="text-xs text-slate-500 max-w-sm">
              ห้องสอบนี้ยังไม่ได้กำหนดลิงก์ข้อสอบ กรุณาแจ้งอาจารย์ผู้คุมสอบ
            </p>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* AIRTIGHT EMERGENCY LOCKDOWN OVERLAY (WHEN ESC PRESSED OR BLUR) */}
      {/* ========================================================= */}
      {isLockedOut && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className="max-w-sm sm:max-w-md w-full rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
            style={{
              backgroundColor: '#fef2f2',
              border: '2px solid #dc2626',
              boxShadow: '0 25px 60px -15px rgba(220, 38, 38, 0.5)',
            }}
          >
            {/* Top red icon badge */}
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full text-white flex items-center justify-center mx-auto shadow-xl animate-bounce"
              style={{
                backgroundColor: '#dc2626',
                boxShadow: '0 10px 25px rgba(220, 38, 38, 0.45)',
              }}
            >
              <AlertTriangle className="w-9 h-9 sm:w-11 sm:h-11 text-white" />
            </div>

            <div>
              <h2
                className="text-xl sm:text-2xl font-black tracking-tight"
                style={{ color: '#991b1b' }}
              >
                ตรวจพบการทำผิดกฎการสอบ!
              </h2>
              <p
                className="text-sm sm:text-base font-bold mt-1"
                style={{ color: '#b91c1c' }}
              >
                {warningReason || 'คลิกออกนอกหน้าต่างสอบ หรือเปิดโปรแกรมอื่น'}
              </p>
            </div>

            {/* Violation Details Box (Pure white card matching reference) */}
            <div
              className="rounded-2xl p-4 text-center space-y-1 shadow-sm"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid rgba(220, 38, 38, 0.25)',
              }}
            >
              <p className="text-sm sm:text-base font-bold text-slate-900">
                บันทึกการละเมิดสะสม:{' '}
                <span
                  style={{
                    color: '#dc2626',
                    fontFamily: 'monospace',
                    fontSize: '1.4rem',
                    fontWeight: 900,
                  }}
                >
                  {violations}
                </span>{' '}
                ครั้ง
              </p>
              <p className="text-xs text-slate-500">
                เหตุการณ์นี้ถูกส่งไปยังแดชบอร์ดอาจารย์ผู้คุมสอบเรียบร้อยแล้ว
              </p>
            </div>

            {/* Resume Fullscreen Primary Action Button (Pure red, no blue focus outline) */}
            <button
              type="button"
              onClick={requestFullScreen}
              className="w-full py-3.5 sm:py-4 px-6 rounded-2xl text-white font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: '#dc2626',
                boxShadow: '0 8px 24px rgba(220, 38, 38, 0.45)',
                border: 'none',
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#b91c1c';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(220, 38, 38, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(220, 38, 38, 0.45)';
              }}
            >
              <Maximize2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              <span>กลับเข้าสู่โหมดเต็มจอทันที</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. EXIT PIN / SUBMISSION MODAL */}
      {/* ========================================================= */}
      <Dialog
        open={exitModalOpen}
        onClose={closeExitModal}
        maxWidth="xs"
        fullWidth
        aria-labelledby="exit-modal-title"
        PaperProps={{
          sx: {
            borderRadius: 4,
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            m: 2,
          },
        }}
      >
        <form onSubmit={handleVerifyExitPin}>
          <DialogTitle sx={{ p: { xs: 2, sm: 2.5 }, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2.5,
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Lock className="w-5 h-5" />
                </Box>
                <div>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                    ส่งข้อสอบและปลดล็อก
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    ยืนยันด้วย Exit PIN จากอาจารย์
                  </Typography>
                </div>
              </Box>

              <IconButton size="small" onClick={closeExitModal}>
                <X className="w-4 h-4 text-slate-400" />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Stack spacing={2.5}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  backgroundColor: '#f8fafc',
                  borderColor: '#e2e8f0',
                }}
              >
                <Typography variant="caption" sx={{ color: '#475569', display: 'block', lineHeight: 1.5 }}>
                  1. ตรวจสอบว่าได้กด <strong>"ส่งคำตอบ (Submit)"</strong> ในแบบฟอร์มข้อสอบด้านล่างเรียบร้อยแล้ว<br />
                  2. แจ้งอาจารย์ผู้คุมสอบเพื่อขอรับ <strong>รหัส Exit PIN</strong> ปลดล็อกหน้าจอ
                </Typography>
              </Paper>

              {exitError && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {exitError}
                </Alert>
              )}

              <TextField
                label="Exit PIN (รหัสปลดล็อก 4-8 หลัก)"
                type={showExitPin ? 'text' : 'password'}
                required
                autoFocus
                placeholder="กรอก Exit PIN"
                value={exitPinInput}
                onChange={(e) => setExitPinInput(e.target.value)}
                inputProps={{
                  maxLength: 12,
                  inputMode: 'numeric',
                  style: {
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '1.5rem',
                    letterSpacing: 6,
                    textAlign: 'center',
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      size="small"
                      type="button"
                      aria-label={showExitPin ? 'ซ่อนรหัส Exit PIN' : 'แสดงรหัส Exit PIN'}
                      onClick={() => setShowExitPin((prev) => !prev)}
                      sx={{ color: '#94a3b8' }}
                    >
                      {showExitPin ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </IconButton>
                  ),
                }}
              />
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <Button
              onClick={closeExitModal}
              color="inherit"
              disabled={submitting}
              sx={{ fontWeight: 700 }}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting || !exitPinInput.trim()}
              sx={{ fontWeight: 800, borderRadius: 2.5, px: 3, py: 1 }}
            >
              {submitting ? 'กำลังตรวจสอบ...' : 'ยืนยันและส่งข้อสอบ'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ========================================================= */}
      {/* 3. EXAM RULES & STUDENT INFO MODAL */}
      {/* ========================================================= */}
      <Dialog
        open={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.2)',
            m: 2,
          },
        }}
      >
        <DialogTitle sx={{ p: 2.5, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Info className="w-5 h-5" />
              </Box>
              <div>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                  ข้อมูลและกฎการสอบ
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  ระบบความปลอดภัย SAMMLocker
                </Typography>
              </div>
            </Box>
            <IconButton size="small" onClick={() => setInfoModalOpen(false)}>
              <X className="w-4 h-4 text-slate-400" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, backgroundColor: '#f8fafc' }}>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">วิชาสอบ:</span>
                  <span className="text-slate-900 font-bold font-sans">{room.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">รหัสห้อง:</span>
                  <span className="text-brand-600 font-bold">{room.roomCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">ผู้เข้าสอบ:</span>
                  <span className="text-slate-900 font-bold font-sans">{student.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">รหัสนักศึกษา:</span>
                  <span className="text-slate-900 font-bold">{student.studentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">เวลาที่เริ่มสอบ:</span>
                  <span className="text-slate-700">{student.joinedAt || 'วันนี้'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">หลุดจอสะสม:</span>
                  <span className={violations > 0 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
                    {violations} ครั้ง
                  </span>
                </div>
              </div>
            </Paper>

            <div>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', display: 'block', mb: 1 }}>
                กฎระเบียบความปลอดภัย 5 ข้อ:
              </Typography>
              <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc">
                <li>ห้ามออกจากโหมดเต็มจอ หรือกดปุ่ม ESC / F11</li>
                <li>ห้ามสลับไปแท็บอื่น หรือเปิดโปรแกรมใดๆ บนเครื่อง</li>
                <li>ห้ามแบ่งหน้าจอ (Split Screen) หรือใช้จอเสริม</li>
                <li>ห้ามพยายามจับภาพหน้าจอ (PrintScreen) หรือเปิด DevTools</li>
                <li>เมื่อทำข้อสอบเสร็จ ให้กดส่งในแบบฟอร์มก่อน แล้วติดต่ออาจารย์เพื่อรับ Exit PIN</li>
              </ul>
            </div>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px solid #e2e8f0' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                เสียงแจ้งเตือนการละเมิด
              </Typography>
              <Button
                size="small"
                variant={soundEnabled ? 'outlined' : 'text'}
                color={soundEnabled ? 'primary' : 'inherit'}
                onClick={() => setSoundEnabled((prev) => !prev)}
                startIcon={<Volume2 className="w-3.5 h-3.5" />}
                sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.3 }}
              >
                {soundEnabled ? 'เปิดเสียงอยู่' : 'ปิดเสียง'}
              </Button>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={() => setInfoModalOpen(false)}
            sx={{ fontWeight: 800, borderRadius: 2.5 }}
          >
            เข้าใจแล้ว (กลับสู่การสอบ)
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
