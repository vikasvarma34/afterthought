import { useState } from 'react';
import '../styles/DiaryList.css';

export default function DiaryList({ diaries, onSelectDiary, onCreateDiary }) {
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setCreating(true);
    await onCreateDiary(title);
    setTitle('');
    setCreating(false);
  };

  return (
    <div className="diary-list">
      <form onSubmit={handleCreate} className="create-form">
        <input
          type="text"
          placeholder="New diary title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={creating}
        />
        <button type="submit" disabled={creating || !title.trim()}>
          {creating ? 'Creating...' : 'Create'}
        </button>
      </form>

      <div className="diaries">
        {diaries.length === 0 ? (
          <p className="empty">No diaries yet. Create one to start journaling.</p>
        ) : (
          diaries.map((diary) => (
            <div
              key={diary.uuid}
              className="diary-item"
              onClick={() => {
                console.log('Selected diary:', diary);
                onSelectDiary(diary);
              }}
            >
              <h3>{diary.title}</h3>
              <p className="date">
                {new Date(diary.created_at).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
