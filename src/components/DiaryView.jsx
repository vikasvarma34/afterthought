import { useEffect, useState, useRef, useCallback } from 'react';
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
  
  // Autosave & draft state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autosaveIntervalRef = useRef(null);
  const draftEntryIdRef = useRef(null);
  
  // Refs to always have latest values
  const titleRef = useRef('');
  const contentRef = useRef('');
  const unsavedRef = useRef(false);
  
  // Refs for edit mode autosave
  const editTitleRef = useRef('');
  const editContentRef = useRef('');
  const editUnsavedRef = useRef(false);

  // Autosave for NEW entries (drafts)
  const autosaveToDB = useCallback(async () => {
    if (!titleRef.current.trim() || !contentRef.current.trim()) return;

    console.log('Autosaving draft...');
    try {
      if (!draftEntryIdRef.current) {
        const { data, error } = await supabase
          .from('entries')
          .insert([{ diary_id: diary.uuid, title: titleRef.current, content: contentRef.current, is_draft: true }])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          draftEntryIdRef.current = data[0].id;
          console.log('Draft created:', data[0].id);
        }
      } else {
        const { error } = await supabase
          .from('entries')
          .update({ title: titleRef.current, content: contentRef.current })
          .eq('id', draftEntryIdRef.current);

        if (error) throw error;
        console.log('Draft saved:', draftEntryIdRef.current);
      }

      setHasUnsavedChanges(false);

      // Refresh entries list to show updated draft
      const { data: updatedEntries } = await supabase
        .from('entries')
        .select('*')
        .eq('diary_id', diary.uuid)
        .order('created_at', { ascending: false });
      
      setEntries(updatedEntries || []);
    } catch (error) {
      console.error('Autosave error:', error);
    }
  }, [diary.uuid]);

  // Autosave for EXISTING entries (editing)
  const autosaveEditEntry = useCallback(async () => {
    if (!editTitleRef.current.trim() || !editContentRef.current.trim()) return;
    if (!editingEntry) return;

    console.log('Autosaving entry:', editingEntry.id);
    try {
      const { error } = await supabase
        .from('entries')
        .update({ title: editTitleRef.current, content: editContentRef.current })
        .eq('id', editingEntry.id);

      if (error) throw error;
      console.log('Entry saved:', editingEntry.id);
      setHasUnsavedChanges(false);

      // Refresh entries list to show updated entry
      const { data: updatedEntries } = await supabase
        .from('entries')
        .select('*')
        .eq('diary_id', diary.uuid)
        .order('created_at', { ascending: false });
      
      setEntries(updatedEntries || []);
    } catch (error) {
      console.error('Autosave error:', error);
    }
  }, [editingEntry, diary.uuid]);

  // Track content changes
  const handleContentChange = (newTitle, newContent) => {
    titleRef.current = newTitle;
    contentRef.current = newContent;
    unsavedRef.current = true;
    setTitle(newTitle);
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  // Handle closing form - show gentle warning if unsaved
  const handleDiscardDraft = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('Are you sure you want to go back without saving?');
      if (!confirmed) return;
    }
    
    setShowNewEntryForm(false);
    setContent('');
    setTitle('');
    setHasUnsavedChanges(false);
    titleRef.current = '';
    contentRef.current = '';
    unsavedRef.current = false;
    draftEntryIdRef.current = null;
  };

  // 10-second autosave interval (for new entries)
  useEffect(() => {
    if (showNewEntryForm && hasUnsavedChanges) {
      autosaveIntervalRef.current = setInterval(() => {
        autosaveToDB();
      }, 10000);

      return () => {
        if (autosaveIntervalRef.current) {
          clearInterval(autosaveIntervalRef.current);
        }
      };
    }
  }, [showNewEntryForm, hasUnsavedChanges, autosaveToDB]);

  // 10-second autosave interval (for editing existing entries)
  useEffect(() => {
    if (editingEntry && hasUnsavedChanges) {
      autosaveIntervalRef.current = setInterval(() => {
        autosaveEditEntry();
      }, 10000);

      return () => {
        if (autosaveIntervalRef.current) {
          clearInterval(autosaveIntervalRef.current);
        }
      };
    }
  }, [editingEntry, hasUnsavedChanges, autosaveEditEntry]);

  // Beforeunload listener - warn if unsaved
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && showNewEntryForm) {
        e.preventDefault();
        e.returnValue = 'You have unsaved writing. Leaving will lose your changes.';
        return 'You have unsaved writing. Leaving will lose your changes.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, showNewEntryForm]);

  // Restore draft on mount from DB (don't auto-open form)
  useEffect(() => {
    const restoreDraft = async () => {
      if (!diary?.uuid) return;

      try {
        const { data, error } = await supabase
          .from('entries')
          .select('*')
          .eq('diary_id', diary.uuid)
          .eq('is_draft', true)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (!error && data && data[0]) {
          const restoredTitle = data[0].title || '';
          const restoredContent = data[0].content || '';
          titleRef.current = restoredTitle;
          contentRef.current = restoredContent;
          unsavedRef.current = false;
          setTitle(restoredTitle);
          setContent(restoredContent);
          draftEntryIdRef.current = data[0].id;
          console.log('Draft ready:', data[0].id);
        }
      } catch (e) {
        console.error('Failed to restore draft:', e);
      }
    };

    if (diary?.uuid) {
      restoreDraft();
    }
  }, [diary?.uuid]);

  // Fetch entries (include drafts)
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
    if (!title.trim() || !content.trim()) return;
    if (!diary?.uuid) {
      console.error('Cannot save entry: diary.uuid is missing!', diary);
      alert('Error: Diary ID is missing');
      return;
    }

    setSaving(true);
    try {
      if (draftEntryIdRef.current) {
        // Convert draft to real entry by removing is_draft flag
        const { error } = await supabase
          .from('entries')
          .update({ title, content, is_draft: false })
          .eq('id', draftEntryIdRef.current);

        if (error) throw error;
        console.log('Draft published:', draftEntryIdRef.current);
      } else {
        // Create new entry if no draft existed
        const { error } = await supabase
          .from('entries')
          .insert([{ diary_id: diary.uuid, title, content, is_draft: false }])
          .select();

        if (error) throw error;
        console.log('Entry saved successfully');
      }

      // Refresh entries list (include drafts)
      const { data: allEntries } = await supabase
        .from('entries')
        .select('*')
        .eq('diary_id', diary.uuid)
        .order('created_at', { ascending: false });

      setEntries(allEntries || []);
      setContent('');
      setTitle('');
      setShowNewEntryForm(false);
      setHasUnsavedChanges(false);
      draftEntryIdRef.current = null;
    } catch (error) {
      console.error('Entry save failed:', error);
      alert('Failed to save entry: ' + error.message);
    }
    setSaving(false);
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    const title = entry.title || '';
    const content = entry.content;
    setEditTitle(title);
    setEditContent(content);
    editTitleRef.current = title;
    editContentRef.current = content;
    editUnsavedRef.current = false;
  };

  const handleEditChange = (newTitle, newContent) => {
    setEditTitle(newTitle);
    setEditContent(newContent);
    editTitleRef.current = newTitle;
    editContentRef.current = newContent;
    editUnsavedRef.current = true;
    setHasUnsavedChanges(true);
  };

  const handleSaveEntry = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;

    setSaving(true);
    const { error } = await supabase
      .from('entries')
      .update({ title: editTitle, content: editContent })
      .eq('id', editingEntry.id);

    if (error) {
      console.error('Entry update failed:', error);
      alert('Failed to update entry: ' + error.message);
    } else {
      const updatedEntries = entries.map((e) =>
        e.id === editingEntry.id
          ? { ...e, title: editTitle, content: editContent }
          : e
      );
      setEntries(updatedEntries);
      setEditingEntry(null);
      setEditTitle('');
      setEditContent('');
      setHasUnsavedChanges(false);
      editUnsavedRef.current = false;
      editTitleRef.current = '';
      editContentRef.current = '';
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
    const handleCloseEdit = () => {
      if (hasUnsavedChanges) {
        const confirmed = window.confirm('Are you sure you want to go back without saving?');
        if (!confirmed) return;
      }
      setEditingEntry(null);
      setEditTitle('');
      setEditContent('');
      setHasUnsavedChanges(false);
      editUnsavedRef.current = false;
      editTitleRef.current = '';
      editContentRef.current = '';
    };

    return (
      <>
        <div className="modal-overlay" onClick={handleCloseEdit}></div>
        <div className="entry-modal">
          <div className="entry-modal-header">
            <h2>Edit Entry</h2>
            <button className="close-btn" onClick={handleCloseEdit}>×</button>
          </div>
          <form className="entry-form-modal">
            <input
              type="text"
              placeholder="Entry title"
              value={editTitle}
              onChange={(e) => handleEditChange(e.target.value, editContent)}
              disabled={saving}
              required
            />
            <textarea
              placeholder="Entry content"
              value={editContent}
              onChange={(e) => handleEditChange(editTitle, e.target.value)}
              disabled={saving}
            />
            <div className="form-actions">
              <button 
                type="button"
                onClick={handleSaveEntry} 
                disabled={!hasUnsavedChanges || !editTitle.trim() || !editContent.trim()}
              >
                {saving ? 'Saving...' : !hasUnsavedChanges && editTitle.trim() && editContent.trim() ? 'Saved' : 'Save Entry'}
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

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('Are you sure you want to go back without saving?');
      if (!confirmed) return;
    }
    onBack();
  };

  return (
    <div className="diary-view">
      <div className="diary-header">
        <button className="back-btn" onClick={handleBackClick}>
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
                placeholder="Entry title"
                value={title}
                onChange={(e) => handleContentChange(e.target.value, content)}
                disabled={saving}
                required
              />
              <textarea
                placeholder="Write your thoughts..."
                value={content}
                onChange={(e) => handleContentChange(title, e.target.value)}
                disabled={saving}
              />
              <div className="form-actions">
                <button type="submit" disabled={!hasUnsavedChanges || !title.trim() || !content.trim()}>
                  {saving ? 'Saving...' : !hasUnsavedChanges && title.trim() && content.trim() ? 'Saved' : 'Save Entry'}
                </button>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
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
                <div>
                  {entry.title && <h3>{entry.title}</h3>}
                  {entry.is_draft && <span className="draft-badge">Draft</span>}
                </div>
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
