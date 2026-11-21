-- Mesa War Room: database schema (Supabase / Postgres).
-- Structure and functions only. No data and no secrets.
-- After running, set the sync secret (same value as SYNC_SECRET in Vercel):
--   insert into app.config(key, value) values ('sync_secret', '<your secret>');

create extension if not exists pgcrypto with schema extensions;
create schema if not exists app;

create table if not exists app.config (key text primary key, value text not null);

create table if not exists public.subjects (
  slug text primary key, name text not null, prof text, nexus_course_id uuid, exam_date date, deadline_note text,
  format text, portions text, marks integer, mrs_weight text, drill_type text not null default 'mcq', sec_per_q integer,
  rubric text, sort integer default 0, exam_when text
);
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(), email text not null unique, name text not null, pass_hash text not null,
  created_at timestamptz default now(), last_seen timestamptz, google_sub text unique
);
create table if not exists public.sessions (
  token_hash text primary key, user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now(), expires_at timestamptz default (now() + interval '30 days')
);
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(), subject_slug text not null references public.subjects(slug),
  source text not null, source_id text unique, title text not null, session_no integer, kind text, url text, content text,
  added_by uuid references public.users(id) on delete set null, created_at timestamptz default now(), updated_at timestamptz default now(),
  fts tsvector generated always as (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))) stored
);
create index if not exists materials_fts_idx on public.materials using gin (fts);
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  subject_slug text not null references public.subjects(slug), mode text not null, score numeric, max_score numeric,
  detail jsonb, created_at timestamptz default now()
);
create table if not exists public.events (
  id bigserial primary key, user_id uuid not null references public.users(id) on delete cascade,
  subject_slug text references public.subjects(slug), type text not null, created_at timestamptz default now()
);
create table if not exists public.sync_log (id bigserial primary key, source text, status text, detail text, created_at timestamptz default now());

-- Row level security on, no policies: tables are reachable only through the SECURITY DEFINER functions below.
alter table public.subjects enable row level security;
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.materials enable row level security;
alter table public.attempts enable row level security;
alter table public.events enable row level security;
alter table public.sync_log enable row level security;

CREATE OR REPLACE FUNCTION app.check_secret(p_secret text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
begin
  if not exists (select 1 from app.config where key = 'sync_secret' and value = p_secret) then raise exception 'unauthorized'; end if;
end $function$;

CREATE OR REPLACE FUNCTION app.uid(p_token text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $function$
declare v uuid;
begin
  select user_id into v from public.sessions where token_hash = encode(digest(coalesce(p_token,''), 'sha256'), 'hex') and expires_at > now();
  if v is null then raise exception 'unauthorized'; end if;
  update public.users set last_seen = now() where id = v;
  return v;
end $function$;

-- Sign-in is Google-only (Mesa Workspace accounts). Password functions are permanently disabled.
CREATE OR REPLACE FUNCTION public.wr_register(p_email text, p_password text, p_name text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
begin raise exception 'Sign in with your Mesa Google account.'; end $function$;
CREATE OR REPLACE FUNCTION public.wr_login(p_email text, p_password text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
begin raise exception 'Sign in with your Mesa Google account.'; end $function$;

CREATE OR REPLACE FUNCTION public.wr_google_login(p_secret text, p_email text, p_name text, p_sub text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $function$
declare v_email text := lower(trim(coalesce(p_email,''))); v_id uuid; v_name text; v_token text;
begin
  perform app.check_secret(p_secret);
  if v_email !~ '^[a-z0-9._%+-]+@([a-z0-9-]+\.)*mesaschool\.co$' then raise exception 'not_mesa'; end if;
  if coalesce(p_sub,'') = '' then raise exception 'bad_google'; end if;
  select id, name into v_id, v_name from users where google_sub = p_sub or email = v_email order by (google_sub = p_sub) desc nulls last limit 1;
  if v_id is null then
    insert into users(email, name, pass_hash, google_sub)
    values (v_email, coalesce(nullif(trim(p_name),''), split_part(v_email,'@',1)), crypt(encode(gen_random_bytes(24),'hex'), gen_salt('bf')), p_sub)
    returning id, name into v_id, v_name;
    insert into events(user_id, type) values (v_id, 'joined');
  else
    update users set google_sub = p_sub, email = v_email where id = v_id;
  end if;
  v_token := encode(gen_random_bytes(32), 'hex');
  insert into sessions(token_hash, user_id) values (encode(digest(v_token,'sha256'),'hex'), v_id);
  return json_build_object('token', v_token, 'name', v_name, 'email', v_email);
end $function$;

CREATE OR REPLACE FUNCTION public.wr_logout(p_token text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $function$
  delete from sessions where token_hash = encode(digest(coalesce(p_token,''),'sha256'),'hex');
$function$;

CREATE OR REPLACE FUNCTION public.wr_me(p_token text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare v uuid := app.uid(p_token);
begin return (select json_build_object('id', id, 'name', name, 'email', email) from users where id = v); end $function$;

CREATE OR REPLACE FUNCTION public.wr_dashboard(p_token text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare v uuid := app.uid(p_token);
        v_today timestamptz := date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
begin
  return json_build_object(
    'subjects', (select coalesce(json_agg(row_to_json(t) order by t.sort), '[]'::json) from (
      select s.*,
        (select count(*) from materials m where m.subject_slug = s.slug) as material_count,
        (select count(*) from attempts a where a.subject_slug = s.slug and a.user_id = v) as my_attempts,
        (select round(avg(x.pct)) from (select a.score / nullif(a.max_score,0) * 100 as pct from attempts a
            where a.subject_slug = s.slug and a.user_id = v and a.max_score > 0 order by a.created_at desc limit 5) x) as my_readiness,
        (select round(avg(x.pct)) from (select a.score / nullif(a.max_score,0) * 100 as pct from attempts a
            where a.subject_slug = s.slug and a.max_score > 0 and a.created_at > now() - interval '7 days') x) as cohort_avg,
        (select count(*) from attempts a where a.subject_slug = s.slug and a.created_at >= v_today) as cohort_attempts_today
      from subjects s) t),
    'new_materials', (select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
      select m.id, m.title, m.subject_slug, m.source, m.created_at from materials m order by m.created_at desc limit 8) t),
    'cohort', json_build_object(
      'members', (select count(*) from users),
      'active_today', (select count(distinct user_id) from events where created_at >= v_today),
      'online_now', (select count(*) from users where last_seen > now() - interval '10 minutes')),
    'feed', (select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
      select split_part(u.name, ' ', 1) as who, e.type, e.subject_slug, e.created_at
      from events e join users u on u.id = e.user_id order by e.created_at desc limit 15) t),
    'last_sync', (select row_to_json(t) from (select source, status, detail, created_at from sync_log order by id desc limit 1) t)
  );
end $function$;

CREATE OR REPLACE FUNCTION public.wr_subject(p_token text, p_slug text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare v uuid := app.uid(p_token);
begin
  if not exists (select 1 from subjects where slug = p_slug) then raise exception 'Unknown subject'; end if;
  return json_build_object(
    'subject', (select row_to_json(s) from subjects s where slug = p_slug),
    'materials', (select coalesce(json_agg(row_to_json(t) order by t.session_no nulls last, t.created_at), '[]'::json) from (
       select m.id, m.title, m.source, m.session_no, m.kind, m.url, m.created_at,
              coalesce(length(m.content), 0) as chars, split_part(u.name,' ',1) as added_by
       from materials m left join users u on u.id = m.added_by where m.subject_slug = p_slug) t),
    'attempts', (select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
       select id, mode, score, max_score, created_at from attempts
       where user_id = v and subject_slug = p_slug order by created_at desc limit 20) t));
end $function$;

CREATE OR REPLACE FUNCTION public.wr_library(p_token text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare v uuid := app.uid(p_token);
begin
  return json_build_object(
    'subjects', (select coalesce(json_agg(json_build_object('slug', slug, 'name', name) order by sort), '[]'::json) from subjects),
    'items', (select coalesce(json_agg(row_to_json(t) order by t.sort, t.session_no nulls last, t.title), '[]'::json) from (
      select m.id, m.subject_slug, s.name as subject_name, s.sort, m.title, m.session_no, m.kind, m.source, m.url,
             coalesce(length(m.content), 0) as chars, split_part(u.name, ' ', 1) as added_by, m.created_at
      from materials m join subjects s on s.slug = m.subject_slug left join users u on u.id = m.added_by) t));
end $function$;

CREATE OR REPLACE FUNCTION public.wr_material(p_token text, p_id uuid) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare v uuid := app.uid(p_token);
begin
  return (select json_build_object('id', m.id, 'title', m.title, 'subject_slug', m.subject_slug, 'source', m.source,
     'session_no', m.session_no, 'kind', m.kind, 'url', m.url, 'content', m.content, 'created_at', m.created_at,
     'added_by', split_part(u.name, ' ', 1))
     from materials m left join users u on u.id = m.added_by where m.id = p_id);
end $function$;

CREATE OR REPLACE FUNCTION public.wr_search(p_token text, p_slug text, p_q text, p_limit integer DEFAULT 6) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare v uuid := app.uid(p_token); r json;
  n int := case when coalesce(p_limit,6) >= 8 then 12 else least(coalesce(p_limit,6), 12) end; -- drills (8) read up to 12 sources
begin
  select coalesce(json_agg(row_to_json(t)), '[]'::json) into r from (
    select m.id, m.title, m.session_no, m.url, left(m.content, 12000) as content from materials m
    where m.subject_slug = p_slug and m.content is not null and length(m.content) > 40
      and m.fts @@ websearch_to_tsquery('english', coalesce(p_q,''))
    order by ts_rank(m.fts, websearch_to_tsquery('english', coalesce(p_q,''))) desc limit n) t;
  if json_array_length(r) = 0 then
    select coalesce(json_agg(row_to_json(t)), '[]'::json) into r from (
      select m.id, m.title, m.session_no, m.url, left(m.content, 12000) as content from materials m
      where m.subject_slug = p_slug and m.content is not null and length(m.content) > 40
      order by m.session_no nulls last, m.created_at desc limit n) t;
  end if;
  return r;
end $function$;

CREATE OR REPLACE FUNCTION public.wr_add_material(p_token text, p_slug text, p_title text, p_session integer, p_content text, p_url text DEFAULT NULL::text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare v uuid := app.uid(p_token); v_id uuid;
begin
  if length(trim(coalesce(p_title,''))) < 3 then raise exception 'Add a title'; end if;
  if length(coalesce(p_content,'')) < 40 and coalesce(p_url,'') = '' then raise exception 'Paste the notes (at least a few lines) or a link'; end if;
  if length(coalesce(p_content,'')) > 200000 then raise exception 'Notes are too long (max ~200k characters)'; end if;
  insert into materials(subject_slug, source, title, session_no, kind, url, content, added_by)
  values (p_slug, 'user', trim(p_title), p_session, 'notes', nullif(trim(coalesce(p_url,'')),''), p_content, v) returning id into v_id;
  insert into events(user_id, subject_slug, type) values (v, p_slug, 'added notes');
  return json_build_object('id', v_id);
end $function$;

CREATE OR REPLACE FUNCTION public.wr_record_attempt(p_token text, p_slug text, p_mode text, p_score numeric, p_max numeric, p_detail jsonb) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare v uuid := app.uid(p_token); v_id uuid;
begin
  insert into attempts(user_id, subject_slug, mode, score, max_score, detail) values (v, p_slug, p_mode, p_score, p_max, p_detail) returning id into v_id;
  insert into events(user_id, subject_slug, type) values (v, p_slug, 'finished a ' || p_mode);
  return json_build_object('id', v_id);
end $function$;

CREATE OR REPLACE FUNCTION public.wr_log_event(p_token text, p_slug text, p_type text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare v uuid := app.uid(p_token);
begin
  if exists (select 1 from events where user_id = v and coalesce(subject_slug,'') = coalesce(p_slug,'') and type = p_type
             and created_at > now() - interval '15 minutes') then return; end if;
  insert into events(user_id, subject_slug, type) values (v, p_slug, left(p_type, 60));
end $function$;

CREATE OR REPLACE FUNCTION public.wr_sync_subjects(p_secret text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
begin
  perform app.check_secret(p_secret);
  return (select coalesce(json_agg(json_build_object('slug', slug, 'nexus_course_id', nexus_course_id)), '[]'::json) from subjects);
end $function$;

CREATE OR REPLACE FUNCTION public.wr_sync_upsert(p_secret text, p_items jsonb) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare it jsonb; n_new int := 0; n_upd int := 0; ins boolean;
begin
  perform app.check_secret(p_secret);
  for it in select * from jsonb_array_elements(p_items) loop
    insert into materials(subject_slug, source, source_id, title, session_no, kind, url, content)
    values (it->>'subject_slug', it->>'source', it->>'source_id', it->>'title', nullif(it->>'session_no','')::int, it->>'kind', it->>'url', it->>'content')
    on conflict (source_id) do update set
      title = excluded.title, session_no = excluded.session_no, kind = excluded.kind, url = excluded.url,
      content = coalesce(excluded.content, materials.content),
      updated_at = case when materials.content is distinct from coalesce(excluded.content, materials.content)
                          or materials.title is distinct from excluded.title then now() else materials.updated_at end
    returning (xmax = 0) into ins;
    if ins then n_new := n_new + 1; else n_upd := n_upd + 1; end if;
  end loop;
  return json_build_object('new', n_new, 'seen', n_upd);
end $function$;

CREATE OR REPLACE FUNCTION public.wr_sync_log(p_secret text, p_source text, p_status text, p_detail text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
begin
  perform app.check_secret(p_secret);
  insert into sync_log(source, status, detail) values (p_source, p_status, left(p_detail, 2000));
end $function$;

-- Only the anon role (used by the app server) may call the functions.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'wr\_%' loop
    execute format('revoke execute on function %s from public, authenticated', f.sig);
    execute format('grant execute on function %s to anon', f.sig);
  end loop;
end $$;
