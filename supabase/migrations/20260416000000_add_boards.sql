-- ============================================================================
-- BOARDS
-- Each board belongs to one team. Tasks can belong to multiple boards.
-- ============================================================================

create table public.boards (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  color text not null default '#6272a4',
  team_id uuid references public.teams(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

-- Join table: a task can belong to multiple boards
create table public.task_boards (
  task_id uuid references public.tasks(id) on delete cascade not null,
  board_id uuid references public.boards(id) on delete cascade not null,
  primary key (task_id, board_id)
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.boards enable row level security;
alter table public.task_boards enable row level security;

create policy "Anyone can view boards" on public.boards
  for select to authenticated using (true);

create policy "Admins and leads can manage boards" on public.boards
  for all to authenticated using (public.current_user_role() in ('admin', 'lead'));

create policy "Anyone can view task boards" on public.task_boards
  for select to authenticated using (true);

create policy "Authenticated users can manage task boards" on public.task_boards
  for all to authenticated using (true);

-- ============================================================================
-- INDEXES
-- ============================================================================
create index idx_boards_team_id on public.boards(team_id);
create index idx_task_boards_task_id on public.task_boards(task_id);
create index idx_task_boards_board_id on public.task_boards(board_id);