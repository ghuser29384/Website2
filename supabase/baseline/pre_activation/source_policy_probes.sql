create policy __mt_baseline_probe_99c57e90f32121282333d607 on public.agreement_events as PERMISSIVE for INSERT to authenticated with check (((actor_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM agreements
  WHERE ((agreements.id = agreement_events.agreement_id) AND ((agreements.proposer_id = ( SELECT auth.uid() AS uid)) OR (agreements.responder_id = ( SELECT auth.uid() AS uid))))))));
create policy __mt_baseline_probe_01d4f137d5bb7d85db2ba775 on public.agreement_events as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM agreements
  WHERE ((agreements.id = agreement_events.agreement_id) AND ((agreements.proposer_id = ( SELECT auth.uid() AS uid)) OR (agreements.responder_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_a24bfd99fad65f5acfe826ee on public.agreement_payment_schedules as PERMISSIVE for INSERT to authenticated with check (((payer_id = ( SELECT auth.uid() AS uid)) OR (payee_id = ( SELECT auth.uid() AS uid))));
create policy __mt_baseline_probe_759c1d903119d11b4c79951e on public.agreement_payment_schedules as PERMISSIVE for SELECT to authenticated using (((payer_id = ( SELECT auth.uid() AS uid)) OR (payee_id = ( SELECT auth.uid() AS uid))));
create policy __mt_baseline_probe_ef1c12f08143b2c514d2f257 on public.agreement_payment_schedules as PERMISSIVE for UPDATE to authenticated using (((payer_id = ( SELECT auth.uid() AS uid)) OR (payee_id = ( SELECT auth.uid() AS uid)))) with check (((payer_id = ( SELECT auth.uid() AS uid)) OR (payee_id = ( SELECT auth.uid() AS uid))));
create policy __mt_baseline_probe_396d5094e9a75be215eacf77 on public.agreement_payments as PERMISSIVE for SELECT to authenticated using (((payer_id = ( SELECT auth.uid() AS uid)) OR (payee_id = ( SELECT auth.uid() AS uid))));
create policy __mt_baseline_probe_330801a506a6e8dca188e978 on public.agreement_ratings as PERMISSIVE for INSERT to authenticated with check (((rater_id = ( SELECT auth.uid() AS uid)) AND (rated_user_id <> ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM agreements
  WHERE ((agreements.id = agreement_ratings.agreement_id) AND ((agreements.proposer_id = ( SELECT auth.uid() AS uid)) OR (agreements.responder_id = ( SELECT auth.uid() AS uid))) AND ((agreements.proposer_id = agreement_ratings.rated_user_id) OR (agreements.responder_id = agreement_ratings.rated_user_id)))))));
create policy __mt_baseline_probe_cb5e1c758216b64adf3faf76 on public.agreement_ratings as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy __mt_baseline_probe_bd2a69bc385ca88c9dcb92d2 on public.agreement_ratings as PERMISSIVE for UPDATE to authenticated using ((rater_id = ( SELECT auth.uid() AS uid))) with check ((rater_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_56f3fefffca736fb3ac75750 on public.agreement_reminder_preferences as PERMISSIVE for DELETE to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM agreements
  WHERE ((agreements.id = agreement_reminder_preferences.agreement_id) AND ((agreements.proposer_id = ( SELECT auth.uid() AS uid)) OR (agreements.responder_id = ( SELECT auth.uid() AS uid))))))));
create policy __mt_baseline_probe_3744e5144bbc4749dc054332 on public.agreement_reminder_preferences as PERMISSIVE for INSERT to authenticated with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM agreements
  WHERE ((agreements.id = agreement_reminder_preferences.agreement_id) AND ((agreements.proposer_id = ( SELECT auth.uid() AS uid)) OR (agreements.responder_id = ( SELECT auth.uid() AS uid))))))));
create policy __mt_baseline_probe_529716eed6d7f9935d5e0349 on public.agreement_reminder_preferences as PERMISSIVE for SELECT to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM agreements
  WHERE ((agreements.id = agreement_reminder_preferences.agreement_id) AND ((agreements.proposer_id = ( SELECT auth.uid() AS uid)) OR (agreements.responder_id = ( SELECT auth.uid() AS uid))))))));
create policy __mt_baseline_probe_f5d188ebe252e44b80cde7c8 on public.agreement_reminder_preferences as PERMISSIVE for UPDATE to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM agreements
  WHERE ((agreements.id = agreement_reminder_preferences.agreement_id) AND ((agreements.proposer_id = ( SELECT auth.uid() AS uid)) OR (agreements.responder_id = ( SELECT auth.uid() AS uid)))))))) with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM agreements
  WHERE ((agreements.id = agreement_reminder_preferences.agreement_id) AND ((agreements.proposer_id = ( SELECT auth.uid() AS uid)) OR (agreements.responder_id = ( SELECT auth.uid() AS uid))))))));
create policy __mt_baseline_probe_f55bfaa19fa5b6dad86f1301 on public.agreement_reminder_rules as PERMISSIVE for DELETE to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM agreements
  WHERE ((agreements.id = agreement_reminder_rules.agreement_id) AND ((agreements.proposer_id = ( SELECT auth.uid() AS uid)) OR (agreements.responder_id = ( SELECT auth.uid() AS uid))))))));
create policy __mt_baseline_probe_8e05df81e5e015360f26078e on public.agreement_reminder_rules as PERMISSIVE for INSERT to authenticated with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM agreements
  WHERE ((agreements.id = agreement_reminder_rules.agreement_id) AND ((agreements.proposer_id = ( SELECT auth.uid() AS uid)) OR (agreements.responder_id = ( SELECT auth.uid() AS uid))))))));
create policy __mt_baseline_probe_9f667cf5afa8c46b4703a5a2 on public.agreement_reminder_rules as PERMISSIVE for SELECT to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM agreements
  WHERE ((agreements.id = agreement_reminder_rules.agreement_id) AND ((agreements.proposer_id = ( SELECT auth.uid() AS uid)) OR (agreements.responder_id = ( SELECT auth.uid() AS uid))))))));
create policy __mt_baseline_probe_17751ea9f7d96b6928cb0a84 on public.agreement_reminder_rules as PERMISSIVE for UPDATE to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM agreements
  WHERE ((agreements.id = agreement_reminder_rules.agreement_id) AND ((agreements.proposer_id = ( SELECT auth.uid() AS uid)) OR (agreements.responder_id = ( SELECT auth.uid() AS uid)))))))) with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM agreements
  WHERE ((agreements.id = agreement_reminder_rules.agreement_id) AND ((agreements.proposer_id = ( SELECT auth.uid() AS uid)) OR (agreements.responder_id = ( SELECT auth.uid() AS uid))))))));
create policy __mt_baseline_probe_fb52ea0f414c12177ea3417c on public.agreements as PERMISSIVE for SELECT to authenticated using (((proposer_id = ( SELECT auth.uid() AS uid)) OR (responder_id = ( SELECT auth.uid() AS uid))));
create policy __mt_baseline_probe_9c9073db6e327817dd0466b7 on public.background_claim_assurance_records as PERMISSIVE for INSERT to authenticated with check ((participant_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_1a6c8ceb90a3047ea1119747 on public.background_claim_assurance_records as PERMISSIVE for SELECT to authenticated using ((participant_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_3e9b88b6c36d0800dc7d8d8a on public.background_claim_assurance_records as PERMISSIVE for UPDATE to authenticated using ((participant_id = ( SELECT auth.uid() AS uid))) with check ((participant_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_61a3977984d1b1a454421969 on public.background_collective_policies as PERMISSIVE for INSERT to authenticated with check (viewer_can_access_collective(collective_id));
create policy __mt_baseline_probe_e91b1e5e234419aeb7899f7e on public.background_collective_policies as PERMISSIVE for SELECT to authenticated using (viewer_can_access_collective(collective_id));
create policy __mt_baseline_probe_eb30c4b00c5154f72a48041b on public.background_collective_policies as PERMISSIVE for UPDATE to authenticated using (viewer_can_access_collective(collective_id)) with check (viewer_can_access_collective(collective_id));
create policy __mt_baseline_probe_d6d9562f0d75a18b34cc6d82 on public.background_delegate_receipts as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_128ef590df064365962d100d on public.background_delegate_receipts as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_642931d4bf70296f8f21c0d8 on public.background_grant_receipts as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_8e8ddebdb0621dbcc6126973 on public.background_grant_receipts as PERMISSIVE for SELECT to authenticated using (((profile_id = ( SELECT auth.uid() AS uid)) OR (counterparty_id = ( SELECT auth.uid() AS uid))));
create policy __mt_baseline_probe_8a49dc7882e9c09757d98ff8 on public.background_grant_receipts as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_c9d86aeefd40d8372d1fbe2d on public.background_helper_runs as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_5ab49471ba5b6b1b88d3b0ff on public.background_helper_runs as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_e8c87c548306888969dc6a3b on public.background_helper_runs as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_d3fd150b3b78b8312f1f53aa on public.background_intent_claims as PERMISSIVE for DELETE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_f0e231702a9939d4f46e772a on public.background_intent_claims as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_4bcd137b43a04b5c0b4adb42 on public.background_intent_claims as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_f9e9dee4ed42c3983e34d149 on public.background_intent_claims as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_ae6e299d6b5484e36140c7cf on public.background_intro_packets as PERMISSIVE for INSERT to authenticated with check (((requester_profile_id = ( SELECT auth.uid() AS uid)) AND ((match_id IS NULL) OR profile_participates_in_match(match_id, ( SELECT auth.uid() AS uid)))));
create policy __mt_baseline_probe_20a2369d886185e0330f67ef on public.background_intro_packets as PERMISSIVE for SELECT to authenticated using (((requester_profile_id = ( SELECT auth.uid() AS uid)) OR (counterparty_profile_id = ( SELECT auth.uid() AS uid))));
create policy __mt_baseline_probe_79e10b9c15c6451f284a2202 on public.background_intro_packets as PERMISSIVE for UPDATE to authenticated using (((requester_profile_id = ( SELECT auth.uid() AS uid)) OR (counterparty_profile_id = ( SELECT auth.uid() AS uid)))) with check (((requester_profile_id = ( SELECT auth.uid() AS uid)) OR (counterparty_profile_id = ( SELECT auth.uid() AS uid))));
create policy __mt_baseline_probe_3e019b9adbafba07a0cf2cb4 on public.background_match_feedback as PERMISSIVE for INSERT to authenticated with check (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM background_opportunity_briefs
  WHERE ((background_opportunity_briefs.id = background_match_feedback.opportunity_brief_id) AND (background_opportunity_briefs.profile_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_a5d7f6f09043fee16f79519d on public.background_match_feedback as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_227da2f52d1912a7066564ae on public.background_match_feedback as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_80317589cad5f547900bc262 on public.background_match_runs as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_cb1b87de8cee92c4b88a2866 on public.background_match_runs as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_18669e6403c8ab17bbbf5019 on public.background_match_runs as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_942aa1b27f7408d154d42d2e on public.background_mute_rules as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_1b669332cee5309971624a15 on public.background_mute_rules as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_7eabff34dc93be06ce10046b on public.background_mute_rules as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_5fbb78c79f0863cdc4c46654 on public.background_notification_preferences as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_57c802308344679621cfc257 on public.background_notification_preferences as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_9203d391078438076d63a34c on public.background_notification_preferences as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_443e2d8f9718d63960be0fc7 on public.background_opportunity_briefs as PERMISSIVE for DELETE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_6ad2e7a9ad4668b27b1763e5 on public.background_opportunity_briefs as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_89e0ab40e483114f5de597a3 on public.background_opportunity_briefs as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_a514048c1f42be412f045580 on public.background_opportunity_briefs as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_9617de9072a8fa5ef44ba7e4 on public.background_pairwise_safety_preferences as PERMISSIVE for INSERT to authenticated with check ((participant_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_c58f5e1229539d28a2ace737 on public.background_pairwise_safety_preferences as PERMISSIVE for SELECT to authenticated using ((participant_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_20c604c91ac0064a19ee4e42 on public.background_pairwise_safety_preferences as PERMISSIVE for UPDATE to authenticated using ((participant_id = ( SELECT auth.uid() AS uid))) with check ((participant_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_5d1d9182df749507d9fdbbdf on public.background_private_overlap_checks as PERMISSIVE for INSERT to authenticated with check ((requester_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_80228c76b3bf5899710ffc80 on public.background_private_overlap_checks as PERMISSIVE for SELECT to authenticated using (((requester_id = ( SELECT auth.uid() AS uid)) OR (counterparty_id = ( SELECT auth.uid() AS uid))));
create policy __mt_baseline_probe_84945c3638c98d0c554bac23 on public.background_private_overlap_tags as PERMISSIVE for DELETE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_6fc53e42102b805c0b17f233 on public.background_private_overlap_tags as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_2c8916782c1e43ea1e0d2f87 on public.background_private_overlap_tags as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_560fe0a45f43db5d0ab32607 on public.background_profile_interview_answers as PERMISSIVE for DELETE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_696684f93a1a41bee924f9a9 on public.background_profile_interview_answers as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_c3c45965841230546bbd5df1 on public.background_profile_interview_answers as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_8d8ecf4792a2e75d0414448c on public.background_profile_interview_answers as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_939b5db9bccb470bf2316313 on public.background_profile_signals as PERMISSIVE for DELETE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_7c4bc3beb1cfec1443a36e50 on public.background_profile_signals as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_a18d0015caaa3e093425b51d on public.background_profile_signals as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_ad6e16ce60b2a7633e07b77f on public.background_profile_signals as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_d71108e12aff37e04bd085c9 on public.background_query_events as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_23b023f4c8dbc7fead74d8d3 on public.background_query_events as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_7d84607ff8f5223dfc43a61c on public.background_shadow_runs as PERMISSIVE for DELETE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_8a56362ca305951121abb979 on public.background_shadow_runs as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_f0e12342968a5609b485fe4f on public.background_shadow_runs as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_1a2576b9ff44d0238cdb040d on public.background_shadow_runs as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_fbe0e36c8f84b9ca2440b085 on public.background_source_summaries as PERMISSIVE for DELETE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_1d7f21c696a11a2d3a5846f0 on public.background_source_summaries as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_7f9fb982a778e48d9e26c836 on public.background_source_summaries as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_317578d1637d51ef456b14b4 on public.background_source_summaries as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_d68c1f82bc11421b47e76733 on public.background_source_sync_jobs as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_b490f87947422d7b4947c3d6 on public.background_source_sync_jobs as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_67640fcd568cb7520a46ed74 on public.background_source_sync_jobs as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_46783dc9da1a3f002f6510de on public.background_subject_identity_profiles as PERMISSIVE for INSERT to authenticated with check ((participant_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_6348658a76ceeae517d68859 on public.background_subject_identity_profiles as PERMISSIVE for SELECT to authenticated using ((participant_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_9e619fa742739e618433361e on public.background_subject_identity_profiles as PERMISSIVE for UPDATE to authenticated using ((participant_id = ( SELECT auth.uid() AS uid))) with check ((participant_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_aae3258593b7aa0e8a737506 on public.background_wish_dialogue_messages as PERMISSIVE for INSERT to authenticated with check (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM background_wish_dialogue_sessions
  WHERE ((background_wish_dialogue_sessions.id = background_wish_dialogue_messages.session_id) AND (background_wish_dialogue_sessions.profile_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_ecbb07b317fe281ae628a115 on public.background_wish_dialogue_messages as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_87d8af99f30080412c63dc5d on public.background_wish_dialogue_sessions as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_6c39c42f0d819f5c8914096b on public.background_wish_dialogue_sessions as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_046a9bce24fa52dc205b641a on public.background_wish_dialogue_sessions as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_69a3c33bbfbe016bedaa6a46 on public.background_wish_field_proposals as PERMISSIVE for INSERT to authenticated with check (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM background_wish_dialogue_sessions
  WHERE ((background_wish_dialogue_sessions.id = background_wish_field_proposals.session_id) AND (background_wish_dialogue_sessions.profile_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_3ada3c3ee102126eaaec9bfe on public.background_wish_field_proposals as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_54bae3bb4d74eb702a2c8259 on public.background_wish_field_proposals as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_e6fcc1bf474c8d0b5d908bc4 on public.brokerage_bounties as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_88208517f3c4d91361a8c057 on public.brokerage_bounties as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_eec6787a20090470f2ddc20f on public.brokerage_bounties as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_2ba5e6765e5b8ce850878086 on public.clarification_questions as PERMISSIVE for DELETE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_6310bc5f732ec426fafcce22 on public.clarification_questions as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_e4fc95298841dec81d5af3f5 on public.clarification_questions as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_67f3de72a8494a134cefc9ae on public.clarification_questions as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_032609d05421cb70c8fcc931 on public.cohort_attributions as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_a7e67b5d39947c543ca223f8 on public.cohort_attributions as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_4ce6573503f67f372555840f on public.cohort_attributions as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_dd512c3287ae85403dd2c3c5 on public.cohort_onboarding_profiles as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_3a7ed2336a1dba95b0ae5009 on public.cohort_onboarding_profiles as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_fa6687a4b5e875a798f16c74 on public.cohort_onboarding_profiles as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_1efa157e2b77b8f3018888c8 on public.collective_decision_responses as PERMISSIVE for INSERT to authenticated with check (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM collective_decisions
  WHERE ((collective_decisions.id = collective_decision_responses.decision_id) AND viewer_can_access_collective(collective_decisions.collective_id))))));
create policy __mt_baseline_probe_0db0129d21f26cbceffd6ff4 on public.collective_decision_responses as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM collective_decisions
  WHERE ((collective_decisions.id = collective_decision_responses.decision_id) AND viewer_can_access_collective(collective_decisions.collective_id)))));
create policy __mt_baseline_probe_2a2d447f6b2f73624d5975fa on public.collective_decision_responses as PERMISSIVE for SELECT to authenticated using (((profile_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM collective_decisions
  WHERE ((collective_decisions.id = collective_decision_responses.decision_id) AND viewer_can_access_collective(collective_decisions.collective_id))))));
create policy __mt_baseline_probe_8098fa61686a25e9360ee262 on public.collective_decision_responses as PERMISSIVE for UPDATE to authenticated using (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM collective_decisions
  WHERE ((collective_decisions.id = collective_decision_responses.decision_id) AND viewer_can_access_collective(collective_decisions.collective_id)))))) with check (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM collective_decisions
  WHERE ((collective_decisions.id = collective_decision_responses.decision_id) AND viewer_can_access_collective(collective_decisions.collective_id))))));
create policy __mt_baseline_probe_d9a5f8dfd0c1118699057d9a on public.collective_decisions as PERMISSIVE for INSERT to authenticated with check (((created_by = ( SELECT auth.uid() AS uid)) AND viewer_can_access_collective(collective_id)));
create policy __mt_baseline_probe_476393f93a708887d39241db on public.collective_decisions as PERMISSIVE for INSERT to authenticated with check (((created_by = ( SELECT auth.uid() AS uid)) AND viewer_can_access_collective(collective_id)));
create policy __mt_baseline_probe_1b72f27f3b85a1d8d7646c18 on public.collective_decisions as PERMISSIVE for SELECT to authenticated using (viewer_can_access_collective(collective_id));
create policy __mt_baseline_probe_6b7997aacb11d02451427619 on public.collective_decisions as PERMISSIVE for SELECT to authenticated using (viewer_can_access_collective(collective_id));
create policy __mt_baseline_probe_d8b3607c51b68b0a56ad449c on public.collective_decisions as PERMISSIVE for UPDATE to authenticated using (viewer_can_access_collective(collective_id)) with check (viewer_can_access_collective(collective_id));
create policy __mt_baseline_probe_a39caa46270530088cc5907c on public.collective_decisions as PERMISSIVE for UPDATE to authenticated using (viewer_can_access_collective(collective_id)) with check (viewer_can_access_collective(collective_id));
create policy __mt_baseline_probe_c14ef96aa728a12e101d7761 on public.collective_members as PERMISSIVE for INSERT to authenticated with check (((profile_id = ( SELECT auth.uid() AS uid)) OR viewer_can_access_collective(collective_id)));
create policy __mt_baseline_probe_4dc54e46ea6e620b25af52dd on public.collective_members as PERMISSIVE for SELECT to authenticated using (((profile_id = ( SELECT auth.uid() AS uid)) OR viewer_can_access_collective(collective_id)));
create policy __mt_baseline_probe_d1bc0327a236cb7c5bb67455 on public.collective_members as PERMISSIVE for UPDATE to authenticated using (((profile_id = ( SELECT auth.uid() AS uid)) OR viewer_can_access_collective(collective_id))) with check (((profile_id = ( SELECT auth.uid() AS uid)) OR viewer_can_access_collective(collective_id)));
create policy __mt_baseline_probe_3867549832cad350c4260f52 on public.collectives as PERMISSIVE for INSERT to authenticated with check ((owner_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_1d9eb18938200b83398e1e42 on public.collectives as PERMISSIVE for SELECT to authenticated using (viewer_can_access_collective(id));
create policy __mt_baseline_probe_279720fdae629c37737f8332 on public.collectives as PERMISSIVE for UPDATE to authenticated using ((owner_id = ( SELECT auth.uid() AS uid))) with check ((owner_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_96aded615d691f6c48338e16 on public.command_audit_events as PERMISSIVE for INSERT to authenticated with check (((profile_id = ( SELECT auth.uid() AS uid)) AND ((session_id IS NULL) OR (EXISTS ( SELECT 1
   FROM command_sessions s
  WHERE ((s.id = command_audit_events.session_id) AND (s.profile_id = ( SELECT auth.uid() AS uid))))))));
create policy __mt_baseline_probe_be52ce4efffca2b60be6285d on public.command_audit_events as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_2abcc8f516a8bbfa5fb9c63b on public.command_messages as PERMISSIVE for INSERT to authenticated with check (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM command_sessions s
  WHERE ((s.id = command_messages.session_id) AND (s.profile_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_a3263fbc9b5bf0fe7e1f00f9 on public.command_messages as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_3491ed4e20104893eda452f2 on public.command_runs as PERMISSIVE for INSERT to authenticated with check (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM command_sessions s
  WHERE ((s.id = command_runs.session_id) AND (s.profile_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_574d7825cb360e849286525e on public.command_runs as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_205459641e7002fa2befecc4 on public.command_runs as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_6c22b08f989d6cca36e795c6 on public.command_sessions as PERMISSIVE for DELETE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_2584113220aa9e6a5153cb48 on public.command_sessions as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_8ee0fe08dca0c7cc326d5746 on public.command_sessions as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_beac2eabcc766ab33e5c5f4a on public.command_sessions as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_392cd56e42f771a2ff8c639a on public.command_tool_calls as PERMISSIVE for INSERT to authenticated with check (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM command_runs r
  WHERE ((r.id = command_tool_calls.run_id) AND (r.session_id = r.session_id) AND (r.profile_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_e173d81122fef60b612a430e on public.command_tool_calls as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_0d386d0faebe24f449e80424 on public.command_tool_calls as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_4f4073019a59655c02f3843b on public.comment_votes as PERMISSIVE for DELETE to authenticated using ((user_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_a80dc6722526241b1bccd298 on public.comment_votes as PERMISSIVE for INSERT to authenticated with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_bc1253220f192d9de12adb2f on public.comment_votes as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy __mt_baseline_probe_adf16f57abc421dc9148d80e on public.comment_votes as PERMISSIVE for UPDATE to authenticated using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_869e226426898c8ab3d79b6e on public.core_loop_events as PERMISSIVE for INSERT to authenticated with check (((profile_id = ( SELECT auth.uid() AS uid)) AND (event_type = ANY (ARRAY['offer_draft_saved'::text, 'offer_submitted'::text])) AND (entity_type = 'offer'::text) AND (entity_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM offers offer
  WHERE ((offer.id = core_loop_events.entity_id) AND (offer.owner_id = ( SELECT auth.uid() AS uid))))) AND (idempotency_key = concat(event_type, ':', (profile_id)::text, ':offer:', (entity_id)::text))));
create policy __mt_baseline_probe_9bc64e3a120affee2cd801d0 on public.core_loop_events as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_7a945e73393ebf4dc38ce6a6 on public.credibility_events as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_349a13b09dcc7bc0fa4d8fa8 on public.credibility_model_versions as PERMISSIVE for SELECT to anon, authenticated using ((status = ANY (ARRAY['active'::text, 'retired'::text])));
create policy __mt_baseline_probe_da8d55b835d91a84af0ba684 on public.credibility_profile_status as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy __mt_baseline_probe_d738aaf6107006759b6d2772 on public.credibility_public_aggregates as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy __mt_baseline_probe_5477738f40b1a5ca805b3d17 on public.credibility_restrictions as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_7079fae08d5ce874b1d24780 on public.donation_offset_matches as PERMISSIVE for INSERT to authenticated with check ((owner_profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_57ceb8a10df8ccb2b76d1c08 on public.donation_offset_matches as PERMISSIVE for SELECT to authenticated using (((owner_profile_id = ( SELECT auth.uid() AS uid)) OR (counterparty_profile_id = ( SELECT auth.uid() AS uid))));
create policy __mt_baseline_probe_3aafaa5a0d68f21d004bcf5c on public.donation_offset_matches as PERMISSIVE for UPDATE to authenticated using ((owner_profile_id = ( SELECT auth.uid() AS uid))) with check ((owner_profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_20cc2b55a4ac8046acb7ef07 on public.donation_offset_offers as PERMISSIVE for DELETE to authenticated using ((EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = donation_offset_offers.offer_id) AND (offers.owner_id = ( SELECT auth.uid() AS uid))))));
create policy __mt_baseline_probe_1cd92a89bb39803bf0d51f3d on public.donation_offset_offers as PERMISSIVE for INSERT to authenticated with check ((EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = donation_offset_offers.offer_id) AND (offers.owner_id = ( SELECT auth.uid() AS uid))))));
create policy __mt_baseline_probe_4133ac203fb692cd99754768 on public.donation_offset_offers as PERMISSIVE for SELECT to anon, authenticated using ((EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = donation_offset_offers.offer_id) AND ((offers.status = 'open'::offer_status) OR (offers.owner_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_331355223cbd63b6b32f8e17 on public.donation_offset_offers as PERMISSIVE for UPDATE to authenticated using ((EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = donation_offset_offers.offer_id) AND (offers.owner_id = ( SELECT auth.uid() AS uid)))))) with check ((EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = donation_offset_offers.offer_id) AND (offers.owner_id = ( SELECT auth.uid() AS uid))))));
create policy __mt_baseline_probe_16fe8b888d59e0b5649a3d28 on public.donation_offset_pools as PERMISSIVE for INSERT to authenticated with check ((created_by = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_afddb6d4b87692b56e99fcad on public.donation_offset_pools as PERMISSIVE for SELECT to anon, authenticated using (((status <> 'closed'::text) AND (moderation_status = 'clear'::text)));
create policy __mt_baseline_probe_cb29c9bac00190561d6dd215 on public.donation_offset_pools as PERMISSIVE for UPDATE to authenticated using ((created_by = ( SELECT auth.uid() AS uid))) with check ((created_by = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_01a52376ceed2cea56e8b40b on public.email_nurture_subscriptions as PERMISSIVE for INSERT to anon, authenticated with check ((((profile_id IS NULL) OR (profile_id = ( SELECT auth.uid() AS uid))) AND ((char_length(email) >= 3) AND (char_length(email) <= 320)) AND ((char_length(segment) >= 1) AND (char_length(segment) <= 80)) AND (jsonb_typeof(attribution) = 'object'::text)));
create policy __mt_baseline_probe_5926bb946997960bbc360340 on public.email_nurture_subscriptions as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_c283b932018d7a45a6f6cee8 on public.fallback_livestream_evidence_routes as PERMISSIVE for INSERT to authenticated with check (((creator_id = ( SELECT auth.uid() AS uid)) AND (subject_user_id = ( SELECT auth.uid() AS uid)) AND (reviewed_at IS NULL) AND (reviewer_id IS NULL) AND (review_decision IS NULL) AND (status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'armed'::text])) AND ((EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = fallback_livestream_evidence_routes.offer_id) AND (offers.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM agreements
  WHERE ((agreements.id = fallback_livestream_evidence_routes.commitment_id) AND ((agreements.proposer_id = ( SELECT auth.uid() AS uid)) OR (agreements.responder_id = ( SELECT auth.uid() AS uid)))))))));
create policy __mt_baseline_probe_b8d255884ee5b23d7570217e on public.fallback_livestream_evidence_routes as PERMISSIVE for SELECT to authenticated using (((creator_id = ( SELECT auth.uid() AS uid)) OR (subject_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = fallback_livestream_evidence_routes.offer_id) AND (offers.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM agreements
  WHERE ((agreements.id = fallback_livestream_evidence_routes.commitment_id) AND ((agreements.proposer_id = ( SELECT auth.uid() AS uid)) OR (agreements.responder_id = ( SELECT auth.uid() AS uid))))))));
create policy __mt_baseline_probe_83a80d8ed24594e38cab0782 on public.fallback_livestream_evidence_routes as PERMISSIVE for UPDATE to authenticated using (((creator_id = ( SELECT auth.uid() AS uid)) AND (reviewed_at IS NULL) AND (reviewer_id IS NULL) AND (review_decision IS NULL) AND (status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'armed'::text, 'due'::text, 'live_window'::text, 'recording_due'::text, 'submitted'::text, 'cancelled'::text])))) with check (((creator_id = ( SELECT auth.uid() AS uid)) AND (subject_user_id = ( SELECT auth.uid() AS uid)) AND (reviewed_at IS NULL) AND (reviewer_id IS NULL) AND (review_decision IS NULL) AND (status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'armed'::text, 'due'::text, 'live_window'::text, 'recording_due'::text, 'submitted'::text, 'cancelled'::text]))));
create policy __mt_baseline_probe_3a518ce90a5277e94d7605d3 on public.financial_commitment_pools as PERMISSIVE for SELECT to PUBLIC using ((owner_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_ab185810f3aa97f952f055fa on public.financial_commitment_reservations as PERMISSIVE for SELECT to PUBLIC using (((EXISTS ( SELECT 1
   FROM financial_commitment_pools pool
  WHERE ((pool.pool_key = financial_commitment_reservations.pool_key) AND (pool.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM agreements agreement
  WHERE ((agreement.id = financial_commitment_reservations.agreement_id) AND ((( SELECT auth.uid() AS uid) = agreement.proposer_id) OR (( SELECT auth.uid() AS uid) = agreement.responder_id)))))));
create policy __mt_baseline_probe_6a96fa3baf7b2c91da1fbf3b on public.funnel_events as PERMISSIVE for INSERT to anon, authenticated with check ((((profile_id IS NULL) OR (profile_id = ( SELECT auth.uid() AS uid))) AND ((char_length(event_type) >= 1) AND (char_length(event_type) <= 100)) AND (char_length(path) <= 1000) AND (jsonb_typeof(metadata) = 'object'::text)));
create policy __mt_baseline_probe_eff1f02aa873c67a2eca80e7 on public.guest_interests as PERMISSIVE for UPDATE to authenticated using (((claimed_by_profile_id = ( SELECT auth.uid() AS uid)) OR ((claimed_by_profile_id IS NULL) AND (lower(contact_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text)))))) with check (((claimed_by_profile_id = ( SELECT auth.uid() AS uid)) AND (lower(contact_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text)))));
create policy __mt_baseline_probe_f6c5b2ee0910b61c7dea7beb on public.guest_interests as PERMISSIVE for INSERT to anon, authenticated with check (((contact_email <> ''::text) AND (claimed_by_profile_id IS NULL) AND (EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = guest_interests.offer_id) AND (offers.status = 'open'::offer_status) AND ((( SELECT auth.uid() AS uid) IS NULL) OR (offers.owner_id <> ( SELECT auth.uid() AS uid))))))));
create policy __mt_baseline_probe_ccf44871bebd17e3603c873c on public.guest_interests as PERMISSIVE for SELECT to authenticated using (((claimed_by_profile_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = guest_interests.offer_id) AND (offers.owner_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_2907663bf3e3226d8a5a2d42 on public.guest_interests as PERMISSIVE for UPDATE to authenticated using ((EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = guest_interests.offer_id) AND (offers.owner_id = ( SELECT auth.uid() AS uid)))))) with check ((EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = guest_interests.offer_id) AND (offers.owner_id = ( SELECT auth.uid() AS uid))))));
create policy __mt_baseline_probe_f0c3bdc7b13d9b5492b65371 on public.helper_runs as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_3facb34fd348cfffcead3afb on public.helper_runs as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_664e473a47bf18aecb7b6054 on public.helper_strategies as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_90b246c1529b16fdb1748308 on public.helper_strategies as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_fa6e4fda8037b321df67c94b on public.helper_strategies as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_41e7c884795d30ea3c140b65 on public.impact_contributions as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_3aff827e81ef2a714f6ec25c on public.impact_contributions as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_3b6c09674daf8f0f612e2ced on public.impact_contributions as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_2941bca0ac9b8003c0e36a2c on public.interests as PERMISSIVE for INSERT to authenticated with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = interests.offer_id) AND (offers.owner_id <> ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_50fc954a12c11915db788433 on public.interests as PERMISSIVE for SELECT to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = interests.offer_id) AND (offers.owner_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_019d21e7e3ddc6b2754071c2 on public.interests as PERMISSIVE for UPDATE to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = interests.offer_id) AND (offers.owner_id = ( SELECT auth.uid() AS uid))))))) with check (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = interests.offer_id) AND (offers.owner_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_4e6c57b9ea93d3190c044337 on public.match_audit_events as PERMISSIVE for INSERT to authenticated with check (((actor_profile_id = ( SELECT auth.uid() AS uid)) AND ((match_id IS NULL) OR viewer_participates_in_match(match_id))));
create policy __mt_baseline_probe_f523a0d6f6d382e5ec01407b on public.match_audit_events as PERMISSIVE for SELECT to authenticated using (((actor_profile_id = ( SELECT auth.uid() AS uid)) OR ((match_id IS NOT NULL) AND viewer_participates_in_match(match_id))));
create policy __mt_baseline_probe_5c469aa45ab168ae4f8f6782 on public.match_concierge_events as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM match_concierge_requests
  WHERE ((match_concierge_requests.id = match_concierge_events.request_id) AND ((match_concierge_requests.requester_profile_id = ( SELECT auth.uid() AS uid)) OR (match_concierge_requests.target_profile_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_03967111554b13051b07f27c on public.match_concierge_requests as PERMISSIVE for INSERT to authenticated with check ((requester_profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_b54b4bfe6a18c638d41f0366 on public.match_concierge_requests as PERMISSIVE for SELECT to authenticated using (((requester_profile_id = ( SELECT auth.uid() AS uid)) OR (target_profile_id = ( SELECT auth.uid() AS uid))));
create policy __mt_baseline_probe_fb24a99f52371647e7292d68 on public.match_concierge_requests as PERMISSIVE for UPDATE to authenticated using (((requester_profile_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['open'::text, 'waiting_on_requester'::text])))) with check ((requester_profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_017830781df9aeb05b1392c6 on public.match_consents as PERMISSIVE for INSERT to authenticated with check (((profile_id = ( SELECT auth.uid() AS uid)) AND viewer_participates_in_match(match_id)));
create policy __mt_baseline_probe_38ec04aaff5050d254d6020c on public.match_consents as PERMISSIVE for SELECT to authenticated using (((profile_id = ( SELECT auth.uid() AS uid)) OR viewer_can_see_match_identity(match_id)));
create policy __mt_baseline_probe_224159b5a332f145fd07b5d8 on public.match_consents as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_fa8dc3c4d29ffde496100db1 on public.match_explanation_snapshots as PERMISSIVE for INSERT to authenticated with check (((profile_id = ( SELECT auth.uid() AS uid)) AND viewer_participates_in_match(match_id)));
create policy __mt_baseline_probe_2fb63f97f21ddd8add9f3da9 on public.match_explanation_snapshots as PERMISSIVE for SELECT to authenticated using (((profile_id = ( SELECT auth.uid() AS uid)) AND viewer_participates_in_match(match_id)));
create policy __mt_baseline_probe_cb493a3fb8d9d8847dddd599 on public.match_introduction_plans as PERMISSIVE for INSERT to authenticated with check (((profile_id = ( SELECT auth.uid() AS uid)) AND viewer_participates_in_match(match_id)));
create policy __mt_baseline_probe_6dd4b9c98110eb9009c4ad0f on public.match_introduction_plans as PERMISSIVE for SELECT to authenticated using (((profile_id = ( SELECT auth.uid() AS uid)) OR (counterparty_id = ( SELECT auth.uid() AS uid))));
create policy __mt_baseline_probe_50f8ac84a43b88761397480f on public.match_introduction_plans as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_c0986b1de19d31271e562fc6 on public.match_introduction_tasks as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_cb356fd8d980e51eca2250a5 on public.match_introduction_tasks as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_4b542d37a024d4c8188f8674 on public.match_reports as PERMISSIVE for INSERT to authenticated with check (((reporter_profile_id = ( SELECT auth.uid() AS uid)) AND viewer_participates_in_match(match_id)));
create policy __mt_baseline_probe_4aefa27fd9266c7d252cdc75 on public.match_reports as PERMISSIVE for SELECT to authenticated using ((reporter_profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_d4ef67a8408e4ceb0576a606 on public.match_suggestions as PERMISSIVE for INSERT to authenticated with check (((profile_a_id = ( SELECT auth.uid() AS uid)) OR (profile_b_id = ( SELECT auth.uid() AS uid))));
create policy __mt_baseline_probe_d3b3f5cb37de48852e28490f on public.match_suggestions as PERMISSIVE for SELECT to authenticated using (viewer_can_see_match_identity(id));
create policy __mt_baseline_probe_fd99a84f8110f94fe9a42426 on public.match_suggestions as PERMISSIVE for UPDATE to authenticated using (viewer_participates_in_match(id)) with check ((viewer_participates_in_match(id) AND (status = 'dismissed'::match_suggestion_status) AND (identity_revealed = false)));
create policy __mt_baseline_probe_ca4fecaf3e43d0fb969f599f on public.moral_trade_create_offer_terms as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = moral_trade_create_offer_terms.offer_id) AND (offers.owner_id = ( SELECT auth.uid() AS uid))))));
create policy __mt_baseline_probe_0f50faa6a676b04e144bc0c4 on public.moral_trade_create_pool_terms as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM mpgf_pool_proposals
  WHERE ((mpgf_pool_proposals.id = moral_trade_create_pool_terms.pool_proposal_id) AND (mpgf_pool_proposals.proposer_id = ( SELECT auth.uid() AS uid))))));
create policy __mt_baseline_probe_ab9a5fb23c09b4e3968bc4ba on public.moral_trade_create_submissions as PERMISSIVE for SELECT to authenticated using ((owner_profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_29be64e8771b99e209a53668 on public.moral_trade_donation_redirect_proposals as PERMISSIVE for SELECT to authenticated using ((owner_profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_d5e6b0d2c468a953c37f2a75 on public.moral_trade_feed_create_events as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_c40463d9c3d628b7a9b7a4f3 on public.moral_trade_feed_create_links as PERMISSIVE for SELECT to authenticated using ((creator_profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_2d50e28e95f7e9d4133d16fd on public.mpgf_ballots as PERMISSIVE for INSERT to authenticated with check ((((profile_id = auth.uid()) OR (user_id = auth.uid())) AND (real_money = false)));
create policy __mt_baseline_probe_1c14a8d8e366e9b4f6dde537 on public.mpgf_ballots as PERMISSIVE for SELECT to authenticated using (((profile_id = auth.uid()) OR (user_id = auth.uid())));
create policy __mt_baseline_probe_8ac5431ec952c2847ce6baa4 on public.mpgf_ballots as PERMISSIVE for UPDATE to authenticated using (((profile_id = auth.uid()) OR (user_id = auth.uid()))) with check ((((profile_id = auth.uid()) OR (user_id = auth.uid())) AND (real_money = false)));
create policy __mt_baseline_probe_65af95ef0f3e198e9b965472 on public.mpgf_completion_gate_evaluations as PERMISSIVE for SELECT to authenticated using (true);
create policy __mt_baseline_probe_b7b4452820cff310ef8503aa on public.mpgf_dac_campaign_outcomes as PERMISSIVE for SELECT to anon, authenticated using ((EXISTS ( SELECT 1
   FROM mpgf_public_goods_campaigns campaign
  WHERE ((campaign.id = mpgf_dac_campaign_outcomes.campaign_id) AND (campaign.pool_proposal_id = mpgf_dac_campaign_outcomes.pool_proposal_id) AND (campaign.review_status = 'finalized'::text)))));
create policy __mt_baseline_probe_52d3d4f2ddb0c0f5fb4a2835 on public.mpgf_dac_pledge_events as PERMISSIVE for SELECT to authenticated using ((profile_id = auth.uid()));
create policy __mt_baseline_probe_1cfc0269224f92f17a17d396 on public.mpgf_dac_pledge_intents as PERMISSIVE for SELECT to authenticated using ((profile_id = auth.uid()));
create policy __mt_baseline_probe_40f0fbcff091a4e44ac6462a on public.mpgf_failure_bonus_premium_quotes as PERMISSIVE for SELECT to anon, authenticated using (((status = 'approved'::text) OR ((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM mpgf_pool_proposals proposal
  WHERE ((proposal.id = mpgf_failure_bonus_premium_quotes.pool_proposal_id) AND (proposal.proposer_id = auth.uid())))))));
create policy __mt_baseline_probe_ddad660210dc8bdf13b0e3d8 on public.mpgf_failure_bonus_reserves as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy __mt_baseline_probe_6c5a37d4cf65802b8c877533 on public.mpgf_payout_compliance_reviews as PERMISSIVE for SELECT to authenticated using (true);
create policy __mt_baseline_probe_1358e3b0028bd9ebfced6554 on public.mpgf_phase_one_ballot_approvals as RESTRICTIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_8a080031ef32f5e1ce864bf6 on public.mpgf_phase_one_ballots as RESTRICTIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_4ca3b03d14865bbc51ca8b1b on public.mpgf_phase_one_candidate_snapshots as RESTRICTIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_eb8286b020add83915cfa453 on public.mpgf_phase_one_checkout_handoffs as RESTRICTIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_4dc20af34f16279f8291d413 on public.mpgf_phase_one_eligible_voters as RESTRICTIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_196648c2d0f24c6077bb4301 on public.mpgf_phase_one_idempotency_keys as RESTRICTIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_ab44bc5674b1b509c5306a7c on public.mpgf_phase_one_pledges as RESTRICTIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_2a1896b5481ee75a85ba90a2 on public.mpgf_phase_one_projects as RESTRICTIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_8d2fe1b050ff4a2c3a52ae26 on public.mpgf_phase_one_rounds as RESTRICTIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_f4720d243387e81aa7ec8531 on public.mpgf_pledges as PERMISSIVE for INSERT to authenticated with check ((((profile_id = auth.uid()) OR (user_id = auth.uid())) AND (real_money = false) AND (payment_provider_object_id IS NULL) AND (pledge_mode = 'pledge_only'::text)));
create policy __mt_baseline_probe_a593b17f7a16effd9820562d on public.mpgf_pledges as PERMISSIVE for SELECT to authenticated using (((profile_id = auth.uid()) OR (user_id = auth.uid())));
create policy __mt_baseline_probe_2d0e49cbb28a8b4935c4de5d on public.mpgf_pledges as PERMISSIVE for UPDATE to authenticated using (((profile_id = auth.uid()) OR (user_id = auth.uid()))) with check ((((profile_id = auth.uid()) OR (user_id = auth.uid())) AND (real_money = false) AND (payment_provider_object_id IS NULL) AND (pledge_mode = 'pledge_only'::text)));
create policy __mt_baseline_probe_c1f8cbbb1749cfbb817036fa on public.mpgf_pool_lifecycle_events as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM mpgf_pool_proposals proposal
  WHERE ((proposal.id = mpgf_pool_lifecycle_events.proposal_id) AND (proposal.proposer_id = auth.uid())))));
create policy __mt_baseline_probe_19fa5e658c7e69a9f5eec110 on public.mpgf_pool_proposal_versions as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM mpgf_pool_proposals proposal
  WHERE ((proposal.id = mpgf_pool_proposal_versions.proposal_id) AND (proposal.proposer_id = auth.uid())))));
create policy __mt_baseline_probe_f3aefa41feba29fe169e81e1 on public.mpgf_pool_proposals as PERMISSIVE for INSERT to authenticated with check ((proposer_id = auth.uid()));
create policy __mt_baseline_probe_fd76558cdc398675541bc69d on public.mpgf_pool_proposals as PERMISSIVE for UPDATE to authenticated using ((proposer_id = auth.uid())) with check ((proposer_id = auth.uid()));
create policy __mt_baseline_probe_eb2bb5f4e16e66016528714b on public.mpgf_pool_proposals as PERMISSIVE for SELECT to authenticated using ((proposer_id = auth.uid()));
create policy __mt_baseline_probe_78746e80f9e340d0730e1212 on public.mpgf_production_verification_runs as PERMISSIVE for SELECT to authenticated using (true);
create policy __mt_baseline_probe_65459ff15bcd95eb1fe3be25 on public.mpgf_public_goods_campaigns as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy __mt_baseline_probe_f9cb6ca4bdd8f4955a39f647 on public.mpgf_public_goods_match_pools as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy __mt_baseline_probe_7889ca7f55bf4b0b2b367fa3 on public.mpgf_public_goods_pledges as PERMISSIVE for INSERT to authenticated with check ((profile_id = auth.uid()));
create policy __mt_baseline_probe_2a21d401e1fe98e2d41b243e on public.mpgf_public_goods_pledges as PERMISSIVE for SELECT to authenticated using ((profile_id = auth.uid()));
create policy __mt_baseline_probe_eeba2c051fe4ad40a0d48bb0 on public.mpgf_public_goods_pledges as PERMISSIVE for UPDATE to authenticated using ((profile_id = auth.uid())) with check ((profile_id = auth.uid()));
create policy __mt_baseline_probe_5b82b1fcb3276ecb86050063 on public.mpgf_public_goods_rounds as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy __mt_baseline_probe_a3690f20a3237a348c57c348 on public.mpgf_recurring_contribution_commitments as PERMISSIVE for INSERT to authenticated with check (((user_id = auth.uid()) AND (mode = 'pledge_only'::text) AND (provider_subscription_id IS NULL)));
create policy __mt_baseline_probe_c3ebdc8c7b42690c55669d70 on public.mpgf_recurring_contribution_commitments as PERMISSIVE for SELECT to authenticated using ((user_id = auth.uid()));
create policy __mt_baseline_probe_61fa2b0f4bf5c79963d38adf on public.mpgf_recurring_contribution_commitments as PERMISSIVE for UPDATE to authenticated using ((user_id = auth.uid())) with check (((user_id = auth.uid()) AND (mode = 'pledge_only'::text) AND (provider_subscription_id IS NULL)));
create policy __mt_baseline_probe_d5402b3499054f5957a657d1 on public.mpgf_solver_certification_runs as PERMISSIVE for SELECT to authenticated using (true);
create policy __mt_baseline_probe_72f45319b880d1b37cff7659 on public.network_invites as PERMISSIVE for DELETE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_b34fd6067feeae4234acffb3 on public.network_invites as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_92084a435070209902c74213 on public.network_invites as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_d5340319af86e407a8d14ade on public.network_invites as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_15f00ae79348d46f68605f28 on public.offer_carts as PERMISSIVE for DELETE to authenticated using ((user_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_998dd7ae9a53c1b30339a5f1 on public.offer_carts as PERMISSIVE for INSERT to authenticated with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = offer_carts.offer_id) AND (offers.owner_id <> ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_d2a36aa1822f6a3f735bf86d on public.offer_carts as PERMISSIVE for SELECT to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM offers
  WHERE ((offers.id = offer_carts.offer_id) AND (offers.owner_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_daa3bfbaec1051d7f662e48d on public.offer_catalog_entries as PERMISSIVE for SELECT to PUBLIC using (true);
create policy __mt_baseline_probe_edbb7bed519aac81e4fed728 on public.offer_comments as PERMISSIVE for DELETE to authenticated using ((author_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_9d5b9604ce02ecbf0a2876b5 on public.offer_comments as PERMISSIVE for INSERT to authenticated with check (((author_id = ( SELECT auth.uid() AS uid)) AND ((depth >= 0) AND (depth <= 49))));
create policy __mt_baseline_probe_59aedc32cebb1b5134a53795 on public.offer_comments as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy __mt_baseline_probe_17da9e713cc2eb76946bd3f1 on public.offer_comments as PERMISSIVE for UPDATE to authenticated using ((author_id = ( SELECT auth.uid() AS uid))) with check ((author_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_ba7180168aecff5eda2415f8 on public.offer_recommendations as PERMISSIVE for DELETE to authenticated using ((recommender_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_522c4159c45b3a489ee65ce2 on public.offer_recommendations as PERMISSIVE for INSERT to authenticated with check (((recommender_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM offers recommended_offer
  WHERE ((recommended_offer.id = offer_recommendations.recommended_offer_id) AND (recommended_offer.owner_id <> ( SELECT auth.uid() AS uid))))) AND ((source_offer_id IS NULL) OR (EXISTS ( SELECT 1
   FROM offers source_offer
  WHERE ((source_offer.id = offer_recommendations.source_offer_id) AND (source_offer.owner_id = ( SELECT auth.uid() AS uid))))))));
create policy __mt_baseline_probe_3c863df427bdc3ac97ed707b on public.offer_recommendations as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy __mt_baseline_probe_74cf7b9a6fffa81df25e58e1 on public.offers as PERMISSIVE for DELETE to authenticated using ((( SELECT auth.uid() AS uid) = owner_id));
create policy __mt_baseline_probe_cd560b71e73eb71c94add18b on public.offers as PERMISSIVE for INSERT to authenticated with check ((( SELECT auth.uid() AS uid) = owner_id));
create policy __mt_baseline_probe_dd977039e10d5a51f9a66c7b on public.offers as PERMISSIVE for SELECT to anon, authenticated using (((status = 'open'::offer_status) OR (owner_id = ( SELECT auth.uid() AS uid)) OR viewer_has_interest_for_offer(id) OR viewer_has_offer_in_cart(id)));
create policy __mt_baseline_probe_9f4a9d23e81b6298e09dd4b7 on public.offers as PERMISSIVE for UPDATE to authenticated using ((( SELECT auth.uid() AS uid) = owner_id)) with check ((( SELECT auth.uid() AS uid) = owner_id));
create policy __mt_baseline_probe_d3ab624b4e47e260413fffd5 on public.performance_bonds as PERMISSIVE for SELECT to authenticated using (((auth.uid() = party_id) OR (auth.uid() = counterparty_id)));
create policy __mt_baseline_probe_80c48d47d39f94f735106179 on public.performance_bonds as PERMISSIVE for INSERT to authenticated with check ((auth.uid() = party_id));
create policy __mt_baseline_probe_643ba82fff512f0fe0880f68 on public.performance_bonds as PERMISSIVE for DELETE to authenticated using (((auth.uid() = party_id) AND (status = ANY (ARRAY['not_enabled'::text, 'draft'::text, 'cancelled'::text]))));
create policy __mt_baseline_probe_15213f0563eb39fe0fe22dfd on public.performance_bonds as PERMISSIVE for UPDATE to authenticated using ((auth.uid() = party_id)) with check ((auth.uid() = party_id));
create policy __mt_baseline_probe_d1baabed36fe96ca8089c6ef on public.personal_delegates as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_c37f08abb7f9eb9b2d0cd1a6 on public.personal_delegates as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_13bbb9e01c53b3de93f4ded5 on public.personal_delegates as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_f3128766a09a7ff4d49f45c9 on public.priority_cause_area_allocations as PERMISSIVE for INSERT to authenticated with check (((submitted_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM priority_correction_arbiter_assignments
  WHERE ((priority_correction_arbiter_assignments.cycle_id = priority_cause_area_allocations.cycle_id) AND (priority_correction_arbiter_assignments.profile_id = ( SELECT auth.uid() AS uid)) AND (priority_correction_arbiter_assignments.role = 'cause_area_arbiter'::text) AND (priority_correction_arbiter_assignments.status = 'active'::text))))));
create policy __mt_baseline_probe_9a4f04377a8a81cea7873663 on public.priority_cause_area_allocations as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy __mt_baseline_probe_f2becb589e3f8e94bf837460 on public.priority_cause_area_allocations as PERMISSIVE for UPDATE to authenticated using ((EXISTS ( SELECT 1
   FROM priority_correction_arbiter_assignments
  WHERE ((priority_correction_arbiter_assignments.cycle_id = priority_cause_area_allocations.cycle_id) AND (priority_correction_arbiter_assignments.profile_id = ( SELECT auth.uid() AS uid)) AND (priority_correction_arbiter_assignments.role = 'cause_area_arbiter'::text) AND (priority_correction_arbiter_assignments.status = 'active'::text))))) with check ((EXISTS ( SELECT 1
   FROM priority_correction_arbiter_assignments
  WHERE ((priority_correction_arbiter_assignments.cycle_id = priority_cause_area_allocations.cycle_id) AND (priority_correction_arbiter_assignments.profile_id = ( SELECT auth.uid() AS uid)) AND (priority_correction_arbiter_assignments.role = 'cause_area_arbiter'::text) AND (priority_correction_arbiter_assignments.status = 'active'::text)))));
create policy __mt_baseline_probe_ac24ddcb9773005caaf44df0 on public.priority_cause_area_feedback as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_a14257c29cacb5a45f26d934 on public.priority_cause_area_feedback as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_f86e2e6a0c92e818e1d61d4f on public.priority_cause_area_feedback as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_d49f49e8998782f0d2c2748f on public.priority_cause_area_positions as PERMISSIVE for INSERT to authenticated with check ((EXISTS ( SELECT 1
   FROM priority_correction_arbiter_assignments
  WHERE ((priority_correction_arbiter_assignments.id = priority_cause_area_positions.arbiter_assignment_id) AND (priority_correction_arbiter_assignments.profile_id = ( SELECT auth.uid() AS uid))))));
create policy __mt_baseline_probe_fd1a2b4994a60e0f66c1b54a on public.priority_cause_area_positions as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM priority_correction_arbiter_assignments
  WHERE ((priority_correction_arbiter_assignments.id = priority_cause_area_positions.arbiter_assignment_id) AND (priority_correction_arbiter_assignments.profile_id = ( SELECT auth.uid() AS uid))))));
create policy __mt_baseline_probe_1c06298c13a584597753ce6b on public.priority_cause_area_positions as PERMISSIVE for UPDATE to authenticated using ((EXISTS ( SELECT 1
   FROM priority_correction_arbiter_assignments
  WHERE ((priority_correction_arbiter_assignments.id = priority_cause_area_positions.arbiter_assignment_id) AND (priority_correction_arbiter_assignments.profile_id = ( SELECT auth.uid() AS uid)))))) with check ((EXISTS ( SELECT 1
   FROM priority_correction_arbiter_assignments
  WHERE ((priority_correction_arbiter_assignments.id = priority_cause_area_positions.arbiter_assignment_id) AND (priority_correction_arbiter_assignments.profile_id = ( SELECT auth.uid() AS uid))))));
create policy __mt_baseline_probe_4dc880163df926169d750fa2 on public.priority_correction_arbiter_assignments as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy __mt_baseline_probe_8eceb1fb7cc956376ce95054 on public.priority_correction_cycles as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy __mt_baseline_probe_11865ad6b9eded7f4b28d406 on public.priority_correction_member_snapshots as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_00281df8f847b7f1208cbabc on public.priority_specific_action_feedback as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_8f4d9c8b68aac258b9ba6067 on public.priority_specific_action_feedback as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_d1d3bfaa35c741f69cecf218 on public.priority_specific_action_feedback as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_a1d32409378ad1309a4b9f21 on public.priority_specific_action_positions as PERMISSIVE for INSERT to authenticated with check ((EXISTS ( SELECT 1
   FROM priority_correction_arbiter_assignments
  WHERE ((priority_correction_arbiter_assignments.id = priority_specific_action_positions.arbiter_assignment_id) AND (priority_correction_arbiter_assignments.profile_id = ( SELECT auth.uid() AS uid))))));
create policy __mt_baseline_probe_144c4266c4c085e50e1334fe on public.priority_specific_action_positions as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM priority_correction_arbiter_assignments
  WHERE ((priority_correction_arbiter_assignments.id = priority_specific_action_positions.arbiter_assignment_id) AND (priority_correction_arbiter_assignments.profile_id = ( SELECT auth.uid() AS uid))))));
create policy __mt_baseline_probe_e386149e0066a6107a6c01fe on public.priority_specific_action_positions as PERMISSIVE for UPDATE to authenticated using ((EXISTS ( SELECT 1
   FROM priority_correction_arbiter_assignments
  WHERE ((priority_correction_arbiter_assignments.id = priority_specific_action_positions.arbiter_assignment_id) AND (priority_correction_arbiter_assignments.profile_id = ( SELECT auth.uid() AS uid)))))) with check ((EXISTS ( SELECT 1
   FROM priority_correction_arbiter_assignments
  WHERE ((priority_correction_arbiter_assignments.id = priority_specific_action_positions.arbiter_assignment_id) AND (priority_correction_arbiter_assignments.profile_id = ( SELECT auth.uid() AS uid))))));
create policy __mt_baseline_probe_3a35e2791b92ec70f52753de on public.priority_specific_action_submissions as PERMISSIVE for INSERT to authenticated with check (((submitted_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM priority_correction_arbiter_assignments
  WHERE ((priority_correction_arbiter_assignments.cycle_id = priority_specific_action_submissions.cycle_id) AND (priority_correction_arbiter_assignments.profile_id = ( SELECT auth.uid() AS uid)) AND (priority_correction_arbiter_assignments.role = 'specific_action_arbiter'::text) AND (priority_correction_arbiter_assignments.cause_area = priority_specific_action_submissions.cause_area) AND (priority_correction_arbiter_assignments.status = 'active'::text))))));
create policy __mt_baseline_probe_68a407e4e70c3f84515911b2 on public.priority_specific_action_submissions as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy __mt_baseline_probe_a70becae59d03c39587f10ac on public.priority_specific_action_submissions as PERMISSIVE for UPDATE to authenticated using ((EXISTS ( SELECT 1
   FROM priority_correction_arbiter_assignments
  WHERE ((priority_correction_arbiter_assignments.cycle_id = priority_specific_action_submissions.cycle_id) AND (priority_correction_arbiter_assignments.profile_id = ( SELECT auth.uid() AS uid)) AND (priority_correction_arbiter_assignments.role = 'specific_action_arbiter'::text) AND (priority_correction_arbiter_assignments.cause_area = priority_specific_action_submissions.cause_area) AND (priority_correction_arbiter_assignments.status = 'active'::text))))) with check ((EXISTS ( SELECT 1
   FROM priority_correction_arbiter_assignments
  WHERE ((priority_correction_arbiter_assignments.cycle_id = priority_specific_action_submissions.cycle_id) AND (priority_correction_arbiter_assignments.profile_id = ( SELECT auth.uid() AS uid)) AND (priority_correction_arbiter_assignments.role = 'specific_action_arbiter'::text) AND (priority_correction_arbiter_assignments.cause_area = priority_specific_action_submissions.cause_area) AND (priority_correction_arbiter_assignments.status = 'active'::text)))));
create policy __mt_baseline_probe_a14f81a22c1571c8221d7a9a on public.privacy_access_requests as PERMISSIVE for INSERT to authenticated with check (((requester_profile_id = ( SELECT auth.uid() AS uid)) AND ((match_id IS NULL) OR profile_participates_in_match(match_id, ( SELECT auth.uid() AS uid)))));
create policy __mt_baseline_probe_d9314f1bf5403426a9b69fb7 on public.privacy_access_requests as PERMISSIVE for SELECT to authenticated using (((owner_profile_id = ( SELECT auth.uid() AS uid)) OR (requester_profile_id = ( SELECT auth.uid() AS uid))));
create policy __mt_baseline_probe_92fad4ea4fea202026a71685 on public.privacy_access_requests as PERMISSIVE for UPDATE to authenticated using (((owner_profile_id = ( SELECT auth.uid() AS uid)) OR (requester_profile_id = ( SELECT auth.uid() AS uid)))) with check (((owner_profile_id = ( SELECT auth.uid() AS uid)) OR (requester_profile_id = ( SELECT auth.uid() AS uid))));
create policy __mt_baseline_probe_6cc01f367cf316e9e879ef2f on public.privacy_grants as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_c3cfbcbae85731a474dcf278 on public.privacy_grants as PERMISSIVE for SELECT to authenticated using (((profile_id = ( SELECT auth.uid() AS uid)) OR ((counterparty_id = ( SELECT auth.uid() AS uid)) AND (status = 'granted'::text))));
create policy __mt_baseline_probe_f03c3d942e6a8a482a1c1499 on public.privacy_grants as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_165a2347d8278b0245d7f3c3 on public.profile_data_right_requests as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_63054d3db4641fb57fe1c5e7 on public.profile_data_right_requests as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_282e688685dba20d691ccae6 on public.profile_data_right_requests as PERMISSIVE for UPDATE to authenticated using (((profile_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['open'::text, 'cancelled'::text])))) with check (((profile_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['open'::text, 'cancelled'::text]))));
create policy __mt_baseline_probe_21bf1d2b57a7a5bd10655b41 on public.profile_payment_accounts as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_20431ba1dc237cfde651612a on public.profile_payment_accounts as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_06584e2ed645659b1cf1aa25 on public.profile_payment_accounts as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_0a5b0a17d48890f39cb22c72 on public.profile_sources as PERMISSIVE for DELETE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_88d12a714fcb427938fdb7e2 on public.profile_sources as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_1b59cd3f1c99b856b0ee950f on public.profile_sources as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_ab1d92cf7989162aa32c3241 on public.profile_sources as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_c2daa443dca83f3616a2752c on public.profile_syntheses as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_7de17f248025ce1c4250f428 on public.profile_syntheses as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_4faf7acecca89733507d6a04 on public.profile_syntheses as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_c3aa5c12cbb2a55b235c186b on public.profile_verification_badges as PERMISSIVE for SELECT to authenticated using ((auth.uid() = profile_id));
create policy __mt_baseline_probe_8faa2a01ee7dfd3c2cfa023d on public.profile_verification_badges as PERMISSIVE for SELECT to anon, authenticated using (((status = 'verified'::text) AND ((expires_at IS NULL) OR (expires_at > now()))));
create policy __mt_baseline_probe_cdfd3321acd32dc0e3e1564f on public.profiles as PERMISSIVE for INSERT to authenticated with check ((( SELECT auth.uid() AS uid) = id));
create policy __mt_baseline_probe_048b7850dbd39cd8c302fd0f on public.profiles as PERMISSIVE for SELECT to authenticated using ((id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_a903241d99b7ef6d7e40ae07 on public.profiles as PERMISSIVE for UPDATE to authenticated using ((( SELECT auth.uid() AS uid) = id)) with check ((( SELECT auth.uid() AS uid) = id));
create policy __mt_baseline_probe_8bd274db2a01cf3984c1c3e9 on public.recommendation_counterparty_priors as PERMISSIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_92b48e11aa83dbe602820f32 on public.recommendation_experiment_assignments as PERMISSIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_adb8c6ace4643f9482f93fb1 on public.recommendation_exposures as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_a06638b83dd13140c6885d64 on public.recommendation_graph_edges as PERMISSIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_9d77b1f9db29aeae59e789aa on public.recommendation_guardrail_snapshots as PERMISSIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_892a0c58d17c6012e70ba07f on public.recommendation_interactions as PERMISSIVE for DELETE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_033dd9d6c6793360c767e298 on public.recommendation_interactions as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_037f0ec724c571dcf597937c on public.recommendation_interactions as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_633fcab8f56b9770b16bc31d on public.recommendation_model_versions as PERMISSIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_b5dfbe5e876469707abf99ee on public.recommendation_opportunity_factors as PERMISSIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_a8d11e71f4c28a1c9c571f28 on public.recommendation_outcome_feedback as PERMISSIVE for INSERT to authenticated with check (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM agreements a
  WHERE ((a.id = recommendation_outcome_feedback.agreement_id) AND ((( SELECT auth.uid() AS uid) = a.proposer_id) OR (( SELECT auth.uid() AS uid) = a.responder_id)) AND (COALESCE(a.lifecycle_status, (a.status)::text) = 'completed'::text))))));
create policy __mt_baseline_probe_e5918294a31005e26f340f2f on public.recommendation_outcome_feedback as PERMISSIVE for SELECT to authenticated using (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM agreements a
  WHERE ((a.id = recommendation_outcome_feedback.agreement_id) AND ((( SELECT auth.uid() AS uid) = a.proposer_id) OR (( SELECT auth.uid() AS uid) = a.responder_id)))))));
create policy __mt_baseline_probe_0fc1da66528c3496868b4f00 on public.recommendation_outcome_feedback as PERMISSIVE for UPDATE to authenticated using (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM agreements a
  WHERE ((a.id = recommendation_outcome_feedback.agreement_id) AND ((( SELECT auth.uid() AS uid) = a.proposer_id) OR (( SELECT auth.uid() AS uid) = a.responder_id))))))) with check (((profile_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM agreements a
  WHERE ((a.id = recommendation_outcome_feedback.agreement_id) AND ((( SELECT auth.uid() AS uid) = a.proposer_id) OR (( SELECT auth.uid() AS uid) = a.responder_id)) AND (COALESCE(a.lifecycle_status, (a.status)::text) = 'completed'::text))))));
create policy __mt_baseline_probe_e0e3239ccde7cefdbb5d2b9d on public.recommendation_outcomes as PERMISSIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_69eb1bfe09818d03d024c717 on public.recommendation_preferences as PERMISSIVE for DELETE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_e936783dc7fe006b8fce2f9f on public.recommendation_preferences as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_bbf7f3cc0022fd6b0badac24 on public.recommendation_preferences as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_5a2ba19e35572c056fb2c470 on public.recommendation_preferences as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_ce6eab15a436badbbcedf469 on public.recommendation_training_runs as PERMISSIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_2c693261cd99b0abfd84951f on public.recommendation_training_slots as PERMISSIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_666398a83cc1a342e2c27cf0 on public.recommendation_user_factors as PERMISSIVE for ALL to anon, authenticated using (false) with check (false);
create policy __mt_baseline_probe_da673743971c542dcb1f760a on public.registered_charities as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy __mt_baseline_probe_d188df7ad61aadb022a525ee on public.reminder_calendar_feeds as PERMISSIVE for DELETE to authenticated using ((user_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_3193122929eccc47dfe77cf8 on public.reminder_calendar_feeds as PERMISSIVE for INSERT to authenticated with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_606a98d01105a53806adc10c on public.reminder_calendar_feeds as PERMISSIVE for SELECT to authenticated using ((user_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_5dd5b20574e1df44d204defb on public.reminder_calendar_feeds as PERMISSIVE for UPDATE to authenticated using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_88417e76dcd302a2b04c869b on public.risk_signals as PERMISSIVE for INSERT to authenticated with check (((profile_id = ( SELECT auth.uid() AS uid)) OR ((match_id IS NOT NULL) AND viewer_participates_in_match(match_id))));
create policy __mt_baseline_probe_5f73d1f6a892d1f3ec480f86 on public.risk_signals as PERMISSIVE for SELECT to authenticated using (((profile_id = ( SELECT auth.uid() AS uid)) OR ((match_id IS NOT NULL) AND viewer_participates_in_match(match_id))));
create policy __mt_baseline_probe_051c2f993247cba036f90e3d on public.route_recommendation_profiles as PERMISSIVE for DELETE to authenticated using ((( SELECT auth.uid() AS uid) = profile_id));
create policy __mt_baseline_probe_4609bff3e72a2b197849d8a6 on public.route_recommendation_profiles as PERMISSIVE for INSERT to authenticated with check ((( SELECT auth.uid() AS uid) = profile_id));
create policy __mt_baseline_probe_5579bb701699b0e7f18ed6b6 on public.route_recommendation_profiles as PERMISSIVE for SELECT to authenticated using ((( SELECT auth.uid() AS uid) = profile_id));
create policy __mt_baseline_probe_39cb71db326b84259b091c16 on public.route_recommendation_profiles as PERMISSIVE for UPDATE to authenticated using ((( SELECT auth.uid() AS uid) = profile_id)) with check ((( SELECT auth.uid() AS uid) = profile_id));
create policy __mt_baseline_probe_132866c1176c5c1ead3d4081 on public.saved_searches as PERMISSIVE for DELETE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_5af849bc2188111e9f437cc1 on public.saved_searches as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_92d78eb944244e71c63f0882 on public.saved_searches as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_1a017808b56a33bc139e3c6f on public.saved_searches as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_c1a5a4af386b452f8a6f3fbf on public.source_connections as PERMISSIVE for DELETE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_1359e7f31ea29b114079439d on public.source_connections as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_429f1570e275d500e74c254e on public.source_connections as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_b98c859d553f115a87ff47f0 on public.source_connections as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_b065006ed9cea4cbdd6db709 on public.trade_agreement_confirmations as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM (trade_agreement_versions v
     JOIN agreements a ON ((a.id = v.agreement_id)))
  WHERE ((v.id = trade_agreement_confirmations.agreement_version_id) AND ((a.proposer_id = ( SELECT auth.uid() AS uid)) OR (a.responder_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_cfc0e965bb090fc38b95a671 on public.trade_agreement_milestones as PERMISSIVE for SELECT to authenticated using (moral_trade_private.can_read_trade_milestone_v1(id, ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_79e71d9e3774920203281e2f on public.trade_agreement_versions as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM agreements a
  WHERE ((a.id = trade_agreement_versions.agreement_id) AND ((a.proposer_id = ( SELECT auth.uid() AS uid)) OR (a.responder_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_6997c40beff887f8421a1463 on public.trade_appeal_reviewer_nominations as PERMISSIVE for SELECT to authenticated using (((EXISTS ( SELECT 1
   FROM ((trade_milestone_appeals appeal
     JOIN trade_agreement_milestones milestone ON ((milestone.id = appeal.milestone_id)))
     JOIN agreements agreement ON ((agreement.id = milestone.agreement_id)))
  WHERE ((appeal.id = trade_appeal_reviewer_nominations.appeal_id) AND ((( SELECT auth.uid() AS uid) = agreement.proposer_id) OR (( SELECT auth.uid() AS uid) = agreement.responder_id))))) OR moral_trade_private.current_actor_has_trade_role('administrator'::text)));
create policy __mt_baseline_probe_7195b2d1ba7c3129a38b5200 on public.trade_blocks as PERMISSIVE for SELECT to authenticated using (((blocker_id = ( SELECT auth.uid() AS uid)) OR (blocked_id = ( SELECT auth.uid() AS uid))));
create policy __mt_baseline_probe_28bb32286f42003159563e74 on public.trade_completion_confirmations as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM agreements a
  WHERE ((a.id = trade_completion_confirmations.agreement_id) AND ((a.proposer_id = ( SELECT auth.uid() AS uid)) OR (a.responder_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_df7b12529c6d42874c0f5494 on public.trade_counterproposals as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM trade_threads t
  WHERE ((t.id = trade_counterproposals.thread_id) AND ((t.participant_a = ( SELECT auth.uid() AS uid)) OR (t.participant_b = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_048a22902203ed54ac7dd73e on public.trade_evidence_bundle_items as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM ((trade_evidence_bundles bundle
     JOIN trade_agreement_milestones milestone ON ((milestone.id = bundle.milestone_id)))
     JOIN agreements agreement ON ((agreement.id = milestone.agreement_id)))
  WHERE ((bundle.id = trade_evidence_bundle_items.bundle_id) AND (((bundle.status = 'draft'::text) AND (bundle.submitted_by = ( SELECT auth.uid() AS uid))) OR ((bundle.status <> 'draft'::text) AND (((( SELECT auth.uid() AS uid) = agreement.proposer_id) OR (( SELECT auth.uid() AS uid) = agreement.responder_id)) OR (milestone.assigned_reviewer_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM trade_milestone_appeals appeal
          WHERE ((appeal.milestone_id = milestone.id) AND (appeal.assigned_reviewer_id = ( SELECT auth.uid() AS uid))))) OR moral_trade_private.current_actor_has_trade_role('administrator'::text))))))));
create policy __mt_baseline_probe_207730ef5968e6df4d56a9fe on public.trade_evidence_bundles as PERMISSIVE for SELECT to authenticated using (((submitted_by = ( SELECT auth.uid() AS uid)) OR ((status <> 'draft'::text) AND ((EXISTS ( SELECT 1
   FROM (trade_agreement_milestones milestone
     JOIN agreements agreement ON ((agreement.id = milestone.agreement_id)))
  WHERE ((milestone.id = trade_evidence_bundles.milestone_id) AND (((( SELECT auth.uid() AS uid) = agreement.proposer_id) OR (( SELECT auth.uid() AS uid) = agreement.responder_id)) OR (milestone.assigned_reviewer_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM trade_milestone_appeals appeal
          WHERE ((appeal.milestone_id = milestone.id) AND (appeal.assigned_reviewer_id = ( SELECT auth.uid() AS uid))))))))) OR moral_trade_private.current_actor_has_trade_role('administrator'::text)))));
create policy __mt_baseline_probe_96be1215b0ce4bb22dfac6e2 on public.trade_evidence_items as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM agreements a
  WHERE ((a.id = trade_evidence_items.agreement_id) AND ((a.proposer_id = ( SELECT auth.uid() AS uid)) OR (a.responder_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_f4ad2594f7cbf1e48476f972 on public.trade_exit_requests as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM agreements a
  WHERE ((a.id = trade_exit_requests.agreement_id) AND ((a.proposer_id = ( SELECT auth.uid() AS uid)) OR (a.responder_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_8c7f389970f1717532dd1668 on public.trade_external_payment_receipts as PERMISSIVE for SELECT to authenticated using (moral_trade_private.can_read_trade_receipt_v1(id, ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_ce63e0f7ca41f0626f1c026a on public.trade_messages as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM trade_threads t
  WHERE ((t.id = trade_messages.thread_id) AND ((t.participant_a = ( SELECT auth.uid() AS uid)) OR (t.participant_b = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_821f4ae4b3ae135f23888660 on public.trade_milestone_appeals as PERMISSIVE for SELECT to authenticated using (((assigned_reviewer_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM (trade_agreement_milestones milestone
     JOIN agreements agreement ON ((agreement.id = milestone.agreement_id)))
  WHERE ((milestone.id = trade_milestone_appeals.milestone_id) AND ((( SELECT auth.uid() AS uid) = agreement.proposer_id) OR (( SELECT auth.uid() AS uid) = agreement.responder_id))))) OR moral_trade_private.current_actor_has_trade_role('administrator'::text)));
create policy __mt_baseline_probe_f6fc7b5b682be9f87f7c54cc on public.trade_milestone_payouts as PERMISSIVE for SELECT to authenticated using (moral_trade_private.can_read_trade_payout_v1(id, ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_2a57a8666393a6ff2edcf72c on public.trade_milestone_reviewer_nominations as PERMISSIVE for SELECT to authenticated using (((EXISTS ( SELECT 1
   FROM (trade_agreement_milestones milestone
     JOIN agreements agreement ON ((agreement.id = milestone.agreement_id)))
  WHERE ((milestone.id = trade_milestone_reviewer_nominations.milestone_id) AND ((( SELECT auth.uid() AS uid) = agreement.proposer_id) OR (( SELECT auth.uid() AS uid) = agreement.responder_id))))) OR moral_trade_private.current_actor_has_trade_role('administrator'::text)));
create policy __mt_baseline_probe_d6cdd8be0f609442e897c9e3 on public.trade_milestone_reviews as PERMISSIVE for SELECT to authenticated using (((reviewer_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM (trade_agreement_milestones milestone
     JOIN agreements agreement ON ((agreement.id = milestone.agreement_id)))
  WHERE ((milestone.id = trade_milestone_reviews.milestone_id) AND (((( SELECT auth.uid() AS uid) = agreement.proposer_id) OR (( SELECT auth.uid() AS uid) = agreement.responder_id)) OR (EXISTS ( SELECT 1
           FROM trade_milestone_appeals appeal
          WHERE ((appeal.milestone_id = milestone.id) AND (appeal.assigned_reviewer_id = ( SELECT auth.uid() AS uid))))))))) OR moral_trade_private.current_actor_has_trade_role('administrator'::text)));
create policy __mt_baseline_probe_499bfa493d2ea7d2f494ab79 on public.trade_notifications as PERMISSIVE for SELECT to authenticated using ((user_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_cdf2103ab11a85ea565b1acb on public.trade_notifications as PERMISSIVE for UPDATE to authenticated using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_f553e54c6a7cd2a3171055d8 on public.trade_payment_appeal_reviewer_nominations as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM trade_payment_appeals appeal
  WHERE ((appeal.id = trade_payment_appeal_reviewer_nominations.appeal_id) AND moral_trade_private.is_trade_payment_case_participant_v1(appeal.case_id, ( SELECT auth.uid() AS uid))))));
create policy __mt_baseline_probe_c1461239885b2fe031f4ce91 on public.trade_payment_appeals as PERMISSIVE for SELECT to authenticated using (moral_trade_private.can_read_trade_payment_appeal_v1(id, ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_0e7e17dbf519fdb68ac7f704 on public.trade_payment_review_cases as PERMISSIVE for SELECT to authenticated using (moral_trade_private.can_read_trade_payment_case_v1(id, ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_958e76d6aaf2db9204ebe506 on public.trade_payment_review_decisions as PERMISSIVE for SELECT to authenticated using (moral_trade_private.can_read_trade_payment_decision_v1(id, ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_328026a7f33cc21f3f145b93 on public.trade_payment_reviewer_nominations as PERMISSIVE for SELECT to authenticated using (moral_trade_private.is_trade_payment_case_participant_v1(case_id, ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_4ea6ffc993da2cc315c93583 on public.trade_reports as PERMISSIVE for SELECT to authenticated using ((reporter_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_24aae8d2c494903bab4424c5 on public.trade_review_events as PERMISSIVE for INSERT to authenticated with check (((reviewer_id IS NULL) AND (action = ANY (ARRAY['submitted'::text, 'duplicate_flagged'::text])) AND (EXISTS ( SELECT 1
   FROM offers offer
  WHERE ((offer.id = trade_review_events.offer_id) AND (offer.owner_id = ( SELECT auth.uid() AS uid)))))));
create policy __mt_baseline_probe_d0af5320ee76bccc2367c166 on public.trade_review_events as PERMISSIVE for SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM offers o
  WHERE ((o.id = trade_review_events.offer_id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))));
create policy __mt_baseline_probe_164ab07da92af74bf39a9bfa on public.trade_review_role_grants as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_ed1986484290af2b7888e7d8 on public.trade_thread_reads as PERMISSIVE for ALL to authenticated using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_a65fb0c8dc7217a982a3771d on public.trade_threads as PERMISSIVE for SELECT to authenticated using (((participant_a = ( SELECT auth.uid() AS uid)) OR (participant_b = ( SELECT auth.uid() AS uid))));
create policy __mt_baseline_probe_825ec77736b8c1e69bde2860 on public.transparency_receipts as PERMISSIVE for INSERT to authenticated with check ((actor_scope = ('profile:'::text || (( SELECT auth.uid() AS uid))::text)));
create policy __mt_baseline_probe_53cfdb5b24a917914c1cc7bf on public.transparency_receipts as PERMISSIVE for SELECT to authenticated using ((actor_scope = ('profile:'::text || (( SELECT auth.uid() AS uid))::text)));
create policy __mt_baseline_probe_ab6451d51b1e69637ed7924d on public.user_follows as PERMISSIVE for DELETE to authenticated using ((follower_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_216aa02c1d67b2c4c4e3d270 on public.user_follows as PERMISSIVE for INSERT to authenticated with check ((follower_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_0d40bebb4d0e18d451c1d045 on public.user_follows as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy __mt_baseline_probe_747de8158a59bb22ecdc7f98 on public.webinar_rsvps as PERMISSIVE for INSERT to anon, authenticated with check ((((profile_id IS NULL) OR (profile_id = ( SELECT auth.uid() AS uid))) AND ((char_length(email) >= 3) AND (char_length(email) <= 320)) AND (jsonb_typeof(attribution) = 'object'::text)));
create policy __mt_baseline_probe_b985ee8f29afe807e9557d3c on public.webinar_rsvps as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_5e051825ebd403ace8dfbd41 on public.wish_entries as PERMISSIVE for DELETE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_1274b1af78e30fdebd779cbe on public.wish_entries as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_983d7a155f03aa9aa4912752 on public.wish_entries as PERMISSIVE for SELECT to authenticated using (((profile_id = ( SELECT auth.uid() AS uid)) OR ((visibility = 'preview'::text) AND (safety_status = 'clear'::text) AND wish_profile_is_previewable(profile_id))));
create policy __mt_baseline_probe_6dc6ab860211a8ec35d5db79 on public.wish_entries as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_9bf55e527aed95082e1d3d34 on public.wish_notifications as PERMISSIVE for INSERT to authenticated with check (((profile_id = ( SELECT auth.uid() AS uid)) OR ((match_id IS NOT NULL) AND viewer_participates_in_match(match_id) AND profile_participates_in_match(match_id, profile_id))));
create policy __mt_baseline_probe_238c96c9d6c05f0636812532 on public.wish_notifications as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_0d304810bdc9e468623fb8fd on public.wish_notifications as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_716a7b330feb36adae5e1981 on public.wish_profile_public_previews as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy __mt_baseline_probe_0f7de3f5b44dae5281d3d409 on public.wish_profiles as PERMISSIVE for INSERT to authenticated with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_3534b25819e2931faa0b09e5 on public.wish_profiles as PERMISSIVE for SELECT to authenticated using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy __mt_baseline_probe_2d60d8c957d01e9f9fc67883 on public.wish_profiles as PERMISSIVE for UPDATE to authenticated using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
