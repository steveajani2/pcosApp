-- Run this in your Supabase project SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run)
--
-- These tables store AI companion conversation history per user.

-- AI CONVERSATIONS
create table if not exists public.ai_conversations (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  title       text not null default 'New Conversation',
  created_at  timestamptz not null default now()
);

alter table public.ai_conversations enable row level security;

create policy "own ai conversations"
  on public.ai_conversations for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- AI MESSAGES
create table if not exists public.ai_messages (
  id              uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.ai_conversations(id) on delete cascade not null,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  created_at      timestamptz not null default now()
);

alter table public.ai_messages enable row level security;

create policy "own ai messages"
  on public.ai_messages for all
  using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );
