'use client'

import { IconSearch, IconAdjustmentsHorizontal, IconClipboard, IconSubtask, IconFlame, IconMessage, IconClock, IconPlus, IconX } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import TaskModal from '@/components/task-modal'
import TaskDetailModal from '@/components/task-detail-modal'

type Status = {
  id: string
  label: string
  color: string
  position: number
}

type Task = {
  id: string
  title: string
  description: string | null
  version: number
  priority: number
  status_id: string
  needs_acceptance: boolean
  start_date: string | null
  subtasks: { count: number }[]
  comments: { count: number }[]
  task_boards: { board: { name: string, color: string } }[]
}

const PRIORITY_LABELS: Record<number, string> = {
  0: 'None', 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical',
}

function timeElapsed(startDate: string | null): string {
  if (!startDate) return ''
  const days = Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000)
  const weeks = Math.floor(days / 7)
  const rem = days % 7
  if (weeks === 0) return `${days}d`
  if (rem === 0) return `${weeks}w`
  return `${weeks}w ${rem}d`
}

const TASK_SELECT = 'id, title, description, version, priority, status_id, needs_acceptance, start_date, subtasks(count), comments(count), task_boards(board:boards(name, color))'

export default function BoardPage() {
  const [statuses, setStatuses]             = useState<Status[]>([])
  const [tasks, setTasks]                   = useState<Task[]>([])
  const [showModal, setShowModal]           = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)

  // Search & filter
  const [search, setSearch]                       = useState('')
  const [showFilter, setShowFilter]               = useState(false)
  const [filterPriorities, setFilterPriorities]   = useState<Set<number>>(new Set())
  const [filterBoards, setFilterBoards]           = useState<Set<string>>(new Set())
  const filterRef = useRef<HTMLDivElement>(null)

  async function fetchTasks() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('tasks').select(TASK_SELECT).eq('assignee', user.id)
    if (data) setTasks(data as unknown as Task[])
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.from('statuses').select('*').order('position')
      .then(({ data }) => { if (data) setStatuses(data) })
    fetchTasks()
  }, [])

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleDrop(e: React.DragEvent, statusId: string) {
    e.preventDefault()
    setDragOverStatus(null)
    const taskId = e.dataTransfer.getData('taskId')
    if (!taskId) return
    const supabase = createClient()
    await supabase.from('tasks').update({ status_id: statusId }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status_id: statusId } : t))
  }

  function togglePriority(p: number) {
    setFilterPriorities(prev => {
      const next = new Set(prev)
      next.has(p) ? next.delete(p) : next.add(p)
      return next
    })
  }

  function toggleBoard(name: string) {
    setFilterBoards(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function clearFilters() {
    setFilterPriorities(new Set())
    setFilterBoards(new Set())
    setSearch('')
  }

  // All unique board names across tasks
  const allBoards = Array.from(
    new Set(tasks.flatMap(t => t.task_boards.map(tb => tb.board.name)))
  )

  // Apply search + filters
  const filteredTasks = tasks.filter(task => {
    if (search && !task.title.toLowerCase().includes(search.toLowerCase()) &&
        !task.description?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterPriorities.size > 0 && !filterPriorities.has(task.priority)) return false
    if (filterBoards.size > 0 && !task.task_boards.some(tb => filterBoards.has(tb.board.name))) return false
    return true
  })

  const hasActiveFilters = filterPriorities.size > 0 || filterBoards.size > 0

  const requestStatus   = statuses.find(s => s.label === 'Request')
  const visibleStatuses = statuses.filter(s => s.label !== 'Request' && s.label !== 'Done')

  return (
    <div className="flex flex-col h-full">
      {/* TOOLBAR */}
      <div className="flex items-center gap-6 mb-6">

        {/* Search */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-sq-nav-inactive w-72">
          <IconSearch size={18} className="text-sq-nav-inactive" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-white placeholder:text-sq-nav-inactive text-sm outline-none w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-sq-muted hover:text-white transition-colors">
              <IconX size={14} />
            </button>
          )}
        </div>

        {/* Avatars */}
        <div className="flex items-center">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="w-8 h-8 rounded-full bg-sq-nav-inactive border-2 border-sq-bg -ml-2 first:ml-0" />
          ))}
        </div>

        {/* Filter */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilter(prev => !prev)}
            className={`flex items-center gap-2 transition-colors ${hasActiveFilters ? 'text-sq-accent' : 'text-sq-nav-inactive hover:text-white'}`}
          >
            <IconAdjustmentsHorizontal size={18} />
            <span className="text-sm">Filter</span>
            {hasActiveFilters && (
              <span className="bg-sq-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                {filterPriorities.size + filterBoards.size}
              </span>
            )}
          </button>

          {/* Filter dropdown */}
          {showFilter && (
            <div className="absolute top-10 left-0 z-40 bg-sq-col border border-sq-muted rounded-xl p-4 w-64 flex flex-col gap-4 shadow-xl">

              {/* Priority */}
              <div className="flex flex-col gap-2">
                <span className="text-white text-sm font-semibold">Priority</span>
                <div className="flex flex-col gap-1">
                  {Object.entries(PRIORITY_LABELS).map(([val, label]) => {
                    const p = Number(val)
                    const active = filterPriorities.has(p)
                    return (
                      <button
                        key={val}
                        onClick={() => togglePriority(p)}
                        className={`flex items-center gap-2 px-2 py-1 rounded text-sm text-left transition-colors ${
                          active ? 'bg-sq-accent text-white' : 'text-sq-nav-inactive hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Boards */}
              {allBoards.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-white text-sm font-semibold">Board</span>
                  <div className="flex flex-col gap-1">
                    {allBoards.map(name => {
                      const active = filterBoards.has(name)
                      return (
                        <button
                          key={name}
                          onClick={() => toggleBoard(name)}
                          className={`flex items-center gap-2 px-2 py-1 rounded text-sm text-left transition-colors ${
                            active ? 'bg-sq-accent text-white' : 'text-sq-nav-inactive hover:text-white'
                          }`}
                        >
                          {name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Clear */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sq-muted hover:text-white text-xs transition-colors text-left"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-sq-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity ml-auto"
        >
          <IconPlus size={16} />
          Create
        </button>
      </div>

      {/* KANBAN COLUMNS */}
      <div className="flex gap-4 items-start flex-1 overflow-x-auto">
        {visibleStatuses.map(status => {
          const columnTasks = (status.label === 'To Do'
            ? filteredTasks.filter(t => t.status_id === status.id || t.status_id === requestStatus?.id)
            : filteredTasks.filter(t => t.status_id === status.id))

          const isOver = dragOverStatus === status.id

          return (
            <div
              key={status.id}
              onDragOver={e => { e.preventDefault(); setDragOverStatus(status.id) }}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={e => handleDrop(e, status.id)}
              className={`flex-1 min-w-56 bg-sq-col rounded-xl p-4 flex flex-col gap-3 transition-all ${isOver ? 'ring-2 ring-sq-accent' : ''}`}
            >
              {/* Column header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: status.color }} />
                  <span className="text-white font-semibold text-base">{status.label}</span>
                </div>
                <div className="flex items-center gap-1 bg-sq-card px-3 py-0.5 rounded-full">
                  <span className="text-sq-nav-inactive text-xs font-medium">Task {columnTasks.length}</span>
                </div>
              </div>

              {/* Task cards */}
              {columnTasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('taskId', task.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="bg-sq-card rounded-xl p-3 flex flex-col gap-3 cursor-grab active:cursor-grabbing hover:brightness-110 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <IconClipboard size={18} className="text-sq-task-icon shrink-0 mt-0.5" />
                      <span className="text-white font-semibold text-sm leading-tight">{task.title}</span>
                    </div>
                    <span className="text-sq-muted text-xs shrink-0">Ver {task.version}</span>
                  </div>

                  {task.description && (
                    <p className="text-sq-nav-inactive text-xs leading-relaxed line-clamp-2 pl-6">
                      {task.description}
                    </p>
                  )}

                  {task.status_id === requestStatus?.id && (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button className="flex-1 text-xs py-1 rounded-lg bg-sq-accent text-white font-semibold">Accept</button>
                      <button className="flex-1 text-xs py-1 rounded-lg border border-sq-muted text-sq-muted font-semibold">Reject</button>
                    </div>
                  )}

                  {task.start_date && (
                    <div className="flex items-center gap-2">
                      <IconClock size={14} className="text-sq-muted" />
                      <span className="text-sq-nav-inactive text-xs">{timeElapsed(task.start_date)}</span>
                    </div>
                  )}

                  {task.task_boards.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {task.task_boards.map((tb, i) => (
                        <div key={i} className="h-5 px-2 rounded-full flex items-center" style={{ backgroundColor: tb.board.color }}>
                          <span className="text-white text-xs font-medium">{tb.board.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="w-5 h-5 rounded-full bg-sq-nav-inactive border-2 border-sq-card -ml-1.5 first:ml-0" />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-sq-muted text-xs">
                      <div className="flex items-center gap-1">
                        <IconMessage size={13} />
                        <span>{task.comments[0]?.count ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <IconSubtask size={13} />
                        <span>{task.subtasks[0]?.count ?? 0}</span>
                      </div>
                      {task.priority >= 3 && <IconFlame size={14} className="text-sq-danger" />}
                    </div>
                  </div>

                </div>
              ))}

            </div>
          )
        })}
      </div>

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={fetchTasks}
        />
      )}

      {showModal && (
        <TaskModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchTasks() }}
        />
      )}
    </div>
  )
}
