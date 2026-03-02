import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import '../styles/TodoWidget.css';

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

export default function TodoWidget({ userId, isDark }) {
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [importance, setImportance] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [filterBy, setFilterBy] = useState('all');

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

    if (!userId) return;

    const { data, error } = await supabase
      .from('todos')
      .insert([{ user_id: userId, text: trimmed, done: false, importance, due_date: dueDate || null }])
      .select('id, text, done, importance, due_date, created_at')
      .single();

    if (error) {
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

    if (!userId) return;

    const { error } = await supabase.from('todos').update({ done: nextDone }).eq('id', id);
    if (error) {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, done: current.done } : item)));
    }
  };

  const removeItem = async (id) => {
    const snapshot = items;
    setItems((prev) => prev.filter((item) => item.id !== id));

    if (!userId) return;

    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) {
      setItems(snapshot);
    }
  };

  const activeCount = items.filter((item) => !item.done).length;
  const completedCount = items.filter((item) => item.done).length;

  return (
    <div className={`todo-widget ${isDark ? 'dark' : 'light'}`}>
      <h3 className="widget-title">My Tasks</h3>
      
      <form className="widget-form" onSubmit={handleAdd}>
        <div className="widget-input-group">
          <input
            type="text"
            placeholder="Add a task..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={100}
            className="widget-input"
          />
          <button type="submit" disabled={!text.trim()} className="widget-add-btn">
            +
          </button>
        </div>

        <div className="widget-meta">
          <select value={importance} onChange={(e) => setImportance(e.target.value)} className="widget-select">
            {IMPORTANCE_LEVELS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="widget-date" />
        </div>
      </form>

      <div className="widget-stats">
        <span>Active: {activeCount}</span>
        <span>Done: {completedCount}</span>
      </div>

      <div className="widget-filters">
        {['all', 'active', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilterBy(f)}
            className={`filter-badge ${filterBy === f ? 'active' : ''}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="widget-list">
        {filteredItems.length === 0 ? (
          <p className="widget-empty">No tasks {filterBy !== 'all' ? `(${filterBy})` : ''}</p>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className={`widget-item ${item.done ? 'done' : ''}`}>
              <label className="widget-check">
                <input type="checkbox" checked={item.done} onChange={() => toggleItem(item.id)} />
                <span className="check-text">
                  {item.text}
                  <span className={`item-importance importance-${item.importance}`}>
                    {IMPORTANCE_LEVELS.find((l) => l.value === item.importance)?.label}
                  </span>
                </span>
              </label>
              <button onClick={() => removeItem(item.id)} className="widget-delete">
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
