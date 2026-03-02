import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../styles/Todos.css';

const IMPORTANCE_LEVELS = [
  { value: 'low', label: 'Low', color: '#7a9e7e' },
  { value: 'medium', label: 'Medium', color: '#d4a574' },
  { value: 'high', label: 'High', color: '#c85a54' },
];

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `todo_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

export default function Todos() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [importance, setImportance] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterBy, setFilterBy] = useState('all'); // all, active, completed
  const navigate = useNavigate();

  const fetchTodos = async (userId) => {
    const { data, error } = await supabase
      .from('todos')
      .select('id, text, done, importance, due_date, created_at')
      .eq('user_id', userId)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load todos:', error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setUser(session.user);
      fetchTodos(session.user.id);
    };
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        fetchTodos(session.user.id);
      }
    });

    return () => subscription?.unsubscribe();
  }, [navigate]);

  const filteredItems = useMemo(() => {
    if (filterBy === 'active') return items.filter((item) => !item.done);
    if (filterBy === 'completed') return items.filter((item) => item.done);
    return items;
  }, [items, filterBy]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    const optimistic = {
      id: createId(),
      text: trimmed,
      done: false,
      importance,
      due_date: dueDate || null,
      created_at: new Date().toISOString(),
    };

    setItems((prev) => [optimistic, ...prev]);
    setText('');
    setDueDate('');

    // Only save to Supabase if user is logged in
    if (!user) {
      return;
    }

    const { data, error } = await supabase
      .from('todos')
      .insert([
        {
          user_id: user.id,
          text: trimmed,
          done: false,
          importance,
          due_date: dueDate || null,
        },
      ])
      .select('id, text, done, importance, due_date, created_at')
      .single();

    if (error) {
      console.error('Failed to save todo:', error);
      setItems((prev) => prev.filter((item) => item.id !== optimistic.id));
      return;
    }

    setItems((prev) => [data, ...prev.filter((item) => item.id !== optimistic.id)]);
  };

  const toggleItem = async (id) => {
    const current = items.find((item) => item.id === id);
    if (!current) return;

    const nextDone = !current.done;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, done: nextDone } : item)));

    if (!user) {
      return;
    }

    const { error } = await supabase.from('todos').update({ done: nextDone }).eq('id', id);
    if (error) {
      console.error('Failed to update todo:', error);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, done: current.done } : item)),
      );
    }
  };

  const removeItem = async (id) => {
    const snapshot = items;
    setItems((prev) => prev.filter((item) => item.id !== id));

    if (!user) {
      return;
    }

    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete todo:', error);
      setItems(snapshot);
    }
  };

  const clearCompleted = async () => {
    const completed = items.filter((item) => item.done);
    if (completed.length === 0) return;

    const snapshot = items;
    setItems((prev) => prev.filter((item) => !item.done));

    if (!user) {
      return;
    }

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('user_id', user.id)
      .eq('done', true);
    if (error) {
      console.error('Failed to clear completed todos:', error);
      setItems(snapshot);
    }
  };

  const handleGoBack = () => navigate('/');

  const completedCount = items.filter((item) => item.done).length;
  const activeCount = items.filter((item) => !item.done).length;

  if (loading) return <div className="todos-loading">Loading...</div>;

  return (
    <div className="todos-container">
      {!user && (
        <div className="todos-offline-banner">
          💾 Offline Mode - Tasks saved locally only. Login to sync to cloud.
        </div>
      )}
      <div className="todos-header">
        <button className="todos-back-btn" onClick={handleGoBack}>
          ← Back
        </button>
        <h1>My Tasks</h1>
        <div className="todos-stats">
          <span className="stat">
            Active: <strong>{activeCount}</strong>
          </span>
          <span className="stat">
            Completed: <strong>{completedCount}</strong>
          </span>
        </div>
      </div>

      <div className="todos-main">
        <form className="todos-form" onSubmit={handleAdd}>
          <div className="todos-form-top">
            <input
              type="text"
              placeholder="Add a new task..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={140}
              className="todos-input"
            />
            <button type="submit" disabled={!text.trim()} className="todos-add-btn">
              Add
            </button>
          </div>

          <div className="todos-form-meta">
            <label className="todos-field">
              <span>Importance</span>
              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value)}
                className="todos-select"
              >
                {IMPORTANCE_LEVELS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="todos-field">
              <span>Due date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="todos-date-input"
              />
            </label>
          </div>
        </form>

        <div className="todos-filter">
          <button
            className={`filter-btn ${filterBy === 'all' ? 'active' : ''}`}
            onClick={() => setFilterBy('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filterBy === 'active' ? 'active' : ''}`}
            onClick={() => setFilterBy('active')}
          >
            Active
          </button>
          <button
            className={`filter-btn ${filterBy === 'completed' ? 'active' : ''}`}
            onClick={() => setFilterBy('completed')}
          >
            Completed
          </button>
        </div>

        <div className="todos-list-wrapper">
          {filteredItems.length === 0 ? (
            <div className="todos-empty">
              {items.length === 0
                ? 'No tasks yet. Add one to get started.'
                : 'No tasks match your filter.'}
            </div>
          ) : (
            <ul className="todos-list">
              {filteredItems.map((item) => (
                <li key={item.id} className={`todos-item ${item.done ? 'done' : ''}`}>
                  <label className="todos-check">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleItem(item.id)}
                      className="todos-checkbox"
                    />
                    <span className="todos-item-text">
                      {item.text}
                      <div className={`todos-item-meta importance-${item.importance || 'medium'}`}>
                        <span className="importance-badge">
                          {IMPORTANCE_LEVELS.find((l) => l.value === item.importance)?.label ||
                            'Medium'}
                        </span>
                        {item.due_date && (
                          <span className="due-date">
                            Due {new Date(item.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </span>
                  </label>
                  <button
                    type="button"
                    className="todos-delete"
                    onClick={() => removeItem(item.id)}
                    aria-label="Delete task"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && completedCount > 0 && (
          <div className="todos-footer">
            <button className="todos-clear-btn" onClick={clearCompleted}>
              Clear completed ({completedCount})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
