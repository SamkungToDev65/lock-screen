import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AdminSidebar from './components/Layout/AdminSidebar';
import AdminTopbar from './components/Layout/AdminTopbar';
import TeacherDashboard from './components/Teacher/TeacherDashboard';
import AdminPortal from './components/Teacher/AdminPortal';
import TeacherLogin from './components/Auth/TeacherLogin';
import CreateRoomModal from './components/Teacher/CreateRoomModal';
import RoomQRModal from './components/Teacher/RoomQRModal';
import ProjectorModal from './components/Teacher/ProjectorModal';
import SettingsModal from './components/SettingsModal';
import StudentJoin from './components/Student/StudentJoin';
import ExamLockScreen from './components/Student/ExamLockScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Box, Drawer } from '@mui/material';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'login' | 'student-join' | 'exam-active'
  const [adminTab, setAdminTab] = useState('dashboard'); // 'dashboard' | 'rooms' | 'students' | 'exams' | 'reports' | 'settings'
  const [selectedRoomCode, setSelectedRoomCode] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [modalCreateRoom, setModalCreateRoom] = useState(false);
  const [modalQR, setModalQR] = useState(false);
  const [modalProjector, setModalProjector] = useState(false);
  const [modalSettings, setModalSettings] = useState(false);
  const [activeModalRoom, setActiveModalRoom] = useState(null);

  // Student active session
  const [activeExamSession, setActiveExamSession] = useState(null);

  // Check URL hash
  const parseHashRoute = () => {
    const hash = window.location.hash || '';

    const roomMatch = hash.match(/#\/room\/([a-zA-Z0-9_-]+)/i);
    if (roomMatch && roomMatch[1]) {
      const code = roomMatch[1].toUpperCase();
      setSelectedRoomCode(code);
      setCurrentView('student-join');
      return;
    }

    if (hash === '#/student') {
      setCurrentView('student-join');
      return;
    }

    if (hash === '#/login') {
      if (isAuthenticated) {
        setCurrentView('dashboard');
        window.location.hash = '#/dashboard';
      } else {
        setCurrentView('login');
      }
      return;
    }

    if (!hash || hash === '#/' || hash === '#/admin' || hash === '#/dashboard') {
      setCurrentView(isAuthenticated ? 'dashboard' : 'login');
      return;
    }
  };

  useEffect(() => {
    parseHashRoute();
    const handleHashChange = () => parseHashRoute();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated]);

  // When user successfully authenticates, immediately redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && (currentView === 'login' || window.location.hash === '#/login')) {
      setCurrentView('dashboard');
      window.location.hash = '#/dashboard';
    }
  }, [isAuthenticated, currentView]);

  const handleNavigate = (view, forceAuth = false) => {
    const isAuth = forceAuth || isAuthenticated;
    if ((view === 'dashboard' || view === 'admin') && !isAuth) {
      setCurrentView('login');
      window.location.hash = '#/login';
      return;
    }

    setCurrentView(view);
    if (view === 'dashboard' || view === 'admin') {
      window.location.hash = '#/dashboard';
    } else if (view === 'student-join') {
      window.location.hash = selectedRoomCode ? `#/room/${selectedRoomCode}` : '#/student';
    } else if (view === 'login') {
      window.location.hash = '#/login';
    }
  };

  const handleSelectAdminTab = (tabId) => {
    setAdminTab(tabId);
    if (tabId === 'settings') {
      setModalSettings(true);
    }
  };

  const handleRoomCreated = (newRoom) => {
    setSelectedRoomCode(newRoom.roomCode);
    setActiveModalRoom(newRoom);
    setModalQR(true);
  };

  const handleStartExam = ({ room, student }) => {
    setActiveExamSession({ room, student });
    setCurrentView('exam-active');
  };

  const handleExitExam = () => {
    setActiveExamSession(null);
    setCurrentView('student-join');
    window.location.hash = '';
  };

  const getAdminTabTitle = () => {
    switch (adminTab) {
      case 'dashboard':
        return 'แดชบอร์ดคุมสอบ';
      case 'rooms':
        return 'จัดการห้องสอบ';
      case 'students':
        return 'จัดการนักศึกษา';
      case 'exams':
        return 'ข้อสอบและคลังข้อสอบ';
      case 'reports':
        return 'รายงานและสถิติ';
      case 'settings':
        return 'ตั้งค่าระบบ';
      default:
        return 'แดชบอร์ดคุมสอบ';
    }
  };

  // 1. FULLSCREEN EXAM ACTIVE
  if (currentView === 'exam-active' && activeExamSession) {
    return (
      <ExamLockScreen
        room={activeExamSession.room}
        student={activeExamSession.student}
        onExitExam={handleExitExam}
      />
    );
  }

  // 2. AUTHENTICATED ADMIN / TEACHER PORTAL (Matching Image 1 Master UI)
  if (isAuthenticated && (currentView === 'dashboard' || currentView === 'admin')) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        {/* Desktop Sidebar (Sticky 100vh full height on md and up) */}
        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            position: 'sticky',
            top: 0,
            height: '100vh',
            flexShrink: 0,
            zIndex: 1000,
          }}
        >
          <AdminSidebar
            currentTab={adminTab}
            onSelectTab={handleSelectAdminTab}
            onOpenSettings={() => setModalSettings(true)}
          />
        </Box>

        {/* Mobile / Tablet Drawer Sidebar */}
        <Drawer
          anchor="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          sx={{ display: { xs: 'block', md: 'none' } }}
          PaperProps={{
            sx: {
              border: 'none',
              background: 'linear-gradient(180deg, #07153b 0%, #0a2052 50%, #061536 100%)',
              width: 270,
            },
          }}
        >
          <AdminSidebar
            currentTab={adminTab}
            onSelectTab={(tab) => {
              handleSelectAdminTab(tab);
              setMobileDrawerOpen(false);
            }}
            onOpenSettings={() => {
              setModalSettings(true);
              setMobileDrawerOpen(false);
            }}
          />
        </Drawer>

        {/* Right Main Body */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
          {/* Top Bar with hamburger trigger on mobile */}
          <AdminTopbar
            title={getAdminTabTitle()}
            onOpenSettings={() => setModalSettings(true)}
            onToggleMobileSidebar={() => setMobileDrawerOpen((prev) => !prev)}
          />

          {/* Dynamic Content based on selected sidebar tab */}
          <Box component="main" sx={{ flex: 1 }}>
            {adminTab === 'dashboard' && (
              <TeacherDashboard
                onOpenCreateRoom={() => setModalCreateRoom(true)}
                onOpenQR={(room) => {
                  setActiveModalRoom(room);
                  setModalQR(true);
                }}
                onOpenProjector={(room) => {
                  setActiveModalRoom(room);
                  setModalProjector(true);
                }}
                selectedRoomCode={selectedRoomCode}
                setSelectedRoomCode={setSelectedRoomCode}
              />
            )}

            {(adminTab === 'rooms' || adminTab === 'exams') && (
              <AdminPortal
                initialTab={0}
                onOpenCreateRoom={() => setModalCreateRoom(true)}
                onOpenQR={(room) => {
                  setActiveModalRoom(room);
                  setModalQR(true);
                }}
                onOpenProjector={(room) => {
                  setActiveModalRoom(room);
                  setModalProjector(true);
                }}
                onOpenLiveDashboard={() => setAdminTab('dashboard')}
              />
            )}

            {adminTab === 'students' && (
              <AdminPortal
                initialTab={1}
                onOpenCreateRoom={() => setModalCreateRoom(true)}
                onOpenQR={(room) => {
                  setActiveModalRoom(room);
                  setModalQR(true);
                }}
                onOpenProjector={(room) => {
                  setActiveModalRoom(room);
                  setModalProjector(true);
                }}
                onOpenLiveDashboard={() => setAdminTab('dashboard')}
              />
            )}

            {(adminTab === 'reports' || adminTab === 'settings') && (
              <AdminPortal
                initialTab={adminTab === 'reports' ? 2 : 3}
                onOpenCreateRoom={() => setModalCreateRoom(true)}
                onOpenQR={(room) => {
                  setActiveModalRoom(room);
                  setModalQR(true);
                }}
                onOpenProjector={(room) => {
                  setActiveModalRoom(room);
                  setModalProjector(true);
                }}
                onOpenLiveDashboard={() => setAdminTab('dashboard')}
              />
            )}
          </Box>
        </Box>

        {/* Global Modals */}
        <CreateRoomModal
          open={modalCreateRoom}
          onClose={() => setModalCreateRoom(false)}
          onRoomCreated={handleRoomCreated}
        />

        <RoomQRModal
          open={modalQR}
          onClose={() => setModalQR(false)}
          room={activeModalRoom}
          onOpenProjector={(room) => {
            setActiveModalRoom(room);
            setModalProjector(true);
          }}
        />

        <ProjectorModal
          open={modalProjector}
          onClose={() => setModalProjector(false)}
          room={activeModalRoom}
        />

        <SettingsModal
          open={modalSettings}
          onClose={() => setModalSettings(false)}
        />
      </Box>
    );
  }

  // 3. UNAUTHENTICATED OR STUDENT VIEWS
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenSettings={() => setModalSettings(true)}
      />

      <Box component="main" sx={{ flex: 1 }}>
        <TeacherLogin
          initialTab={currentView === 'student-join' ? 'student' : 'teacher'}
          initialRoomCode={selectedRoomCode}
          onLoginSuccess={() => handleNavigate('dashboard', true)}
          onStartExam={handleStartExam}
          onOpenSettings={() => setModalSettings(true)}
        />
      </Box>

      {/* Global Modals */}
      <CreateRoomModal
        open={modalCreateRoom}
        onClose={() => setModalCreateRoom(false)}
        onRoomCreated={handleRoomCreated}
      />

      <RoomQRModal
        open={modalQR}
        onClose={() => setModalQR(false)}
        room={activeModalRoom}
        onOpenProjector={(room) => {
          setActiveModalRoom(room);
          setModalProjector(true);
        }}
      />

      <ProjectorModal
        open={modalProjector}
        onClose={() => setModalProjector(false)}
        room={activeModalRoom}
      />

      <SettingsModal
        open={modalSettings}
        onClose={() => setModalSettings(false)}
      />
    </Box>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
