import React, { useState, useEffect } from 'react';
import {
  Card,
  TextField,
  Button,
  Typography,
  Box,
  Divider,
  Alert,
  InputAdornment,
  IconButton,
  Chip,
  Stack,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Paper,
  Grid,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  LinearProgress,
} from '@mui/material';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  School,
  ArrowRight,
  LogIn,
  CheckCircle2,
  FileSpreadsheet,
  Users,
  User,
  Hash,
  Maximize2,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRoom, joinRoom } from '../../services/api';

export default function TeacherLogin({
  initialTab = 'teacher', // 'teacher' | 'student'
  initialRoomCode = '',
  onLoginSuccess,
  onStartExam,
  onOpenSettings,
}) {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab || 'teacher');

  // Teacher Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loadingTeacher, setLoadingTeacher] = useState(false);
  const [errorTeacher, setErrorTeacher] = useState('');

  // Student Form State
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [checkingRoom, setCheckingRoom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [loadingElapsed, setLoadingElapsed] = useState(0);
  const [errorStudent, setErrorStudent] = useState('');

  useEffect(() => {
    if (!loadingStudent) {
      setLoadingElapsed(0);
      return undefined;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => setLoadingElapsed((Date.now() - startedAt) / 1000), 100);
    return () => clearInterval(timer);
  }, [loadingStudent]);

  // Sync tab if prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode.toUpperCase());
      checkRoom(initialRoomCode);
    }
  }, [initialRoomCode]);

  const checkRoom = async (code) => {
    if (!code || !code.trim()) {
      setRoomInfo(null);
      return;
    }
    setCheckingRoom(true);
    try {
      const res = await getRoom(code.trim());
      if (res.success && res.room) {
        setRoomInfo(res.room);
        setErrorStudent('');
      } else {
        setRoomInfo(null);
      }
    } catch {
      setRoomInfo(null);
    } finally {
      setCheckingRoom(false);
    }
  };

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    setErrorTeacher('');

    if (!email.trim()) {
      setErrorTeacher('กรุณากรอกอีเมลอาจารย์ / บุคลากร');
      return;
    }
    if (!password) {
      setErrorTeacher('กรุณากรอกรหัสผ่าน');
      return;
    }

    setLoadingTeacher(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setErrorTeacher(res.error || 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลในฐานข้อมูล admins');
      }
    } catch (err) {
      setErrorTeacher(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoadingTeacher(false);
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setErrorStudent('');

    if (!roomCode.trim()) {
      setErrorStudent('กรุณาระบุรหัสห้องสอบ');
      return;
    }
    if (!studentId.trim()) {
      setErrorStudent('กรุณากรอกรหัสนักศึกษา');
      return;
    }
    if (!studentName.trim()) {
      setErrorStudent('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    if (!agreed) {
      setErrorStudent('กรุณาทำเครื่องหมายยินยอมปฏิบัติตามกฎระเบียบการสอบ');
      return;
    }

    // Keep the fullscreen request inside the user click before waiting on the
    // stagger timer or network; browser user activation may otherwise expire.
    try {
      const root = document.documentElement;
      if (root.requestFullscreen) await root.requestFullscreen();
      else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
    } catch (fsErr) {
      console.warn('Fullscreen request prompt notice:', fsErr);
    }

    const loadingStartedAt = Date.now();
    setLoadingElapsed(0);
    setLoadingStudent(true);
    try {
      const rRes = await getRoom(roomCode.trim());
      if (!rRes.success || !rRes.room) {
        setErrorStudent(rRes.error || 'ไม่พบห้องสอบที่ระบุ กรุณาตรวจสอบรหัสห้องอีกครั้ง');
        const remaining = 5000 - (Date.now() - loadingStartedAt);
        if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
        return;
      }

      const jRes = await joinRoom(roomCode.trim(), studentId.trim(), studentName.trim());
      if (jRes.success) {
        const remaining = 5000 - (Date.now() - loadingStartedAt);
        if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
        if (onStartExam) {
          onStartExam({
            room: rRes.room,
            student: jRes.student,
          });
        }
      } else {
        setErrorStudent(jRes.error || 'เกิดข้อผิดพลาดในการลงทะเบียนเข้าห้องสอบ');
      }
    } catch (err) {
      const remaining = 5000 - (Date.now() - loadingStartedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      setErrorStudent(err.message || 'ไม่สามารถบันทึกการเข้าห้องได้ กรุณาลองอีกครั้ง');
    } finally {
      setLoadingStudent(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 68px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 3, md: 4 },
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 20%, #ffffff 0%, #f1f7ff 65%, #dbeafe 100%)',
      }}
    >
      {/* Decorative soft bottom wave accents */}
      <Box
        sx={{
          position: 'absolute',
          bottom: -80,
          left: -80,
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(147, 197, 253, 0.45) 0%, rgba(219, 234, 254, 0) 70%)',
          filter: 'blur(35px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -100,
          right: -80,
          width: 440,
          height: 440,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(191, 219, 254, 0.5) 0%, rgba(219, 234, 254, 0) 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      {/* Main 2-Column Floating Card */}
      <Card
        elevation={0}
        sx={{
          maxWidth: { xs: 500, md: 1100 },
          width: '100%',
          borderRadius: { xs: 4, md: '28px' },
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.12), 0 0 1px 1px rgba(15, 23, 42, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Grid container>
          {/* LEFT SIDE: Midnight Blue Hero Panel (Hidden on mobile) */}
          <Grid
            item
            xs={12}
            md={5}
            sx={{
              background: 'linear-gradient(180deg, #07153b 0%, #0a2052 50%, #061536 100%)',
              p: { xs: 3.5, sm: 4, md: 5 },
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              justifyContent: 'center',
              color: '#ffffff',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Ambient subtle glow inside hero */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 250,
                height: 250,
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)',
                filter: 'blur(30px)',
                pointerEvents: 'none',
              }}
            />

            {/* Decorative animated moving waves (3-layer multi-speed wave) */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 140,
                pointerEvents: 'none',
                overflow: 'hidden',
                zIndex: 0,
              }}
            >
              <style>{`
                @keyframes loginWaveSlide1 {
                  0% { transform: translate3d(0, 0, 0); }
                  100% { transform: translate3d(-50%, 0, 0); }
                }
                @keyframes loginWaveSlide2 {
                  0% { transform: translate3d(-50%, 0, 0); }
                  100% { transform: translate3d(0, 0, 0); }
                }
                @keyframes loginWaveSlide3 {
                  0% { transform: translate3d(0, 0, 0); }
                  100% { transform: translate3d(-50%, 0, 0); }
                }
                @keyframes loginWaveBob {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(5px); }
                }
              `}</style>

              {/* Layer 1: Deep slow ocean wave */}
              <svg
                viewBox="0 0 1200 140"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '200%',
                  height: '100%',
                  animation: 'loginWaveSlide1 18s linear infinite',
                  opacity: 0.25,
                  willChange: 'transform',
                }}
              >
                <path
                  d="M 0 50 Q 150 15, 300 50 T 600 50 Q 750 15, 900 50 T 1200 50 L 1200 140 L 0 140 Z"
                  fill="url(#login-wave-grad-1)"
                />
                <defs>
                  <linearGradient id="login-wave-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1e3a8a" />
                    <stop offset="50%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Layer 2: Middle counter-flow wave */}
              <svg
                viewBox="0 0 1200 140"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '200%',
                  height: '100%',
                  animation: 'loginWaveSlide2 12s linear infinite',
                  opacity: 0.42,
                  willChange: 'transform',
                }}
              >
                <path
                  d="M 0 70 Q 150 110, 300 70 T 600 70 Q 750 110, 900 70 T 1200 70 L 1200 140 L 0 140 Z"
                  fill="url(#login-wave-grad-2)"
                />
                <defs>
                  <linearGradient id="login-wave-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0284c7" />
                    <stop offset="50%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Layer 3: Foreground luminous crest wave with gentle undulating bob */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  animation: 'loginWaveBob 6s ease-in-out infinite',
                }}
              >
                <svg
                  viewBox="0 0 1200 140"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="none"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '200%',
                    height: '100%',
                    animation: 'loginWaveSlide3 7.5s linear infinite',
                    opacity: 0.6,
                    willChange: 'transform',
                  }}
                >
                  <path
                    d="M 0 85 Q 150 45, 300 85 T 600 85 Q 750 45, 900 85 T 1200 85 L 1200 140 L 0 140 Z"
                    fill="url(#login-wave-grad-3)"
                  />
                  <defs>
                    <linearGradient id="login-wave-grad-3" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </Box>

            {/* Top Brand & Title */}
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  mb: 2.5,
                  boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)',
                }}
              >
                <ShieldCheck className="w-6 h-6" />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                    color: '#ffffff',
                    fontSize: { xs: '1.45rem', sm: '1.75rem' },
                    lineHeight: 1.2,
                  }}
                >
                  SAMMLocker
                </Typography>
                <Chip
                  label="PWA"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    backgroundColor: 'rgba(59, 130, 246, 0.25)',
                    color: '#93c5fd',
                    border: '1px solid rgba(147, 197, 253, 0.35)',
                    borderRadius: '999px',
                  }}
                />
              </Box>

              <Typography
                variant="body2"
                sx={{
                  color: '#bfdbfe',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  lineHeight: 1.5,
                }}
              >
                ระบบสอบออนไลน์แบบล็อกหน้าจอ
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#93c5fd',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'block',
                }}
              >
                (WCAG AA 60-30-10 Compliance)
              </Typography>
            </Box>

            {/* Dynamic Feature Highlights based on Active Tab */}
            <Stack spacing={2} sx={{ mt: { xs: 3, md: 3.5 }, position: 'relative', zIndex: 1 }}>
              {activeTab === 'teacher' ? (
                <>
                  <Box
                    sx={{
                      p: 2.2,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.6,
                    }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                    <Box>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '0.88rem' }}>
                        ควบคุมการสอบ ป้องกันการสลับหน้าจอ
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.76rem', display: 'block', mt: 0.4 }}>
                        ตรวจจับ Tab Switch, Window Blur และการออกจาก Fullscreen ทันที
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      p: 2.2,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.6,
                    }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                    <Box>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '0.88rem' }}>
                        บล็อกคัดลอก คลิกขวา และปุ่มลัด
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.76rem', display: 'block', mt: 0.4 }}>
                        ตัดสิทธิ์ Developer Tools ป้องกันการทุจริตอย่างรัดกุม
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      p: 2.2,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.6,
                    }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                    <Box>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '0.88rem' }}>
                        บันทึกผลสดลงฐานข้อมูล MariaDB เรียลไทม์
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.76rem', display: 'block', mt: 0.4 }}>
                        จัดเก็บห้องสอบ รายชื่อผู้สอบ และ Audit Trail สดตลอดการสอบ
                      </Typography>
                    </Box>
                  </Box>
                </>
              ) : (
                <>
                  <Box
                    sx={{
                      p: 2.2,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.6,
                    }}
                  >
                    <Maximize2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                    <Box>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '0.88rem' }}>
                        โหมดเต็มจออัตโนมัติ (Fullscreen Lockdown)
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.76rem', display: 'block', mt: 0.4 }}>
                        ระบบจะสั่งเปิดแบบเต็มจอทันทีที่กดเริ่มทำข้อสอบ
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      p: 2.2,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.6,
                    }}
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <Box>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '0.88rem' }}>
                        แจ้งเตือนสดเมื่อหลุดจอหรือสลับแท็บ
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.76rem', display: 'block', mt: 0.4 }}>
                        จำนวนครั้งที่ทำผิดกฎจะถูกบันทึกและส่งให้อาจารย์ผู้คุมสอบทราบ
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      p: 2.2,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.6,
                    }}
                  >
                    <Lock className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                    <Box>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '0.88rem' }}>
                        รหัสปลดล็อก Exit PIN จากอาจารย์
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.76rem', display: 'block', mt: 0.4 }}>
                        ต้องให้นักศึกษากรอก Exit PIN เพื่อยืนยันการส่งข้อสอบและออกจากระบบ
                      </Typography>
                    </Box>
                  </Box>
                </>
              )}
            </Stack>
          </Grid>

          {/* RIGHT SIDE: White Clean Interactive Panel */}
          <Grid
            item
            xs={12}
            md={7}
            sx={{
              p: { xs: 3, sm: 4, md: 5 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
            }}
          >
            {/* Top Interactive Segmented Tab Switcher */}
            <Box
              sx={{
                backgroundColor: '#f1f5f9',
                p: '5px',
                borderRadius: '999px',
                display: 'flex',
                gap: 0.5,
                mb: 3.5,
              }}
            >
              <Button
                variant={activeTab === 'teacher' ? 'contained' : 'text'}
                disableElevation
                onClick={() => {
                  setActiveTab('teacher');
                  setErrorTeacher('');
                  window.history.replaceState(null, '', '#/login');
                }}
                startIcon={<School className="w-4 h-4" />}
                sx={{
                  flex: 1,
                  py: 1,
                  borderRadius: '999px',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  backgroundColor: activeTab === 'teacher' ? '#1d4ed8' : 'transparent',
                  color: activeTab === 'teacher' ? '#ffffff' : '#64748b',
                  boxShadow: activeTab === 'teacher' ? '0 2px 8px rgba(29, 78, 216, 0.25)' : 'none',
                  textTransform: 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: activeTab === 'teacher' ? '#1e40af' : 'rgba(255, 255, 255, 0.6)',
                    color: activeTab === 'teacher' ? '#ffffff' : '#0f172a',
                  },
                }}
              >
                อาจารย์ / แอดมิน
              </Button>

              <Button
                variant={activeTab === 'student' ? 'contained' : 'text'}
                disableElevation
                onClick={() => {
                  setActiveTab('student');
                  setErrorStudent('');
                  window.history.replaceState(null, '', '#/student');
                }}
                startIcon={<Users className="w-4 h-4" />}
                sx={{
                  flex: 1,
                  py: 1,
                  borderRadius: '999px',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  backgroundColor: activeTab === 'student' ? '#1d4ed8' : 'transparent',
                  color: activeTab === 'student' ? '#ffffff' : '#64748b',
                  boxShadow: activeTab === 'student' ? '0 2px 8px rgba(29, 78, 216, 0.25)' : 'none',
                  textTransform: 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: activeTab === 'student' ? '#1e40af' : 'rgba(255, 255, 255, 0.6)',
                    color: activeTab === 'student' ? '#ffffff' : '#0f172a',
                  },
                }}
              >
                นักศึกษาเข้าสอบ
              </Button>
            </Box>

            {/* TAB 1: TEACHER / ADMIN LOGIN */}
            {activeTab === 'teacher' && (
              <Box sx={{ animation: 'fadeIn 0.25s ease' }}>
                {/* Title & Subtitle */}
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 900,
                      color: '#0f172a',
                      fontSize: { xs: '1.3rem', sm: '1.5rem' },
                      letterSpacing: '-0.02em',
                      mb: 0.5,
                    }}
                  >
                    ระบบจัดการควบคุมสอบหลังบ้าน
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#64748b',
                      fontSize: '0.84rem',
                      lineHeight: 1.4,
                    }}
                  >
                    สำหรับอาจารย์ผู้คุมสอบ และผู้ดูแลระบบห้องสอบ (Proctor Portal)
                  </Typography>
                </Box>

                {errorTeacher && (
                  <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5, fontSize: '0.85rem' }}>
                    {errorTeacher}
                  </Alert>
                )}

                {/* Form with Large & Comfortable Fields */}
                <form onSubmit={handleTeacherSubmit}>
                  <Stack spacing={2.5}>
                    <TextField
                      fullWidth
                      label="อีเมลอาจารย์ / บุคลากร (Email) *"
                      placeholder="เช่น thanakorn.sammer@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                        sx: {
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: '#334155',
                          '&.Mui-focused': { color: '#1d4ed8' },
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Mail className="w-5 h-5 text-slate-400 mr-0.5" />
                          </InputAdornment>
                        ),
                        sx: {
                          borderRadius: '16px',
                          backgroundColor: '#ffffff',
                          fontSize: '1.02rem',
                          fontWeight: 600,
                          minHeight: '58px',
                          '& fieldset': {
                            borderColor: '#cbd5e1',
                            borderWidth: '1.5px',
                          },
                          '&:hover fieldset': {
                            borderColor: '#94a3b8',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#2563eb',
                            borderWidth: '2px',
                          },
                        },
                      }}
                    />

                    <TextField
                      fullWidth
                      label="รหัสผ่าน (Password) *"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="กรอกรหัสผ่านของคุณ"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                        sx: {
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: '#334155',
                          '&.Mui-focused': { color: '#1d4ed8' },
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock className="w-5 h-5 text-slate-400 mr-0.5" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="สลับการมองเห็นรหัสผ่าน"
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              size="medium"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5 text-slate-400" /> : <Eye className="w-5 h-5 text-slate-400" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                        sx: {
                          borderRadius: '16px',
                          backgroundColor: '#ffffff',
                          fontSize: '1.02rem',
                          fontWeight: 600,
                          minHeight: '58px',
                          '& fieldset': {
                            borderColor: '#cbd5e1',
                            borderWidth: '1.5px',
                          },
                          '&:hover fieldset': {
                            borderColor: '#94a3b8',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#2563eb',
                            borderWidth: '2px',
                          },
                        },
                      }}
                    />

                    {/* Remember me & Forgot Password */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.2 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            color="primary"
                            size="small"
                            sx={{ p: 0.5, mr: 0.5, '&.Mui-checked': { color: '#1d4ed8' } }}
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>
                            จดจำการเข้าสู่ระบบ
                          </Typography>
                        }
                      />

                      <Typography
                        variant="caption"
                        onClick={() => alert('หากลืมรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่าน')}
                        sx={{
                          color: '#2563eb',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        ลืมรหัสผ่าน?
                      </Typography>
                    </Box>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={loadingTeacher}
                      sx={{
                        minHeight: '56px',
                        fontWeight: 800,
                        fontSize: '1.02rem',
                        borderRadius: '18px',
                        background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)',
                        boxShadow: '0 8px 24px -4px rgba(37, 99, 235, 0.4)',
                        textTransform: 'none',
                        letterSpacing: '0.01em',
                        '&:hover': {
                          background: 'linear-gradient(90deg, #1e40af 0%, #1d4ed8 100%)',
                          boxShadow: '0 12px 28px -4px rgba(37, 99, 235, 0.5)',
                        },
                      }}
                      startIcon={loadingTeacher ? <CircularProgress size={20} color="inherit" /> : <LogIn className="w-5 h-5" />}
                      endIcon={!loadingTeacher && <ArrowRight className="w-5 h-5" />}
                    >
                      {loadingTeacher ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบหลังบ้าน'}
                    </Button>
                  </Stack>
                </form>
              </Box>
            )}

            {/* TAB 2: STUDENT JOIN EXAM */}
            {activeTab === 'student' && (
              <Box sx={{ animation: 'fadeIn 0.25s ease' }}>
                {errorStudent && (
                  <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5, fontSize: '0.85rem' }}>
                    {errorStudent}
                  </Alert>
                )}

                {/* Form matching media_1793877868556_9fd60749.png exactly */}
                <form onSubmit={handleStudentSubmit}>
                  <Stack spacing={2.2}>
                    {/* 1. Room Code */}
                    <TextField
                      fullWidth
                      label="รหัสห้องสอบ (Room Code) *"
                      placeholder="เช่น CS101"
                      value={roomCode}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setRoomCode(val);
                        checkRoom(val);
                      }}
                      InputLabelProps={{
                        shrink: true,
                        sx: {
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: '#334155',
                          '&.Mui-focused': { color: '#1d4ed8' },
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: '#94a3b8', mr: 0.5 }}>#</Typography>
                          </InputAdornment>
                        ),
                        sx: {
                          borderRadius: '16px',
                          backgroundColor: '#ffffff',
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          minHeight: '58px',
                          '& fieldset': {
                            borderColor: '#cbd5e1',
                            borderWidth: '1.5px',
                          },
                          '&:hover fieldset': {
                            borderColor: '#94a3b8',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#2563eb',
                            borderWidth: '2px',
                          },
                        },
                      }}
                    />

                    {/* Room Preview Pill (or Skeleton while checking) */}
                    {checkingRoom ? (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.8,
                          borderRadius: '20px',
                          backgroundColor: '#f8fafc',
                          border: '1.5px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.8,
                        }}
                      >
                        <Skeleton variant="circular" width={44} height={44} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width="65%" height={24} sx={{ borderRadius: 1 }} />
                          <Skeleton variant="text" width="40%" height={18} sx={{ borderRadius: 1, mt: 0.5 }} />
                        </Box>
                      </Paper>
                    ) : roomInfo && (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.8,
                          borderRadius: '20px',
                          backgroundColor: '#eff6ff',
                          border: '1.5px solid #bfdbfe',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.8,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            backgroundColor: '#dbeafe',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            shrink: 0,
                          }}
                        >
                          <BookOpen className="w-5 h-5" />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 800,
                              color: '#1e3a8a',
                              fontSize: '0.95rem',
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {roomInfo.title || 'ห้องสอบออนไลน์'}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#2563eb',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              mt: 0.3,
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                            ห้องสอบพร้อมเริ่มทำข้อสอบ
                          </Typography>
                        </Box>
                      </Paper>
                    )}

                    {/* 2. Student ID */}
                    <TextField
                      fullWidth
                      label="รหัสนักศึกษา (Student ID) *"
                      placeholder="เช่น 64010234 หรือ 12345"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                        sx: {
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: '#334155',
                          '&.Mui-focused': { color: '#1d4ed8' },
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#94a3b8', mr: 0.5 }}>#</Typography>
                          </InputAdornment>
                        ),
                        sx: {
                          borderRadius: '16px',
                          backgroundColor: '#ffffff',
                          fontSize: '1.02rem',
                          fontWeight: 600,
                          minHeight: '58px',
                          '& fieldset': {
                            borderColor: '#cbd5e1',
                            borderWidth: '1.5px',
                          },
                          '&:hover fieldset': {
                            borderColor: '#94a3b8',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#2563eb',
                            borderWidth: '2px',
                          },
                        },
                      }}
                    />

                    {/* 3. Full Name */}
                    <TextField
                      fullWidth
                      label="ชื่อ - นามสกุล (Full Name) *"
                      placeholder="เช่น สมชาย ใจดี"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                        sx: {
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: '#334155',
                          '&.Mui-focused': { color: '#1d4ed8' },
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <User className="w-5 h-5 text-slate-400 mr-0.5" />
                          </InputAdornment>
                        ),
                        sx: {
                          borderRadius: '16px',
                          backgroundColor: '#ffffff',
                          fontSize: '1.02rem',
                          fontWeight: 600,
                          minHeight: '58px',
                          '& fieldset': {
                            borderColor: '#cbd5e1',
                            borderWidth: '1.5px',
                          },
                          '&:hover fieldset': {
                            borderColor: '#94a3b8',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#2563eb',
                            borderWidth: '2px',
                          },
                        },
                      }}
                    />

                    {/* 4. Rules & Safety Agreement Card */}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: { xs: 2, sm: 2.2 },
                        borderRadius: '20px',
                        backgroundColor: '#f8fafc',
                        borderColor: '#e2e8f0',
                        borderWidth: '1.5px',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.2 }}>
                        <Box
                          sx={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            shrink: 0,
                          }}
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                          กฎระเบียบและข้อตกลงความปลอดภัยในการสอบ:
                        </Typography>
                      </Box>

                      <Stack spacing={0.6} sx={{ pl: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.8rem', lineHeight: 1.6, display: 'block' }}>
                          • เมื่อกดเริ่มทำข้อสอบ หน้าจอจะเข้าสู่ <strong>โหมดเต็มจอ (Fullscreen)</strong> ทันที
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.8rem', lineHeight: 1.6, display: 'block' }}>
                          • ระบบจะ <strong>บล็อกคลิกขวา</strong> และคีย์ลัดคัดลอก/ดูซอร์สโค้ดตลอดการสอบ
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.8rem', lineHeight: 1.6, display: 'block' }}>
                          • ระบบตรวจจับทันทีเมื่อ <strong>สลับแท็บ, หลุดเต็มจอ หรือเปิดหน้าต่างอื่น</strong> และบันทึกลงรายงานอาจารย์
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.8rem', lineHeight: 1.6, display: 'block' }}>
                          • เมื่อทำข้อสอบเสร็จ ต้องติดต่ออาจารย์เพื่อขอ <strong>Exit PIN</strong> ในการปลดล็อกส่งข้อสอบ
                        </Typography>
                      </Stack>
                    </Paper>

                    {/* 5. Checkbox Agreement */}
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={agreed}
                          onChange={(e) => setAgreed(e.target.checked)}
                          color="primary"
                          sx={{
                            p: 0.8,
                            '&.Mui-checked': { color: '#1d4ed8' },
                            '& .MuiSvgIcon-root': { fontSize: 24 },
                          }}
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                          ข้าพเจ้ารับทราบและยินยอมปฏิบัติตามกฎความปลอดภัยในการสอบข้างต้น
                        </Typography>
                      }
                    />

                    {/* 6. Action Button */}
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={loadingStudent}
                      sx={{
                        minHeight: '56px',
                        fontWeight: 800,
                        fontSize: '1.02rem',
                        borderRadius: '18px',
                        background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)',
                        boxShadow: '0 8px 24px -4px rgba(37, 99, 235, 0.4)',
                        textTransform: 'none',
                        letterSpacing: '0.01em',
                        '&:hover': {
                          background: 'linear-gradient(90deg, #1e40af 0%, #1d4ed8 100%)',
                          boxShadow: '0 12px 28px -4px rgba(37, 99, 235, 0.5)',
                        },
                      }}
                      startIcon={loadingStudent ? <CircularProgress size={20} color="inherit" /> : <Maximize2 className="w-5 h-5" />}
                    >
                      {loadingStudent ? 'กำลังเข้าสู่ห้องสอบ...' : 'เริ่มทำข้อสอบ (เข้าโหมดเต็มจอ)'}
                    </Button>
                  </Stack>
                </form>
              </Box>
            )}
          </Grid>
        </Grid>
      </Card>
      <Dialog
        open={loadingStudent}
        disableEscapeKeyDown
        aria-labelledby="student-join-loading-title"
        PaperProps={{ sx: { width: 'min(420px, calc(100% - 32px))', borderRadius: 4, p: 1 } }}
      >
        <DialogTitle id="student-join-loading-title" sx={{ textAlign: 'center', pt: 3, fontWeight: 800 }}>
          กำลังเข้าสู่ห้องสอบ
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 3 }}>
          <Box sx={{ width: 56, height: 56, mx: 'auto', mb: 2, color: '#2563eb' }}>
            <CircularProgress size={56} thickness={4} aria-label="กำลังโหลด" />
          </Box>
          <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 800, mb: 0.5 }}>
            {roomInfo?.title || roomCode || 'กำลังตรวจสอบห้องสอบ'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
            ห้อง {roomCode || '—'} · {studentName || 'ผู้เข้าสอบ'}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, (loadingElapsed / 5) * 100)}
            sx={{ height: 8, borderRadius: 8, mb: 1.25, bgcolor: '#dbeafe', '& .MuiLinearProgress-bar': { borderRadius: 8 } }}
          />
          <Typography variant="body2" aria-live="polite" sx={{ color: '#334155', fontWeight: 700 }}>
            {loadingElapsed < 5
              ? `กำลังเตรียมข้อมูล ${Math.min(5, Math.floor(loadingElapsed) + 1)} / 5 วินาที`
              : 'กำลังรอการยืนยันจากเซิร์ฟเวอร์...'}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#64748b', mt: 1 }}>
            กรุณาอย่าปิดหน้านี้
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
