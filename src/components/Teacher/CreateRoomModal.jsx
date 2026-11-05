import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Stack,
  InputAdornment,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  PlusCircle,
  KeyRound,
  Link as LinkIcon,
  BookOpen,
  Dices,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { createRoom } from '../../services/api';

export default function CreateRoomModal({ open, onClose, onRoomCreated }) {
  const [formData, setFormData] = useState({
    roomCode: '',
    title: '',
    examUrl: '',
    exitPin: '1234',
    maxViolations: 3,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'EXAM-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, roomCode: code }));
  };

  const generateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormData((prev) => ({ ...prev, exitPin: pin }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('กรุณาระบุชื่อการสอบหรือชื่อวิชา');
      return;
    }
    if (!formData.examUrl.trim()) {
      setError('กรุณาระบุลิงก์ข้อสอบ (เช่น Google Forms, Microsoft Forms หรือ Web URL)');
      return;
    }
    if (!formData.exitPin.trim() || formData.exitPin.length < 4) {
      setError('รหัส Exit PIN ต้องมีอย่างน้อย 4 หลัก');
      return;
    }

    try {
      setLoading(true);
      const res = await createRoom({
        roomCode: formData.roomCode.trim() || undefined,
        title: formData.title.trim(),
        examUrl: formData.examUrl.trim(),
        exitPin: formData.exitPin.trim(),
        maxViolations: formData.maxViolations,
      });

      if (res.success) {
        onRoomCreated(res.room);
        onClose();
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการสร้างห้องสอบ');
      }
    } catch (err) {
      setError(err.message || 'ไม่สามารถสร้างห้องสอบได้');
    } finally {
      setLoading(false);
    }
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
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <DialogTitle sx={{ p: 2.5, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
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
              <PlusCircle className="w-5 h-5" />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                สร้างห้องสอบใหม่ (Create Exam Session)
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                กำหนดลิงก์ข้อสอบ รหัสปลดล็อก และสร้าง QR Code อัตโนมัติ
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        {/* Content */}
        <DialogContent sx={{ p: 3.5 }}>
          <Stack spacing={2.5}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {/* Room Code */}
            <TextField
              label="รหัสห้องสอบ (Room Code)"
              placeholder="เช่น CS101 หรือปล่อยว่างเพื่อให้ระบบสุ่ม"
              value={formData.roomCode}
              onChange={(e) => setFormData({ ...formData, roomCode: e.target.value.toUpperCase() })}
              helperText="รหัสที่ใช้สำหรับแสดงและสร้าง QR Code หน้าห้องสอบ"
              InputProps={{
                sx: { fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 },
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={generateRandomCode}
                      startIcon={<Dices className="w-3.5 h-3.5" />}
                      sx={{ borderRadius: 2, py: 0.5, fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      สุ่มรหัส
                    </Button>
                  </InputAdornment>
                ),
              }}
            />

            {/* Exam Title */}
            <TextField
              label="ชื่อการสอบ / วิชา"
              required
              placeholder="เช่น การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น (Midterm Exam)"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BookOpen className="w-4 h-4 text-slate-400" />
                  </InputAdornment>
                ),
              }}
            />

            {/* Exam URL */}
            <TextField
              label="ลิงก์ข้อสอบ (Exam URL / <iframe>)"
              required
              type="url"
              placeholder="https://docs.google.com/forms/d/e/.../viewform"
              value={formData.examUrl}
              onChange={(e) => setFormData({ ...formData, examUrl: e.target.value })}
              helperText="ลิงก์นี้จะถูกนำไปฝังแสดงผลในหน้าจอสอบแบบเต็มจอ (Secure Shell)"
              InputProps={{
                sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon className="w-4 h-4 text-slate-400" />
                  </InputAdornment>
                ),
              }}
            />

            {/* Exit PIN & Max Violations */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Exit PIN (รหัสปลดล็อก)"
                required
                maxLength={8}
                placeholder="เช่น 1234"
                value={formData.exitPin}
                onChange={(e) => setFormData({ ...formData, exitPin: e.target.value })}
                helperText="นักศึกษาต้องกรอก PIN นี้เพื่อส่งข้อสอบและออกจาก Fullscreen"
                InputProps={{
                  sx: { fontFamily: 'monospace', fontWeight: 800, textAlign: 'center', letterSpacing: 2 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={generateRandomPin}
                        startIcon={<Dices className="w-3.5 h-3.5" />}
                        sx={{ borderRadius: 2, py: 0.5, fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        สุ่ม
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="เกณฑ์เตือนหลุดจอ (ครั้ง)"
                type="number"
                inputProps={{ min: 1, max: 10 }}
                value={formData.maxViolations}
                onChange={(e) => setFormData({ ...formData, maxViolations: Number(e.target.value) })}
                helperText="เกณฑ์จำนวนครั้งที่จะขึ้นแจ้งเตือนสีแดงใน Dashboard อาจารย์"
                InputProps={{
                  sx: { fontWeight: 800, textAlign: 'center' },
                  startAdornment: (
                    <InputAdornment position="start">
                      <ShieldAlert className="w-4 h-4 text-slate-400" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Stack>
        </DialogContent>

        {/* Actions */}
        <DialogActions sx={{ p: 2.5, backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 700, borderRadius: 2.5 }}>
            ยกเลิก
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Sparkles className="w-4 h-4" />}
            sx={{ fontWeight: 700, borderRadius: 2.5, px: 3 }}
          >
            {loading ? 'กำลังสร้างห้องสอบ...' : 'สร้างห้องสอบและรับ QR Code'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
