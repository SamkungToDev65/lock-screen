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
  Divider,
} from '@mui/material';
import {
  FileSpreadsheet,
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCw,
  Trash2,
  HelpCircle,
  Database,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { getGasUrl, setGasUrl, testGasConnection, normalizeGasUrl } from '../services/api';
import { GAS_SCRIPT_CODE } from '../utils/gasCode';

export default function SettingsModal({ open, onClose, onRefreshData }) {
  const [url, setUrl] = useState(getGasUrl());
  const [status, setStatus] = useState({ type: '', message: '' });
  const [testing, setTesting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Check if URL looks truncated
  const isTruncated = (() => {
    const val = url.trim();
    if (!val) return false;
    if (val.includes('...') || val.endsWith('.')) return true;
    if (val.includes('script.google.com')) {
      const match = val.match(/\/s\/([a-zA-Z0-9_-]+)/);
      if (match && match[1].length < 50) return true;
    }
    return false;
  })();

  const handleSave = () => {
    const normalized = normalizeGasUrl(url);
    setGasUrl(normalized);
    setStatus({
      type: 'success',
      message: 'บันทึกการตั้งค่า API Endpoint สำเร็จเรียบร้อย!',
    });
    if (onRefreshData) onRefreshData();
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleTest = async () => {
    if (!url.trim()) {
      setStatus({ type: 'warning', message: 'กรุณากรอก API Endpoint ก่อนกดทดสอบ' });
      return;
    }
    if (isTruncated) {
      setStatus({
        type: 'error',
        message: '⚠️ URL ดูเหมือนถูกตัดทอน (ไม่สมบูรณ์) เนื่องจากความยาวสั้นเกินไป กรุณาดูวิธีคัดลอกแบบเต็มด้านล่าง',
      });
      return;
    }
    setTesting(true);
    setStatus({ type: 'info', message: 'กำลังทดสอบเชื่อมต่อ...' });
    try {
      await testGasConnection(url);
      setStatus({
        type: 'success',
        message: 'เชื่อมต่อสำเร็จ 100%! ระบบตอบรับปกติ พร้อมใช้งานแล้ว',
      });
      setGasUrl(url);
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
    if (window.confirm('คุณต้องการล้างข้อมูลห้องสอบและสถิติใน LocalStorage หรือไม่? (ข้อมูลใน Google Sheet จะไม่ถูกลบ)')) {
      localStorage.removeItem('secure_exam_rooms');
      localStorage.removeItem('secure_exam_students');
      localStorage.removeItem('secure_exam_logs');
      window.location.reload();
    }
  };

  const copyAppsScriptCode = () => {
    navigator.clipboard.writeText(GAS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          border: '1px solid #e2e8f0',
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
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #a7f3d0',
            }}
          >
            <FileSpreadsheet className="w-5 h-5" />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
              ตั้งค่าการเชื่อมต่อ Google Sheets & Apps Script
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              เชื่อมโยงข้อมูลแบบเรียลไทม์กับ Google Spreadsheet
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3.5 }}>
        <Stack spacing={3}>
          {/* Sheet Target Banner */}
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 3,
              backgroundColor: '#f8fafc',
              borderColor: '#e2e8f0',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                Google Sheet เป้าหมาย:
              </Typography>
              <Button
                size="small"
                variant="outlined"
                href="https://docs.google.com/spreadsheets/d/1ymUruyobCQTdvyJ6X1uhoU5Zys9wulF4bciYvD1PRH4/edit?gid=0#gid=0"
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<ExternalLink className="w-3.5 h-3.5" />}
                sx={{ borderRadius: 2, fontSize: '0.75rem', fontWeight: 700 }}
              >
                เปิดชีต
              </Button>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.6 }}>
              ระบบสามารถทำงานได้ทันทีด้วย Local Database ในตัว และจะซิงค์ข้อมูลขึ้น Google Sheet ทันทีเมื่อระบุ Web App URL
            </Typography>
          </Paper>

          {/* Web App URL Input */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
              Google Apps Script Web App URL:
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                error={isTruncated}
                helperText={
                  isTruncated
                    ? '⚠️ URL สั้นเกินไปหรือถูกตัดทอน (...) กรุณาคัดลอกที่อยู่ลิงก์ตัวเต็ม'
                    : 'ต้องลงท้ายด้วย /exec และมี Deployment ID ตัวเต็ม'
                }
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

            {isTruncated && (
              <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2, fontSize: '0.8rem' }}>
                <strong>สาเหตุที่ทดสอบไม่ผ่าน:</strong> ลิงก์ที่วางลงท้ายด้วย <code>...</code> หรือถูกตัดคำ
                ให้กลับไปที่ Apps Script แล้ว <strong>คลิกขวาที่ลิงก์ URL สีน้ำเงิน</strong> &gt; เลือก <strong>"คัดลอกที่อยู่ลิงก์" (Copy link address)</strong>
              </Alert>
            )}
          </Box>

          {status.message && (
            <Alert severity={status.type || 'info'} sx={{ borderRadius: 2 }}>
              {status.message}
            </Alert>
          )}

          {/* Apps Script Guide */}
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 3,
              backgroundColor: '#ffffff',
              borderColor: '#e2e8f0',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HelpCircle className="w-4 h-4 text-brand-600" />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  ขั้นตอนการเชื่อมต่อ Google Sheets & Apps Script
                </Typography>
              </Box>

              <Button
                size="small"
                variant="contained"
                onClick={copyAppsScriptCode}
                startIcon={copiedCode ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                sx={{
                  borderRadius: 2,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: copiedCode ? '#059669' : '#2563eb',
                  '&:hover': { backgroundColor: copiedCode ? '#047857' : '#1d4ed8' },
                }}
              >
                {copiedCode ? 'คัดลอกโค้ดทั้ง 4 ชีตแล้ว!' : 'คัดลอกโค้ด Apps Script ตัวเต็ม'}
              </Button>
            </Box>

            <Typography component="ol" variant="caption" sx={{ color: 'text.secondary', pl: 2, m: 0, spaceY: 1, lineHeight: 1.8, display: 'block' }}>
              <li>เปิด Google Sheet ที่กำหนดไว้</li>
              <li>ไปที่เมนู <strong>ส่วนขยาย (Extensions)</strong> &gt; <strong>Apps Script</strong></li>
              <li>ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดที่กดคัดลอกด้านบน (รองรับ 4 ชีต: <code>Rooms</code>, <code>Students</code>, <code>Logs</code>, <code>Admin</code>)</li>
              <li>
                <strong>สำคัญมาก:</strong> เลือกฟังก์ชัน <code>setupSheets</code> ที่แถบเครื่องมือด้านบน แล้วกดปุ่ม <strong>"เรียกใช้" (Run)</strong> 1 ครั้ง
                พร้อมกดยอมรับสิทธิ์ (Review permissions &gt; Advanced &gt; Go to project &gt; Allow) ระบบจะสร้างตาราง Admin และชีตให้ครบอัตโนมัติ
              </li>
              <li>กดปุ่มสีน้ำเงินมุมบนขวา <strong>ทำให้ใช้งานได้ (Deploy)</strong> &gt; <strong>การทำให้ใช้งานได้ใหม่ (New deployment)</strong></li>
              <li>เลือกประเภท <strong>เว็บแอป (Web app)</strong> กำหนดสิทธิ์ผู้มีสิทธิ์เข้าถึงเป็น <strong>"ทุกคน" (Anyone)</strong></li>
              <li>
                กด "ทำให้ใช้งานได้" แล้วกดปุ่ม <strong>[คัดลอก]</strong> ตรงช่อง <em>"URL ของเว็บแอป"</em> (หรือคลิกขวาที่ลิงก์ &gt; คัดลอกที่อยู่ลิงก์) นำมาวางในช่องด้านบนแล้วกด <strong>"ทดสอบ"</strong> และ <strong>"บันทึก"</strong>
              </li>
            </Typography>
          </Paper>

          {/* Reset local data */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #f1f5f9' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              ต้องการรีเซ็ตข้อมูลทดสอบในเครื่อง?
            </Typography>
            <Button
              size="small"
              color="error"
              onClick={handleClearData}
              startIcon={<Trash2 className="w-3.5 h-3.5" />}
              sx={{ fontWeight: 700, fontSize: '0.75rem' }}
            >
              ล้างข้อมูล LocalStorage
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
