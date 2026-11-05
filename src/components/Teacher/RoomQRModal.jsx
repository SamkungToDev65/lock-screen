import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Typography,
  Box,
  Stack,
  Paper,
  Tooltip,
  IconButton,
  Divider,
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Copy,
  CheckCircle2,
  Tv,
  KeyRound,
  X,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export default function RoomQRModal({ open, onClose, room, onOpenProjector }) {
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const origin = window.location.origin;
  const roomUrl = `${origin}/#/room/${room.roomCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        },
      }}
    >
      {/* Modal Header */}
      <DialogTitle sx={{ p: 2.5, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #bfdbfe',
              }}
            >
              <QrCode className="w-5 h-5" />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                QR Code ประจำห้องสอบ
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                ให้นักศึกษาสแกนเพื่อเข้าทำข้อสอบในโหมดล็อกหน้าจอ
              </Typography>
            </Box>
          </Box>

          <Chip
            label={room.roomCode}
            color="primary"
            sx={{
              fontWeight: 800,
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              borderRadius: 2,
              px: 0.5,
            }}
          />
        </Box>
      </DialogTitle>

      {/* Modal Content */}
      <DialogContent sx={{ p: 3.5 }}>
        <Stack spacing={3} alignItems="center">
          {/* Exam Title */}
          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
              {room.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              เปิดกล้องโทรศัพท์สแกน QR Code หรือเปิดลิงก์บนเครื่องคอมพิวเตอร์
            </Typography>
          </Box>

          {/* QR Code Card Frame */}
          <Paper
            elevation={3}
            sx={{
              p: 3,
              borderRadius: 4,
              backgroundColor: '#ffffff',
              border: '2px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 10px 30px -5px rgba(37, 99, 235, 0.1)',
            }}
          >
            <QRCodeSVG
              value={roomUrl}
              size={210}
              level="H"
              includeMargin={false}
              imageSettings={{
                src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232563eb'><path d='M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 6c1.4 0 2.5 1.1 2.5 2.5V11h1c.55 0 1 .45 1 1v5c0 .55-.45 1-1 1H8.5c-.55 0-1-.45-1-1v-5c0-.55.45-1 1-1h1V9.5C9.5 8.1 10.6 7 12 7zm0 1.5c-.55 0-1 .45-1 1V11h2V9.5c0-.55-.45-1-1-1z'/></svg>",
                x: undefined,
                y: undefined,
                height: 42,
                width: 42,
                excavate: true,
              }}
            />
            <Chip
              label={`ROOM CODE: ${room.roomCode}`}
              size="small"
              sx={{
                mt: 2,
                fontWeight: 800,
                fontFamily: 'monospace',
                letterSpacing: 1.2,
                backgroundColor: '#f1f5f9',
                color: '#334155',
              }}
            />
          </Paper>

          {/* Direct URL Box */}
          <Paper
            variant="outlined"
            sx={{
              width: '100%',
              p: 1.5,
              borderRadius: 3,
              backgroundColor: '#f8fafc',
              borderColor: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                userSelect: 'all',
                flex: 1,
                pl: 1,
              }}
            >
              {roomUrl}
            </Typography>

            <Button
              variant="contained"
              size="small"
              onClick={copyLink}
              startIcon={copied ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              color={copied ? 'success' : 'primary'}
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                whiteSpace: 'nowrap',
                px: 2,
                py: 0.8,
              }}
            >
              {copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
            </Button>
          </Paper>

          {/* Exit PIN Security Card */}
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              p: 2,
              borderRadius: 3,
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #fde68a',
                  flexShrink: 0,
                }}
              >
                <KeyRound className="w-5 h-5" />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#92400e', lineHeight: 1.2 }}>
                  รหัสปลดล็อกสำหรับอาจารย์ (Exit PIN)
                </Typography>
                <Typography variant="caption" sx={{ color: '#b45309', display: 'block' }}>
                  ให้นักศึกษากรอกเพื่อส่งข้อสอบและออกจากโหมดเต็มจอ
                </Typography>
              </Box>
            </Box>

            <Paper
              elevation={1}
              sx={{
                px: 2,
                py: 0.8,
                borderRadius: 2.5,
                backgroundColor: '#ffffff',
                border: '1px solid #fde68a',
                textAlign: 'center',
                flexShrink: 0,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  color: '#92400e',
                  letterSpacing: 2,
                  lineHeight: 1,
                }}
              >
                {room.exitPin}
              </Typography>
            </Paper>
          </Paper>
        </Stack>
      </DialogContent>

      {/* Modal Actions */}
      <DialogActions sx={{ p: 2.5, backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => {
            onClose();
            if (onOpenProjector) onOpenProjector(room);
          }}
          startIcon={<Tv className="w-4 h-4" />}
          sx={{ fontWeight: 700, borderRadius: 2.5 }}
        >
          โหมดฉายจอโปรเจกเตอร์
        </Button>

        <Button
          variant="contained"
          color="secondary"
          onClick={onClose}
          sx={{ fontWeight: 700, borderRadius: 2.5, px: 3 }}
        >
          ปิดหน้าต่าง
        </Button>
      </DialogActions>
    </Dialog>
  );
}
