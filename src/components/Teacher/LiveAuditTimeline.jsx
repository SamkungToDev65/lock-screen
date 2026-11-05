import React, { useState, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  TextField,
  Stack,
  Avatar,
  Skeleton,
  Tooltip,
  Fade,
} from '@mui/material';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  KeyRound,
  EyeOff,
  LogOut,
  RotateCcw,
  Activity,
  Search,
  X,
  Clock,
  ArrowUp,
  Copy,
  Check,
  Filter,
} from 'lucide-react';

// Configuration mapping for event types
const EVENT_CONFIG = {
  LEFT_FULLSCREEN: {
    category: 'VIOLATION',
    severity: 'danger',
    title: 'หลุดโหมดเต็มหน้าจอ (Left Fullscreen)',
    shortLabel: 'หลุดเต็มจอ',
    icon: ShieldAlert,
    nodeBg: '#fee2e2',
    nodeBorder: '#ef4444',
    nodeColor: '#dc2626',
    cardBorder: '#fca5a5',
    cardBg: '#fffbfb',
    badgeBg: '#fef2f2',
    badgeText: '#991b1b',
    accentColor: '#dc2626',
  },
  TAB_SWITCH: {
    category: 'VIOLATION',
    severity: 'warning',
    title: 'สลับหน้าต่าง / ยุบจอ (Tab Switch)',
    shortLabel: 'สลับหน้าต่าง / ยุบจอ',
    icon: AlertTriangle,
    nodeBg: '#ffedd5',
    nodeBorder: '#f97316',
    nodeColor: '#c2410c',
    cardBorder: '#fdba74',
    cardBg: '#fffdfa',
    badgeBg: '#fff7ed',
    badgeText: '#9a3412',
    accentColor: '#ea580c',
  },
  BLUR: {
    category: 'VIOLATION',
    severity: 'warning',
    title: 'หน้าต่างสอบหลุดโฟกัส (Window Blur)',
    shortLabel: 'หลุดโฟกัสหน้าต่าง',
    icon: EyeOff,
    nodeBg: '#fef3c7',
    nodeBorder: '#f59e0b',
    nodeColor: '#b45309',
    cardBorder: '#fcd34d',
    cardBg: '#fffdf5',
    badgeBg: '#fffbeb',
    badgeText: '#92400e',
    accentColor: '#d97706',
  },
  EXIT_PIN_FAILED: {
    category: 'VIOLATION',
    severity: 'danger',
    title: 'รหัส Exit PIN ไม่ถูกต้อง',
    shortLabel: 'รหัส Exit PIN ผิด',
    icon: KeyRound,
    nodeBg: '#fee2e2',
    nodeBorder: '#e11d48',
    nodeColor: '#be123c',
    cardBorder: '#fda4af',
    cardBg: '#fffafa',
    badgeBg: '#fff1f2',
    badgeText: '#9f1239',
    accentColor: '#e11d48',
  },
  SUBMITTED: {
    category: 'SUBMISSION',
    severity: 'success',
    title: 'ส่งข้อสอบสำเร็จและปลดล็อก',
    shortLabel: 'ส่งข้อสอบสำเร็จ',
    icon: CheckCircle2,
    nodeBg: '#dcfce7',
    nodeBorder: '#22c55e',
    nodeColor: '#15803d',
    cardBorder: '#86efac',
    cardBg: '#f0fdf4',
    badgeBg: '#ecfdf5',
    badgeText: '#166534',
    accentColor: '#16a34a',
  },
  FORCE_SUBMITTED: {
    category: 'SUBMISSION',
    severity: 'info',
    title: 'อาจารย์สั่งส่งข้อสอบแทน (Force Submit)',
    shortLabel: 'ส่งแทนโดยอาจารย์',
    icon: LogOut,
    nodeBg: '#ede9fe',
    nodeBorder: '#8b5cf6',
    nodeColor: '#6d28d9',
    cardBorder: '#c4b5fd',
    cardBg: '#faf5ff',
    badgeBg: '#f5f3ff',
    badgeText: '#5b21b6',
    accentColor: '#7c3aed',
  },
  RESET_WARNING: {
    category: 'SYSTEM',
    severity: 'info',
    title: 'ล้างประวัติการเตือนและรีเซ็ต',
    shortLabel: 'ล้างการเตือน',
    icon: RotateCcw,
    nodeBg: '#e0e7ff',
    nodeBorder: '#6366f1',
    nodeColor: '#4338ca',
    cardBorder: '#a5b4fc',
    cardBg: '#f5f7ff',
    badgeBg: '#eef2ff',
    badgeText: '#3730a3',
    accentColor: '#4f46e5',
  },
  STUDENT_JOINED: {
    category: 'JOIN',
    severity: 'info',
    title: 'เข้าสู่ห้องสอบ (Joined Room)',
    shortLabel: 'เข้าห้องสอบ',
    icon: UserPlus,
    nodeBg: '#e0f2fe',
    nodeBorder: '#0ea5e9',
    nodeColor: '#0369a1',
    cardBorder: '#bae6fd',
    cardBg: '#f0f9ff',
    badgeBg: '#f0f9ff',
    badgeText: '#075985',
    accentColor: '#0284c7',
  },
};

const DEFAULT_CONFIG = {
  category: 'OTHER',
  severity: 'default',
  title: 'บันทึกเหตุการณ์',
  shortLabel: 'เหตุการณ์',
  icon: Activity,
  nodeBg: '#f1f5f9',
  nodeBorder: '#94a3b8',
  nodeColor: '#475569',
  cardBorder: '#e2e8f0',
  cardBg: '#ffffff',
  badgeBg: '#f8fafc',
  badgeText: '#334155',
  accentColor: '#64748b',
};

// Robust timestamp parser & relative time calculator
function parseTime(ts) {
  if (!ts) return { time: '--:--', full: '', relative: '' };

  // If MySQL format "YYYY-MM-DD HH:mm:ss"
  if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}/.test(ts)) {
    const d = new Date(ts.replace(' ', 'T'));
    if (!isNaN(d.getTime())) {
      const time = d.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
      let relative = 'เมื่อสักครู่';
      if (diffSec >= 60 && diffSec < 3600) {
        relative = `${Math.floor(diffSec / 60)} นาทีก่อน`;
      } else if (diffSec >= 3600 && diffSec < 86400) {
        relative = `${Math.floor(diffSec / 3600)} ชม.ก่อน`;
      } else if (diffSec >= 86400) {
        relative = `${Math.floor(diffSec / 86400)} วันก่อน`;
      }
      return { time, full: ts, relative };
    }
  }

  // If Thai format string e.g. "5/11/2569, 21:58:00"
  const match = String(ts).match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
  if (match) {
    return { time: match[1], full: String(ts), relative: '' };
  }

  return { time: String(ts), full: String(ts), relative: '' };
}

export default function LiveAuditTimeline({ logs = [], loading = false }) {
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'VIOLATION' | 'SUBMISSION' | 'JOIN'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef(null);

  // Filter & Search Logic
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const cfg = EVENT_CONFIG[log.eventType] || DEFAULT_CONFIG;

      // Filter by category
      if (activeFilter !== 'ALL') {
        if (activeFilter === 'VIOLATION' && cfg.category !== 'VIOLATION') return false;
        if (activeFilter === 'SUBMISSION' && cfg.category !== 'SUBMISSION') return false;
        if (activeFilter === 'JOIN' && cfg.category !== 'JOIN') return false;
      }

      // Search query filter (matches student name, student ID, or details)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const studentIdMatch = (log.studentId || '').toLowerCase().includes(query);
        const nameMatch = (log.studentName || '').toLowerCase().includes(query);
        const detailsMatch = (log.details || '').toLowerCase().includes(query);
        const labelMatch = (cfg.shortLabel || '').toLowerCase().includes(query);
        return studentIdMatch || nameMatch || detailsMatch || labelMatch;
      }

      return true;
    });
  }, [logs, activeFilter, searchQuery]);

  // Counts for pills
  const counts = useMemo(() => {
    let violations = 0;
    let submissions = 0;
    let joins = 0;

    logs.forEach((log) => {
      const cfg = EVENT_CONFIG[log.eventType] || DEFAULT_CONFIG;
      if (cfg.category === 'VIOLATION') violations++;
      else if (cfg.category === 'SUBMISSION') submissions++;
      else if (cfg.category === 'JOIN') joins++;
    });

    return { total: logs.length, violations, submissions, joins };
  }, [logs]);

  // Handle scroll detection for "Scroll to top" button
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setShowScrollTop(scrollContainerRef.current.scrollTop > 200);
    }
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Paper
      elevation={1}
      sx={{
        borderRadius: 3.5,
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        height: { xs: 'auto', md: 620 },
        minHeight: { md: 620 },
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        boxShadow: '0 4px 16px -4px rgba(15, 23, 42, 0.05)',
      }}
    >
      {/* 1. TOP HEADER WITH LIVE BEACON */}
      <Box
        sx={{
          p: 2.2,
          pb: 1.8,
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          {/* Title & Live Pulse */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2.5,
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}
            >
              <ShieldAlert className="w-5 h-5" />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                  เหตุการณ์สด (Live Audit Feed)
                </Typography>
                {/* Live pulsing radar dot */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, bgcolor: '#ecfdf5', px: 1, py: 0.2, borderRadius: 999, border: '1px solid #a7f3d0' }}>
                  <Box sx={{ position: 'relative', width: 7, height: 7 }}>
                    <Box
                      sx={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        opacity: 0.8,
                        animation: 'radarPulse 1.6s cubic-bezier(0, 0, 0.2, 1) infinite',
                        '@keyframes radarPulse': {
                          '70%, 100%': { transform: 'scale(2.5)', opacity: 0 },
                        },
                      }}
                    />
                    <Box
                      sx={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                      }}
                    />
                  </Box>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#059669', letterSpacing: '0.04em' }}>
                    LIVE
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                บันทึกการกระทำและตรวจจับความปลอดภัยแบบเรียลไทม์
              </Typography>
            </Box>
          </Box>

          {/* Alert pill counter if any violations exist */}
          {counts.violations > 0 ? (
            <Tooltip title="มีเหตุการณ์ตรวจพบการละเมิดกฎการสอบ">
              <Chip
                icon={<AlertTriangle className="w-3.5 h-3.5" style={{ color: '#dc2626' }} />}
                label={`${counts.violations} เตือน`}
                size="small"
                sx={{
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                }}
              />
            </Tooltip>
          ) : (
            <Chip
              label={`${counts.total} บันทึก`}
              size="small"
              sx={{
                backgroundColor: '#f8fafc',
                color: '#475569',
                border: '1px solid #e2e8f0',
                fontWeight: 700,
                fontSize: '0.72rem',
                fontFamily: 'monospace',
              }}
            />
          )}
        </Box>

        {/* 2. FILTER SEGMENTS BAR */}
        <Box sx={{ mt: 1.8, display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
          <Chip
            label={`ทั้งหมด (${counts.total})`}
            size="small"
            clickable
            onClick={() => setActiveFilter('ALL')}
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              height: 26,
              backgroundColor: activeFilter === 'ALL' ? '#0f172a' : '#f1f5f9',
              color: activeFilter === 'ALL' ? '#ffffff' : '#475569',
              border: activeFilter === 'ALL' ? '1px solid #0f172a' : '1px solid transparent',
              '&:hover': {
                backgroundColor: activeFilter === 'ALL' ? '#1e293b' : '#e2e8f0',
              },
            }}
          />

          <Chip
            icon={<ShieldAlert className="w-3 h-3" />}
            label={`การเตือน (${counts.violations})`}
            size="small"
            clickable
            onClick={() => setActiveFilter('VIOLATION')}
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              height: 26,
              backgroundColor: activeFilter === 'VIOLATION' ? '#dc2626' : counts.violations > 0 ? '#fef2f2' : '#f8fafc',
              color: activeFilter === 'VIOLATION' ? '#ffffff' : counts.violations > 0 ? '#dc2626' : '#64748b',
              border: activeFilter === 'VIOLATION' ? '1px solid #dc2626' : counts.violations > 0 ? '1px solid #fecaca' : '1px solid transparent',
              '& .MuiChip-icon': {
                color: activeFilter === 'VIOLATION' ? '#ffffff' : '#dc2626',
              },
              '&:hover': {
                backgroundColor: activeFilter === 'VIOLATION' ? '#b91c1c' : '#fee2e2',
              },
            }}
          />

          <Chip
            icon={<CheckCircle2 className="w-3 h-3" />}
            label={`ส่งข้อสอบ (${counts.submissions})`}
            size="small"
            clickable
            onClick={() => setActiveFilter('SUBMISSION')}
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              height: 26,
              backgroundColor: activeFilter === 'SUBMISSION' ? '#16a34a' : '#f0fdf4',
              color: activeFilter === 'SUBMISSION' ? '#ffffff' : '#15803d',
              border: activeFilter === 'SUBMISSION' ? '1px solid #16a34a' : '1px solid #bbf7d0',
              '& .MuiChip-icon': {
                color: activeFilter === 'SUBMISSION' ? '#ffffff' : '#16a34a',
              },
              '&:hover': {
                backgroundColor: activeFilter === 'SUBMISSION' ? '#15803d' : '#dcfce7',
              },
            }}
          />

          <Chip
            icon={<UserPlus className="w-3 h-3" />}
            label={`เข้าห้อง (${counts.joins})`}
            size="small"
            clickable
            onClick={() => setActiveFilter('JOIN')}
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              height: 26,
              backgroundColor: activeFilter === 'JOIN' ? '#0284c7' : '#f0f9ff',
              color: activeFilter === 'JOIN' ? '#ffffff' : '#0369a1',
              border: activeFilter === 'JOIN' ? '1px solid #0284c7' : '1px solid #bae6fd',
              '& .MuiChip-icon': {
                color: activeFilter === 'JOIN' ? '#ffffff' : '#0284c7',
              },
              '&:hover': {
                backgroundColor: activeFilter === 'JOIN' ? '#0369a1' : '#e0f2fe',
              },
            }}
          />
        </Box>

        {/* 3. QUICK SEARCH WITHIN TIMELINE */}
        <Box sx={{ mt: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="ค้นหาชื่อ, รหัสนักศึกษา หรือ เหตุการณ์..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />,
              endAdornment: searchQuery ? (
                <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ p: 0.2 }}>
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </IconButton>
              ) : null,
              sx: {
                height: 32,
                fontSize: '0.78rem',
                borderRadius: 2,
                backgroundColor: '#f8fafc',
                '& fieldset': { borderColor: '#e2e8f0' },
                '&:hover fieldset': { borderColor: '#cbd5e1' },
                '&.Mui-focused fieldset': { borderColor: '#2563eb' },
              },
            }}
          />
        </Box>
      </Box>

      {/* 4. SCROLLABLE TIMELINE BODY */}
      <Box
        ref={scrollContainerRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          pr: 1.5,
          position: 'relative',
          backgroundColor: '#fafbfc',
          '&::-webkit-scrollbar': { width: '5px' },
          '&::-webkit-scrollbar-track': { background: '#f8fafc' },
          '&::-webkit-scrollbar-thumb': { background: '#cbd5e1', borderRadius: '4px' },
          '&::-webkit-scrollbar-thumb:hover': { background: '#94a3b8' },
        }}
      >
        <Stack spacing={1.5}>
          {loading && logs.length === 0 ? (
            // SKELETON LOADING STATE
            [...Array(5)].map((_, idx) => (
              <Paper
                key={`skeleton-log-${idx}`}
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2.5,
                  borderColor: '#e2e8f0',
                  backgroundColor: '#ffffff',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Skeleton variant="text" width="40%" height={20} />
                  <Skeleton variant="text" width="25%" height={18} />
                </Box>
                <Skeleton variant="text" width="60%" height={18} sx={{ mb: 1 }} />
                <Skeleton variant="rounded" width="50%" height={24} sx={{ borderRadius: 1.5 }} />
              </Paper>
            ))
          ) : filteredLogs.length === 0 ? (
            // EMPTY STATES
            <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                  color: '#3b82f6',
                }}
              >
                <Activity className="w-6 h-6 text-brand-600" />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#334155', mb: 0.5 }}>
                {searchQuery || activeFilter !== 'ALL'
                  ? 'ไม่พบประวัติที่ตรงกับเงื่อนไข'
                  : 'ยังไม่มีประวัติเหตุการณ์'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', maxWidth: 260, mx: 'auto' }}>
                {searchQuery || activeFilter !== 'ALL'
                  ? 'ลองเปลี่ยนตัวกรอง หรือล้างคำค้นหาเพื่อดูบันทึกทั้งหมด'
                  : 'ระบบกำลังเฝ้าระวังการหลุดจอ สลับแท็บ และการส่งข้อสอบแบบเรียลไทม์'}
              </Typography>
              {(searchQuery || activeFilter !== 'ALL') && (
                <Chip
                  label="ล้างตัวกรองทั้งหมด"
                  size="small"
                  onClick={() => {
                    setActiveFilter('ALL');
                    setSearchQuery('');
                  }}
                  sx={{
                    mt: 2,
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    bgcolor: '#ffffff',
                    border: '1px solid #cbd5e1',
                  }}
                />
              )}
            </Box>
          ) : (
            // RENDER SENIOR-LEVEL TIMELINE CARDS
            filteredLogs.map((log, index) => {
              const cfg = EVENT_CONFIG[log.eventType] || DEFAULT_CONFIG;
              const IconComponent = cfg.icon;
              const { time, full, relative } = parseTime(log.timestamp);
              const isAlert = cfg.category === 'VIOLATION';
              const isCopied = copiedId === log.studentId;

              return (
                <Paper
                  key={`audit-item-${index}`}
                  elevation={0}
                  sx={{
                    p: 1.6,
                    borderRadius: 2.75,
                    backgroundColor: cfg.cardBg,
                    border: `1px solid ${cfg.cardBorder}`,
                    borderLeft: `4px solid ${cfg.accentColor}`,
                    boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.04)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      boxShadow: '0 6px 16px -4px rgba(15, 23, 42, 0.1)',
                      transform: 'translateY(-1.5px)',
                      borderColor: cfg.accentColor,
                    },
                  }}
                >
                  {/* CARD HEADER: STUDENT INFO & TIME */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    {/* Student Identity */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <Avatar
                        sx={{
                          width: 24,
                          height: 24,
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          backgroundColor: isAlert ? '#fee2e2' : '#e0e7ff',
                          color: isAlert ? '#dc2626' : '#3730a3',
                          border: `1px solid ${isAlert ? '#fca5a5' : '#c7d2fe'}`,
                        }}
                      >
                        {log.studentName ? log.studentName.trim().charAt(0) : 'S'}
                      </Avatar>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{
                          fontWeight: 750,
                          fontSize: '0.82rem',
                          color: '#0f172a',
                          maxWidth: { xs: 110, sm: 150 },
                        }}
                      >
                        {log.studentName || 'ไม่ระบุชื่อ'}
                      </Typography>

                      {/* Student ID chip with click-to-copy */}
                      {log.studentId && (
                        <Tooltip title={isCopied ? 'คัดลอกรหัสแล้ว!' : 'คลิกเพื่อคัดลอกรหัสนักศึกษา'}>
                          <Box
                            onClick={() => handleCopyId(log.studentId)}
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.4,
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              color: '#334155',
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              px: 0.8,
                              py: 0.15,
                              borderRadius: 1.25,
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease',
                              '&:hover': {
                                backgroundColor: '#e2e8f0',
                              },
                            }}
                          >
                            {isCopied ? (
                              <Check className="w-2.8 h-2.8 text-emerald-600" />
                            ) : (
                              <Copy className="w-2.8 h-2.8 text-slate-400" />
                            )}
                            <span>{log.studentId}</span>
                          </Box>
                        </Tooltip>
                      )}
                    </Box>

                    {/* Timestamp Node */}
                    <Tooltip title={full || time}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexShrink: 0 }}>
                        <Clock className="w-3 h-3 text-slate-400" />
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            color: '#475569',
                          }}
                        >
                          {time}
                        </Typography>
                        {relative && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.66rem',
                              color: '#94a3b8',
                              display: { xs: 'none', sm: 'inline' },
                            }}
                          >
                            ({relative})
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  </Box>

                  {/* EVENT BADGE PILL */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.6,
                        px: 1,
                        py: 0.35,
                        borderRadius: 1.5,
                        backgroundColor: cfg.badgeBg,
                        border: `1px solid ${cfg.cardBorder}`,
                        color: cfg.badgeText,
                      }}
                    >
                      <IconComponent className="w-3.2 h-3.2" style={{ color: cfg.accentColor }} />
                      <Typography
                        sx={{
                          fontSize: '0.73rem',
                          fontWeight: 750,
                          lineHeight: 1.3,
                        }}
                      >
                        {cfg.title}
                      </Typography>
                    </Box>
                  </Box>

                  {/* DETAILS CALLOUT (Crucial context like reason, pin failure, seconds) */}
                  {log.details && (
                        <Box
                          sx={{
                            mt: 1,
                            px: 1.25,
                            py: 0.65,
                            borderRadius: 1.75,
                            backgroundColor: isAlert ? '#fff1f2' : '#f8fafc',
                            border: `1px dashed ${isAlert ? '#fecdd3' : '#cbd5e1'}`,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 0.8,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: '0.73rem',
                              color: isAlert ? '#9f1239' : '#334155',
                              lineHeight: 1.45,
                              wordBreak: 'break-word',
                            }}
                          >
                            <span style={{ fontWeight: 700 }}>บันทึก:</span> {log.details}
                          </Typography>
                        </Box>
                  )}
                </Paper>
              );
            })
          )}
        </Stack>
      </Box>

      {/* 5. BOTTOM STATUS BAR & SCROLL-TO-TOP BUTTON */}
      <Box
        sx={{
          p: 1.4,
          px: 2,
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>
          แสดงผล {filteredLogs.length} จาก {logs.length} เหตุการณ์
        </Typography>

        <Fade in={showScrollTop}>
          <Box
            onClick={scrollToTop}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              color: '#2563eb',
              fontSize: '0.72rem',
              fontWeight: 700,
              p: 0.5,
              borderRadius: 1,
              '&:hover': {
                backgroundColor: '#eff6ff',
              },
            }}
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>กลับด้านบน</span>
          </Box>
        </Fade>
      </Box>
    </Paper>
  );
}

