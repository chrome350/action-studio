begin;
create schema if not exists gallery_private;
revoke all on schema gallery_private from public, anon, authenticated;
create table if not exists gallery_private.settings(id boolean primary key default true check(id), phase text not null default 'upload' check(phase in ('upload','voting','words','results')), liked boolean not null default false, words boolean not null default false);
insert into gallery_private.settings(id) values(true) on conflict do nothing;
create table if not exists gallery_private.admins(email text primary key);
-- Set the administrator separately in the SQL Editor; do not commit personal emails.
create table if not exists gallery_private.people(id uuid primary key references auth.users(id), created_at timestamptz not null default now());
create table if not exists gallery_private.works(id uuid primary key default gen_random_uuid(), person uuid not null references auth.users(id), path text unique not null, title text not null default 'Изображение', author text not null default 'Участник', status text not null default 'pending' check(status in ('pending','approved','rejected')), created_at timestamptz not null default now());
create table if not exists gallery_private.votes(person uuid references auth.users(id), work uuid references gallery_private.works(id) on delete cascade, primary key(person,work));
create table if not exists gallery_private.words(id uuid primary key default gen_random_uuid(), person uuid not null references auth.users(id), text text not null check(char_length(text) between 1 and 100), status text not null default 'pending' check(status in ('pending','approved','rejected')), created_at timestamptz not null default now());
-- Update the limit for existing installations as well.
alter table gallery_private.words drop constraint if exists words_text_check;
alter table gallery_private.words add constraint words_text_check check(char_length(text) between 1 and 100);
alter table gallery_private.settings enable row level security;
alter table gallery_private.admins enable row level security;
alter table gallery_private.people enable row level security;
alter table gallery_private.works enable row level security;
alter table gallery_private.votes enable row level security;
alter table gallery_private.words enable row level security;
create or replace function public.gallery_is_admin() returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from gallery_private.admins a join auth.users u on lower(u.email)=lower(a.email) where u.id=auth.uid() and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false));
$$;
create or replace function public.gallery_can_upload() returns boolean language sql stable security definer set search_path='' as $$
select auth.uid() is not null and (select phase='upload' from gallery_private.settings) and (select count(*)<20 from storage.objects where bucket_id='gallery' and owner_id=auth.uid()::text);
$$;
create or replace function public.gallery_can_read(p_path text) returns boolean language sql stable security definer set search_path='' as $$
select public.gallery_is_admin() or exists(select 1 from gallery_private.works where path=p_path and (status='approved' or person=auth.uid()));
$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('gallery','gallery',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy gallery_upload on storage.objects for insert to authenticated with check(bucket_id='gallery' and (storage.foldername(name))[1]=auth.uid()::text and public.gallery_can_upload());
create policy gallery_read on storage.objects for select to authenticated using(bucket_id='gallery' and public.gallery_can_read(name));
create or replace function public.gallery_api(action text, payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); cfg gallery_private.settings; wid uuid; answer text; result jsonb; st text;
begin
 if uid is null then raise exception 'Войдите в галерею заново'; end if;
 insert into gallery_private.people(id) values(uid) on conflict do nothing;
 -- All mutations lock the session first; votes additionally serialize per participant.
 if action in ('state','admin','join') then select * into cfg from gallery_private.settings;
 else select * into cfg from gallery_private.settings for update; end if;
 if action='join' then return jsonb_build_object('token',uid); end if;
 if action='state' then
  return jsonb_build_object('settings',to_jsonb(cfg),'works',coalesce((select jsonb_agg(to_jsonb(w)||jsonb_build_object('likes',(select count(*) from gallery_private.votes v where v.work=w.id)) order by w.created_at) from gallery_private.works w where w.status='approved'),'[]'::jsonb),'votes',coalesce((select jsonb_agg(work) from gallery_private.votes where person=uid),'[]'::jsonb),'mine',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'status',status)) from gallery_private.works where person=uid),'[]'::jsonb),'words',coalesce((select jsonb_agg(jsonb_build_object('id',id,'text',text)) from gallery_private.words where status='approved' and cfg.words),'[]'::jsonb));
 end if;
 if action='submit' then
  if cfg.phase<>'upload' then raise exception 'Приём работ завершён'; end if;
  if not exists(select 1 from storage.objects where bucket_id='gallery' and name=payload->>'path' and owner_id=uid::text) then raise exception 'Изображение не загружено'; end if;
  insert into gallery_private.works(person,path) values(uid,payload->>'path') on conflict(path) do nothing;
 elsif action='vote' then
  if cfg.phase<>'voting' then raise exception 'Голосование сейчас закрыто'; end if;
  perform 1 from gallery_private.people where id=uid for update;
  wid:=(payload->>'id')::uuid;
  if not exists(select 1 from gallery_private.works where id=wid and status='approved') then raise exception 'Работа недоступна'; end if;
  if coalesce((payload->>'liked')::boolean,false) then
   if not exists(select 1 from gallery_private.votes where person=uid and work=wid) then
    if (select count(*) from gallery_private.votes where person=uid)>=3 then raise exception 'Можно выбрать только три работы'; end if;
    insert into gallery_private.votes values(uid,wid);
   end if;
  else delete from gallery_private.votes where person=uid and work=wid; end if;
 elsif action='words' then
  if cfg.phase<>'words' then raise exception 'Сбор впечатлений сейчас закрыт'; end if;
  answer:=trim(regexp_replace(coalesce(payload->>'text',''),'\s+',' ','g'));
  if char_length(answer) not between 1 and 100 then raise exception 'Напишите от 1 до 100 символов.'; end if;
  if (select count(*) from gallery_private.words where person=uid)>=20 then raise exception 'Вы уже отправили 20 ответов'; end if;
  insert into gallery_private.words(person,text) values(uid,answer);
 elsif action like 'admin%' then
  if not public.gallery_is_admin() then raise exception 'Нет доступа к админке'; end if;
  if action='admin' then
   return jsonb_build_object('participants',(select count(*) from gallery_private.people),'works',coalesce((select jsonb_agg(to_jsonb(w)||jsonb_build_object('likes',(select count(*) from gallery_private.votes v where v.work=w.id)) order by w.created_at) from gallery_private.works w),'[]'::jsonb),'words',coalesce((select jsonb_agg(jsonb_build_object('id',id,'text',text,'status',status) order by created_at) from gallery_private.words),'[]'::jsonb));
  elsif action='admin/settings' then
   update gallery_private.settings set phase=coalesce(payload->>'phase',phase),liked=coalesce((payload->>'liked')::boolean,liked),words=coalesce((payload->>'words')::boolean,words) where id=true;
  elsif action in ('admin/moderate','admin/moderate-word') then
   st:=payload->>'status'; wid:=(payload->>'id')::uuid;
   if st not in ('pending','approved','rejected') or st is null then raise exception 'Неизвестный статус'; end if;
   if action='admin/moderate' then
    update gallery_private.works set status=st where id=wid;
    if st<>'approved' then delete from gallery_private.votes where work=wid; end if;
   else update gallery_private.words set status=st where id=wid; end if;
  else raise exception 'Неизвестное действие'; end if;
 else raise exception 'Неизвестное действие'; end if;
 return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.gallery_api(text,jsonb),public.gallery_is_admin(),public.gallery_can_upload(),public.gallery_can_read(text) from public,anon;
grant execute on function public.gallery_api(text,jsonb),public.gallery_is_admin(),public.gallery_can_upload(),public.gallery_can_read(text) to authenticated;
commit;
