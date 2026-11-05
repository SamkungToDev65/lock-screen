import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Button,
} from '@mui/material';
import {
  Home,
  Bell,
  HelpCircle,
  ChevronDown,
  LogOut,
  User,
  Settings,
  ExternalLink,
  Sliders,
  Menu as MenuIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminTopbar({ title = 'แดชบอร์ดคุมสอบ', onOpenSettings, onToggleMobileSidebar }) {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  return (
    <Box
      sx={{
        height: 64,
        px: { xs: 2, sm: 3.5 },
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Left: Mobile Menu Button + Breadcrumbs / Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <IconButton
          size="small"
          onClick={onToggleMobileSidebar}
          sx={{ display: { xs: 'inline-flex', md: 'none' }, border: '1px solid #e2e8f0', p: 0.8 }}
          aria-label="open drawer"
        >
          <MenuIcon className="w-5 h-5 text-slate-700" />
        </IconButton>
        <Home className="w-4 h-4 text-slate-500" sx={{ display: { xs: 'none', sm: 'block' } }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', fontSize: { xs: '0.88rem', sm: '0.95rem' } }}>
          {title}
        </Typography>
      </Box>

      {/* Right Controls */}
      <Stack direction="row" spacing={2} alignItems="center">
        {/* Notifications */}
        <IconButton size="small" sx={{ border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <Badge badgeContent={1} color="error" variant="dot">
            <Bell className="w-4 h-4 text-slate-600" />
          </Badge>
        </IconButton>

        {/* Help */}
        <IconButton
          size="small"
          onClick={onOpenSettings}
          sx={{ border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}
        >
          <HelpCircle className="w-4 h-4 text-slate-600" />
        </IconButton>

        {/* User Card */}
        {user && (
          <>
            <Paper
              elevation={0}
              onClick={handleMenuOpen}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 0.6,
                pr: 1.5,
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                backgroundColor: '#f8fafc',
                transition: 'all 0.15s ease',
                '&:hover': { backgroundColor: '#f1f5f9' },
              }}
            >
              <Avatar
                src={user.avatar}
                alt={user.name}
                sx={{ width: 34, height: 34, backgroundColor: '#2563eb', fontWeight: 800, fontSize: '0.85rem' }}
              >
                {user.name ? user.name.charAt(0) : 'T'}
              </Avatar>

              <Box sx={{ textAlign: 'left', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.1, fontSize: '0.82rem' }}>
                  {user.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                  {user.role}
                </Typography>
              </Box>

              <ChevronDown className="w-4 h-4 text-slate-400 ml-0.5" />
            </Paper>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                elevation: 3,
                sx: { minWidth: 220, borderRadius: 3, mt: 1, p: 0.5 },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {user.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {user.email}
                </Typography>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, mt: 0.5, display: 'block' }}>
                  {user.department}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => { handleMenuClose(); onOpenSettings(); }}>
                <ListItemIcon>
                  <Settings className="w-4 h-4" />
                </ListItemIcon>
                <ListItemText primary="ตั้งค่าระบบ / การเชื่อมต่อ API" />
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon sx={{ color: 'error.main' }}>
                  <LogOut className="w-4 h-4" />
                </ListItemIcon>
                <ListItemText primary="ออกจากระบบ" />
              </MenuItem>
            </Menu>
          </>
        )}
      </Stack>
    </Box>
  );
}

