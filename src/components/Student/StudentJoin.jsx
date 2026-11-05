import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Box,
  Stack,
  Alert,
  Checkbox,
  FormControlLabel,
  Paper,
  Chip,
  InputAdornment,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import {
  ShieldAlert,
  Maximize2,
  Lock,
  User,
  Hash,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { getRoom, joinRoom } from '../../services/api';

export default function StudentJoin({
  initialRoomCode = '',
  onStartExam,
}) {
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingRoom, setCheckingRoom] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode.toUpperCase());
      fetchRoom(initialRoomCode);
    }
  }, [initialRoomCode]);

  const fetchRoom = async (code) => {
    if (!code) return;
    setCheckingRoom(true);
    try {
      const res = await getRoom(code);
      if (res.success) {
        setRoomInfo(res.room);
        setError('');
      } else {
        setRoomInfo(null);
        setError(res.error || 'ไม่พบห้องสอบนี้');
      }
    } catch (e) {
      setRoomInfo(null);
      setError('ไม่สามารถค้นหาห้องสอบได้');
    } finally {
      setCheckingRoom(false);
    }
  };

  const handleRoomCodeBlur = () => {
    if (roomCode.trim()) {
      fetchRoom(roomCode.trim());
    }
  };

  const handleStartExam = async (e) => {
    e.preventDefault();
    setError('');

    if (!roomCode.trim()) {
      setError('กรุณาระบุรหัสห้องสอบ');
      return;
    }
    if (!studentId.trim()) {
      setError('กรุณากรอกรหัสนักศึกษา');
      return;
    }
    if (!studentName.trim()) {
      setError('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    if (!agreed) {
      setError('กรุณาทำเครื่องหมายยินยอมปฏิบัติตามกฎระเบียบการสอบ');
      return;
    }

    try {
      setLoading(true);

      const rRes = await getRoom(roomCode.trim());
      if (!rRes.success || !rRes.room) {
        setError(rRes.error || 'ไม่พบห้องสอบที่ระบุ กรุณาตรวจสอบรหัสห้องอีกครั้ง');
        setLoading(false);
        return;
      }

      const jRes = await joinRoom(roomCode.trim(), studentId.trim(), studentName.trim());
      if (jRes.success) {
        try {
          if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          } else if (document.documentElement.webkitRequestFullscreen) {
            await document.documentElement.webkitRequestFullscreen();
          }
        } catch (fsErr) {
          console.warn('Fullscreen request prompt notice:', fsErr);
        }

        onStartExam({
          room: rRes.room,
          student: jRes.student,
        });
      } else {
        setError(jRes.error || 'เกิดข้อผิดพลาดในการลงทะเบียนเข้าห้องสอบ');
      }
    } catch (err) {
      setError(err.message || 'ไม่สามารถเริ่มทำข้อสอบได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 4rem)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 4 },
        backgroundColor: '#f8fafc',
      }}
    >
      <Card
        elevation={3}
        sx={{
          maxWidth: 540,
          width: '100%',
          borderRadius: 4,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
            color: '#ffffff',
            p: 4,
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
            }}
          >
            <Lock className="w-8 h-8 text-white" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
            เข้าสู่ระบบสอบออนไลน์ (SAMMLocker)
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5, fontSize: '0.85rem' }}>
            ระบบควบคุมความปลอดภัยขั้นสูง บล็อกการสลับหน้าจอ (WCAG AA)
          </Typography>
        </Box>

        {/* Content */}
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <form onSubmit={handleStartExam}>
            <Stack spacing={2.5}>
              {error && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Room Code */}
              <TextField
                label="รหัสห้องสอบ (Room Code)"
                required
                placeholder="เช่น CS101"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onBlur={handleRoomCodeBlur}
                InputProps={{
                  sx: { fontFamily: 'monospace', fontWeight: 800, fontSize: '1.05rem', letterSpacing: 1.5 },
                  startAdornment: (
                    <InputAdornment position="start">
                      <Hash className="w-4 h-4 text-slate-400" />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Room Verified Card or Skeleton */}
              {checkingRoom ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    backgroundColor: '#f8fafc',
                    borderColor: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <Skeleton variant="rounded" width={36} height={36} sx={{ borderRadius: 2 }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={22} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="text" width="35%" height={16} sx={{ borderRadius: 1 }} />
                  </Box>
                </Paper>
              ) : roomInfo && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    backgroundColor: '#eff6ff',
                    borderColor: '#bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ width: 36, height: 36, borderRadius: 2, backgroundColor: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen className="w-5 h-5" />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e3a8a' }}>
                      {roomInfo.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#2563eb', fontWeight: 600 }}>
                      ✓ ห้องสอบพร้อมเริ่มทำข้อสอบ
                    </Typography>
                  </Box>
                </Paper>
              )}

              {/* Student ID */}
              <TextField
                label="รหัสนักศึกษา (Student ID)"
                required
                placeholder="เช่น 64010234 หรือ 12345"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                InputProps={{
                  sx: { fontFamily: 'monospace', fontWeight: 700 },
                  startAdornment: (
                    <InputAdornment position="start">
                      <Hash className="w-4 h-4 text-slate-400" />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Student Name */}
              <TextField
                label="ชื่อ - นามสกุล (Full Name)"
                required
                placeholder="เช่น สมชาย ใจดี"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <User className="w-4 h-4 text-slate-400" />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Exam Security Rules Warning Box */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  backgroundColor: '#f8fafc',
                  borderColor: '#e2e8f0',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ShieldAlert className="w-4 h-4 text-danger-base" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.85rem' }}>
                    กฎระเบียบและข้อตกลงความปลอดภัยในการสอบ:
                  </Typography>
                </Box>
                <Typography component="ul" variant="caption" sx={{ color: 'text.secondary', pl: 2, m: 0, spaceY: 0.5, lineHeight: 1.6, display: 'block' }}>
                  <li>เมื่อกดเริ่มทำข้อสอบ หน้าจอจะเข้าสู่ <strong>โหมดเต็มจอ (Fullscreen)</strong> ทันที</li>
                  <li>ระบบจะ <strong>บล็อกคลิกขวา</strong> และคีย์ลัดคัดลอก/ดูซอร์สโค้ดตลอดการสอบ</li>
                  <li>ระบบตรวจจับทันทีเมื่อ <strong>สลับแท็บ, หลุดเต็มจอ หรือเปิดหน้าต่างอื่น</strong> และบันทึกลงรายงานอาจารย์</li>
                  <li>เมื่อทำข้อสอบเสร็จ ต้องติดต่ออาจารย์เพื่อขอ <strong>Exit PIN</strong> ในการปลดล็อกส่งข้อสอบ</li>
                </Typography>
              </Paper>

              {/* Consent Checkbox */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.85rem' }}>
                    ข้าพเจ้ารับทราบและยินยอมปฏิบัติตามกฎความปลอดภัยในการสอบข้างต้น
                  </Typography>
                }
              />

              {/* Start Exam Button */}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                disabled={loading || !agreed}
                sx={{
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 800,
                  borderRadius: 3,
                  boxShadow: '0 6px 20px rgba(37, 99, 235, 0.35)',
                }}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Maximize2 className="w-5 h-5" />}
              >
                {loading ? 'กำลังเข้าสู่ห้องสอบ...' : 'เริ่มทำข้อสอบ (เข้าโหมดเต็มจอ)'}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
