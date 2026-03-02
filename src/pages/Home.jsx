import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import DiaryList from '../components/DiaryList';
import DiaryView from '../components/DiaryView';
import EmptyState from '../components/EmptyState';
import Placeholder from '../components/Placeholder';
import TodoPanel from '../components/TodoPanel';
import logo from '../assets/—Pngtree—black quill feather pen with_5157648.png';
import '../styles/Home.css';
import '../styles/EmptyState.css';
import '../styles/Placeholder.css';

export default function Home() {
  const [user, setUser] = useState(null);
  const [diaries, setDiaries] = useState([]);
  const [selectedDiary, setSelectedDiary] = useState(null);
  const [showTodoList, setShowTodoList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateDiaryModal, setShowCreateDiaryModal] = useState(false);
  const [newDiaryTitle, setNewDiaryTitle] = useState('');
  const [creatingDiary, setCreatingDiary] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLoginChoice, setShowLoginChoice] = useState(false);
  const { isDark, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const inactivityTimeoutRef = useRef(null);

  const fetchDiaries = async (userId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('diaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch diaries:', error);
    } else {
      console.log('Diaries fetched:', data);
      setDiaries(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      setUser(session.user);
      setShowLoginChoice(true);
      fetchDiaries(session.user.id);
    };
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        setShowLoginChoice(true);
        fetchDiaries(session.user.id);
      } else {
        navigate('/login');
      }
    });

    return () => subscription?.unsubscribe();
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    await supabase.auth.signOut();
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    const resetInactivityTimer = () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }

      inactivityTimeoutRef.current = setTimeout(() => {
        console.log('User inactive for 30 minutes. Logging out...');
        handleLogout();
      }, 30 * 60 * 1000); // 30 minutes
    };

    resetInactivityTimer();

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => resetInactivityTimer();

    events.forEach((event) => document.addEventListener(event, handleActivity));

    return () => {
      events.forEach((event) => document.removeEventListener(event, handleActivity));
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, [handleLogout]);

  const handleCreateDiary = async (title) => {
    const { data, error } = await supabase
      .from('diaries')
      .insert([{ user_id: user.id, title }])
      .select();

    if (error) {
      console.error(error);
    } else if (data) {
      setDiaries([data[0], ...diaries]);
    }
  };

  const handleCreateDiaryFromModal = async (e) => {
    e.preventDefault();
    if (!newDiaryTitle.trim()) return;

    setCreatingDiary(true);
    await handleCreateDiary(newDiaryTitle);
    setNewDiaryTitle('');
    setShowCreateDiaryModal(false);
    setCreatingDiary(false);
  };

  const handleDiaryDeleted = () => {
    setSelectedDiary(null);
    fetchDiaries(user.id);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="home">
      {showLoginChoice && (
        <>
          <div className="modal-overlay"></div>
          <div className="login-choice-modal">
            <h2>Welcome! What would you like to do?</h2>
            <div className="choice-buttons">
              <button className="choice-btn reflections" onClick={() => {
                setShowLoginChoice(false);
                setShowTodoList(false);
              }}>
                Reflections
              </button>
              <button className="choice-btn plans" onClick={() => {
                setShowLoginChoice(false);
                setShowTodoList(true);
              }}>
                Plans
              </button>
            </div>
          </div>
        </>
      )}

      <div className="header">
        <h1 className="header-title">
          <img src={logo} alt="afterThoughts" />
          <span className="app-name">afterThoughts</span>
        </h1>
        <div className="header-right">
          <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
            ⚙️
          </button>
          {showSettings && user && (
            <>
              <div className="settings-overlay" onClick={() => setShowSettings(false)}></div>
              <div className="settings-menu">
                <div className="settings-user-info">
                  <p className="settings-label">Name</p>
                  <p className="settings-value">
                    {`${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'User'}
                  </p>
                </div>
                <div className="settings-user-info">
                  <p className="settings-label">Email</p>
                  <p className="settings-value">{user.email}</p>
                </div>
                <div className="settings-theme-toggle">
                  <p className="settings-label">Dark Mode</p>
                  <button className="theme-toggle-btn" onClick={toggleDarkMode}>
                    {isDark ? '🌙 ON' : '☀️ OFF'}
                  </button>
                </div>
                <button className="settings-logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="content" style={{ display: showLoginChoice ? 'none' : 'flex' }}>
        <div className="diary-list-container" style={{ display: showTodoList ? 'none' : 'block' }}>
          <DiaryList
            diaries={diaries}
            onSelectDiary={setSelectedDiary}
            onCreateDiary={handleCreateDiary}
            onBack={() => setShowLoginChoice(true)}
          />
        </div>
        {showTodoList ? (
          <div className="diary-view-container">
            <TodoPanel userId={user?.id} onBack={() => {
              setShowTodoList(false);
              setShowLoginChoice(true);
            }} />
          </div>
        ) : selectedDiary ? (
          <div className="diary-view-container">
            <DiaryView
              diary={selectedDiary}
              onBack={() => setSelectedDiary(null)}
              onDiaryDeleted={handleDiaryDeleted}
              onDiaryUpdated={() => fetchDiaries(user.id)}
            />
          </div>
        ) : diaries.length === 0 ? (
          <>
            <EmptyState
              title="No diaries yet"
              description="Create your first diary to begin writing."
              buttonText="Create diary"
              onButtonClick={() => setShowCreateDiaryModal(true)}
            />
            {showCreateDiaryModal && (
              <>
                <div className="modal-overlay" onClick={() => setShowCreateDiaryModal(false)}></div>
                <div className="create-diary-modal">
                  <h2>Create a new diary</h2>
                  <form onSubmit={handleCreateDiaryFromModal}>
                    <input
                      type="text"
                      placeholder="Diary title"
                      value={newDiaryTitle}
                      onChange={(e) => setNewDiaryTitle(e.target.value)}
                      disabled={creatingDiary}
                      autoFocus
                    />
                    <div className="modal-actions">
                      <button type="submit" disabled={creatingDiary || !newDiaryTitle.trim()}>
                        {creatingDiary ? 'Creating...' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateDiaryModal(false)}
                        className="cancel-btn"
                        disabled={creatingDiary}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </>
        ) : (
          <Placeholder
            message="Take a moment to settle into yourself."
            subMessage="Whatever feels closest right now is enough to begin."
          />
        )}
      </div>
    </div>
  );
}
