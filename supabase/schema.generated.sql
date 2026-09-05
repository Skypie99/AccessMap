-- GENERATED FILE — DO NOT EDIT BY HAND.
--
-- Produced by: node scripts/replay-migrations.mjs --with-next --local-only --dump
-- Source: 71 immutable applied migrations plus five forward candidates.
-- This is a deterministic REFERENCE SNAPSHOT, not an apply script,
-- migration history, or proof of current production state.
-- Privileges and owners are excluded; compare.sql covers grants.
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.11 (Homebrew)
-- Dumped by pg_dump version 17.11 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: private; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA private;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: feedback_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.feedback_category AS ENUM (
    'bug',
    'idea',
    'love',
    'other'
);


--
-- Name: current_user_is_admin(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.current_user_is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
select account.is_admin
from public.users as account
where account.id = (select auth.uid())
$$;


--
-- Name: check_feedback_rate_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_feedback_rate_limit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  recent   integer;
  anon_cap integer := 30;   -- anonymous feedback rows / 1h, global (tune me)
begin
  if new.user_id is not null then
    return new;
  end if;

  select count(*) into recent
    from public.feedback
   where user_id is null
     and created_at > now() - interval '1 hour';

  if recent >= anon_cap then
    raise exception 'Feedback is temporarily rate-limited. Please try again later.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;


--
-- Name: check_flag_creation_rate_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_flag_creation_rate_limit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  flag_count integer;
  rate_limit constant integer := 20;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO flag_count
  FROM public.flags
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '24 hours';

  IF flag_count >= rate_limit THEN
    RAISE EXCEPTION 'Rate limit exceeded: you can only create % flags per 24-hour period. Try again later.', rate_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: check_flag_rate_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_flag_rate_limit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  flag_count INTEGER;
  rate_limit INTEGER := 20;
BEGIN
  -- Anon inserts (auth.uid() IS NULL) are rate-limited client-side via
  -- AsyncStorage (src/lib/anonRateLimit.ts). No server-side per-user
  -- limit is possible without IP or device ID (Jordan hard constraints).
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO flag_count
  FROM public.flags
  WHERE user_id = auth.uid()
    AND created_at > NOW() - INTERVAL '24 hours';

  IF flag_count >= rate_limit THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum % flags per 24 hours', rate_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: check_global_anon_rate_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_global_anon_rate_limit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  anon_count INTEGER;
  global_cap INTEGER := 100;
BEGIN
  -- Only applies to anon inserts (authenticated users have their own limit).
  IF auth.uid() IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO anon_count
  FROM public.flags
  WHERE user_id IS NULL
    AND created_at > NOW() - INTERVAL '1 hour';

  IF anon_count >= global_cap THEN
    RAISE EXCEPTION 'Anonymous reporting is temporarily paused. Try again in a bit.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: enforce_flag_photos_object_key_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_flag_photos_object_key_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    if new.object_key is not null then
      raise exception 'object_key is server-managed and cannot be set directly'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.object_key is distinct from old.object_key then
    raise exception 'object_key is server-managed and cannot be changed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;


--
-- Name: enforce_flag_status_only_for_non_owner(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_flag_status_only_for_non_owner() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if auth.uid() is null or auth.uid() = old.user_id then
    return new;
  end if;

  new.id           := old.id;            -- NEW: PK immutable
  new.user_id      := old.user_id;
  new.lat          := old.lat;
  new.lng          := old.lng;
  new.category     := old.category;
  new.severity     := old.severity;
  new.description  := old.description;
  new.photo_url    := old.photo_url;
  new.created_at   := old.created_at;
  new.context_tags := old.context_tags;  -- NEW: closes the tag-pollution hole
  return new;
end;
$$;


--
-- Name: enforce_flag_status_transition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_flag_status_transition() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.status = old.status then
    return new; -- idempotent writes are fine
  end if;
  if (old.status = 'open'     and new.status in ('verified', 'resolved', 'rejected'))
  or (old.status = 'verified' and new.status in ('resolved', 'rejected'))
  or (old.status = 'resolved' and new.status = 'open')
  then
    return new;
  end if;
  if old.status = 'resolved' and new.status = 'rejected'
     and auth.uid() in (select id from public.users where is_admin = true)
  then
    return new;
  end if;
  raise exception 'illegal flag status transition: % -> %', old.status, new.status
    using errcode = 'P0001';
end;
$$;


--
-- Name: enforce_flags_photo_object_key_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_flags_photo_object_key_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    if new.photo_object_key is not null then
      raise exception 'photo_object_key is server-managed and cannot be set directly'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.photo_object_key is distinct from old.photo_object_key then
    raise exception 'photo_object_key is server-managed and cannot be changed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;


--
-- Name: enforce_users_avatar_object_key_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_users_avatar_object_key_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    if new.avatar_object_key is not null then
      raise exception 'avatar_object_key is server-managed and cannot be set directly'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.avatar_object_key is distinct from old.avatar_object_key then
    raise exception 'avatar_object_key is server-managed and cannot be changed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;


--
-- Name: handle_comment_added(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_comment_added() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.users
    SET points = points + 1
    WHERE id = NEW.user_id;

  INSERT INTO public.point_events (user_id, event_type, delta, flag_id)
    VALUES (NEW.user_id, 'comment_added', 1, NEW.flag_id);

  RETURN NEW;
END;
$$;


--
-- Name: handle_comment_vote_added(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_comment_vote_added() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  comment_author  uuid;
  total_votes     int;
BEGIN
  SELECT user_id INTO comment_author
    FROM public.flag_comments WHERE id = NEW.comment_id;

  IF comment_author = NEW.voter_id THEN
    RAISE EXCEPTION 'Cannot vote on your own comment'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*) INTO total_votes
    FROM public.comment_votes WHERE comment_id = NEW.comment_id;

  IF total_votes <= 10 THEN
    UPDATE public.users
      SET points = points + 2
      WHERE id = comment_author;
    INSERT INTO public.point_events (user_id, event_type, delta, flag_id)
      VALUES (
        comment_author,
        'comment_upvoted',
        2,
        (SELECT flag_id FROM public.flag_comments WHERE id = NEW.comment_id)
      );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: handle_flag_dispute_reset(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_flag_dispute_reset() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.status is distinct from old.status then
    new.dispute_requests          := 0;
    new.dispute_requests_reset_at := now();
  end if;
  return new;
end;
$$;


--
-- Name: handle_flag_insert_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_flag_insert_history() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.flag_status_history (
    flag_id, user_id, from_status, to_status
  ) values (
    new.id, new.user_id, null, new.status
  );
  return new;
end;
$$;


--
-- Name: handle_flag_photo_added(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_flag_photo_added() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  flag_owner       uuid;
  already_rewarded boolean;
BEGIN
  SELECT user_id INTO flag_owner FROM public.flags WHERE id = NEW.flag_id;
  IF flag_owner IS NULL OR flag_owner <> auth.uid() THEN
    RETURN NEW; -- only reward the flag owner for adding a photo
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.point_events
    WHERE user_id = flag_owner
      AND event_type = 'flag_photo_added'
      AND flag_id = NEW.flag_id
  ) INTO already_rewarded;

  IF NOT already_rewarded THEN
    UPDATE public.users
      SET points = points + 3
      WHERE id = flag_owner;
    INSERT INTO public.point_events (user_id, event_type, delta, flag_id)
      VALUES (flag_owner, 'flag_photo_added', 3, NEW.flag_id);
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: handle_flag_reopen_reset(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_flag_reopen_reset() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.status = 'resolved' AND NEW.status = 'open' THEN
    NEW.reopen_requests          := 0;
    NEW.reopen_requests_reset_at := now();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_flag_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_flag_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  reporter_bonus    int := 0;
  reporter_event    text;
  actor_bonus       int := 0;
  actor_event       text;
begin
  if new.status is null or new.status = old.status then
    return new;
  end if;

  -- Audit row first, so the history is faithful even if a later statement raises.
  insert into public.flag_status_history (flag_id, user_id, from_status, to_status)
  values (new.id, auth.uid(), old.status, new.status);

  if new.status = 'verified' and old.status = 'open' then
    reporter_bonus  := 10;
    reporter_event  := 'flag_verified_reporter';
    actor_bonus     := 3;
    actor_event     := 'flag_verified_actor';
  elsif new.status = 'resolved' and old.status in ('open', 'verified') then
    reporter_bonus  := 15;
    reporter_event  := 'flag_resolved_reporter';
    actor_bonus     := 7;
    actor_event     := 'flag_resolved_actor';
  elsif new.status = 'rejected' and auth.uid() in (
      select id from public.users where is_admin = true
    ) then
    -- Spam penalty: only when admin explicitly rejects
    if new.user_id is not null then
      update public.users
        set points = greatest(0, points - 20)
        where id = new.user_id;
      insert into public.point_events (user_id, event_type, delta, flag_id)
        values (new.user_id, 'flag_spam_penalty', -20, new.id);
    end if;
    return new;
  end if;

  if reporter_bonus > 0 and new.user_id is not null then
    update public.users
      set points = points + reporter_bonus
      where id = new.user_id;
    insert into public.point_events (user_id, event_type, delta, flag_id)
      values (new.user_id, reporter_event, reporter_bonus, new.id);
  end if;

  if actor_bonus > 0
     and auth.uid() is not null
     and auth.uid() is distinct from new.user_id then   -- << THE ONE CHANGED LINE
    update public.users
      set points = points + actor_bonus
      where id = auth.uid();
    insert into public.point_events (user_id, event_type, delta, flag_id)
      values (auth.uid(), actor_event, actor_bonus, new.id);
  end if;

  return new;
end;
$$;


--
-- Name: handle_flag_submitted(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_flag_submitted() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW; -- anon submission: no points
  END IF;

  UPDATE public.users
    SET points = points + 5
    WHERE id = NEW.user_id;

  INSERT INTO public.point_events (user_id, event_type, delta, flag_id)
    VALUES (NEW.user_id, 'flag_submitted', 5, NEW.id);

  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;


--
-- Name: handle_point_event_streak(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_point_event_streak() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  today          date := current_date;
  user_last_date date;
  user_streak    int;
BEGIN
  IF NEW.event_type = 'streak_bonus' THEN
    RETURN NEW; -- avoid recursion
  END IF;

  SELECT last_active_date, streak_days
    INTO user_last_date, user_streak
    FROM public.users WHERE id = NEW.user_id;

  IF user_last_date = today THEN
    RETURN NEW; -- already updated today
  ELSIF user_last_date = today - 1 THEN
    user_streak := user_streak + 1;
  ELSE
    user_streak := 1;
  END IF;

  UPDATE public.users
    SET last_active_date = today,
        streak_days = user_streak,
        longest_streak_days = GREATEST(longest_streak_days, user_streak)
    WHERE id = NEW.user_id;

  -- Award streak bonus at each completed 7-day multiple
  IF user_streak > 0 AND user_streak % 7 = 0 THEN
    UPDATE public.users
      SET points = points + 5
      WHERE id = NEW.user_id;
    INSERT INTO public.point_events (user_id, event_type, delta, flag_id)
      VALUES (NEW.user_id, 'streak_bonus', 5, NULL);
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: handle_push_token_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_push_token_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin new.updated_at = now(); return new; end; $$;


--
-- Name: increment_dispute_request(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_dispute_request(p_flag_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_new_count integer;
begin
  if (select auth.uid()) is null
     or not exists (
       select 1
       from public.users as account
       where account.id = (select auth.uid())
     )
  then
    raise exception 'Account is no longer active.' using errcode = 'P0001';
  end if;

  update public.flags
    set dispute_requests = dispute_requests + 1
    where id = p_flag_id
      and status in ('open', 'verified')
    returning dispute_requests into v_new_count;

  return coalesce(v_new_count, 0);
end;
$$;


--
-- Name: increment_reopen_request(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_reopen_request(p_flag_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_new_count integer;
begin
  if (select auth.uid()) is null
     or not exists (
       select 1
       from public.users as account
       where account.id = (select auth.uid())
     )
  then
    raise exception 'Account is no longer active.' using errcode = 'P0001';
  end if;

  update public.flags
    set reopen_requests = reopen_requests + 1
    where id = p_flag_id
      and status = 'resolved'
    returning reopen_requests into v_new_count;

  return coalesce(v_new_count, 0);
end;
$$;


--
-- Name: log_realtime_event(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_realtime_event(p_event text, p_channel text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'log_realtime_event requires an authenticated user';
  end if;

  if p_event not in ('subscribe', 'unsubscribe') then
    raise exception 'event must be ''subscribe'' or ''unsubscribe''';
  end if;

  insert into public.realtime_subscribe_log (user_id, event, channel)
  values (auth.uid(), p_event, p_channel);
end;
$$;


--
-- Name: notify_flag_status_webhook(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_flag_status_webhook() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'vault', 'net'
    AS $$
DECLARE v_secret text; v_payload jsonb;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets
    WHERE name = 'webhook_secret' LIMIT 1;
  IF v_secret IS NULL THEN
    RAISE WARNING '[notify_flag_status_webhook] vault secret missing - skipping';
    RETURN NEW;
  END IF;
  v_payload := jsonb_build_object('type','UPDATE','table','flags','schema','public',
    'record', row_to_json(NEW), 'old_record', row_to_json(OLD));
  PERFORM net.http_post(
    url := 'https://kldlwszpfkdmsjrjhjym.supabase.co/functions/v1/notify-flag-status',
    body := v_payload, params := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type','application/json','X-Webhook-Secret', v_secret),
    timeout_milliseconds := 5000);
  RETURN NEW;
END; $$;


--
-- Name: set_flag_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_flag_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


--
-- Name: update_flags_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_flags_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


--
-- Name: verify_webhook_secret(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_webhook_secret(incoming text) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'vault'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'webhook_secret' AND decrypted_secret = incoming
  );
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: comment_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_votes (
    comment_id uuid NOT NULL,
    voter_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    category public.feedback_category DEFAULT 'idea'::public.feedback_category NOT NULL,
    body text NOT NULL,
    contact_email text,
    platform text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feedback_body_check CHECK (((length(body) >= 1) AND (length(body) <= 5000))),
    CONSTRAINT feedback_contact_email_check CHECK (((contact_email IS NULL) OR (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)))
);


--
-- Name: flag_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flag_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flag_id uuid NOT NULL,
    user_id uuid DEFAULT auth.uid(),
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT flag_comments_content_check CHECK (((char_length(content) >= 1) AND (char_length(content) <= 500)))
);


--
-- Name: flag_edit_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flag_edit_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flag_id uuid NOT NULL,
    user_id uuid,
    changed_fields text[] NOT NULL,
    old_values jsonb DEFAULT '{}'::jsonb NOT NULL,
    new_values jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: flag_edit_history_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.flag_edit_history_public WITH (security_invoker='true') AS
 SELECT id,
    flag_id,
    changed_fields,
    old_values,
    new_values,
    created_at
   FROM public.flag_edit_history;


--
-- Name: flag_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flag_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flag_id uuid NOT NULL,
    url text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    alt_text text,
    object_key text,
    CONSTRAINT flag_photos_alt_text_check CHECK (((alt_text IS NULL) OR (char_length(alt_text) <= 200))),
    CONSTRAINT flag_photos_position_check CHECK (("position" >= 0))
);


--
-- Name: flag_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flag_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flag_id uuid NOT NULL,
    user_id uuid,
    from_status text,
    to_status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: flag_status_history_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.flag_status_history_public WITH (security_invoker='true') AS
 SELECT id,
    flag_id,
    from_status,
    to_status,
    created_at
   FROM public.flag_status_history;


--
-- Name: flag_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flag_verifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    flag_id uuid NOT NULL,
    verifier_id uuid NOT NULL,
    weight numeric(3,1) DEFAULT 1.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flags (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    category text NOT NULL,
    description text,
    severity smallint NOT NULL,
    photo_url text,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    context_tags text[] DEFAULT '{}'::text[] NOT NULL,
    reopen_requests integer DEFAULT 0 NOT NULL,
    reopen_requests_reset_at timestamp with time zone,
    dispute_requests integer DEFAULT 0 NOT NULL,
    dispute_requests_reset_at timestamp with time zone,
    photo_alt text,
    photo_object_key text,
    CONSTRAINT description_max_length CHECK ((length(COALESCE(description, ''::text)) <= 2000)),
    CONSTRAINT flags_category_check CHECK ((category = ANY (ARRAY['no_ramp'::text, 'broken_sidewalk'::text, 'blocked_path'::text, 'missing_signal'::text, 'steep_grade'::text, 'other'::text]))),
    CONSTRAINT flags_description_length_chk CHECK (((description IS NULL) OR (char_length(description) <= 2000))),
    CONSTRAINT flags_lat_range_chk CHECK (((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision))),
    CONSTRAINT flags_lng_range_chk CHECK (((lng >= ('-180'::integer)::double precision) AND (lng <= (180)::double precision))),
    CONSTRAINT flags_photo_alt_check CHECK (((photo_alt IS NULL) OR (char_length(photo_alt) <= 200))),
    CONSTRAINT flags_severity_check CHECK (((severity >= 1) AND (severity <= 5))),
    CONSTRAINT flags_status_check CHECK ((status = ANY (ARRAY['open'::text, 'verified'::text, 'resolved'::text, 'rejected'::text])))
);


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    user_id uuid NOT NULL,
    flag_status_updates boolean DEFAULT true NOT NULL,
    nearby_flags boolean DEFAULT true NOT NULL,
    watched_flag_updates boolean DEFAULT true NOT NULL,
    bulk_watch_alerts boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: point_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_events (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    delta integer NOT NULL,
    flag_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT point_events_event_type_check CHECK ((event_type = ANY (ARRAY['flag_submitted'::text, 'flag_verified_reporter'::text, 'flag_resolved_reporter'::text, 'flag_verified_actor'::text, 'flag_resolved_actor'::text, 'flag_photo_added'::text, 'comment_added'::text, 'comment_upvoted'::text, 'flag_spam_penalty'::text, 'streak_bonus'::text])))
);


--
-- Name: point_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.point_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: point_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.point_events_id_seq OWNED BY public.point_events.id;


--
-- Name: push_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_tokens (
    user_id uuid NOT NULL,
    token text NOT NULL,
    platform text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT push_tokens_platform_check CHECK ((platform = ANY (ARRAY['ios'::text, 'android'::text, 'web'::text])))
);


--
-- Name: realtime_subscribe_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.realtime_subscribe_log (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    event text NOT NULL,
    channel text NOT NULL,
    logged_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT realtime_subscribe_log_event_check CHECK ((event = ANY (ARRAY['subscribe'::text, 'unsubscribe'::text])))
);


--
-- Name: realtime_subscribe_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.realtime_subscribe_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.realtime_subscribe_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    display_name text,
    avatar_url text,
    points integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_active_date date,
    streak_days integer DEFAULT 0 NOT NULL,
    longest_streak_days integer DEFAULT 0 NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    avatar_object_key text,
    CONSTRAINT points_non_negative CHECK ((points >= 0)),
    CONSTRAINT users_points_nonneg_chk CHECK ((points >= 0))
);


--
-- Name: users_self_email; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.users_self_email WITH (security_invoker='true') AS
 SELECT id,
    email
   FROM public.users
  WHERE (id = ( SELECT auth.uid() AS uid));


--
-- Name: point_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_events ALTER COLUMN id SET DEFAULT nextval('public.point_events_id_seq'::regclass);


--
-- Name: comment_votes comment_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_votes
    ADD CONSTRAINT comment_votes_pkey PRIMARY KEY (comment_id, voter_id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: flag_comments flag_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flag_comments
    ADD CONSTRAINT flag_comments_pkey PRIMARY KEY (id);


--
-- Name: flag_edit_history flag_edit_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flag_edit_history
    ADD CONSTRAINT flag_edit_history_pkey PRIMARY KEY (id);


--
-- Name: flag_photos flag_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flag_photos
    ADD CONSTRAINT flag_photos_pkey PRIMARY KEY (id);


--
-- Name: flag_status_history flag_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flag_status_history
    ADD CONSTRAINT flag_status_history_pkey PRIMARY KEY (id);


--
-- Name: flag_verifications flag_verifications_flag_id_verifier_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flag_verifications
    ADD CONSTRAINT flag_verifications_flag_id_verifier_id_key UNIQUE (flag_id, verifier_id);


--
-- Name: flag_verifications flag_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flag_verifications
    ADD CONSTRAINT flag_verifications_pkey PRIMARY KEY (id);


--
-- Name: flags flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flags
    ADD CONSTRAINT flags_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: point_events point_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_events
    ADD CONSTRAINT point_events_pkey PRIMARY KEY (id);


--
-- Name: push_tokens push_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_pkey PRIMARY KEY (user_id);


--
-- Name: realtime_subscribe_log realtime_subscribe_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.realtime_subscribe_log
    ADD CONSTRAINT realtime_subscribe_log_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: comment_votes_voter_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comment_votes_voter_id_idx ON public.comment_votes USING btree (voter_id);


--
-- Name: feedback_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_category_idx ON public.feedback USING btree (category);


--
-- Name: feedback_user_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_user_created_at_idx ON public.feedback USING btree (user_id, created_at DESC);


--
-- Name: flag_comments_flag_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flag_comments_flag_id_created_at_idx ON public.flag_comments USING btree (flag_id, created_at DESC);


--
-- Name: flag_comments_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flag_comments_user_id_idx ON public.flag_comments USING btree (user_id);


--
-- Name: flag_edit_history_flag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flag_edit_history_flag_idx ON public.flag_edit_history USING btree (flag_id, created_at DESC);


--
-- Name: flag_edit_history_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flag_edit_history_user_id_idx ON public.flag_edit_history USING btree (user_id);


--
-- Name: flag_photos_flag_id_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flag_photos_flag_id_position_idx ON public.flag_photos USING btree (flag_id, "position");


--
-- Name: flag_status_history_flag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flag_status_history_flag_idx ON public.flag_status_history USING btree (flag_id, created_at DESC);


--
-- Name: flag_status_history_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flag_status_history_user_id_idx ON public.flag_status_history USING btree (user_id);


--
-- Name: flag_verifications_flag_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flag_verifications_flag_id_idx ON public.flag_verifications USING btree (flag_id);


--
-- Name: flag_verifications_verifier_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flag_verifications_verifier_id_idx ON public.flag_verifications USING btree (verifier_id);


--
-- Name: flags_context_tags_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flags_context_tags_idx ON public.flags USING gin (context_tags);


--
-- Name: flags_reopen_requests_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flags_reopen_requests_idx ON public.flags USING btree (reopen_requests) WHERE (status = 'resolved'::text);


--
-- Name: flags_status_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flags_status_created_at_idx ON public.flags USING btree (status, created_at DESC);


--
-- Name: flags_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flags_user_id_idx ON public.flags USING btree (user_id);


--
-- Name: point_events_flag_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX point_events_flag_id_idx ON public.point_events USING btree (flag_id);


--
-- Name: point_events_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX point_events_user_id_idx ON public.point_events USING btree (user_id, created_at DESC);


--
-- Name: realtime_subscribe_log_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX realtime_subscribe_log_user_id_idx ON public.realtime_subscribe_log USING btree (user_id);


--
-- Name: feedback enforce_feedback_rate_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_feedback_rate_limit BEFORE INSERT ON public.feedback FOR EACH ROW EXECUTE FUNCTION public.check_feedback_rate_limit();


--
-- Name: flags enforce_flag_creation_rate_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_flag_creation_rate_limit BEFORE INSERT ON public.flags FOR EACH ROW EXECUTE FUNCTION public.check_flag_creation_rate_limit();


--
-- Name: flags enforce_flag_rate_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_flag_rate_limit BEFORE INSERT ON public.flags FOR EACH ROW EXECUTE FUNCTION public.check_flag_rate_limit();


--
-- Name: flags enforce_flag_status_only_for_non_owner; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_flag_status_only_for_non_owner BEFORE UPDATE ON public.flags FOR EACH ROW EXECUTE FUNCTION public.enforce_flag_status_only_for_non_owner();


--
-- Name: flags enforce_global_anon_rate_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_global_anon_rate_limit BEFORE INSERT ON public.flags FOR EACH ROW EXECUTE FUNCTION public.check_global_anon_rate_limit();


--
-- Name: flag_photos flag_photos_object_key_insert_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER flag_photos_object_key_insert_guard BEFORE INSERT ON public.flag_photos FOR EACH ROW EXECUTE FUNCTION public.enforce_flag_photos_object_key_guard();


--
-- Name: flag_photos flag_photos_object_key_update_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER flag_photos_object_key_update_guard BEFORE UPDATE OF object_key ON public.flag_photos FOR EACH ROW EXECUTE FUNCTION public.enforce_flag_photos_object_key_guard();


--
-- Name: flags flag_status_notify_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER flag_status_notify_trigger AFTER UPDATE ON public.flags FOR EACH ROW EXECUTE FUNCTION public.notify_flag_status_webhook();


--
-- Name: flags flag_status_transition_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER flag_status_transition_guard BEFORE UPDATE OF status ON public.flags FOR EACH ROW EXECUTE FUNCTION public.enforce_flag_status_transition();


--
-- Name: flags flags_photo_object_key_insert_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER flags_photo_object_key_insert_guard BEFORE INSERT ON public.flags FOR EACH ROW EXECUTE FUNCTION public.enforce_flags_photo_object_key_guard();


--
-- Name: flags flags_photo_object_key_update_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER flags_photo_object_key_update_guard BEFORE UPDATE OF photo_object_key ON public.flags FOR EACH ROW EXECUTE FUNCTION public.enforce_flags_photo_object_key_guard();


--
-- Name: flag_comments on_comment_added; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_comment_added AFTER INSERT ON public.flag_comments FOR EACH ROW EXECUTE FUNCTION public.handle_comment_added();


--
-- Name: comment_votes on_comment_vote_added; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_comment_vote_added AFTER INSERT ON public.comment_votes FOR EACH ROW EXECUTE FUNCTION public.handle_comment_vote_added();


--
-- Name: flags on_flag_dispute_reset; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_flag_dispute_reset BEFORE UPDATE OF status ON public.flags FOR EACH ROW EXECUTE FUNCTION public.handle_flag_dispute_reset();


--
-- Name: flags on_flag_insert_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_flag_insert_history AFTER INSERT ON public.flags FOR EACH ROW EXECUTE FUNCTION public.handle_flag_insert_history();


--
-- Name: flag_photos on_flag_photo_added; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_flag_photo_added AFTER INSERT ON public.flag_photos FOR EACH ROW EXECUTE FUNCTION public.handle_flag_photo_added();


--
-- Name: flags on_flag_reopen_reset; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_flag_reopen_reset BEFORE UPDATE OF status ON public.flags FOR EACH ROW EXECUTE FUNCTION public.handle_flag_reopen_reset();


--
-- Name: flags on_flag_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_flag_status_change AFTER UPDATE OF status ON public.flags FOR EACH ROW EXECUTE FUNCTION public.handle_flag_status_change();


--
-- Name: flags on_flag_submitted; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_flag_submitted AFTER INSERT ON public.flags FOR EACH ROW EXECUTE FUNCTION public.handle_flag_submitted();


--
-- Name: flags on_flag_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_flag_updated_at BEFORE UPDATE ON public.flags FOR EACH ROW EXECUTE FUNCTION public.set_flag_updated_at();


--
-- Name: point_events on_point_event_streak; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_point_event_streak AFTER INSERT ON public.point_events FOR EACH ROW EXECUTE FUNCTION public.handle_point_event_streak();


--
-- Name: push_tokens push_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER push_tokens_updated_at BEFORE UPDATE ON public.push_tokens FOR EACH ROW EXECUTE FUNCTION public.handle_push_token_updated_at();


--
-- Name: flags update_flags_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_flags_updated_at BEFORE UPDATE ON public.flags FOR EACH ROW EXECUTE FUNCTION public.update_flags_updated_at();


--
-- Name: users users_avatar_object_key_insert_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_avatar_object_key_insert_guard BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.enforce_users_avatar_object_key_guard();


--
-- Name: users users_avatar_object_key_update_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_avatar_object_key_update_guard BEFORE UPDATE OF avatar_object_key ON public.users FOR EACH ROW EXECUTE FUNCTION public.enforce_users_avatar_object_key_guard();


--
-- Name: comment_votes comment_votes_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_votes
    ADD CONSTRAINT comment_votes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.flag_comments(id) ON DELETE CASCADE;


--
-- Name: comment_votes comment_votes_voter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_votes
    ADD CONSTRAINT comment_votes_voter_id_fkey FOREIGN KEY (voter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: feedback feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: flag_comments flag_comments_flag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flag_comments
    ADD CONSTRAINT flag_comments_flag_id_fkey FOREIGN KEY (flag_id) REFERENCES public.flags(id) ON DELETE CASCADE;


--
-- Name: flag_comments flag_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flag_comments
    ADD CONSTRAINT flag_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: flag_edit_history flag_edit_history_flag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flag_edit_history
    ADD CONSTRAINT flag_edit_history_flag_id_fkey FOREIGN KEY (flag_id) REFERENCES public.flags(id) ON DELETE CASCADE;


--
-- Name: flag_edit_history flag_edit_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flag_edit_history
    ADD CONSTRAINT flag_edit_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: flag_photos flag_photos_flag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flag_photos
    ADD CONSTRAINT flag_photos_flag_id_fkey FOREIGN KEY (flag_id) REFERENCES public.flags(id) ON DELETE CASCADE;


--
-- Name: flag_status_history flag_status_history_flag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flag_status_history
    ADD CONSTRAINT flag_status_history_flag_id_fkey FOREIGN KEY (flag_id) REFERENCES public.flags(id) ON DELETE CASCADE;


--
-- Name: flag_status_history flag_status_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flag_status_history
    ADD CONSTRAINT flag_status_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: flag_verifications flag_verifications_flag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flag_verifications
    ADD CONSTRAINT flag_verifications_flag_id_fkey FOREIGN KEY (flag_id) REFERENCES public.flags(id) ON DELETE CASCADE;


--
-- Name: flag_verifications flag_verifications_verifier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flag_verifications
    ADD CONSTRAINT flag_verifications_verifier_id_fkey FOREIGN KEY (verifier_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: flags flags_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flags
    ADD CONSTRAINT flags_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: point_events point_events_flag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_events
    ADD CONSTRAINT point_events_flag_id_fkey FOREIGN KEY (flag_id) REFERENCES public.flags(id) ON DELETE SET NULL;


--
-- Name: point_events point_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_events
    ADD CONSTRAINT point_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: push_tokens push_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: realtime_subscribe_log realtime_subscribe_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.realtime_subscribe_log
    ADD CONSTRAINT realtime_subscribe_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notification_preferences Users can read their own notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read their own notification preferences" ON public.notification_preferences FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: notification_preferences Users can update their own notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notification preferences" ON public.notification_preferences FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: notification_preferences Users can upsert their own notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can upsert their own notification preferences" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: flag_comments admin delete any comment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin delete any comment" ON public.flag_comments FOR DELETE TO authenticated USING (( SELECT users.is_admin
   FROM public.users
  WHERE (users.id = ( SELECT auth.uid() AS uid))));


--
-- Name: flags admin delete any flag; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin delete any flag" ON public.flags FOR DELETE TO authenticated USING (( SELECT users.is_admin
   FROM public.users
  WHERE (users.id = ( SELECT auth.uid() AS uid))));


--
-- Name: comment_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: comment_votes comment_votes delete own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "comment_votes delete own" ON public.comment_votes FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = voter_id));


--
-- Name: comment_votes comment_votes insert own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "comment_votes insert own" ON public.comment_votes FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = voter_id));


--
-- Name: comment_votes comment_votes readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "comment_votes readable" ON public.comment_votes FOR SELECT TO authenticated USING ((voter_id = ( SELECT auth.uid() AS uid)));


--
-- Name: feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback feedback_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feedback_delete_own ON public.feedback FOR DELETE USING (((user_id IS NOT NULL) AND (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: feedback feedback_insert_self_or_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feedback_insert_self_or_anon ON public.feedback FOR INSERT WITH CHECK (((user_id IS NULL) OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: feedback feedback_select_maintainer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feedback_select_maintainer ON public.feedback FOR SELECT USING ((( SELECT auth.email() AS email) = 'skylerhalisky@gmail.com'::text));


--
-- Name: feedback feedback_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feedback_select_own ON public.feedback FOR SELECT USING (((user_id IS NOT NULL) AND (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: flag_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.flag_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: flag_comments flag_comments: authenticated read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flag_comments: authenticated read" ON public.flag_comments FOR SELECT TO authenticated USING (true);


--
-- Name: flag_comments flag_comments: own delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flag_comments: own delete" ON public.flag_comments FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: flag_comments flag_comments: own insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flag_comments: own insert" ON public.flag_comments FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: flag_edit_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.flag_edit_history ENABLE ROW LEVEL SECURITY;

--
-- Name: flag_edit_history flag_edit_history insert by flag owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flag_edit_history insert by flag owner" ON public.flag_edit_history FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = ( SELECT flags.user_id
   FROM public.flags
  WHERE (flags.id = flag_edit_history.flag_id))));


--
-- Name: flag_edit_history flag_edit_history select by maintainer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flag_edit_history select by maintainer" ON public.flag_edit_history FOR SELECT TO authenticated USING ((( SELECT auth.email() AS email) = 'skylerhalisky@gmail.com'::text));


--
-- Name: flag_edit_history flag_edit_history select via public view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flag_edit_history select via public view" ON public.flag_edit_history FOR SELECT TO authenticated USING (true);


--
-- Name: flag_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.flag_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: flag_photos flag_photos: authenticated insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flag_photos: authenticated insert" ON public.flag_photos FOR INSERT TO authenticated WITH CHECK (((POSITION(((('/flag-photos/'::text || (( SELECT auth.uid() AS uid))::text) || '/'::text)) IN (url)) > 0) AND (EXISTS ( SELECT 1
   FROM public.users account
  WHERE (account.id = ( SELECT auth.uid() AS uid)))) AND (EXISTS ( SELECT 1
   FROM public.flags flag
  WHERE ((flag.id = flag_photos.flag_id) AND (flag.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: flag_photos flag_photos: authenticated read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flag_photos: authenticated read" ON public.flag_photos FOR SELECT TO authenticated USING (true);


--
-- Name: flag_photos flag_photos: flag owner delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flag_photos: flag owner delete" ON public.flag_photos FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.flags f
  WHERE ((f.id = flag_photos.flag_id) AND (f.user_id IS NOT NULL) AND (f.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: flag_photos flag_photos: flag owner update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flag_photos: flag owner update" ON public.flag_photos FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.flags f
  WHERE ((f.id = flag_photos.flag_id) AND (f.user_id IS NOT NULL) AND (f.user_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.flags f
  WHERE ((f.id = flag_photos.flag_id) AND (f.user_id IS NOT NULL) AND (f.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: flag_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.flag_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: flag_status_history flag_status_history no direct insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flag_status_history no direct insert" ON public.flag_status_history FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: flag_status_history flag_status_history readable by maintainer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flag_status_history readable by maintainer" ON public.flag_status_history FOR SELECT TO authenticated USING ((( SELECT auth.email() AS email) = 'skylerhalisky@gmail.com'::text));


--
-- Name: flag_status_history flag_status_history readable via public view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flag_status_history readable via public view" ON public.flag_status_history FOR SELECT TO authenticated USING (true);


--
-- Name: flag_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.flag_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: flag_verifications flag_verifications own insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flag_verifications own insert" ON public.flag_verifications FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = verifier_id) AND (verifier_id IS DISTINCT FROM ( SELECT f.user_id
   FROM public.flags f
  WHERE (f.id = flag_verifications.flag_id)))));


--
-- Name: flag_verifications flag_verifications readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flag_verifications readable" ON public.flag_verifications FOR SELECT TO authenticated USING ((verifier_id = ( SELECT auth.uid() AS uid)));


--
-- Name: flags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.flags ENABLE ROW LEVEL SECURITY;

--
-- Name: flags flags anon insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flags anon insert" ON public.flags FOR INSERT TO anon WITH CHECK (((user_id IS NULL) AND (photo_url IS NULL) AND (status = 'open'::text)));


--
-- Name: flags flags delete own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flags delete own" ON public.flags FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: flags flags insert own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flags insert own" ON public.flags FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: flags flags owner edit open; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flags owner edit open" ON public.flags FOR UPDATE TO authenticated USING (((( SELECT auth.uid() AS uid) = user_id) AND (status = 'open'::text))) WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (lat = ( SELECT f.lat
   FROM public.flags f
  WHERE (f.id = flags.id))) AND (lng = ( SELECT f.lng
   FROM public.flags f
  WHERE (f.id = flags.id))) AND (user_id = ( SELECT f.user_id
   FROM public.flags f
  WHERE (f.id = flags.id))) AND (created_at = ( SELECT f.created_at
   FROM public.flags f
  WHERE (f.id = flags.id))) AND (status = ( SELECT f.status
   FROM public.flags f
  WHERE (f.id = flags.id)))));


--
-- Name: flags flags readable by anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flags readable by anon" ON public.flags FOR SELECT TO anon USING (true);


--
-- Name: flags flags readable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flags readable by authenticated" ON public.flags FOR SELECT TO authenticated USING (true);


--
-- Name: flags flags status update by any authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flags status update by any authenticated" ON public.flags FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users account
  WHERE (account.id = ( SELECT auth.uid() AS uid))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users account
  WHERE (account.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: flags flags_user_scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY flags_user_scoped ON public.flags USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: point_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;

--
-- Name: point_events point_events owner select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "point_events owner select" ON public.point_events FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: push_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: push_tokens push_tokens owner delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "push_tokens owner delete" ON public.push_tokens FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: push_tokens push_tokens owner insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "push_tokens owner insert" ON public.push_tokens FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: push_tokens push_tokens owner select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "push_tokens owner select" ON public.push_tokens FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: push_tokens push_tokens owner update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "push_tokens owner update" ON public.push_tokens FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: realtime_subscribe_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.realtime_subscribe_log ENABLE ROW LEVEL SECURITY;

--
-- Name: realtime_subscribe_log subscribe_log insert own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "subscribe_log insert own" ON public.realtime_subscribe_log FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users own row full select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users own row full select" ON public.users FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = id));


--
-- Name: users users readable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users readable by authenticated" ON public.users FOR SELECT TO authenticated USING (true);


--
-- Name: users users update own row; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users update own row" ON public.users FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = id)) WITH CHECK (((( SELECT auth.uid() AS uid) = id) AND (NOT (is_admin IS DISTINCT FROM ( SELECT private.current_user_is_admin() AS current_user_is_admin)))));


--
-- PostgreSQL database dump complete
--
