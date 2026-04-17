'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IconClipboard, IconX, IconCheck, IconPencil, IconDeviceFloppy } from '@tabler/icons-react'

type Status   = { id: string; label: string; color: string }
type User     = { id: string; full_name: string }
type Subtask  = { id: string; title: string; is_done: boolean; position: number }
type Comment  = { id: string; content: string; created_at: string; user: { full_name: string } }

type TaskDetail = {
  id: string
  title: string
  description: string | null
  version: number
  priority: number
  status_id: string
  start_date: string | null
  end_date: string | null
  needs_acceptance: boolean
  assignee: string | null
  reviewer_id: string | null
  created_by: string | null
  parent_id: string | null
  parent: { title: string } | null
  assignee_user: { full_name: string } | null
  reviewer_user: { full_name: string } | null
  creator_user: { full_name: string } | null
  subtasks: Subtask[]
  comments: Comment[]
  task_boards: { board: { name: string; color: string } }[]
}

const PRIORITY_LABELS: Record<number, string> = {
  0: 'None', 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical',
}

const PRIORITY_COLORS: Record<number, string> = {
  0: '#6B6B6B', 1: '#50fa7b', 2: '#F3A63A', 3: '#ffb86c', 4: '#B84040',
}

type Props = {
  taskId: string
  onClose: () => void
  onUpdated: () => void
}

export default function TaskDetailModal({ taskId, onClose, onUpdated }: Props) {
  const [task, setTask]       = useState<TaskDetail | null>(null)
  const [statuses, setStatuses] = useState<Status[]>([])
  const [users, setUsers]     = useState<User[]>([])
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle]       = useState('')
  const [editDescription, setEditDescription] = useState('')

  async function fetchTask() {
    const supabase = createClient()
    const { data } = await supabase
      .from('tasks')
      .select(`
        id, title, description, version, priority, status_id,
        start_date, end_date, needs_acceptance, assignee, reviewer_id, created_by, parent_id,
        parent:tasks!parent_id(title),
        assignee_user:users!assignee(full_name),
        reviewer_user:users!reviewer_id(full_name),
        creator_user:users!created_by(full_name),
        subtasks(id, title, is_done, position),
        comments(id, content, created_at, user:users!user_id(full_name)),
        task_boards(board:boards(name, color))
      `)
      .eq('id', taskId)
      .single()

    if (data) setTask(data as unknown as TaskDetail)
    setLoading(false)
  }

  useEffect(() => {
    fetchTask()
    const supabase = createClient()
    supabase.from('statuses').select('id, label, color').order('position')
      .then(({ data }) => { if (data) setStatuses(data) })
    supabase.from('users').select('id, full_name')
      .then(({ data }) => { if (data) setUsers(data) })
  }, [taskId])

  async function toggleSubtask(subtask: Subtask) {
    const supabase = createClient()
    await supabase.from('subtasks').update({ is_done: !subtask.is_done }).eq('id', subtask.id)
    setTask(prev => prev ? {
      ...prev,
      subtasks: prev.subtasks.map(s => s.id === subtask.id ? { ...s, is_done: !s.is_done } : s)
    } : prev)
  }

  function startEditing() {
    if (!task) return
    setEditTitle(task.title)
    setEditDescription(task.description ?? '')
    setEditing(true)
  }

  async function saveEdit() {
    if (!task || !editTitle.trim()) return
    const supabase = createClient()
    await supabase.from('tasks').update({
      title: editTitle.trim(),
      description: editDescription.trim() || null,
    }).eq('id', taskId)
    setTask(prev => prev ? { ...prev, title: editTitle.trim(), description: editDescription.trim() || null } : prev)
    setEditing(false)
    onUpdated()
  }

  async function updateField(field: string, value: string | number) {
    const supabase = createClient()
    await supabase.from('tasks').update({ [field]: value }).eq('id', taskId)
    setTask(prev => prev ? { ...prev, [field]: value } : prev)
    onUpdated()
  }

  async function submitComment() {
    if (!comment.trim()) return
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('comments').insert({ task_id: taskId, user_id: user.id, content: comment.trim() })
    setComment('')
    setSubmitting(false)
    fetchTask()
  }

  const activeStatus = statuses.find(s => s.id === task?.status_id)

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-sq-card rounded-xl w-200 h-96 flex items-center justify-center">
        <span className="text-sq-muted text-sm">Loading...</span>
      </div>
    </div>
  )

  if (!task) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-sq-card rounded-xl w-200 max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 shrink-0">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <IconClipboard size={24} className="text-sq-task-icon shrink-0" />
              {editing
                ? <input
                    autoFocus
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="bg-transparent text-white font-bold text-2xl outline-none border-b border-sq-accent w-full"
                  />
                : <h2 className="text-white font-bold text-2xl">{task.title}</h2>
              }
            </div>
            {task.parent && (
              <span className="text-sq-muted text-sm ml-9">↳ {task.parent.title}</span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <select
              value={task.status_id}
              onChange={e => updateField('status_id', e.target.value)}
              className="appearance-none px-3 py-1 rounded text-white text-sm font-medium cursor-pointer outline-none"
              style={{ backgroundColor: activeStatus?.color ?? '#6272a4' }}
            >
              {statuses.filter(s => s.label !== 'Request').map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            {editing
              ? <button onClick={saveEdit} className="text-sq-accent hover:text-white transition-colors">
                  <IconDeviceFloppy size={20} />
                </button>
              : <button onClick={startEditing} className="text-sq-muted hover:text-white transition-colors">
                  <IconPencil size={18} />
                </button>
            }
            <button onClick={onClose} className="text-sq-muted hover:text-white transition-colors">
              <IconX size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* LEFT */}
          <div className="flex-1 px-6 pb-6 flex flex-col gap-6 overflow-y-auto">

            {/* Description */}
            <div className="flex flex-col gap-2">
              <label className="text-white font-semibold text-base">Description</label>
              {editing
                ? <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    placeholder="Describe the task..."
                    rows={4}
                    className="bg-sq-col border border-sq-muted rounded text-white text-sm p-3 outline-none resize-none placeholder:text-sq-muted"
                  />
                : <p className="text-white/80 text-base leading-relaxed">
                    {task.description || <span className="italic text-sq-muted">No description</span>}
                  </p>
              }
            </div>

            {/* Subtasks */}
            <div className="flex flex-col gap-2">
              <label className="text-white font-semibold text-base">
                Subtasks ({task.subtasks.filter(s => s.is_done).length}/{task.subtasks.length})
              </label>
              {task.subtasks.length === 0
                ? <span className="text-sq-muted text-xs italic">No subtasks</span>
                : (
                  <div className="flex flex-col gap-1">
                    {task.subtasks.sort((a, b) => a.position - b.position).map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => toggleSubtask(sub)}
                        className="flex items-center gap-3 text-left group"
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          sub.is_done
                            ? 'bg-sq-accent border-sq-accent'
                            : 'border-sq-muted group-hover:border-white'
                        }`}>
                          {sub.is_done && <IconCheck size={10} className="text-white" />}
                        </div>
                        <span className={`text-base ${sub.is_done ? 'line-through text-sq-muted' : 'text-white'}`}>
                          {sub.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )
              }
            </div>

            {/* Board tags */}
            {task.task_boards.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className="text-white font-semibold text-base">Boards</label>
                <div className="flex gap-2 flex-wrap">
                  {task.task_boards.map((tb, i) => (
                    <div key={i} className="h-6 px-3 rounded-full flex items-center" style={{ backgroundColor: tb.board.color }}>
                      <span className="text-white text-xs font-medium">{tb.board.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="flex flex-col gap-3">
              <label className="text-white font-semibold text-base">
                Comments ({task.comments.length})
              </label>
              {task.comments.length > 0 && (
                <div className="flex flex-col gap-3">
                  {task.comments.map(c => (
                    <div key={c.id} className="bg-sq-col rounded-lg p-3 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sq-accent text-xs font-semibold">{c.user?.full_name}</span>
                        <span className="text-sq-muted text-xs">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-white text-sm">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitComment()}
                  placeholder="Add a comment..."
                  className="flex-1 bg-sq-col border border-sq-muted rounded-lg text-white text-sm px-3 py-2 outline-none placeholder:text-sq-muted"
                />
                <button
                  onClick={submitComment}
                  disabled={submitting || !comment.trim()}
                  className="bg-sq-accent text-white text-sm px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT — sidebar */}
          <div className="w-56 bg-sq-col p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">

            <div className="flex flex-col gap-1">
              <label className="text-white text-sm font-medium">Assignee</label>
              <select
                value={task.assignee ?? ''}
                onChange={e => updateField('assignee', e.target.value)}
                className="bg-sq-card border border-sq-muted rounded text-white text-sm px-2 py-2 outline-none"
              >
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-white text-sm font-medium">Priority</label>
              <select
                value={task.priority}
                onChange={e => updateField('priority', Number(e.target.value))}
                className="bg-sq-card border border-sq-muted rounded text-xs px-2 py-1.5 outline-none font-medium"
                style={{ color: PRIORITY_COLORS[task.priority] }}
              >
                {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-white text-sm font-medium">Reviewer</label>
              <select
                value={task.reviewer_id ?? ''}
                onChange={e => updateField('reviewer_id', e.target.value)}
                className="bg-sq-card border border-sq-muted rounded text-white text-sm px-2 py-2 outline-none"
              >
                <option value="">None</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-white text-sm font-medium">Period</label>
              <input
                type="date"
                value={task.start_date ?? ''}
                onChange={e => updateField('start_date', e.target.value)}
                className="bg-sq-card border border-sq-muted rounded text-white text-sm px-2 py-2 outline-none"
              />
              <input
                type="date"
                value={task.end_date ?? ''}
                onChange={e => updateField('end_date', e.target.value)}
                className="bg-sq-card border border-sq-muted rounded text-white text-sm px-2 py-2 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-white text-sm font-medium">Version</label>
              <span className="text-white text-xs">v{task.version}</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-white text-sm font-medium">Creator</label>
              <span className="text-white text-sm">{task.creator_user?.full_name ?? '—'}</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
