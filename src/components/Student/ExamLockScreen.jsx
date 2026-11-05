import React, { useState, useEffect, useRef } from 'react';
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
} from '@mui/material';
import {
  ShieldAlert,
  Maximize2,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  User,
  CheckCircle2,
  ExternalLink,
  Volume2,
} from 'lucide-react';
import { logViolation, submitExam, updateStudentStatus } from '../../services/api';
import { playViolationSound, playSuccessSound } from '../../utils/sound';

export default function ExamLockScreen({ room, student, onExitExam }) {
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [violations, setViolations] = useState(student.violations || 0);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningReason, setWarningReason] = useState('');
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [exitPinInput, setExitPinInput] = useState('');
  const [exitError, setExitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const containerRef = useRef(null);
  const timerRef = useRef(null);

  // Exam timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper to re-enter fullscreen
  const requestFullScreen = async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }
      setIsFullscreen(true);
      setWarningModalOpen(false);
      updateStudentStatus(room.roomCode, student.studentId, 'ACTIVE');
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

  // Record Violation and prompt modal
  const handleViolationTrigger = async (type, reason) => {
    if (submitted) return; // ignore after submitted

    playViolationSound();
    setWarningReason(reason);
    setWarningModalOpen(true);

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
      } else {
        setViolations((prev) => prev + 1);
      }
    } catch (e) {
      console.warn('Log violation error:', e);
      setViolations((prev) => prev + 1);
    }
  };

  useEffect(() => {
    // 1. Initial attempt to enter fullscreen
    requestFullScreen();

    // 2. Fullscreen change listener
    const onFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      setIsFullscreen(isCurrentlyFullscreen);

      if (!isCurrentlyFullscreen && !submitted) {
        handleViolationTrigger('LEFT_FULLSCREEN', 'นักศึกษาออกจากโหมดเต็มจอ (Exited Fullscreen)');
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);

    // 3. Tab switch / window visibility change listener
    const onVisibilityChange = () => {
      if (document.hidden && !submitted) {
        handleViolationTrigger('TAB_SWITCH', 'ตรวจพบการสลับแท็บ หรือยุบหน้าจอเบราว์เซอร์');
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    // 4. Window blur listener (clicking outside window / multi-monitor switch)
    const onWindowBlur = () => {
      if (!submitted && !exitModalOpen) {
        handleViolationTrigger('BLUR', 'คลิกออกนอกหน้าต่างสอบ หรือเปิดโปรแกรมอื่น');
      }
    };

    window.addEventListener('blur', onWindowBlur);

    // 5. Block Context Menu (Right Click)
    const onContextMenu = (e) => {
      e.preventDefault();
      return false;
    };
    window.addEventListener('contextmenu', onContextMenu);

    // 6. Block Keyboard Shortcuts (F12, Ctrl+U, Ctrl+Shift+I, Ctrl+C, Ctrl+V, F5, Ctrl+R)
    const onKeyDown = (e) => {
      // F12 or Inspect
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'))) {
        e.preventDefault();
        handleViolationTrigger('BLUR', 'ตรวจพบการพยายามเปิด Developer Tools (F12)');
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
      // Refresh F5, Ctrl+R
      if (e.key === 'F5' || (e.ctrlKey && (e.key === 'r' || e.key === 'R'))) {
        e.preventDefault();
        return false;
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('mozfullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [submitted, exitModalOpen]);

  // Handle Exit PIN submission
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
        setExitModalOpen(false);

        // Exit fullscreen
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } else {
        setExitError(res.error || 'รหัส Exit PIN ไม่ถูกต้อง');
      }
    } catch (err) {
      setExitError(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบ Exit PIN');
    } finally {
      setSubmitting(false);
    }
  };

  // Submitted view
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-white">
              ส่งข้อสอบและปลดล็อกเรียบร้อยแล้ว
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              ระบบได้บันทึกเวลาส่งข้อสอบของคุณไปยังอาจารย์เรียบร้อยแล้ว
            </p>
          </div>

          <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-700 text-left text-xs space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">วิชา:</span>
              <span className="text-white font-bold">{room.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">รหัสนักศึกษา:</span>
              <span className="text-white font-bold">{student.studentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ชื่อนักศึกษา:</span>
              <span className="text-white font-bold">{student.studentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">เวลาที่ใช้สอบ:</span>
              <span className="text-emerald-400 font-bold">{formatTime(elapsedSeconds)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">บันทึกหลุดจอ:</span>
              <span className={violations > 0 ? 'text-danger-base font-bold' : 'text-slate-300'}>
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
            sx={{ py: 1.5, borderRadius: 3, fontWeight: 700 }}
          >
            เสร็จสิ้น (กลับสู่หน้าหลัก)
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col no-select overflow-hidden"
    >
      {/* Top Secure Proctor Bar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-white shrink-0 z-10 shadow-md">
        {/* Left: Room & Student info */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs sm:text-sm text-white">
                {room.title}
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {room.roomCode}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              นักศึกษา: <span className="font-semibold text-white">{student.studentName}</span> ({student.studentId})
            </p>
          </div>
        </div>

        {/* Center: Live Timer */}
        <div className="hidden sm:flex items-center space-x-2 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
          <Clock className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-xs font-mono font-bold text-slate-200">
            เวลา: {formatTime(elapsedSeconds)}
          </span>
        </div>

        {/* Right: Violation counter & Exit PIN unlock button */}
        <div className="flex items-center space-x-3">
          {violations > 0 && (
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-danger-light text-danger-dark font-mono text-xs font-bold border border-danger-base/40 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>หลุดจอ {violations} ครั้ง</span>
            </div>
          )}

          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={() => setExitModalOpen(true)}
            startIcon={<Unlock className="w-4 h-4" />}
            sx={{
              fontWeight: 700,
              fontSize: '0.8rem',
              borderRadius: 2,
              px: 2,
            }}
          >
            ส่งข้อสอบ (Exit PIN)
          </Button>
        </div>
      </div>

      {/* Main Exam Canvas: Secure Shell <iframe> */}
      <div className="flex-1 relative bg-white w-full h-[calc(100vh-3.5rem)]">
        {room.examUrl ? (
          <iframe
            src={room.examUrl}
            title="Online Exam Sheet"
            className="w-full h-full border-0 select-none"
            allow="fullscreen; clipboard-read; clipboard-write;"
            sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
            <AlertCircle className="w-12 h-12 text-slate-400" />
            <p className="text-base font-bold">ไม่พบ URL ของข้อสอบ</p>
            <p className="text-xs text-slate-400">กรุณาแจ้งให้อาจารย์ผู้คุมสอบทราบ</p>
          </div>
        )}
      </div>

      {/* Warning Modal Overlay (When student exits fullscreen or blurs) */}
      <Dialog
        open={warningModalOpen}
        fullWidth
        maxWidth="xs"
        disableEscapeKeyDown
        aria-labelledby="violation-modal-title"
        PaperProps={{
          sx: {
            backgroundColor: '#fef2f2',
            border: '2px solid #dc2626',
            borderRadius: 4,
            p: 2,
            boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.4)',
          },
        }}
      >
        <Stack spacing={2.5} alignItems="center" textAlign="center" sx={{ p: 2 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(220, 38, 38, 0.4)',
              animation: 'bounce 1s infinite',
            }}
          >
            <AlertTriangle className="w-9 h-9" />
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#991b1b', lineHeight: 1.2 }}>
              ตรวจพบการทำผิดกฎการสอบ!
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#b91c1c', mt: 0.5 }}>
              {warningReason || 'ระบบตรวจพบการออกจากโหมดเต็มจอ หรือสลับแท็บไปยังโปรแกรมอื่น'}
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              width: '100%',
              p: 2,
              borderRadius: 3,
              backgroundColor: '#ffffff',
              border: '1px solid rgba(220, 38, 38, 0.25)',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
              บันทึกการละเมิดสะสม: <span style={{ color: '#dc2626', fontFamily: 'monospace', fontSize: '1.2rem' }}>{violations}</span> ครั้ง
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
              เหตุการณ์นี้ถูกส่งไปยังแดชบอร์ดอาจารย์ผู้คุมสอบเรียบร้อยแล้ว
            </Typography>
          </Paper>

          <Button
            variant="contained"
            color="error"
            fullWidth
            size="large"
            onClick={requestFullScreen}
            startIcon={<Maximize2 className="w-5 h-5" />}
            sx={{
              py: 1.5,
              fontWeight: 800,
              fontSize: '1rem',
              borderRadius: 3,
              boxShadow: '0 8px 20px rgba(220, 38, 38, 0.4)',
            }}
          >
            กลับเข้าสู่โหมดเต็มจอทันที
          </Button>
        </Stack>
      </Dialog>

      {/* Exit / Submit PIN Dialog */}
      <Dialog
        open={exitModalOpen}
        onClose={() => setExitModalOpen(false)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="exit-modal-title"
        PaperProps={{
          sx: {
            borderRadius: 4,
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          },
        }}
      >
        <form onSubmit={handleVerifyExitPin}>
          <DialogTitle sx={{ p: 2.5, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock className="w-5 h-5" />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                ส่งข้อสอบและปลดล็อกหน้าจอ
              </Typography>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                เมื่อทำข้อสอบเสร็จแล้ว กรุณาแจ้งอาจารย์ผู้คุมสอบเพื่อขอรับ <strong>Exit PIN</strong> ในการปลดล็อกออกจาก Fullscreen
              </Typography>

              {exitError && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {exitError}
                </Alert>
              )}

              <TextField
                label="Exit PIN (รหัสปลดล็อก)"
                type="password"
                required
                maxLength={8}
                autoFocus
                placeholder="กรอก Exit PIN"
                value={exitPinInput}
                onChange={(e) => setExitPinInput(e.target.value)}
                InputProps={{
                  sx: {
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '1.4rem',
                    letterSpacing: 4,
                    textAlign: 'center',
                  },
                }}
              />
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 2.5, backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <Button
              onClick={() => setExitModalOpen(false)}
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
              sx={{ fontWeight: 700, borderRadius: 2.5, px: 3 }}
            >
              {submitting ? 'กำลังตรวจสอบ...' : 'ยืนยันและส่งข้อสอบ'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
}

