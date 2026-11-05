import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Divider,
  Skeleton,
} from '@mui/material';
import {
  LayoutDashboard,
  DoorOpen,
  Users,
  ShieldAlert,
  FileSpreadsheet,
  PlusCircle,
  Edit,
  Trash2,
  RotateCcw,
  CheckCircle,
  QrCode,
  Tv,
  ExternalLink,
  Search,
  Download,
  AlertTriangle,
  KeyRound,
  RefreshCw,
  Sliders,
  Send,
  Eye,
} from 'lucide-react';
import {
  listRooms,
  updateRoom,
  deleteRoom,
  getDashboardData,
  resetStudentViolations,
  forceSubmitStudent,
  clearAuditLogs,
  getGasUrl,
  setGasUrl,
  testGasConnection,
} from '../../services/api';

export default function AdminPortal({
  initialTab = 0,
  onOpenCreateRoom,
  onOpenQR,
  onOpenProjector,
  onOpenLiveDashboard,
}) {
  const [tabIndex, setTabIndex] = useState(initialTab);

  useEffect(() => {
    if (initialTab !== undefined) {
      setTabIndex(initialTab);
    }
  }, [initialTab]);
  const [rooms, setRooms] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState('ALL');

  // Edit Room Dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    examUrl: '',
    exitPin: '',
    maxViolations: 3,
    status: 'ACTIVE',
  });

  // Google Apps Script state
  const [gasUrlInput, setGasUrlInput] = useState(getGasUrl());
  const [gasTestStatus, setGasTestStatus] = useState({ type: '', message: '' });
  const [gasTesting, setGasTesting] = useState(false);

  const refreshAllData = async () => {
    setLoading(true);
    try {
      const rRes = await listRooms();
      if (rRes.success) setRooms(rRes.rooms);

      const dRes = await getDashboardData('');
      if (dRes.success) {
        setAllStudents(dRes.students || []);
        setAllLogs(dRes.logs || []);
      }
    } catch (e) {
      console.warn('AdminPortal load data error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Open Edit Room
  const handleStartEditRoom = (room) => {
    setEditingRoom(room);
    setEditFormData({
      title: room.title || '',
      examUrl: room.examUrl || '',
      exitPin: room.exitPin || '',
      maxViolations: room.maxViolations || 3,
      status: room.status || 'ACTIVE',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEditRoom = async () => {
    if (!editingRoom) return;
    const res = await updateRoom(editingRoom.roomCode, editFormData);
    if (res.success) {
      setEditDialogOpen(false);
      refreshAllData();
    }
  };

  const handleDeleteRoom = async (roomCode) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบห้องสอบ "${roomCode}"?`)) {
      await deleteRoom(roomCode);
      refreshAllData();
    }
  };

  // Student Actions
  const handleResetStudent = async (roomCode, studentId) => {
    if (window.confirm(`รีเซ็ตสถานะและล้างจำนวนครั้งที่เตือนของนักศึกษา ${studentId}?`)) {
      await resetStudentViolations(roomCode, studentId);
      refreshAllData();
    }
  };

  const handleForceSubmit = async (roomCode, studentId) => {
    if (window.confirm(`คุณต้องการบังคับส่งข้อสอบแทนนักศึกษา ${studentId} หรือไม่?`)) {
      await forceSubmitStudent(roomCode, studentId);
      refreshAllData();
    }
  };

  const handleClearLogs = async () => {
    if (window.confirm('คุณต้องการล้างประวัติ Audit Logs ทั้งหมดหรือไม่?')) {
      await clearAuditLogs();
      refreshAllData();
    }
  };

  const handleTestGas = async () => {
    setGasTesting(true);
    setGasTestStatus({ type: 'info', message: 'กำลังทดสอบเชื่อมต่อไปยังเซิร์ฟเวอร์...' });
    try {
      await testGasConnection(gasUrlInput);
      setGasTestStatus({ type: 'success', message: 'เชื่อมต่อสำเร็จ! API ตอบรับปกติ พร้อมบันทึกข้อมูลเรียบร้อย' });
      setGasUrl(gasUrlInput);
    } catch (err) {
      setGasTestStatus({ type: 'error', message: err.message || 'เชื่อมต่อไม่สำเร็จ' });
    } finally {
      setGasTesting(false);
    }
  };

  const filteredStudents = allStudents.filter((s) => {
    const matchRoom = selectedRoomFilter === 'ALL' || s.roomCode.toUpperCase() === selectedRoomFilter.toUpperCase();
    const matchQuery =
      (s.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.studentId || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchRoom && matchQuery;
  });

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Top Banner Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 4,
          pb: 3,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: -0.5 }}>
              ศูนย์จัดการระบบหลังบ้าน (Admin Portal)
            </Typography>
            <Chip
              label="Admin Mode"
              color="primary"
              size="small"
              sx={{ fontWeight: 700, borderRadius: 1.5 }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            จัดการห้องสอบ, ควบคุมเซสชันนักศึกษา, ตรวจสอบบันทึกความปลอดภัย และเชื่อมต่อ Google Sheet
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            color="primary"
            onClick={onOpenLiveDashboard}
            startIcon={<LayoutDashboard className="w-4 h-4" />}
            sx={{ fontWeight: 600 }}
          >
            แดชบอร์ดคุมสอบสด (Live)
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={onOpenCreateRoom}
            startIcon={<PlusCircle className="w-4 h-4" />}
            sx={{ fontWeight: 700 }}
          >
            สร้างห้องสอบใหม่
          </Button>
          <Tooltip title="รีเฟรชข้อมูล" arrow>
            <IconButton onClick={refreshAllData} disabled={loading} sx={{ border: '1px solid #cbd5e1' }}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tabIndex}
          onChange={(e, val) => setTabIndex(val)}
          aria-label="Admin Navigation Tabs"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              minHeight: 48,
            },
          }}
        >
          <Tab icon={<DoorOpen className="w-4 h-4" />} iconPosition="start" label={`จัดการห้องสอบ (${rooms.length})`} />
          <Tab icon={<Users className="w-4 h-4" />} iconPosition="start" label={`ควบคุมนักศึกษา (${allStudents.length})`} />
          <Tab icon={<ShieldAlert className="w-4 h-4" />} iconPosition="start" label={`บันทึกความปลอดภัย (${allLogs.length})`} />
          <Tab icon={<FileSpreadsheet className="w-4 h-4" />} iconPosition="start" label="การเชื่อมต่อ Google Sheets" />
        </Tabs>
      </Box>

      {/* TAB 0: ROOMS MANAGEMENT */}
      {tabIndex === 0 && (
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              รายการห้องสอบทั้งหมดในระบบ ({rooms.length} ห้อง)
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={onOpenCreateRoom}
              startIcon={<PlusCircle className="w-4 h-4" />}
            >
              เพิ่มห้องสอบ
            </Button>
          </Box>

          <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>รหัสห้องสอบ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ชื่อการสอบ / วิชา</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Exit PIN (รหัสปลดล็อก)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>เกณฑ์เตือน</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>สร้างเมื่อ</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>เครื่องมือจัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && rooms.length === 0 ? (
                  [...Array(4)].map((_, idx) => (
                    <TableRow key={`skeleton-room-${idx}`}>
                      <TableCell><Skeleton variant="text" width={80} height={26} sx={{ borderRadius: 1 }} /></TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={180} height={22} sx={{ borderRadius: 1 }} />
                        <Skeleton variant="text" width={110} height={16} sx={{ borderRadius: 1 }} />
                      </TableCell>
                      <TableCell><Skeleton variant="rounded" width={55} height={24} sx={{ borderRadius: 2 }} /></TableCell>
                      <TableCell><Skeleton variant="text" width={50} height={20} sx={{ borderRadius: 1 }} /></TableCell>
                      <TableCell><Skeleton variant="rounded" width={65} height={24} sx={{ borderRadius: 2 }} /></TableCell>
                      <TableCell><Skeleton variant="text" width={100} height={20} sx={{ borderRadius: 1 }} /></TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Skeleton variant="circular" width={28} height={28} />
                          <Skeleton variant="circular" width={28} height={28} />
                          <Skeleton variant="circular" width={28} height={28} />
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                ) : rooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      ยังไม่มีห้องสอบในระบบ คลิก "เพิ่มห้องสอบ" เพื่อเริ่มต้น
                    </TableCell>
                  </TableRow>
                ) : (
                  rooms.map((r) => (
                    <TableRow key={r.roomCode} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: 'primary.main', fontSize: '0.95rem' }}>
                        {r.roomCode}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {r.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', maxWidth: 300, truncate: true }}>
                          URL: {r.examUrl || 'ยังไม่ได้ระบุ'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.exitPin}
                          size="small"
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            letterSpacing: 1.5,
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {r.maxViolations || 3} ครั้ง
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.status === 'ACTIVE' ? 'เปิดรับข้อสอบ' : r.status === 'PAUSED' ? 'พักชั่วคราว' : 'ปิดแล้ว'}
                          size="small"
                          color={r.status === 'ACTIVE' ? 'success' : 'default'}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                        {r.createdAt || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="เปิด QR Code หน้าห้อง" arrow>
                            <IconButton size="small" color="primary" onClick={() => onOpenQR(r)}>
                              <QrCode className="w-4 h-4" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="ฉายโปรเจกเตอร์" arrow>
                            <IconButton size="small" color="secondary" onClick={() => onOpenProjector(r)}>
                              <Tv className="w-4 h-4" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="แก้ไขการตั้งค่าห้องสอบ" arrow>
                            <IconButton size="small" color="info" onClick={() => handleStartEditRoom(r)}>
                              <Edit className="w-4 h-4" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="ลบห้องสอบนี้" arrow>
                            <IconButton size="small" color="error" onClick={() => handleDeleteRoom(r.roomCode)}>
                              <Trash2 className="w-4 h-4" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}

      {/* TAB 1: STUDENT SESSIONS & CONTROLS */}
      {tabIndex === 1 && (
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              ควบคุมและติดตามเซสชันนักศึกษา ({filteredStudents.length} คน)
            </Typography>

            <Stack direction="row" spacing={1.5} alignItems="center">
              {/* Room Filter */}
              <Select
                size="small"
                value={selectedRoomFilter}
                onChange={(e) => setSelectedRoomFilter(e.target.value)}
                sx={{ minWidth: 160, fontSize: '0.85rem', fontWeight: 600 }}
              >
                <MenuItem value="ALL">ห้องสอบทั้งหมด</MenuItem>
                {rooms.map((r) => (
                  <MenuItem key={r.roomCode} value={r.roomCode}>
                    {r.roomCode} - {r.title}
                  </MenuItem>
                ))}
              </Select>

              {/* Search */}
              <TextField
                size="small"
                placeholder="ค้นหารหัส หรือ ชื่อ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <Search className="w-4 h-4 text-slate-400 mr-1" />,
                }}
                sx={{ width: 220 }}
              />
            </Stack>
          </Box>

          <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>ห้องสอบ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>รหัสนักศึกษา</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ชื่อ - นามสกุล</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>หลุดจอ (ครั้ง)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>เข้าสอบเมื่อ</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>คำสั่งควบคุม (Teacher Actions)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && allStudents.length === 0 ? (
                  [...Array(5)].map((_, idx) => (
                    <TableRow key={`skeleton-student-tab-${idx}`}>
                      <TableCell><Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 1.5 }} /></TableCell>
                      <TableCell><Skeleton variant="text" width={85} height={24} sx={{ borderRadius: 1 }} /></TableCell>
                      <TableCell><Skeleton variant="text" width={140} height={24} sx={{ borderRadius: 1 }} /></TableCell>
                      <TableCell><Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: 2 }} /></TableCell>
                      <TableCell sx={{ textAlign: 'center' }}><Skeleton variant="rounded" width={36} height={22} sx={{ borderRadius: 2, mx: 'auto' }} /></TableCell>
                      <TableCell><Skeleton variant="text" width={90} height={20} sx={{ borderRadius: 1 }} /></TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Skeleton variant="rounded" width={80} height={28} sx={{ borderRadius: 1.5 }} />
                          <Skeleton variant="rounded" width={80} height={28} sx={{ borderRadius: 1.5 }} />
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      ไม่พบข้อมูลนักศึกษาตามเงื่อนไขที่เลือก
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((s) => (
                    <TableRow key={s.studentId + s.roomCode} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {s.roomCode}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: 'text.primary' }}>
                        {s.studentId}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {s.studentName}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            s.status === 'ACTIVE'
                              ? 'ปกติ (ในจอ)'
                              : s.status === 'LEFT_FULLSCREEN'
                              ? 'หลุด Fullscreen!'
                              : s.status === 'TAB_SWITCH' || s.status === 'BLUR'
                              ? 'สลับแท็บ / ยุบจอ!'
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
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {s.violations > 0 ? (
                          <Chip
                            label={`${s.violations} ครั้ง`}
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ fontWeight: 800, fontFamily: 'monospace' }}
                          />
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">0</span>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                        {s.joinedAt || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => handleResetStudent(s.roomCode, s.studentId)}
                            startIcon={<RotateCcw className="w-3.5 h-3.5" />}
                            sx={{ fontSize: '0.75rem', fontWeight: 700, borderRadius: 2 }}
                          >
                            ล้างเตือน
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            disabled={s.status === 'SUBMITTED'}
                            onClick={() => handleForceSubmit(s.roomCode, s.studentId)}
                            startIcon={<CheckCircle className="w-3.5 h-3.5" />}
                            sx={{ fontSize: '0.75rem', fontWeight: 700, borderRadius: 2 }}
                          >
                            ส่งข้อสอบแทน
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {tabIndex === 2 && (
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              ประวัติการกระทำและบันทึกความปลอดภัยทั้งหมด ({allLogs.length} รายการ)
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleClearLogs}
                startIcon={<Trash2 className="w-4 h-4" />}
              >
                ล้างประวัติ
              </Button>
            </Stack>
          </Box>

          <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>วันและเวลา</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ห้องสอบ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>รหัสนักศึกษา</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ชื่อนักศึกษา</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ประเภทเหตุการณ์</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>รายละเอียดเพิ่มเติม</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && allLogs.length === 0 ? (
                  [...Array(6)].map((_, idx) => (
                    <TableRow key={`skeleton-log-tab-${idx}`}>
                      <TableCell><Skeleton variant="text" width={110} height={20} sx={{ borderRadius: 1 }} /></TableCell>
                      <TableCell><Skeleton variant="rounded" width={65} height={22} sx={{ borderRadius: 1.5 }} /></TableCell>
                      <TableCell><Skeleton variant="text" width={80} height={20} sx={{ borderRadius: 1 }} /></TableCell>
                      <TableCell><Skeleton variant="text" width={120} height={20} sx={{ borderRadius: 1 }} /></TableCell>
                      <TableCell><Skeleton variant="rounded" width={90} height={22} sx={{ borderRadius: 2 }} /></TableCell>
                      <TableCell><Skeleton variant="text" width={180} height={20} sx={{ borderRadius: 1 }} /></TableCell>
                    </TableRow>
                  ))
                ) : allLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      ยังไม่มีประวัติเหตุการณ์
                    </TableCell>
                  </TableRow>
                ) : (
                  allLogs.map((log, index) => {
                    const isAlert =
                      log.eventType === 'LEFT_FULLSCREEN' ||
                      log.eventType === 'TAB_SWITCH' ||
                      log.eventType === 'BLUR' ||
                      log.eventType === 'EXIT_PIN_FAILED';

                    return (
                      <TableRow key={index} hover sx={{ backgroundColor: isAlert ? 'rgba(254, 242, 242, 0.4)' : undefined }}>
                        <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                          {log.timestamp}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {log.roomCode}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800 }}>
                          {log.studentId}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {log.studentName}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.eventType}
                            size="small"
                            color={isAlert ? 'error' : log.eventType === 'SUBMITTED' ? 'primary' : 'default'}
                            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                          {log.details || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}

      {/* TAB 3: GOOGLE SHEETS SYNC SETTINGS */}
      {tabIndex === 3 && (
        <Card elevation={1} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 4 }}>
          <Stack spacing={3} maxWidth="md">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                การเชื่อมต่อฐานข้อมูล Google Sheets
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                กำหนด URL ของ Google Apps Script Web App เพื่อให้อัปเดตข้อมูลขึ้น Google Sheet แบบเรียลไทม์
              </Typography>
            </Box>

            <Box sx={{ p: 2.5, backgroundColor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Google Sheet เป้าหมาย:
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main', wordBreak: 'break-all' }}>
                https://docs.google.com/spreadsheets/d/1ymUruyobCQTdvyJ6X1uhoU5Zys9wulF4bciYvD1PRH4/edit
              </Typography>
              <Button
                variant="outlined"
                size="small"
                href="https://docs.google.com/spreadsheets/d/1ymUruyobCQTdvyJ6X1uhoU5Zys9wulF4bciYvD1PRH4/edit"
                target="_blank"
                rel="noreferrer"
                startIcon={<ExternalLink className="w-3.5 h-3.5" />}
                sx={{ mt: 1.5 }}
              >
                เปิดไฟล์ Google Sheet ในแท็บใหม่
              </Button>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                API Endpoint (REST API / Web App URL):
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="https://dashboard.bcnlp.ac.th/api/SammLocker"
                  value={gasUrlInput}
                  onChange={(e) => setGasUrlInput(e.target.value)}
                />
                <Button
                  variant="contained"
                  onClick={handleTestGas}
                  disabled={gasTesting || !gasUrlInput.trim()}
                  sx={{ whiteSpace: 'nowrap', px: 3, fontWeight: 700 }}
                >
                  {gasTesting ? 'กำลังทดสอบ...' : 'ทดสอบและบันทึก'}
                </Button>
              </Stack>
            </Box>

            {gasTestStatus.message && (
              <Alert severity={gasTestStatus.type || 'info'} sx={{ borderRadius: 2 }}>
                {gasTestStatus.message}
              </Alert>
            )}
          </Stack>
        </Card>
      )}

      {/* Edit Room Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          แก้ไขข้อมูลห้องสอบ ({editingRoom?.roomCode})
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="ชื่อการสอบ / วิชา"
              fullWidth
              value={editFormData.title}
              onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
            />
            <TextField
              label="URL ของข้อสอบ"
              fullWidth
              value={editFormData.examUrl}
              onChange={(e) => setEditFormData({ ...editFormData, examUrl: e.target.value })}
            />
            <TextField
              label="Exit PIN (รหัสปลดล็อก)"
              fullWidth
              value={editFormData.exitPin}
              onChange={(e) => setEditFormData({ ...editFormData, exitPin: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>สถานะห้องสอบ</InputLabel>
              <Select
                value={editFormData.status}
                label="สถานะห้องสอบ"
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
              >
                <MenuItem value="ACTIVE">เปิดใช้งาน (ACTIVE)</MenuItem>
                <MenuItem value="PAUSED">พักชั่วคราว (PAUSED)</MenuItem>
                <MenuItem value="CLOSED">ปิดการสอบ (CLOSED)</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit">
            ยกเลิก
          </Button>
          <Button onClick={handleSaveEditRoom} variant="contained" color="primary">
            บันทึกการเปลี่ยนแปลง
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

