import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Badge,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  ShieldCheck,
  Home,
  Monitor,
  Users,
  FileText,
  BarChart3,
  Settings,
  BookOpen,
  Headphones,
  Bell,
  HelpCircle,
  ChevronDown,
  LogOut,
  ExternalLink,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminSidebar({ currentTab, onSelectTab, onOpenSettings }) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'แดชบอร์ดคุมสอบ', icon: <Home className="w-5 h-5" /> },
    { id: 'rooms', label: 'จัดการห้องสอบ', icon: <Monitor className="w-5 h-5" /> },
    { id: 'students', label: 'จัดการนักศึกษา', icon: <Users className="w-5 h-5" /> },
    { id: 'exams', label: 'ข้อสอบและคลังข้อสอบ', icon: <FileText className="w-5 h-5" /> },
    { id: 'reports', label: 'รายงานและสถิติ', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'settings', label: 'ตั้งค่าระบบ', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <Box
      sx={{
        width: 260,
        height: '100%',
        minHeight: '100vh',
        flexShrink: 0,
        background: 'linear-gradient(180deg, #07153b 0%, #0a2052 50%, #061536 100%)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        p: 2.5,
        position: 'relative',
        overflowX: 'hidden',
        overflowY: 'auto',
        '&::-webkit-scrollbar': { width: '4px' },
        '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px' },
      }}
    >
      {/* Decorative animated moving waves matching login screen */}
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
          @keyframes sidebarWaveSlide1 {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          @keyframes sidebarWaveSlide2 {
            0% { transform: translate3d(-50%, 0, 0); }
            100% { transform: translate3d(0, 0, 0); }
          }
          @keyframes sidebarWaveSlide3 {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          @keyframes sidebarWaveBob {
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
            animation: 'sidebarWaveSlide1 18s linear infinite',
            opacity: 0.25,
            willChange: 'transform',
          }}
        >
          <path
            d="M 0 50 Q 150 15, 300 50 T 600 50 Q 750 15, 900 50 T 1200 50 L 1200 140 L 0 140 Z"
            fill="url(#sidebar-wave-grad-1)"
          />
          <defs>
            <linearGradient id="sidebar-wave-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
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
            animation: 'sidebarWaveSlide2 12s linear infinite',
            opacity: 0.42,
            willChange: 'transform',
          }}
        >
          <path
            d="M 0 70 Q 150 110, 300 70 T 600 70 Q 750 110, 900 70 T 1200 70 L 1200 140 L 0 140 Z"
            fill="url(#sidebar-wave-grad-2)"
          />
          <defs>
            <linearGradient id="sidebar-wave-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
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
            animation: 'sidebarWaveBob 6s ease-in-out infinite',
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
              animation: 'sidebarWaveSlide3 7.5s linear infinite',
              opacity: 0.6,
              willChange: 'transform',
            }}
          >
            <path
              d="M 0 85 Q 150 45, 300 85 T 600 85 Q 750 45, 900 85 T 1200 85 L 1200 140 L 0 140 Z"
              fill="url(#sidebar-wave-grad-3)"
            />
            <defs>
              <linearGradient id="sidebar-wave-grad-3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </Box>

      {/* Top Brand Logo */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, px: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.45)',
            }}
          >
            <ShieldCheck className="w-5 h-5" />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#ffffff', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                SAMMLocker
              </Typography>
              <Chip
                label="PWA"
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  backgroundColor: 'rgba(59, 130, 246, 0.25)',
                  color: '#93c5fd',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}>
              ระบบสอบออนไลน์แบบล็อกหน้าจอ (WCAG AA)
            </Typography>
          </Box>
        </Box>

        {/* Navigation Items (Matching Image 1 Pill Styles) */}
        <Stack spacing={1}>
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <Box
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  py: 1.3,
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  transition: 'all 0.15s ease-in-out',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  background: isActive
                    ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)'
                    : 'transparent',
                  boxShadow: isActive ? '0 8px 18px rgba(37, 99, 235, 0.35)' : 'none',
                  '&:hover': {
                    color: '#ffffff',
                    backgroundColor: isActive ? undefined : 'rgba(255, 255, 255, 0.06)',
                  },
                }}
              >
                <Box sx={{ color: isActive ? '#ffffff' : '#64748b' }}>
                  {item.icon}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: isActive ? 800 : 600, fontSize: '0.88rem' }}>
                  {item.label}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* Bottom Sidebar Info & Status */}
      <Box sx={{ pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Stack spacing={1.5} sx={{ mb: 2.5, px: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              color: '#94a3b8',
              fontSize: '0.82rem',
              cursor: 'pointer',
              '&:hover': { color: '#ffffff' },
            }}
            onClick={onOpenSettings}
          >
            <BookOpen className="w-4 h-4 text-slate-400" />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>คู่มือการใช้งาน</Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              color: '#94a3b8',
              fontSize: '0.82rem',
              cursor: 'pointer',
              '&:hover': { color: '#ffffff' },
            }}
            onClick={onOpenSettings}
          >
            <Headphones className="w-4 h-4 text-slate-400" />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>ติดต่อผู้ดูแล / ตั้งค่า API</Typography>
          </Box>
        </Stack>

        {/* Ready Status Card matching Image 1 */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2.5,
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', animation: 'pulse 2s infinite' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#34d399', fontSize: '0.75rem' }}>
              ระบบพร้อมใช้งาน
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block', mt: 0.3 }}>
            อัปเดตล่าสุด: {new Date().toLocaleDateString('th-TH')} 15:59
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

