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
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Database,
  CheckCircle2,
  Trash2,
  Server,
} from 'lucide-react';
import { getApiUrl, setApiUrl, testApiConnection, normalizeApiUrl } from '../services/api';

export default function SettingsModal({ open, onClose, onRefreshData }) {
  const [url, setUrl] = useState(getApiUrl());
  const [status, setStatus] = useState({ type: '', message: '' });
  const [testing, setTesting] = useState(false);

  const handleSave = () => {
    const normalized = normalizeApiUrl(url);
    setApiUrl(normalized);
    setStatus({
      type: 'success',
      message: 'บันทึกการตั้งค่า API Endpoint สำเร็จเรียบร้อย!',
    });
    if (onRefreshData) onRefreshData();
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleTest = async () => {
    if (!url.trim()) {
      setStatus({ type: 'warning', message: 'กรุณากรอก API Endpoint ก่อนกดทดสอบ' });
      return;
    }
    setTesting(true);
    setStatus({ type: 'info', message: 'กำลังทดสอบเชื่อมต่อ API...' });
    try {
      await testApiConnection(url);
      setStatus({
        type: 'success',
        message: 'เชื่อมต่อสำเร็จ 100%! API และฐานข้อมูล MariaDB ตอบรับปกติ พร้อมใช้งาน',
      });
      setApiUrl(url);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.message || 'การเชื่อมต่อล้มเหลว ตรวจสอบ URL หรือสถานะเซิร์ฟเวอร์',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClearData = () => {
    if (window.confirm('คุณต้องการล้างข้อมูลห้องสอบและสถิติในแคชของเบราว์เซอร์หรือไม่? (ข้อมูลบนเซิร์ฟเวอร์จะไม่ถูกลบ)')) {
      localStorage.removeItem('secure_exam_rooms');
      localStorage.removeItem('secure_exam_students');
      localStorage.removeItem('secure_exam_logs');
      window.location.reload();
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
          borderRadius: 3.5,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        },
      }}
    >
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
            <Database className="w-5 h-5" />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
              ตั้งค่าการเชื่อมต่อ API & ฐานข้อมูล MariaDB
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              เชื่อมโยงข้อมูลแบบเรียลไทม์กับเซิร์ฟเวอร์ dashboard.bcnlp.ac.th
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3.5 }}>
        <Stack spacing={3}>
          {/* Server Info Banner */}
          <Paper
            variant="outlined"
            sx={{
              p: 2.2,
              borderRadius: 3,
              backgroundColor: '#f8fafc',
              borderColor: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Server className="w-6 h-6 text-blue-600 shrink-0" />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                เซิร์ฟเวอร์เป้าหมาย: dashboard.bcnlp.ac.th
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                ฐานข้อมูล: <code>sammlocker</code> (MariaDB 5.5+)
              </Typography>
            </Box>
          </Paper>

          {/* API URL Input */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
              REST API Endpoint URL:
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                placeholder="https://dashboard.bcnlp.ac.th/api/SammLocker/index.php"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                helperText="URL ของไฟล์ index.php บนเซิร์ฟเวอร์"
                InputProps={{
                  sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
                }}
              />
              <Button
                variant="outlined"
                color="primary"
                onClick={handleTest}
                disabled={testing || !url.trim()}
                startIcon={testing ? <CircularProgress size={16} /> : <CheckCircle2 className="w-4 h-4" />}
                sx={{ whiteSpace: 'nowrap', px: 3, fontWeight: 700, borderRadius: 2.5, height: 40 }}
              >
                {testing ? 'กำลังทดสอบ...' : 'ทดสอบ'}
              </Button>
            </Stack>
          </Box>

          {status.message && (
            <Alert severity={status.type || 'info'} sx={{ borderRadius: 2 }}>
              {status.message}
            </Alert>
          )}

          {/* Reset local data */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #f1f5f9' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              ต้องการรีเซ็ตข้อมูลแคชในเครื่อง?
            </Typography>
            <Button
              size="small"
              color="error"
              onClick={handleClearData}
              startIcon={<Trash2 className="w-3.5 h-3.5" />}
              sx={{ fontWeight: 700, fontSize: '0.75rem' }}
            >
              ล้างแคช LocalStorage
            </Button>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 700, borderRadius: 2.5 }}>
          ปิด
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary" sx={{ fontWeight: 700, borderRadius: 2.5, px: 3 }}>
          บันทึกการตั้งค่า
        </Button>
      </DialogActions>
    </Dialog>
  );
}
