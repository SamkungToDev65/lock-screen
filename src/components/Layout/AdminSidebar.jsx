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
        flexShrink: 0,
        background: 'linear-gradient(180deg, #07153b 0%, #0a2052 50%, #061536 100%)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        minHeight: '100vh',
        p: 2.5,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative Wave at the Bottom matching Image 1 */}
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
        <svg
          viewBox="0 0 260 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', position: 'absolute', bottom: 0, left: 0 }}
        >
          <path
            d="M-20 90 C 60 130, 150 40, 280 85 L 280 140 L -20 140 Z"
            fill="url(#sidebar-wave-gradient-1)"
            opacity="0.35"
          />
          <path
            d="M-20 110 C 70 70, 160 120, 280 75 L 280 140 L -20 140 Z"
            fill="url(#sidebar-wave-gradient-2)"
            opacity="0.55"
          />
          <defs>
            <linearGradient id="sidebar-wave-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="sidebar-wave-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
        </svg>
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
            onClick={() => window.open('https://docs.google.com/spreadsheets/d/1ymUruyobCQTdvyJ6X1uhoU5Zys9wulF4bciYvD1PRH4/edit', '_blank')}
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

