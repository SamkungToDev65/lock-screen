import React from 'react';
import {
  Dialog,
  DialogContent,
  Button,
  Box,
  Typography,
  Stack,
  Paper,
  Chip,
  IconButton,
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { X, Maximize2, Users, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';

export default function ProjectorModal({ open, onClose, room, studentCount = 0 }) {
  if (!room) return null;

  const origin = window.location.origin;
  const roomUrl = `${origin}/#/room/${room.roomCode}`;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.log(err));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          backgroundColor: '#090d16', // Deep cinematic night sky
          color: '#ffffff',
          backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(37, 99, 235, 0.15) 0%, transparent 60%)',
        },
      }}
    >
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: { xs: 3, sm: 6 } }}>
        {/* Top Control Bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 3, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
              }}
            >
              <ShieldCheck className="w-7 h-7" />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#ffffff' }}>
                  {room.title}
                </Typography>
                <Chip
                  label="โหมดฉายจอห้องเรียน"
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: '#93c5fd',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    fontWeight: 700,
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                เปิดกล้องมือถือสแกน QR Code หรือเปิดลิงก์บนเครื่องคอมพิวเตอร์
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              onClick={toggleFullscreen}
              startIcon={<Maximize2 className="w-4 h-4" />}
              sx={{
                color: '#ffffff',
                borderColor: 'rgba(255,255,255,0.2)',
                fontWeight: 700,
                borderRadius: 2.5,
                '&:hover': { borderColor: '#ffffff', backgroundColor: 'rgba(255,255,255,0.05)' },
              }}
            >
              เต็มจอโปรเจกเตอร์
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={onClose}
              startIcon={<X className="w-4 h-4" />}
              sx={{ fontWeight: 700, borderRadius: 2.5 }}
            >
              ปิดหน้าต่าง
            </Button>
          </Stack>
        </Box>

        {/* Center: Giant QR & Info */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 6, alignItems: 'center', my: 'auto', py: 4 }}>
          {/* Left: QR Code Card */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Paper
              elevation={6}
              sx={{
                p: 4,
                borderRadius: 6,
                backgroundColor: '#ffffff',
                boxShadow: '0 25px 60px -15px rgba(37, 99, 235, 0.4)',
                border: '4px solid rgba(255, 255, 255, 0.9)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <QRCodeSVG
                value={roomUrl}
                size={300}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232563eb'><path d='M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 6c1.4 0 2.5 1.1 2.5 2.5V11h1c.55 0 1 .45 1 1v5c0 .55-.45 1-1 1H8.5c-.55 0-1-.45-1-1v-5c0-.55.45-1 1-1h1V9.5C9.5 8.1 10.6 7 12 7zm0 1.5c-.55 0-1 .45-1 1V11h2V9.5c0-.55-.45-1-1-1z'/></svg>",
                  x: undefined,
                  y: undefined,
                  height: 52,
                  width: 52,
                  excavate: true,
                }}
              />
            </Paper>
            <Typography variant="body2" sx={{ color: '#94a3b8', mt: 3, fontWeight: 600 }}>
              สแกน QR Code ด้วยกล้องสมาร์ตโฟนเพื่อเข้าสอบทันที
            </Typography>
          </Box>

          {/* Right: Room Code & Link */}
          <Stack spacing={3}>
            {/* Room Code Box */}
            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: 4,
                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                รหัสห้องสอบ (Room Code)
              </Typography>
              <Typography variant="h2" sx={{ fontFamily: 'monospace', fontWeight: 900, color: '#60a5fa', letterSpacing: 4, mt: 0.5 }}>
                {room.roomCode}
              </Typography>
            </Paper>

            {/* Direct Link Box */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                ลิงก์เข้าสอบผ่านเบราว์เซอร์
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'monospace',
                  color: '#ffffff',
                  mt: 0.5,
                  wordBreak: 'break-all',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  p: 2,
                  borderRadius: 2.5,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {roomUrl}
              </Typography>
            </Paper>
          </Stack>
        </Box>

        {/* Bottom Rules Banner */}
        <Box sx={{ pt: 3, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
            🔒 ระบบจะเข้าสู่โหมด Fullscreen ทันทีเมื่อเริ่มทำข้อสอบ • ห้ามสลับแท็บ • ห้ามออกจากหน้าจอ
          </Typography>
          <Typography variant="caption" sx={{ color: '#fbbf24', fontWeight: 700 }}>
            Exit PIN: สำหรับให้อาจารย์ปลดล็อกเมื่อส่งข้อสอบ
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
}
