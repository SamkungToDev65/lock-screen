import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
} from '@mui/material';
import { ShieldCheck, Download, Share2, PlusSquare, X } from 'lucide-react';

export default function Navbar({
  currentView,
  onNavigate,
  onOpenSettings,
}) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (isIOS || !deferredPrompt) {
      setInstallGuideOpen(true);
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const installButton = (
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
  );

  const installGuide = (
    <Dialog
      open={installGuideOpen}
      onClose={() => setInstallGuideOpen(false)}
      maxWidth="xs"
      fullWidth
      aria-labelledby="install-guide-title"
    >
      <DialogTitle id="install-guide-title" sx={{ pr: 6, fontWeight: 800 }}>
        ติดตั้ง SAMMLocker
        <IconButton
          aria-label="ปิดคำแนะนำ"
          onClick={() => setInstallGuideOpen(false)}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {isIOS ? (
          <Stack spacing={2}>
            <Typography>เพิ่ม SAMMLocker ไปยังหน้าจอโฮมของ iPhone หรือ iPad:</Typography>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <Share2 size={20} />
              <Typography>ใน Safari แตะปุ่ม <strong>แชร์</strong></Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <PlusSquare size={20} />
              <Typography>เลือก <strong>เพิ่มไปยังหน้าจอโฮม</strong> แล้วแตะ <strong>เพิ่ม</strong></Typography>
            </Stack>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              หากเปิดจากเบราว์เซอร์ในแอป ให้เปิดหน้านี้ใน Safari ก่อน การเพิ่มแอปต้องยืนยันจากเมนูแชร์ของ iOS
            </Alert>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography>หากเบราว์เซอร์ยังไม่แสดงหน้าติดตั้ง ให้เปิดเมนูเบราว์เซอร์แล้วเลือก <strong>ติดตั้งแอป</strong> หรือ <strong>เพิ่มไปยังหน้าจอหลัก</strong></Typography>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              แนะนำให้เปิดเว็บไซต์ด้วย Chrome หรือเบราว์เซอร์ที่รองรับ PWA
            </Alert>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={() => setInstallGuideOpen(false)} variant="contained">เข้าใจแล้ว</Button>
      </DialogActions>
    </Dialog>
  );

  // If on login or student-join page, render clean, non-duplicated minimal transparent header
  if (currentView === 'login' || currentView === 'student-join') {
    return (
      <>
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
            {installButton}
          </Stack>
        </Toolbar>
      </AppBar>
      {installGuide}
      </>
    );
  }

  // Standard Header for Student views
  return (
    <>
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
          onClick={() => onNavigate('login')}
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
          {installButton}
        </Stack>
      </Toolbar>
    </AppBar>
    {installGuide}
    </>
  );
}
