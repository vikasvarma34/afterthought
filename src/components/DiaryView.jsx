import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Placeholder from './Placeholder';
import '../styles/DiaryView.css';
import '../styles/Placeholder.css';

export default function DiaryView({ diary, onBack, onDiaryDeleted, onDiaryUpdated }) {
  const [entries, setEntries] = useState([]);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editingDiary, setEditingDiary] = useState(false);
  const [diaryTitle, setDiaryTitle] = useState(diary.title);
  const [showNewEntryForm, setShowNewEntryForm] = useState(false);

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      console.log('Fetching entries for diary_id:', diary.uuid);
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('diary_id', diary.uuid)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch entries failed:', error);
      } else {
        console.log('Entries fetched:', data);
        setEntries(data || []);
      }
      setLoading(false);
    };

    console.log('DiaryView mounted with diary:', diary);
    if (diary?.uuid) {
      fetchEntries();
    } else {
      console.warn('DiaryView: diary or diary.uuid is missing!', diary);
    }
  }, [diary?.uuid, diary]);

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (!diary?.uuid) {
      console.error('Cannot save entry: diary.uuid is missing!', diary);
      alert('Error: Diary ID is missing');
      return;
    }

    setSaving(true);
    console.log('Adding entry with diary_id:', diary.uuid);
    const { data, error } = await supabase
      .from('entries')
      .insert([{ diary_id: diary.uuid, title: title || null, content }])
      .select();

    if (error) {
      console.error('Entry insert failed:', error);
      alert('Failed to save entry: ' + error.message);
    } else if (data) {
      console.log('Entry saved successfully:', data);
      setEntries([data[0], ...entries]);
      setContent('');
      setTitle('');
      setShowNewEntryForm(false);
    }
    setSaving(false);
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setEditTitle(entry.title || '');
    setEditContent(entry.content);
  };

  const handleSaveEntry = async () => {
    if (!editContent.trim()) return;

    setSaving(true);
    const { error } = await supabase
      .from('entries')
      .update({ title: editTitle || null, content: editContent })
      .eq('id', editingEntry.id);

    if (error) {
      console.error('Entry update failed:', error);
      alert('Failed to update entry: ' + error.message);
    } else {
      console.log('Entry updated successfully');
      const updatedEntries = entries.map((e) =>
        e.id === editingEntry.id
          ? { ...e, title: editTitle, content: editContent }
          : e
      );
      setEntries(updatedEntries);
      setEditingEntry(null);
      setEditTitle('');
      setEditContent('');
    }
    setSaving(false);
  };

  const handleDeleteEntry = async (entryId) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', entryId);

    if (error) {
      console.error('Entry delete failed:', error);
      alert('Failed to delete entry: ' + error.message);
    } else {
      console.log('Entry deleted successfully');
      setEntries(entries.filter((e) => e.id !== entryId));
      setEditingEntry(null);
    }
  };

  const handleEditDiary = () => {
    setEditingDiary(true);
    setDiaryTitle(diary.title);
  };

  const handleSaveDiary = async () => {
    if (!diaryTitle.trim()) {
      alert('Diary name cannot be empty');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('diaries')
      .update({ title: diaryTitle })
      .eq('uuid', diary.uuid);

    if (error) {
      console.error('Diary update failed:', error);
      alert('Failed to update diary: ' + error.message);
    } else {
      console.log('Diary updated successfully');
      setEditingDiary(false);
      if (onDiaryUpdated) {
        onDiaryUpdated();
      }
    }
    setSaving(false);
  };

  const handleDeleteDiary = async () => {
    if (!confirm('Delete this diary and all its entries?')) return;

    // Delete all entries first
    const { error: entriesError } = await supabase
      .from('entries')
      .delete()
      .eq('diary_id', diary.uuid);

    if (entriesError) {
      console.error('Delete entries failed:', entriesError);
      alert('Failed to delete entries: ' + entriesError.message);
      return;
    }

    // Then delete the diary
    const { error: diaryError } = await supabase
      .from('diaries')
      .delete()
      .eq('uuid', diary.uuid);

    if (diaryError) {
      console.error('Delete diary failed:', diaryError);
    } else {
      onDiaryDeleted();
    }
  };

  const truncatePreview = (text, lines = 2) => {
    const lineArray = text.split('\n').slice(0, lines);
    const preview = lineArray.join('\n');
    return preview.length > 150 ? preview.substring(0, 150) + '...' : preview;
  };

  if (loading) return <div className="loading">Loading entries...</div>;

  if (editingEntry) {
    return (
      <>
        <div className="modal-overlay" onClick={() => setEditingEntry(null)}></div>
        <div className="entry-modal">
          <div className="entry-modal-header">
            <h2>Edit Entry</h2>
            <button className="close-btn" onClick={() => setEditingEntry(null)}>×</button>
          </div>
          <form className="entry-form-modal">
            <input
              type="text"
              placeholder="Entry title (optional)"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              disabled={saving}
            />
            <textarea
              placeholder="Entry content"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              disabled={saving}
              autoFocus
            />
            <div className="form-actions">
              <button 
                type="button"
                onClick={handleSaveEntry} 
                disabled={saving || !editContent.trim()}
              >
                {saving ? 'Saving...' : 'Save Entry'}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteEntry(editingEntry.id)}
                className="delete-btn"
                disabled={saving}
              >
                Delete Entry
              </button>
            </div>
          </form>
        </div>
      </>
    );
  }

  if (editingDiary) {
    return (
      <div className="diary-view">
        <div className="diary-header">
          <button className="back-btn" onClick={() => setEditingDiary(false)}>
            ← Back
          </button>
          <h2>Edit Diary Name</h2>
          <div></div>
        </div>

        <div className="edit-entry-form">
          <input
            type="text"
            placeholder="Diary name"
            value={diaryTitle}
            onChange={(e) => setDiaryTitle(e.target.value)}
            disabled={saving}
            autoFocus
          />
          <div className="form-actions">
            <button onClick={handleSaveDiary} disabled={saving || !diaryTitle.trim()}>
              {saving ? 'Saving...' : 'Save Diary Name'}
            </button>
            <button
              onClick={() => setEditingDiary(false)}
              className="cancel-btn"
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="diary-view">
      <div className="diary-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2>{diary.title}</h2>
        <div className="header-actions">
          <button className="edit-btn" onClick={handleEditDiary}>
            Edit Name
          </button>
          <button className="delete-btn" onClick={handleDeleteDiary}>
            Delete Diary
          </button>
        </div>
      </div>

      {!showNewEntryForm && (
        <div className="new-entry-cta">
          <button onClick={() => setShowNewEntryForm(true)} className="cta-btn">
            + Write a new entry
          </button>
        </div>
      )}

      {showNewEntryForm && (
        <>
          <div className="modal-overlay" onClick={() => setShowNewEntryForm(false)}></div>
          <div className="entry-modal">
            <form onSubmit={handleAddEntry} className="entry-form-modal">
              <input
                type="text"
                placeholder="Entry title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={saving}
              />
              <textarea
                placeholder="Write your thoughts..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={saving}
                autoFocus
              />
              <div className="form-actions">
                <button type="submit" disabled={saving || !content.trim()}>
                  {saving ? 'Saving...' : 'Save Entry'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewEntryForm(false)}
                  className="cancel-btn"
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {entries.length === 0 ? (
        <Placeholder
          message="No entries yet"
          subMessage="Start writing your first entry"
        />
      ) : (
        <div className="entries">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="entry-item"
              onClick={() => handleEditEntry(entry)}
            >
              <div className="entry-header">
                {entry.title && <h3>{entry.title}</h3>}
                <p className="date">
                  {new Date(entry.created_at).toLocaleString()}
                </p>
              </div>
              <p className="preview">{truncatePreview(entry.content)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
