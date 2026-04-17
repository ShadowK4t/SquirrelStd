'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IconClipboard, IconX, IconPlus, IconTrash, IconBooks } from '@tabler/icons-react'

type Status = { id: string; label: string; color: string }
type User   = { id: string; full_name: string }
type Task   = { id: string; title: string }

const PRIORITY_LABELS: Record<number, string> = {
  0: 'None', 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical',
}

type Props = {
  onClose: () => void
  onCreated: () => void
  defaultType?: 'story' | 'task'
  defaultParentId?: string
}

export default function TaskModal({ onClose, onCreated, defaultType = 'task', defaultParentId = '' }: Props) {
  const [statuses, setStatuses]       = useState<Status[]>([])
  const [users, setUsers]             = useState<User[]>([])
  const [stories, setStories]         = useState<Task[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // Form state
  const [type, setType]               = useState<'story' | 'task'>(defaultType)
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [statusId, setStatusId]       = useState('')
  const [assigneeId, setAssigneeId]   = useState('')
  const [reviewerId, setReviewerId]   = useState('')
  const [priority, setPriority]       = useState(2)
  const [startDate, setStartDate]     = useState('')
  const [endDate, setEndDate]         = useState('')
  const [parentId, setParentId]       = useState(defaultParentId)
  const [subtasks, setSubtasks]       = useState<string[]>([''])

  useEffect(() => {
    const supabase = createClient()

    supabase.from('statuses').select('id, label, color').order('position')
      .then(({ data }) => {
        if (data) {
          setStatuses(data)
          const todo = data.find(s => s.label === 'To Do')
          if (todo) setStatusId(todo.id)
        }
      })

    supabase.from('users').select('id, full_name')
      .then(({ data }) => { if (data) setUsers(data) })

    supabase.from('tasks').select('id, title').eq('type', 'story')
      .then(({ data }) => { if (data) setStories(data) })

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('users').select('id, full_name').eq('id', user.id).single()
          .then(({ data }) => { if (data) setCurrentUser(data) })
      }
    })
  }, [])

  const activeStatus = statuses.find(s => s.id === statusId)

  function addSubtask() { setSubtasks(prev => [...prev, '']) }
  function updateSubtask(i: number, v: string) { setSubtasks(prev => prev.map((s, idx) => idx === i ? v : s)) }
  function removeSubtask(i: number) { setSubtasks(prev => prev.filter((_, idx) => idx !== i)) }

  async function handleSubmit() {
    if (!title.trim()) return setError('Title is required')
    if (type === 'task' && !assigneeId) return setError('Assignee is required')
    if (type === 'task' && !reviewerId) return setError('Reviewer is required')

    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        status_id: statusId,
        assignee: assigneeId,
        reviewer_id: reviewerId,
        priority,
        start_date: startDate || null,
        end_date: endDate || null,
        parent_id: type === 'task' ? parentId : null,
        created_by: currentUser?.id,
        type,
      })
      .select('id')
      .single()

    if (taskError || !task) {
      setError('Failed to create')
      setLoading(false)
      return
    }

    const validSubtasks = subtasks.filter(s => s.trim())
    if (validSubtasks.length > 0) {
      await supabase.from('subtasks').insert(
        validSubtasks.map((title, position) => ({
          task_id: task.id, title: title.trim(), is_done: false, position,
        }))
      )
    }

    setLoading(false)
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-sq-card rounded-xl w-200 max-h-[90vh] overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex flex-col gap-2 flex-1 min-w-0">

            {/* Type toggle */}
            <div className="flex items-center gap-1 bg-sq-col rounded-lg p-1 w-fit">
              <button
                onClick={() => { setType('story'); setParentId('') }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  type === 'story' ? 'bg-sq-accent text-white' : 'text-sq-muted hover:text-white'
                }`}
              >
                <IconBooks size={13} /> Story
              </button>
              <button
                onClick={() => setType('task')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  type === 'task' ? 'bg-sq-accent text-white' : 'text-sq-muted hover:text-white'
                }`}
              >
                <IconClipboard size={13} /> Task
              </button>
            </div>

            <div className="flex items-center gap-3">
              {type === 'story'
                ? <IconBooks size={24} className="text-sq-accent shrink-0" />
                : <IconClipboard size={24} className="text-sq-task-icon shrink-0" />
              }
              <input
                type="text"
                placeholder={type === 'story' ? 'Story title...' : 'Task title...'}
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="bg-transparent text-white font-bold text-2xl outline-none placeholder:text-sq-muted w-full"
              />
            </div>

            {type === 'task' && parentId && (
              <span className="text-sq-muted text-sm ml-9">
                ↳ {stories.find(s => s.id === parentId)?.title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-4">
            <select
              value={statusId}
              onChange={e => setStatusId(e.target.value)}
              className="appearance-none px-3 py-1 rounded text-white text-sm font-medium cursor-pointer outline-none"
              style={{ backgroundColor: activeStatus?.color ?? '#6272a4' }}
            >
              {statuses.filter(s => s.label !== 'Request').map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <button onClick={onClose} className="text-sq-muted hover:text-white transition-colors">
              <IconX size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        {type === 'story' ? (

          /* STORY — simple layout */
          <div className="px-6 pb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-white font-semibold text-base">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this story about?"
                rows={3}
                className="bg-sq-col border border-sq-muted rounded text-white text-sm p-3 outline-none resize-none placeholder:text-sq-muted"
              />
            </div>
            {error && <p className="text-sq-danger text-sm">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-sq-accent text-white text-sm font-semibold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Story'}
              </button>
              <button
                onClick={onClose}
                className="border border-sq-muted text-sq-muted text-sm px-6 py-2 rounded-lg hover:text-white hover:border-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

        ) : (

          /* TASK — full two-column layout */
          <div className="flex flex-1 min-h-0">

            {/* LEFT */}
            <div className="flex-1 px-6 pb-6 flex flex-col gap-6 overflow-y-auto">

              <div className="flex flex-col gap-2">
                <label className="text-white font-semibold text-base">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the task..."
                  rows={3}
                  className="bg-sq-col border border-sq-muted rounded text-white text-sm p-3 outline-none resize-none placeholder:text-sq-muted"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-white font-semibold text-base">Subtasks</label>
                <div className="flex flex-col gap-1">
                  {subtasks.map((sub, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={sub}
                        onChange={e => updateSubtask(i, e.target.value)}
                        placeholder={`Subtask ${i + 1}`}
                        className="flex-1 bg-sq-col border border-sq-muted rounded text-white text-sm px-3 py-2 outline-none placeholder:text-sq-muted"
                      />
                      {subtasks.length > 1 && (
                        <button onClick={() => removeSubtask(i)} className="text-sq-muted hover:text-sq-danger transition-colors">
                          <IconTrash size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addSubtask}
                  className="flex items-center gap-1 text-sq-muted hover:text-white text-xs transition-colors w-fit"
                >
                  <IconPlus size={14} /> Add subtask
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-white font-semibold text-base">Story</label>
                <select
                  value={parentId}
                  onChange={e => setParentId(e.target.value)}
                  className="bg-sq-col border border-sq-muted rounded text-white text-sm px-3 py-2 outline-none"
                >
                  <option value="">Select a story...</option>
                  {stories.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

              {error && <p className="text-sq-danger text-sm">{error}</p>}
            </div>

            {/* RIGHT sidebar */}
            <div className="w-56 bg-sq-col rounded-br-xl p-4 flex flex-col gap-4 shrink-0">

              <div className="flex flex-col gap-1">
                <label className="text-white text-sm font-medium">Assignee</label>
                <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
                  className="bg-sq-card border border-sq-muted rounded text-white text-sm px-2 py-2 outline-none">
                  <option value="">Select...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-white text-sm font-medium">Priority</label>
                <select value={priority} onChange={e => setPriority(Number(e.target.value))}
                  className="bg-sq-card border border-sq-muted rounded text-white text-sm px-2 py-2 outline-none">
                  {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-white text-sm font-medium">Reviewer</label>
                <select value={reviewerId} onChange={e => setReviewerId(e.target.value)}
                  className="bg-sq-card border border-sq-muted rounded text-white text-sm px-2 py-2 outline-none">
                  <option value="">Select...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-white text-sm font-medium">Period</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="bg-sq-card border border-sq-muted rounded text-white text-sm px-2 py-2 outline-none" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="bg-sq-card border border-sq-muted rounded text-white text-sm px-2 py-2 outline-none" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-white text-sm font-medium">Creator</label>
                <span className="text-white text-xs">{currentUser?.full_name ?? '—'}</span>
              </div>

              <div className="mt-auto pt-4 flex flex-col gap-2">
                <button onClick={handleSubmit} disabled={loading}
                  className="w-full bg-sq-accent text-white text-sm font-semibold py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create Task'}
                </button>
                <button onClick={onClose}
                  className="w-full border border-sq-muted text-sq-muted text-sm py-2 rounded-lg hover:text-white hover:border-white transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
