import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '../ui';
import { formatDate } from '../../utils';

export const BlockedCommentsPanel = ({ deployment, onAddComment }) => {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const comments = deployment.blockedComments || [];

  const rootComments = comments.filter(c => !c.parentId);
  const getReplies = (parentId) => comments.filter(c => c.parentId === parentId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    onAddComment({
      id: crypto.randomUUID(),
      text: newComment,
      author: 'Admin',
      timestamp: new Date().toISOString(),
      parentId: replyTo
    });

    setNewComment('');
    setReplyTo(null);
  };

  const CommentItem = ({ comment, depth = 0 }) => (
    <div className={`${depth > 0 ? 'ml-4 border-l-2 border-slate-100 dark:border-slate-700 pl-3' : ''}`}>
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{comment.author}</span>
          <span className="text-[10px] text-slate-400">{formatDate(comment.timestamp)}</span>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-200">{comment.text}</p>
        <button
          onClick={() => setReplyTo(comment.id)}
          className="text-xs text-blue-600 hover:underline mt-2"
        >
          Reply
        </button>
      </div>
      {getReplies(comment.id).map(reply => (
        <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
        <MessageSquare size={16} className="text-rose-500" />
        Blocked Comments ({comments.length})
      </h4>

      <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
        {rootComments.length === 0 && (
          <p className="text-sm text-slate-400 italic">No comments yet.</p>
        )}
        {rootComments.map(comment => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>

      {deployment.status === 'Blocked' && (
        <form onSubmit={handleSubmit} className="space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Replying to comment...</span>
              <button type="button" onClick={() => setReplyTo(null)} className="text-rose-500 hover:underline">Cancel</button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment about this blocker..."
              className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white"
            />
            <Button type="submit" icon={Send} disabled={!newComment.trim()}>Send</Button>
          </div>
        </form>
      )}
    </div>
  );
};
