-- ============================================================
--  SOZO 예약 시스템 DB 설정
--  Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run 하세요.
--  여러 번 실행해도 안전합니다.
-- ============================================================


-- ------------------------------------------------------------
-- 1. 동시 예약(오버부킹) 방지
-- ------------------------------------------------------------
-- 기존에는 "자리 확인" 과 "예약 등록" 이 따로 실행돼서,
-- 마지막 한 자리에 두 명이 동시에 신청하면 둘 다 통과했습니다.
-- 아래 함수는 해당 날짜의 일정 행을 잠근(for update) 뒤
-- 확인과 등록을 한 트랜잭션에서 처리하므로 절대 초과되지 않습니다.

create or replace function public.reserve_sozo(
  p_target_date  date,
  p_user_name    text,
  p_user_phone   text,
  p_gender       text,
  p_cell         text,
  p_age          text,
  p_expectations text,
  p_questions    text
) returns public.sozo_reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max   int;
  v_taken int;
  v_row   public.sozo_reservations;
begin
  -- 성별 값이 남자/여자가 아니면 정원 계산을 우회할 수 있으므로 막습니다.
  if p_gender not in ('남자', '여자') then
    raise exception 'INVALID';
  end if;

  -- 빈 값 / 비정상적으로 긴 값 차단 (화면을 거치지 않고 직접 호출하는 경우 대비)
  if coalesce(trim(p_user_name), '') = ''
     or length(p_user_name) > 30
     or regexp_replace(coalesce(p_user_phone, ''), '\D', '', 'g') !~ '^01\d{8,9}$'
     or length(coalesce(p_cell, '')) > 30
     or length(coalesce(p_age, '')) > 3
     or length(coalesce(p_expectations, '')) > 2000
     or length(coalesce(p_questions, '')) > 2000 then
    raise exception 'INVALID';
  end if;

  -- 동시에 들어온 요청들이 여기서 한 줄로 세워집니다.
  -- 지난 날짜(한국 시간 기준)는 열려 있어도 받지 않습니다.
  select case when p_gender = '남자' then max_male else max_female end
    into v_max
    from public.sozo_availability
   where target_date = p_target_date
     and is_open
     and target_date >= (now() at time zone 'Asia/Seoul')::date
     for update;

  if v_max is null then
    raise exception 'CLOSED';   -- 오픈되지 않았거나 없는/지난 일정
  end if;

  -- 같은 날짜에 같은 번호로 중복 신청 방지
  if exists (
    select 1 from public.sozo_reservations
     where target_date = p_target_date
       and user_phone = p_user_phone
       and status is distinct from 'cancelled'
  ) then
    raise exception 'DUPLICATE';
  end if;

  select count(*)
    into v_taken
    from public.sozo_reservations
   where target_date = p_target_date
     and gender = p_gender
     and status is distinct from 'cancelled';

  if v_taken >= v_max then
    raise exception 'FULL';     -- 이미 정원이 찬 경우
  end if;

  insert into public.sozo_reservations
    (target_date, user_name, user_phone, gender, cell, age,
     expectations, questions, status)
  values
    (p_target_date, p_user_name, p_user_phone, p_gender, p_cell, p_age,
     p_expectations, p_questions, 'confirmed')
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.reserve_sozo(
  date, text, text, text, text, text, text, text
) to anon, authenticated;


-- ------------------------------------------------------------
-- 2. 잔여석 조회 (개인정보 없이 숫자만)
-- ------------------------------------------------------------
-- 예약 페이지는 "몇 자리 남았는지" 만 알면 됩니다.
-- 예약자 명단 자체를 내려보내지 않도록 카운트만 돌려줍니다.

create or replace function public.sozo_seat_counts()
returns table (target_date date, gender text, taken bigint)
language sql
security definer
set search_path = public
as $$
  select r.target_date, r.gender, count(*)
    from public.sozo_reservations r
   where r.status is distinct from 'cancelled'
   group by r.target_date, r.gender;
$$;

grant execute on function public.sozo_seat_counts() to anon, authenticated;


-- ------------------------------------------------------------
-- 3. 개인정보 잠그기 (RLS)
-- ------------------------------------------------------------
-- 지금은 링크만 알면 누구나 예약자 전원의 이름/전화번호/나이/소속을
-- 그대로 조회할 수 있는 상태입니다. 아래를 적용하면
--   · 예약 신청  → 위 reserve_sozo 함수로만 가능
--   · 명단 조회  → 로그인한 관리자만 가능
--   · 잔여석     → 위 sozo_seat_counts 함수로 숫자만 공개
-- 가 됩니다. (관리자 로그인/대시보드는 그대로 동작합니다.)

alter table public.sozo_reservations enable row level security;
alter table public.sozo_availability enable row level security;

-- 두 테이블의 기존 정책을 전부 지우고 필요한 것만 다시 만듭니다.
-- (이름을 몰라도 되고, 여러 번 실행해도 항상 같은 상태가 됩니다.)
do $$
declare p record;
begin
  for p in
    select policyname, tablename
      from pg_policies
     where schemaname = 'public'
       and tablename in ('sozo_reservations', 'sozo_availability')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- 예약 명단(개인정보): 로그인한 관리자만.
-- 일반 신청자는 위의 reserve_sozo / sozo_seat_counts 함수로만 접근합니다.
create policy "관리자 전체 권한" on public.sozo_reservations
  for all to authenticated using (true) with check (true);

-- 일정: 조회는 누구나(예약 페이지에 날짜를 띄워야 하므로), 편집은 관리자만.
create policy "일정은 누구나 조회" on public.sozo_availability
  for select to anon, authenticated using (true);

create policy "관리자만 일정 편집" on public.sozo_availability
  for all to authenticated using (true) with check (true);
