import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  Button,
  IconButton,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  TextField,
  Tooltip,
  Select,
  MenuItem,
  Stack,
  Avatar,
  Menu,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Divider,
} from '@mui/material';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Search,
  RefreshCw,
  PlusCircle,
  QrCode,
  Tv,
  Download,
  Volume2,
  VolumeX,
  ShieldAlert,
  Copy,
  CheckCircle2,
  Radio,
  MoreHorizontal,
  UserCheck,
  RotateCcw,
  Check,
  Laptop,
} from 'lucide-react';
import {
  getDashboardData,
  listRooms,
  resetStudentViolations,
  forceSubmitStudent,
} from '../../services/api';
import { playViolationSound } from '../../utils/sound';
import LiveAuditTimeline from './LiveAuditTimeline';

export default function TeacherDashboard({
  onOpenCreateRoom,
  onOpenQR,
  onOpenProjector,
  selectedRoomCode,
  setSelectedRoomCode,
}) {
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [students, setStudents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  // Student action menu
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedStudentForAction, setSelectedStudentForAction] = useState(null);

  const prevViolationsCountRef = useRef({});
  const isPollingRef = useRef(false);

  const fetchRooms = async () => {
    const res = await listRooms();
    if (res.success && Array.isArray(res.rooms)) {
      setRooms(res.rooms);
      if (res.rooms.length > 0) {
        if (!selectedRoomCode || !res.rooms.some((r) => r.roomCode === selectedRoomCode)) {
          setSelectedRoomCode(res.rooms[0].roomCode);
          setCurrentRoom(res.rooms[0]);
        } else {
          const found = res.rooms.find((r) => r.roomCode === selectedRoomCode);
          setCurrentRoom(found || res.rooms[0]);
        }
      } else {
        setCurrentRoom(null);
      }
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (selectedRoomCode && rooms.length > 0) {
      const found = rooms.find((r) => r.roomCode === selectedRoomCode);
      if (found) setCurrentRoom(found);
    }
  }, [selectedRoomCode, rooms]);

  const loadData = async (isManual = false) => {
    if (!selectedRoomCode) return;
    if (isPollingRef.current && !isManual) return;
    isPollingRef.current = true;
    if (isManual) setLoading(true);

    try {
      const res = await getDashboardData(selectedRoomCode, isManual);
      if (res.success) {
        if (soundEnabled) {
          let hasNewViolation = false;
          res.students.forEach((s) => {
            const prev = prevViolationsCountRef.current[s.studentId] || 0;
            if (s.violations > prev) {
              hasNewViolation = true;
            }
            prevViolationsCountRef.current[s.studentId] = s.violations;
          });

          if (hasNewViolation) {
            playViolationSound();
          }
        }

        setStudents(res.students || []);
        setLogs(res.logs || []);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.warn('Dashboard load error:', err);
    } finally {
      isPollingRef.current = false;
      if (isManual) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, [selectedRoomCode]);

  // High-concurrency adaptive polling loop (non-overlapping + tab visibility aware for 500+ users)
  useEffect(() => {
    if (!autoRefresh || !selectedRoomCode) return;

    let timerId = null;
    let isCancelled = false;

    const poll = async () => {
      if (isCancelled) return;
      await loadData(false);
      if (isCancelled) return;
      // 5s when proctor tab is active, 15s if in background to optimize bandwidth
      const intervalMs = document.hidden ? 15000 : 5000;
      timerId = setTimeout(poll, intervalMs);
    };

    timerId = setTimeout(poll, 5000);

    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [autoRefresh, selectedRoomCode, soundEnabled]);

  const handleCopyLink = () => {
    if (currentRoom?.examUrl) {
      navigator.clipboard.writeText(currentRoom.examUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyPin = () => {
    if (currentRoom?.exitPin) {
      navigator.clipboard.writeText(currentRoom.exitPin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const handleOpenStudentMenu = (e, student) => {
    setMenuAnchor(e.currentTarget);
    setSelectedStudentForAction(student);
  };

  const handleCloseStudentMenu = () => {
    setMenuAnchor(null);
    setSelectedStudentForAction(null);
  };

  const handleResetViolation = async () => {
    if (selectedStudentForAction && currentRoom) {
      await resetStudentViolations(currentRoom.roomCode, selectedStudentForAction.studentId);
      handleCloseStudentMenu();
      loadData(false);
    }
  };

  const handleForceSubmit = async () => {
    if (selectedStudentForAction && currentRoom) {
      await forceSubmitStudent(currentRoom.roomCode, selectedStudentForAction.studentId);
      handleCloseStudentMenu();
      loadData(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchSearch =
      (s.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.studentId || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') return s.status === 'ACTIVE';
    if (statusFilter === 'WARNING')
      return s.status === 'BLUR' || s.status === 'LEFT_FULLSCREEN' || s.status === 'TAB_SWITCH' || s.violations > 0;
    if (statusFilter === 'SUBMITTED') return s.status === 'SUBMITTED';

    return true;
  });

  const totalCount = students.length;
  const activeCount = students.filter((s) => s.status === 'ACTIVE').length;
  const breachCount = students.filter(
    (s) => s.status === 'BLUR' || s.status === 'LEFT_FULLSCREEN' || s.status === 'TAB_SWITCH' || s.violations > 0
  ).length;
  const submittedCount = students.filter((s) => s.status === 'SUBMITTED').length;

  const handleExportCSV = () => {
    if (students.length === 0) {
      alert('ยังไม่มีข้อมูลนักศึกษาในห้องสอบนี้');
      return;
    }

    const headers = ['RoomCode', 'StudentId', 'StudentName', 'Status', 'Violations', 'JoinedAt', 'SubmittedAt', 'LastPing'];
    const rows = students.map((s) => [
      `"${s.roomCode || ''}"`,
      `"${s.studentId || ''}"`,
      `"${s.studentName || ''}"`,
      `"${s.status || ''}"`,
      s.violations || 0,
      `"${s.joinedAt || ''}"`,
      `"${s.submittedAt || ''}"`,
      `"${s.lastPing || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Exam_Report_${selectedRoomCode || 'ALL'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3.5 }, spaceY: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* 1. HERO BANNER - Exact match with Image 1 */}
      <Paper
        elevation={3}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          background: 'radial-gradient(circle at 75% 30%, #1e3a8a 0%, #0d1b3e 50%, #080f24 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px -15px rgba(13, 27, 62, 0.5)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', gap: 3, position: 'relative', zIndex: 2 }}>
          {/* Left details */}
          <Box sx={{ maxWidth: { lg: '62%' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Chip
                label="LIVE MONITORING"
                size="small"
                sx={{
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                }}
                icon={<Radio className="w-3 h-3 text-emerald-400 animate-pulse ml-1" />}
              />
              {currentRoom && (
                <Chip
                  label={`ROOM: ${currentRoom.roomCode}`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: '#93c5fd',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    fontSize: '0.72rem',
                  }}
                />
              )}
            </Box>

            <Typography variant="h4" sx={{ fontWeight: 800, color: '#ffffff', letterSpacing: -0.5, mb: 1.5 }}>
              {currentRoom ? currentRoom.title : 'การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น (Midterm Exam)'}
            </Typography>

            {currentRoom && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#cbd5e1', fontSize: '0.85rem' }}>
                <span className="text-slate-400">ลิงก์เข้าสอบ:</span>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#60a5fa', textDecoration: 'underline', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentRoom.examUrl || 'https://forms.gle/KUdRrgSRwybbnDVV6'}
                </Typography>
                <IconButton size="small" onClick={handleCopyLink} sx={{ color: '#94a3b8', p: 0.5 }}>
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </IconButton>
              </Box>
            )}
          </Box>

          {/* Right controls */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', lg: 'flex-end' }, gap: 2 }}>
            {/* Exit PIN Box */}
            {currentRoom && (
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  px: 2.5,
                  borderRadius: 3,
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>
                    EXIT PIN (รหัสปลดล็อก)
                  </Typography>
                  <Typography variant="h5" sx={{ fontFamily: 'monospace', fontWeight: 900, color: '#fef3c7', letterSpacing: 3, lineHeight: 1.1 }}>
                    {currentRoom.exitPin}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={handleCopyPin} sx={{ color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                  {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </IconButton>
              </Paper>
            )}

            {/* Room Selector Dropdown */}
            {rooms.length > 0 && (
              <Select
                size="small"
                value={selectedRoomCode}
                onChange={(e) => setSelectedRoomCode(e.target.value)}
                sx={{
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  color: '#ffffff',
                  fontWeight: 700,
                  borderRadius: 2.5,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  minWidth: 260,
                  '& .MuiSvgIcon-root': { color: '#ffffff' },
                }}
              >
                {rooms.map((r) => (
                  <MenuItem key={r.roomCode} value={r.roomCode}>
                    {r.roomCode} - {r.title}
                  </MenuItem>
                ))}
              </Select>
            )}

            {/* Action Buttons Row */}
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                variant="contained"
                onClick={onOpenCreateRoom}
                startIcon={<PlusCircle className="w-4 h-4" />}
                sx={{
                  borderRadius: 2.5,
                  fontWeight: 700,
                  backgroundColor: '#2563eb',
                  px: 2.5,
                  '&:hover': { backgroundColor: '#1d4ed8' },
                }}
              >
                สร้างห้องสอบ
              </Button>

              {currentRoom && (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => onOpenQR(currentRoom)}
                    startIcon={<QrCode className="w-4 h-4" />}
                    sx={{
                      borderRadius: 2.5,
                      fontWeight: 700,
                      color: '#ffffff',
                      borderColor: 'rgba(255, 255, 255, 0.25)',
                      '&:hover': { borderColor: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                    }}
                  >
                    QR Code
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => onOpenProjector(currentRoom)}
                    startIcon={<Tv className="w-4 h-4" />}
                    sx={{
                      borderRadius: 2.5,
                      fontWeight: 700,
                      color: '#ffffff',
                      borderColor: 'rgba(255, 255, 255, 0.25)',
                      '&:hover': { borderColor: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                    }}
                  >
                    ฉายจอ
                  </Button>
                </>
              )}

              <Tooltip title={soundEnabled ? 'ปิดเสียงเตือน' : 'เปิดเสียงเตือน'} arrow>
                <IconButton
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  sx={{
                    color: soundEnabled ? '#60a5fa' : '#94a3b8',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </Box>
      </Paper>

      {/* 2. 4 METRIC CARDS - with Skeleton Loading */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2.5 }}>
        {/* Total Students */}
        <Card sx={{ p: 2.5, borderRadius: 3.5, backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 2.5, backgroundColor: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users className="w-5 h-5" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                นักศึกษาทั้งหมด
              </Typography>
              {loading && students.length === 0 ? (
                <Skeleton variant="text" width={65} height={34} sx={{ borderRadius: 1 }} />
              ) : (
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'text.primary', mt: 0.2 }}>
                  {totalCount} คน
                </Typography>
              )}
            </Box>
          </Box>
        </Card>

        {/* Normal In Screen */}
        <Card sx={{ p: 2.5, borderRadius: 3.5, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 2.5, backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle className="w-5 h-5" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534' }}>
                กำลังสอบปกติ (ในจอ)
              </Typography>
              {loading && students.length === 0 ? (
                <Skeleton variant="text" width={65} height={34} sx={{ borderRadius: 1 }} />
              ) : (
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#15803d', mt: 0.2 }}>
                  {activeCount} คน
                </Typography>
              )}
            </Box>
          </Box>
        </Card>

        {/* Violations / Switched Tab */}
        <Card sx={{ p: 2.5, borderRadius: 3.5, backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 2.5, backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle className="w-5 h-5" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#991b1b' }}>
                หลุดจอ / สลับแท็บ
              </Typography>
              {loading && students.length === 0 ? (
                <Skeleton variant="text" width={65} height={34} sx={{ borderRadius: 1 }} />
              ) : (
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#dc2626', mt: 0.2 }}>
                  {breachCount} คน
                </Typography>
              )}
            </Box>
          </Box>
        </Card>

        {/* Submitted */}
        <Card sx={{ p: 2.5, borderRadius: 3.5, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 2.5, backgroundColor: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 className="w-5 h-5" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e40af' }}>
                ส่งข้อสอบเรียบร้อย
              </Typography>
              {loading && students.length === 0 ? (
                <Skeleton variant="text" width={65} height={34} sx={{ borderRadius: 1 }} />
              ) : (
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#2563eb', mt: 0.2 }}>
                  {submittedCount} คน
                </Typography>
              )}
            </Box>
          </Box>
        </Card>
      </Box>

      {/* 3. LOWER SECTION: TABLE & LIVE FEED (Matching Image 1) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7.5fr 4.5fr', lg: '8fr 4fr' }, gap: 3, alignItems: 'stretch' }}>
        {/* Left: Students Table */}
        <Paper
          elevation={1}
          sx={{
            borderRadius: 3.5,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: { xs: 'auto', md: 620 },
            minHeight: { md: 620 },
            backgroundColor: '#ffffff',
          }}
        >
          {/* Table Toolbar */}
          <Box sx={{ p: 2.5, backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Users className="w-5 h-5 text-brand-600" />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                รายชื่อนักศึกษาในห้องสอบ ({filteredStudents.length} คน)
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <TextField
                size="small"
                placeholder="ค้นหารหัส ชื่อ หรือ นามสกุล..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search className="w-4 h-4 text-slate-400 mr-1" />,
                }}
                sx={{ width: 220 }}
              />

              <Select
                size="small"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ minWidth: 140, fontSize: '0.82rem', fontWeight: 600 }}
              >
                <MenuItem value="ALL">สถานะทั้งหมด</MenuItem>
                <MenuItem value="ACTIVE">ปกติ (ในจอ)</MenuItem>
                <MenuItem value="WARNING">มีประวัติหลุดจอ</MenuItem>
                <MenuItem value="SUBMITTED">ส่งข้อสอบแล้ว</MenuItem>
              </Select>

              <Tooltip title="รีเฟรชข้อมูล" arrow>
                <IconButton size="small" onClick={() => loadData(true)} disabled={loading} sx={{ border: '1px solid #cbd5e1' }}>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </IconButton>
              </Tooltip>

              <Tooltip title="ส่งออกเป็นไฟล์ CSV" arrow>
                <IconButton size="small" onClick={handleExportCSV} sx={{ border: '1px solid #cbd5e1' }}>
                  <Download className="w-4 h-4" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* DESKTOP VIEW: Full sticky table */}
          <TableContainer sx={{ display: { xs: 'none', md: 'block' }, flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>รหัสนักศึกษา</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ชื่อ - นามสกุล</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>สถานะปัจจุบัน</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>หลุดจอ (ครั้ง)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>เข้าสอบเมื่อ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ส่งข้อสอบเมื่อ</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && students.length === 0 ? (
                  [...Array(6)].map((_, idx) => (
                    <TableRow key={`skeleton-student-${idx}`}>
                      <TableCell>
                        <Skeleton variant="text" width={75} height={26} sx={{ borderRadius: 1 }} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Skeleton variant="circular" width={28} height={28} />
                          <Skeleton variant="text" width={130} height={24} sx={{ borderRadius: 1 }} />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="rounded" width={95} height={24} sx={{ borderRadius: 2 }} />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Skeleton variant="rounded" width={36} height={22} sx={{ borderRadius: 2, mx: 'auto' }} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={80} height={20} sx={{ borderRadius: 1 }} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={80} height={20} sx={{ borderRadius: 1 }} />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Skeleton variant="circular" width={28} height={28} sx={{ mx: 'auto' }} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 8 }}>
                      <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        ยังไม่มีนักศึกษาเข้าห้องสอบนี้
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        เปิด QR Code หรือส่งลิงก์ให้นักศึกษาสแกนเพื่อเริ่มทำข้อสอบ
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((s) => {
                    const isViolation = s.violations > 0;
                    return (
                      <TableRow key={s.studentId} hover sx={{ backgroundColor: isViolation ? 'rgba(254, 242, 242, 0.35)' : undefined }}>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: 'text.primary' }}>
                          {s.studentId}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
                              {s.studentName ? s.studentName.charAt(0) : 'S'}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {s.studentName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={
                              s.status === 'ACTIVE'
                                ? <CheckCircle className="w-3.5 h-3.5" />
                                : s.status === 'SUBMITTED'
                                ? <CheckCircle2 className="w-3.5 h-3.5" />
                                : <AlertTriangle className="w-3.5 h-3.5" />
                            }
                            label={
                              s.status === 'ACTIVE'
                                ? 'ปกติ (ในจอ)'
                                : s.status === 'LEFT_FULLSCREEN'
                                ? 'หลุด Fullscreen'
                                : s.status === 'TAB_SWITCH' || s.status === 'BLUR'
                                ? 'สลับแท็บ / ยุบจอ'
                                : s.status === 'SUBMITTED'
                                ? 'ส่งข้อสอบแล้ว'
                                : s.status
                            }
                            size="small"
                            color={
                              s.status === 'ACTIVE'
                                ? 'success'
                                : s.status === 'SUBMITTED'
                                ? 'primary'
                                : 'error'
                            }
                            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          {s.violations > 0 ? (
                            <Chip
                              label={`${s.violations} ครั้ง`}
                              size="small"
                              color="error"
                              sx={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.75rem' }}
                            />
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">0</span>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                          {s.joinedAt || '-'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                          {s.submittedAt || '-'}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="คำสั่งจัดการนักศึกษา" arrow>
                              <IconButton size="small" onClick={(e) => handleOpenStudentMenu(e, s)} sx={{ border: '1px solid #e2e8f0' }}>
                                <MoreHorizontal className="w-4 h-4" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* MOBILE / TABLET VIEW: Card-Based Student Cards */}
          <Box sx={{ display: { xs: 'block', md: 'none' }, p: 2, overflowY: 'auto', flex: 1, maxHeight: 520 }}>
            {loading && students.length === 0 ? (
              [...Array(4)].map((_, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2.5 }}>
                  <Skeleton variant="text" width="60%" height={24} />
                  <Skeleton variant="text" width="40%" height={18} />
                </Paper>
              ))
            ) : filteredStudents.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  ยังไม่มีนักศึกษาเข้าห้องสอบนี้
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {filteredStudents.map((s) => {
                  const isViolation = s.violations > 0;
                  return (
                    <Paper
                      key={s.studentId}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        backgroundColor: isViolation ? '#fff5f5' : '#ffffff',
                        borderColor: isViolation ? '#fecaca' : '#e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                          <Avatar sx={{ width: 34, height: 34, fontSize: '0.85rem', fontWeight: 800, backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
                            {s.studentName ? s.studentName.charAt(0) : 'S'}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                              {s.studentName}
                            </Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.secondary' }}>
                              รหัส: {s.studentId}
                            </Typography>
                          </Box>
                        </Box>

                        <Chip
                          icon={
                            s.status === 'ACTIVE'
                              ? <CheckCircle className="w-3 h-3" />
                              : s.status === 'SUBMITTED'
                              ? <CheckCircle2 className="w-3 h-3" />
                              : <AlertTriangle className="w-3 h-3" />
                          }
                          label={
                            s.status === 'ACTIVE'
                              ? 'ปกติ (ในจอ)'
                              : s.status === 'LEFT_FULLSCREEN'
                              ? 'หลุด Fullscreen'
                              : s.status === 'TAB_SWITCH' || s.status === 'BLUR'
                              ? 'สลับแท็บ / ยุบจอ'
                              : s.status === 'SUBMITTED'
                              ? 'ส่งแล้ว'
                              : s.status
                          }
                          size="small"
                          color={
                            s.status === 'ACTIVE'
                              ? 'success'
                              : s.status === 'SUBMITTED'
                              ? 'primary'
                              : 'error'
                          }
                          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                        />
                      </Box>

                      <Divider sx={{ my: 1, borderColor: '#f1f5f9' }} />

                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'text.secondary' }}>
                        <Box>
                          <span>หลุดจอ: </span>
                          {s.violations > 0 ? (
                            <Chip
                              label={`${s.violations} ครั้ง`}
                              size="small"
                              color="error"
                              sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800, ml: 0.5 }}
                            />
                          ) : (
                            <span className="font-semibold text-emerald-600 ml-0.5">0 ครั้ง</span>
                          )}
                        </Box>
                        <Box sx={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
                          เข้า: {s.joinedAt ? (s.joinedAt.split(' ')[1] || s.joinedAt) : '-'}
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, mt: 1.5, pt: 1, borderTop: '1px dashed #e2e8f0' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          fullWidth
                          onClick={(e) => handleOpenStudentMenu(e, s)}
                          startIcon={<MoreHorizontal className="w-3.5 h-3.5" />}
                          sx={{ fontSize: '0.75rem', fontWeight: 700, borderRadius: 2 }}
                        >
                          จัดการผู้สอบ
                        </Button>
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>

          {/* Integrated Card Footer - pinned cleanly at the bottom */}
          <Box
            sx={{
              p: 2,
              px: 2.5,
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 'auto',
              flexShrink: 0,
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              ระบบตรวจจับและอัปเดตอัตโนมัติทุก 3.5 วินาที
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontWeight: 600 }}>
              อัปเดตล่าสุด: {lastRefreshed.toLocaleTimeString('th-TH')}
            </Typography>
          </Box>
        </Paper>

        {/* Right: Live Audit Feed with Timeline */}
        <LiveAuditTimeline logs={logs} loading={loading} />
      </Box>

      {/* Student Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseStudentMenu}
        PaperProps={{ elevation: 3, sx: { borderRadius: 2.5, minWidth: 180 } }}
      >
        <MenuItem onClick={handleResetViolation}>
          <ListItemIcon>
            <RotateCcw className="w-4 h-4 text-amber-600" />
          </ListItemIcon>
          <ListItemText primary="ล้างการเตือน (Reset)" />
        </MenuItem>
        <MenuItem onClick={handleForceSubmit}>
          <ListItemIcon>
            <CheckCircle2 className="w-4 h-4 text-brand-600" />
          </ListItemIcon>
          <ListItemText primary="ส่งข้อสอบแทน (Submit)" />
        </MenuItem>
      </Menu>
    </Box>
  );
}
