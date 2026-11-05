import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Tooltip,
  Box,
  Stack,
  Divider,
} from '@mui/material';
import {
  ShieldCheck,
  LayoutDashboard,
  Sliders,
  UserCheck,
  FileSpreadsheet,
  Settings,
  LogOut,
  Download,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getGasUrl } from '../services/api';

export default function Navbar({
  currentView,
  onNavigate,
  onOpenSettings,
}) {
  const { user, isAuthenticated, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstallPWA, setCanInstallPWA] = useState(false);

  const hasGasUrl = Boolean(getGasUrl());

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPWA(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstallPWA(false);
    }
    setDeferredPrompt(null);
  };

  const handleUserMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleUserMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    onNavigate('login');
  };

  // If on login or student-join page, render clean, non-duplicated minimal transparent header
  if (currentView === 'login' || currentView === 'student-join') {
    return (
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: 'transparent',
          color: '#0f172a',
          borderBottom: 'none',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: 68, px: { xs: 2.5, sm: 4, md: 6 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => onNavigate('login')}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
            >
              <ShieldCheck className="w-5 h-5" />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
                SAMMLocker
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: { xs: 'none', sm: 'block' }, fontSize: '0.72rem', fontWeight: 600 }}>
                ระบบสอบออนไลน์แบบล็อกหน้าจอ (WCAG AA)
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            {canInstallPWA && (
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={handleInstallPWA}
                startIcon={<Download className="w-4 h-4" />}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                ติดตั้ง PWA
              </Button>
            )}
          </Stack>
        </Toolbar>
      </AppBar>
    );
  }

  // Standard Header for Student views
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: '#ffffff',
        color: '#0f172a',
        borderBottom: '1px solid #e2e8f0',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: 64, px: { xs: 2, sm: 3 } }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
          onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'login')}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
            }}
          >
            <ShieldCheck className="w-5 h-5" />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
              SAMMLocker
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' }, fontSize: '0.72rem' }}>
              ระบบสอบออนไลน์แบบล็อกหน้าจอ (WCAG AA)
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="contained"
            color="primary"
            onClick={() => onNavigate('login')}
            startIcon={<Lock className="w-4 h-4" />}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            เข้าสู่ระบบอาจารย์ / แอดมิน
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
