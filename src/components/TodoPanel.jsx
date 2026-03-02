import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import TodoDetailModal from './TodoDetailModal';
import { formatDueDate, isToday, isOverdue } from '../utils/dateHelpers';
import '../styles/TodoPanel.css';

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

export default function TodoPanel({ userId, onBack }) {
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [importance, setImportance] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [isOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [expandedSubtasks, setExpandedSubtasks] = useState({});
  const [focusMode] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isMounted = true;

    const fetchTodos = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('todos')
        .select('id, text, done, importance, due_date, details, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load todos:', error);
      } else if (isMounted) {
        setItems(data || []);
      }
      if (isMounted) setLoading(false);
    };

    fetchTodos();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Group items by importance and completion status
  const groupedItems = useMemo(() => {
    const incomplete = items.filter((item) => !item.done);
    const completed = items.filter((item) => item.done);

    const groupByImportance = (arr) => ({
      high: arr.filter((i) => i.importance === 'high'),
      medium: arr.filter((i) => i.importance === 'medium'),
      low: arr.filter((i) => i.importance === 'low'),
    });

    return {
      incomplete: groupByImportance(incomplete),
      completed: groupByImportance(completed),
    };
  }, [items]);

  const remainingCount = useMemo(() => items.filter((item) => !item.done).length, [items]);
  const completedCount = useMemo(() => items.filter((item) => item.done).length, [items]);
  const progressPercent = useMemo(() => {
    const total = items.length;
    return total === 0 ? 0 : Math.round((completedCount / total) * 100);
  }, [items, completedCount]);



  const handleAdd = async (event) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    const optimistic = {
      id: createId(),
      text: trimmed,
      done: false,
      importance,
      due_date: dueDate || null,
      details: null,
      created_at: new Date().toISOString(),
    };

    setItems((prev) => [optimistic, ...prev]);
    setText('');
    setDueDate('');

    const { data, error } = await supabase
      .from('todos')
      .insert([
        {
          user_id: userId,
          text: trimmed,
          done: false,
          importance,
          due_date: dueDate || null,
          details: null,
        },
      ])
      .select('id, text, done, importance, due_date, details, created_at')
      .single();

    if (error) {
      console.error('Failed to save todo:', error);
      setItems((prev) => prev.filter((item) => item.id !== optimistic.id));
      return;
    }

    setItems((prev) => [data, ...prev.filter((item) => item.id !== optimistic.id)]);
  };

  const removeItem = async (id) => {
    const snapshot = items;
    setItems((prev) => prev.filter((item) => item.id !== id));

    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete todo:', error);
      setItems(snapshot);
    }
  };

  const updateItem = (updatedTodo) => {
    setItems((prev) =>
      prev.map((item) => (item.id === updatedTodo.id ? updatedTodo : item)),
    );
  };

  const completeItem = (id) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: true } : item)),
    );
  };

  const clearCompleted = async () => {
    const completed = items.filter((item) => item.done);
    if (completed.length === 0) return;

    const snapshot = items;
    setItems((prev) => prev.filter((item) => !item.done));

    const { error } = await supabase.from('todos').delete().eq('user_id', userId).eq('done', true);
    if (error) {
      console.error('Failed to clear completed todos:', error);
      setItems(snapshot);
    }
  };

  const toggleSubtasks = (id) => {
    setExpandedSubtasks((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const renderTaskItem = (item) => (
    <li
      key={item.id}
      className={`todo-item ${item.done ? 'done' : ''}`}
    >
      <div className="todo-check">
        <span className="todo-content">
          <span className="todo-main-text">{item.text}</span>
          <span className="todo-meta-line-wrapper">
            <span
              className={`todo-importance-badge importance-${item.importance || 'medium'}`}
            >
              {IMPORTANCE_LEVELS.find((l) => l.value === item.importance)?.label || 'Medium'}
            </span>
            {item.due_date && (
              <span
                className={`todo-due-date ${isOverdue(item.due_date) && !item.done ? 'overdue' : ''} ${isToday(item.due_date) ? 'today' : ''}`}
              >
                {formatDueDate(item.due_date)}
              </span>
            )}
          </span>
        </span>
      </div>
      <button
        type="button"
        className="todo-view-edit"
        onClick={() => setSelectedTodo(item)}
        aria-label="Edit task"
        title="Edit task"
      >
        ✎
      </button>
      <button
        type="button"
        className="todo-delete"
        onClick={(e) => {
          e.stopPropagation();
          removeItem(item.id);
        }}
        aria-label="Remove task"
        title="Remove task"
      >
        ✕
      </button>
    </li>
  );

  if (!userId) return null;



  const showEmptyState = !loading && items.length === 0;
  const showNoIncompleteState = !loading && remainingCount === 0 && items.length > 0;

  return (
    <div className="todo-full-page">
      <div className="todo-header">
        <button className="todo-back-btn" onClick={onBack} aria-label="Go back">
          ← Back
        </button>
        <div className="todo-header-title">
          <h1>Plans</h1>
          {remainingCount > 0 && (
            <p className="todo-header-subtitle">
              {remainingCount} gentle {remainingCount === 1 ? 'step' : 'steps'} ahead
            </p>
          )}
        </div>
      </div>

      <div className="todo-main-content">
        <aside className="todo-panel todo-panel-full">
          {isOpen && (
            <div className="todo-body">
              {/* Progress section */}
              {items.length > 0 && (
                <div className="todo-progress-section">
                  <div className="todo-progress-info">
                    <span className="todo-progress-text">Progress</span>
                    <span className="todo-progress-percent">{progressPercent}%</span>
                  </div>
                  <div className="todo-progress-bar">
                    <div
                      className="todo-progress-fill"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  {completedCount > 0 && (
                    <span className="todo-progress-done">
                      {completedCount} {completedCount === 1 ? 'task' : 'tasks'} completed
                    </span>
                  )}
                </div>
              )}

              {/* Tagline */}
              <p className="todo-subtitle">Small steps, quietly kept.</p>

              {/* Add task form */}
              <form className="todo-form" onSubmit={handleAdd}>
                <input
                  type="text"
                  placeholder="Add a gentle task..."
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  maxLength={140}
                  aria-label="Task description"
                />
                <button type="submit" disabled={!text.trim()} title="Add task">
                  Add
                </button>
              </form>

              {/* Importance & due date controls */}
              <div className="todo-meta">
                <label className="todo-field">
                  <span>Priority</span>
                  <select
                    value={importance}
                    onChange={(event) => setImportance(event.target.value)}
                    aria-label="Task importance"
                  >
                    {IMPORTANCE_LEVELS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="todo-field">
                  <span>Due date</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    aria-label="Task due date"
                  />
                </label>
              </div>

              {/* Focus mode indicator */}
              {remainingCount > 0 && (
                <div className="todo-focus-hint">
                  <span className="todo-focus-icon">🎯</span>
                  <span className="todo-focus-text">
                    {focusMode
                      ? 'Focus mode active - one step at a time'
                      : remainingCount > 3
                        ? 'Try tackling one task at a time'
                        : 'You\'re almost there!'}
                  </span>
                </div>
              )}

              {/* Task list with priority grouping */}
              {showEmptyState ? (
                <div className="todo-empty-state">
                  <div className="todo-empty-icon">✨</div>
                  <p className="todo-empty-primary">Nothing here yet.</p>
                  <p className="todo-empty-secondary">Add one small thing to get started.</p>
                </div>
              ) : showNoIncompleteState ? (
                <div className="todo-empty-state todo-empty-completed">
                  <div className="todo-empty-icon">🌟</div>
                  <p className="todo-empty-primary">All done for now!</p>
                  <p className="todo-empty-secondary">Take a moment to breathe.</p>
                </div>
              ) : (
                <>
                  {/* High priority section */}
                  {groupedItems.incomplete.high.length > 0 && (
                    <div className="todo-priority-section todo-priority-high">
                      <div className="todo-priority-header">
                        <span className="todo-priority-label">⚡ Needs attention</span>
                        <span className="todo-priority-count">{groupedItems.incomplete.high.length}</span>
                      </div>
                      <ul className="todo-list">
                        {groupedItems.incomplete.high.map((item) => renderTaskItem(item))}
                      </ul>
                    </div>
                  )}

                  {/* Medium priority section */}
                  {groupedItems.incomplete.medium.length > 0 && (
                    <div className="todo-priority-section todo-priority-medium">
                      <div className="todo-priority-header">
                        <span className="todo-priority-label">→ Next steps</span>
                        <span className="todo-priority-count">{groupedItems.incomplete.medium.length}</span>
                      </div>
                      <ul className="todo-list">
                        {groupedItems.incomplete.medium.map((item) => renderTaskItem(item))}
                      </ul>
                    </div>
                  )}

                  {/* Low priority section */}
                  {groupedItems.incomplete.low.length > 0 && (
                    <div className="todo-priority-section todo-priority-low">
                      <div className="todo-priority-header">
                        <span className="todo-priority-label">◇ When you can</span>
                        <span className="todo-priority-count">{groupedItems.incomplete.low.length}</span>
                      </div>
                      <ul className="todo-list">
                        {groupedItems.incomplete.low.map((item) => renderTaskItem(item))}
                      </ul>
                    </div>
                  )}

                  {/* Completed section */}
                  {completedCount > 0 && (
                    <div className="todo-completed-section">
                      <button
                        type="button"
                        className="todo-completed-toggle"
                        onClick={() => toggleSubtasks('completed')}
                        aria-expanded={expandedSubtasks['completed']}
                      >
                        <span className="todo-completed-label">
                          ✓ Completed ({completedCount})
                        </span>
                      </button>
                      {expandedSubtasks['completed'] && (
                        <ul className="todo-list todo-list-completed">
                          {items
                            .filter((item) => item.done)
                            .map((item) => renderTaskItem(item))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Footer with actions */}
              {items.length > 0 && (
                <div className="todo-footer">
                  <span className="todo-left">
                    {remainingCount} {remainingCount === 1 ? 'task' : 'tasks'} remaining
                  </span>
                  {completedCount > 0 && (
                    <button
                      type="button"
                      className="todo-clear"
                      onClick={clearCompleted}
                      title="Clear completed tasks"
                    >
                      Clear completed
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Task detail modal */}
      {selectedTodo && (
        <TodoDetailModal
          todo={selectedTodo}
          onClose={() => setSelectedTodo(null)}
          onSave={updateItem}
          onDelete={removeItem}
          onComplete={completeItem}
        />
      )}
    </div>
  );
}
