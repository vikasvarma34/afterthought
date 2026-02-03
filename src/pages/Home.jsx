import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import DiaryList from '../components/DiaryList';
import DiaryView from '../components/DiaryView';
import EmptyState from '../components/EmptyState';
import Placeholder from '../components/Placeholder';
import '../styles/Home.css';
import '../styles/EmptyState.css';
import '../styles/Placeholder.css';

export default function Home() {
  const [user, setUser] = useState(null);
  const [diaries, setDiaries] = useState([]);
  const [selectedDiary, setSelectedDiary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      fetchDiaries(session.user.id);
    };
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/login');
      }
    });

    return () => subscription?.unsubscribe();
  }, [navigate]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

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

  const handleDiaryDeleted = () => {
    setSelectedDiary(null);
    fetchDiaries(user.id);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="home">
      <div className="header">
        <h1>
          <img src="/src/assets/—Pngtree—black quill feather pen with_5157648.png" alt="afterThoughts" />
          afterThoughts
        </h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="content">
        <DiaryList
          diaries={diaries}
          onSelectDiary={setSelectedDiary}
          onCreateDiary={handleCreateDiary}
        />
        {selectedDiary ? (
          <DiaryView
            diary={selectedDiary}
            onBack={() => setSelectedDiary(null)}
            onDiaryDeleted={handleDiaryDeleted}
            onDiaryUpdated={() => fetchDiaries(user.id)}
          />
        ) : diaries.length === 0 ? (
          <EmptyState
            title="No diaries yet"
            description="Create your first diary to begin writing."
            buttonText="Create diary"
            onButtonClick={() => {
              const title = prompt('Diary title:');
              if (title) handleCreateDiary(title);
            }}
          />
        ) : (
          <Placeholder
            message="Select a diary to start writing"
            subMessage="Choose from your diaries on the left"
          />
        )}
      </div>
    </div>
  );
}
