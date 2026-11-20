-- Run in the Supabase SQL Editor after installing supabase/live-rooms.sql.
-- All test data and per-test settings are rolled back.
begin;
set local role anon;
do $$
declare
 code text := upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
 owner_key uuid:=gen_random_uuid(); host_tab uuid:=gen_random_uuid(); new_host uuid:=gen_random_uuid();
 guest_key uuid:=gen_random_uuid(); guest_tab uuid:=gen_random_uuid(); next_tab uuid:=gen_random_uuid();
 request uuid:=gen_random_uuid(); member_id text; result jsonb; payload jsonb;
begin
 result:=public.qm_room('create',code,owner_key,host_tab);
 assert result ? 'cursor', 'Create room';
 result:=public.qm_room('join',code,guest_key,guest_tab);
 member_id:=result->>'member';
 assert member_id is not null, 'First admission';
 payload:=jsonb_build_object('msg',jsonb_build_object('t','hi','name','Vivek'),'request',request);
 perform public.qm_room('send',code,guest_key,guest_tab,payload);
 perform public.qm_room('send',code,guest_key,guest_tab,payload);
 result:=public.qm_room('poll',code,owner_key,host_tab);
 assert jsonb_array_length(result->'events')=1, 'Retry must deliver the message once';
 result:=public.qm_room('join',code,guest_key,next_tab);
 assert result->>'member'=member_id, 'Reopen as the same participant';
 result:=public.qm_room('poll',code,guest_key,guest_tab);
 assert result->>'error'='superseded', 'Reject replaced tab';
 result:=public.qm_room('join',code,guest_key,guest_tab,'{"manual":true}');
 assert result->>'error'='superseded', 'Delayed old join cannot take the room back';
 result:=public.qm_room('restore',code,owner_key,new_host);
 assert result->>'hostSession'=new_host::text, 'Host can reopen';
 result:=public.qm_room('restore',code,owner_key,host_tab);
 assert result->>'error'='superseded', 'Replaced host tab cannot take the room back';
 payload:=jsonb_build_object('member',member_id,'request',gen_random_uuid());
 result:=public.qm_room('block',code,guest_key,next_tab,payload);
 assert result ? 'error', 'Only the host can block';
 perform public.qm_room('kick',code,owner_key,new_host,payload);
 result:=public.qm_room('join',code,guest_key,gen_random_uuid());
 assert result->>'error'='kicked', 'Kick suppresses automatic return';
 guest_tab:=gen_random_uuid();
 result:=public.qm_room('join',code,guest_key,guest_tab,'{"manual":true}');
 assert result->>'member'=member_id, 'Manual return after kick';
 perform public.qm_room('kick',code,owner_key,new_host,payload);
 result:=public.qm_room('poll',code,guest_key,guest_tab);
 assert result ? 'events', 'Retry of the original kick cannot kick the returning player again';
 perform public.qm_room('block',code,owner_key,new_host,payload||jsonb_build_object('request',gen_random_uuid()));
 result:=public.qm_room('poll',code,guest_key,guest_tab);
 assert result->>'error'='unavailable', 'Block removes read access';
 result:=public.qm_room('join',code,guest_key,gen_random_uuid(),'{"manual":true,"name":"New name"}');
 assert result='{"error":"unavailable"}'::jsonb, 'Block hides room details on rejoin';
 result:=public.qm_room('join',code,gen_random_uuid(),gen_random_uuid(),'{"manual":true}');
 assert result->>'member'<>member_id, 'Another guest can still join';
end;
$$;

set local role authenticated;
do $$
declare
 code text:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
 owner_key uuid:=gen_random_uuid();host_tab uuid:=gen_random_uuid();account_id uuid:=gen_random_uuid();
 device_a uuid:=gen_random_uuid(); device_b uuid:=gen_random_uuid();
 member_id text; result jsonb;
begin
 perform public.qm_room('create',code,owner_key,host_tab);
 perform set_config('request.jwt.claim.sub',account_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',account_id)::text,true);
 result:=public.qm_room('join',code,device_a,gen_random_uuid());
 member_id:=result->>'member';
 result:=public.qm_room('join',code,device_b,gen_random_uuid());
 assert result->>'member'=member_id, 'One signed-in participant across devices';
 perform public.qm_room('block',code,owner_key,host_tab,jsonb_build_object('member',member_id,'request',gen_random_uuid()));
 result:=public.qm_room('join',code,gen_random_uuid(),gen_random_uuid(),'{"manual":true}');
 assert result='{"error":"unavailable"}'::jsonb, 'Account block follows the player to another device';
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{}',true);
 result:=public.qm_room('join',code,device_a,gen_random_uuid(),'{"manual":true}');
 assert result='{"error":"unavailable"}'::jsonb, 'A blocked player signing out on the same browser';

end;
$$;
rollback;
