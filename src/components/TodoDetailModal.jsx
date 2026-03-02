import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatDueDate, isToday, isOverdue } from '../utils/dateHelpers';
import '../styles/TodoDetailModal.css';

const IMPORTANCE_LEVELS = [
  { value: 'low', label: 'Low', color: '#7a9e7e' },
  { value: 'medium', label: 'Medium', color: '#d4a574' },
  { value: 'high', label: 'High', color: '#c85a54' },
];

// Helper functions for flexible due dates
const getFlexibleDueDate = (option) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (option) {
    case 'today': {
      return today.toISOString().split('T')[0];
    }
    case 'tomorrow': {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    case 'day-after-tomorrow': {
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      return dayAfter.toISOString().split('T')[0];
    }
    case 'this-saturday': {
      const saturday = new Date(today);
      const day = saturday.getDay();
      const daysUntilSaturday = (6 - day + 7) % 7 || 7;
      saturday.setDate(saturday.getDate() + daysUntilSaturday);
      return saturday.toISOString().split('T')[0];
    }
    case 'this-sunday': {
      const sunday = new Date(today);
      const dayOfWeek = sunday.getDay();
      const daysUntilSunday = (0 - dayOfWeek + 7) % 7 || 7;
      sunday.setDate(sunday.getDate() + daysUntilSunday);
      return sunday.toISOString().split('T')[0];
    }
    default:
      return null;
  }
};

export default function TodoDetailModal({ todo, onClose, onSave, onDelete, onComplete }) {
  const [details, setDetails] = useState(todo.details || '');
  const [importance, setImportance] = useState(todo.importance || 'medium');
  const [dueDate, setDueDate] = useState(todo.due_date || '');
  const [saving, setSaving] = useState(false);
  const [showDateOptions, setShowDateOptions] = useState(false);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('todos')
      .update({
        text: todo.text,
        importance,
        due_date: dueDate || null,
        details: details || null,
      })
      .eq('id', todo.id);

    if (!error) {
      onSave({
        ...todo,
        importance,
        due_date: dueDate,
        details,
      });
      onClose();
    } else {
      console.error('Failed to save todo:', error);
    }
    setSaving(false);
  };

  const handleComplete = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('todos')
      .update({ done: true })
      .eq('id', todo.id);

    if (!error) {
      onComplete(todo.id);
      onClose();
    } else {
      console.error('Failed to complete todo:', error);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', todo.id);

    if (!error) {
      onDelete(todo.id);
      onClose();
    } else {
      console.error('Failed to delete todo:', error);
    }
    setSaving(false);
  };

  const handleFlexibleDate = (option) => {
    const newDate = getFlexibleDueDate(option);
    setDueDate(newDate);
    setShowDateOptions(false);
  };

  const dueDateLabel = dueDate
    ? isToday(dueDate)
      ? '📌 Today'
      : isOverdue(dueDate)
        ? `🔴 Overdue: ${formatDueDate(dueDate)}`
        : formatDueDate(dueDate)
    : 'No due date';

  return (
    <div className="todo-modal-overlay" onClick={onClose}>
      <div className="todo-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="todo-modal-header">
          <h2>Task Details</h2>
          <button
            className="todo-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Task title (read-only) */}
        <div className="todo-modal-section">
          <h3 className="todo-modal-task-title">{todo.text}</h3>
        </div>

        {/* Details text area */}
        <div className="todo-modal-section">
          <label className="todo-modal-label">
            <span className="todo-modal-label-text">Details (optional)</span>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add more information about this task..."
              maxLength={500}
              className="todo-modal-textarea"
              aria-label="Task details"
            />
            <span className="todo-modal-char-count">
              {details.length}/500
            </span>
          </label>
        </div>

        {/* Priority selector */}
        <div className="todo-modal-section">
          <label className="todo-modal-label">
            <span className="todo-modal-label-text">Priority</span>
            <select
              value={importance}
              onChange={(e) => setImportance(e.target.value)}
              className="todo-modal-select"
              aria-label="Task priority"
            >
              {IMPORTANCE_LEVELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Due date section */}
        <div className="todo-modal-section">
          <label className="todo-modal-label">
            <span className="todo-modal-label-text">Due Date</span>
            <div className="todo-date-wrapper">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  setShowDateOptions(false);
                }}
                className="todo-modal-input"
                aria-label="Custom due date"
              />
              <button
                type="button"
                className="todo-date-preset-btn"
                onClick={() => setShowDateOptions(!showDateOptions)}
                aria-label="Show date presets"
              >
                📅 Quick dates
              </button>
            </div>

            {/* Flexible date options */}
            {showDateOptions && (
              <div className="todo-date-options">
                <button
                  type="button"
                  className="todo-date-option"
                  onClick={() => handleFlexibleDate('today')}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="todo-date-option"
                  onClick={() => handleFlexibleDate('tomorrow')}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  className="todo-date-option"
                  onClick={() => handleFlexibleDate('day-after-tomorrow')}
                >
                  Day after tomorrow
                </button>
                <button
                  type="button"
                  className="todo-date-option"
                  onClick={() => handleFlexibleDate('this-saturday')}
                >
                  This Saturday
                </button>
                <button
                  type="button"
                  className="todo-date-option"
                  onClick={() => handleFlexibleDate('this-sunday')}
                >
                  This Sunday
                </button>
                <button
                  type="button"
                  className="todo-date-option todo-date-option-clear"
                  onClick={() => {
                    setDueDate('');
                    setShowDateOptions(false);
                  }}
                >
                  Clear date
                </button>
              </div>
            )}

            {dueDate && (
              <div className="todo-current-date">
                {dueDateLabel}
              </div>
            )}
          </label>
        </div>

        {/* Action buttons */}
        <div className="todo-modal-actions">
          <button
            type="button"
            className="todo-modal-btn todo-modal-btn-complete"
            onClick={handleComplete}
            disabled={saving || todo.done}
            title={todo.done ? 'Task already completed' : 'Mark as complete'}
          >
            ✓ Complete
          </button>
          <button
            type="button"
            className="todo-modal-btn todo-modal-btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            className="todo-modal-btn todo-modal-btn-delete"
            onClick={handleDelete}
            disabled={saving}
            title="Delete this task"
          >
            🗑️ Delete
          </button>
        </div>

        {/* Footer info */}
        <div className="todo-modal-footer">
          <p className="todo-modal-footer-text">
            Press <kbd>Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
