begin;
set transaction read only;

do $verify$
declare
  guard_source text;
  guard_trigger_enabled "char";
begin
  select prosrc
  into guard_source
  from pg_proc
  where oid = to_regprocedure('public.mpgf_guard_published_pool_campaign()');

  if guard_source is null
     or position('Published pool campaign status may change only through an authorized service lifecycle.' in guard_source) = 0
     or position('A finalized DAC campaign cannot return to a nonterminal state.' in guard_source) = 0
     or position('A DAC campaign can be finalized only through the audited terminal-outcome function.' in guard_source) = 0 then
    raise exception 'The complete terminal-aware DAC campaign guard is absent.';
  end if;

  select tgenabled
  into guard_trigger_enabled
  from pg_trigger
  where tgrelid = 'public.mpgf_public_goods_campaigns'::regclass
    and tgname = 'mpgf_public_goods_campaigns_published_terms_guard'
    and not tgisinternal;

  if guard_trigger_enabled is distinct from 'O'::"char" then
    raise exception 'The terminal-aware DAC campaign guard trigger is absent or disabled.';
  end if;
end
$verify$;

select jsonb_build_object(
  'guard_function', 'terminal_aware',
  'guard_trigger', 'enabled',
  'terminal_reversal', 'blocked',
  'result', 'passed'
) as terminal_dac_guard_verification;

rollback;
