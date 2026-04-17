insert into public.tasks (title, status_id, assignee, created_by, priority, version)
select
  t.title,
  s.id,
  u.id,
  u.id,
  t.priority,
  1
from (values
  ('Rigging main character', 'To Do', 2),
  ('Moving main character', 'Doing', 1),
  ('UI sound effects', 'Review', 3)
) as t(title, status_label, priority)
join public.statuses s on s.label = t.status_label
cross join (select id from public.users limit 1) u;