import { useState } from 'react';
import { MessageSquare, Send, History, User } from 'lucide-react';
import { Button } from '../ui';
import { formatDate } from '../../utils';

export const NotesPanel = ({
  notes = [],
  onAddNote,
  title = "Notes",
  placeholder = "Add a note...",
  icon: Icon = MessageSquare,
  iconColor = "text-blue-500",
  showStatusHistory = false,
  statusHistory = [],
  readOnly = false
}) => {
  const [newNote, setNewNote] = useState('');
  const [replyTo, setReplyTo] = useState(null);

  const rootNotes = notes.filter(n => !n.parentId);
  const getReplies = (parentId) => notes.filter(n => n.parentId === parentId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    onAddNote({
      id: crypto.randomUUID(),
      text: newNote,
      author: 'Admin',
      timestamp: new Date().toISOString(),
      parentId: replyTo,
      type: 'note'
    });

    setNewNote('');
    setReplyTo(null);
  };

  const NoteItem = ({ note, depth = 0 }) => {
    const isStatusChange = note.type === 'status_change';

    return (
      <div className={`${depth > 0 ? 'ml-4 border-l-2 border-slate-100 dark:border-slate-700 pl-3' : ''}`}>
        <div className={`rounded-lg p-3 mb-2 ${
          isStatusChange
            ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
            : 'bg-slate-50 dark:bg-slate-800/50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isStatusChange ? (
                <History size={12} className="text-amber-600 dark:text-amber-400" />
              ) : (
                <User size={12} className="text-slate-400" />
              )}
              <span className={`text-xs font-bold ${
                isStatusChange
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-slate-600 dark:text-slate-300'
              }`}>
                {note.author}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">{formatDate(note.timestamp)}</span>
          </div>
          <p className={`text-sm ${
            isStatusChange
              ? 'text-amber-800 dark:text-amber-200'
              : 'text-slate-700 dark:text-slate-200'
          }`}>
            {note.text}
          </p>
          {!isStatusChange && !readOnly && (
            <button
              onClick={() => setReplyTo(note.id)}
              className="text-xs text-blue-600 hover:underline mt-2"
            >
              Reply
            </button>
          )}
        </div>
        {getReplies(note.id).map(reply => (
          <NoteItem key={reply.id} note={reply} depth={depth + 1} />
        ))}
      </div>
    );
  };

  // Combine notes and status history, sorted by timestamp
  const allItems = [...notes, ...statusHistory].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  const displayItems = showStatusHistory ? allItems : notes;
  const rootItems = displayItems.filter(n => !n.parentId);

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
        <Icon size={16} className={iconColor} />
        {title} ({notes.length})
        {showStatusHistory && statusHistory.length > 0 && (
          <span className="text-xs font-normal text-slate-400">
            + {statusHistory.length} status changes
          </span>
        )}
      </h4>

      <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
        {rootItems.length === 0 && (
          <p className="text-sm text-slate-400 italic">No notes yet.</p>
        )}
        {rootItems.map(item => (
          <NoteItem key={item.id} note={item} />
        ))}
      </div>

      {!readOnly && (
        <form onSubmit={handleSubmit} className="space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Replying to note...</span>
              <button type="button" onClick={() => setReplyTo(null)} className="text-rose-500 hover:underline">Cancel</button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white"
            />
            <Button type="submit" icon={Send} disabled={!newNote.trim()}>Add</Button>
          </div>
        </form>
      )}
    </div>
  );
};
