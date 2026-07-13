---
name: mpgf-chatgpt-pro-extended-rd
description: Use @Computer and @Chrome to run the user-provided ChatGPT Web Pro Extended MPGF R&D workflow exactly as written, preserving the workflow prompts verbatim and saving versioned Moral Trade outputs.
---

# MPGF ChatGPT Web Pro Extended R&D Workflow

Use this skill when the user asks to run, automate, iterate, replay, or continue the ChatGPT Web Pro Extended R&D workflow for the Moral Trade moral goods group-buying feature, moral public goods funding feature, or `moralpublicgoods[v].md` spec series.

## Authoritative workflow

The authoritative workflow is stored in:

`references/workflow-verbatim.md`

Read that file before acting.

The workflow text in `references/workflow-verbatim.md` is immutable. Do not rewrite it, summarize it, repair its numbering, change its punctuation, improve its prompts, rename any referenced concepts, or alter its content.

If the user asks to change the workflow, create a new versioned reference file instead of editing the original, unless the user explicitly says to overwrite the original.

## Required tools

Use `@Chrome` when controlling ChatGPT Web in the user's signed-in browser session.

Use `@Computer` only when visual desktop control outside Chrome is needed and it is available.

If `@Computer` is unavailable but `@Chrome` can complete the browser workflow, continue with `@Chrome` and its browser UI controls. Stop only when the unavailable tool is actually required for the next step.

If `@Chrome` is unavailable, stop and tell the user that the Chrome plugin is missing.

## Default execution mode

Run one supervised iteration by default.

If the user explicitly provides `max_iterations`, run up to that many iterations.

Never run an unbounded loop.

If the workflow reaches step `f. Repeat a to e with moralpublicgoods[v+1].md.`, continue only if:
1. `max_iterations` has not been reached;
2. the previous candidate file was successfully saved;
3. no stop condition has occurred;
4. the user has not asked to stop.

## Inputs

When invoking the skill, infer or ask for:

- `repo_root`: root directory of the Moral Trade repo.
- `spec_search_root`: primary directory to search for `moralpublicgoods[v].md`; default is `repo_root`.
- `extra_spec_search_roots`: additional directories to search for `moralpublicgoods[v].md`; default includes `~/Downloads`.
- `output_root`: directory where run outputs should be saved; default is `repo_root/runs/mpgf-chatgpt-pro-extended-rd/`.
- `max_iterations`: default `1`.
- `chatgpt_project_name`: default `MT`.
- `chatgpt_chat_name`: default `MPGF 1`.
- `model_mode`: default `latest model’s Pro Extended mode`.

## Version detection

Before each iteration:

1. Run `scripts/find_latest_mpgf.py` against `spec_search_root` and `~/Downloads`.
2. Include any user-provided `extra_spec_search_roots`.
3. If the script reports `ok: false` because any search root is inaccessible, stop and report the inaccessible root. Do not proceed with a partial latest version.
4. Identify the latest file by largest numeric version `v` across all searched roots.
5. Set:
   - `latest_spec_path`
   - `latest_version = v`
   - `next_version = v + 1`
   - `next_spec_filename = moralpublicgoods[next_version].md`

Do not guess the latest version from filenames visible in the browser or from memory.

The latest `moralpublicgoods[v].md` file may be in `~/Downloads`, not only in the repo. If `~/Downloads` contains a larger numeric version than `spec_search_root`, use the Downloads file as `latest_spec_path` and upload that file before Prompt 2.

If `~/Downloads` cannot be listed because of macOS privacy controls, rely on `scripts/find_latest_mpgf.py` exact-filename probing. The script may still find files such as `~/Downloads/moralpublicgoods133.md` by testing exact `moralpublicgoods<N>.md` paths above the repo latest version. If the script returns `ok: true` with `search_warning`, proceed with `latest_spec_path` and record the warning and `probed_paths` in the run log.

If no matching `moralpublicgoods[v].md` file exists, stop and ask the user for the current spec file.

## Run directory

For each iteration, create a run directory:

`{output_root}/v{latest_version}_to_v{next_version}_{timestamp}/`

Inside it, create:

```text
raw/
candidates/
logs/
```

Save:
- raw ChatGPT response to prompt 1 as `raw/01_blind_frontier_pass.md`
- raw ChatGPT response to prompt 2 as `raw/02_inherited_artifact_review.md`
- raw ChatGPT response to prompt 3 as `raw/03_next_spec_response.md`
- proposed next spec as `candidates/moralpublicgoods[next_version].md`
- browser/run notes as `logs/run_log.md`

## Browser workflow rules

When using ChatGPT Web:

1. Use `@Chrome`.
2. Open `https://chatgpt.com`.
3. Confirm the user is signed in.
4. Navigate to the pinned project named in `chatgpt_project_name`.
5. Navigate to the chat named in `chatgpt_chat_name`.
6. Select the latest model’s Pro Extended mode if visible.
7. If the model picker is ambiguous, stop and ask the user.
8. Use Prompt 1 exactly as written in `references/workflow-verbatim.md`, and use Prompt 2 and Prompt 3 exactly as written in their required reference files.
9. Do not ask for confirmation before submitting workflow prompts. The user's invocation of this skill authorizes submitting Prompt 1 and the required Phase 2 and Phase 3 prompts exactly as referenced by this skill.
10. Wait for the full response.
11. Save the full raw response.
12. Do not treat a response as accepted merely because ChatGPT produced it.

## ChatGPT Web context reading

When resuming, recovering, or continuing inside ChatGPT Web, first read the current conversation context before deciding whether to submit a prompt, wait longer, save a response, or stop.

Preferred tab strategy:

1. Use `@Chrome` to claim the newest visible `MT / MPGF 1` tab, preferring a matching ChatGPT conversation URL and the active handoff group.
2. If that tab hangs, times out, or cannot be inspected, do not reload it. Open a fresh controlled Chrome tab to the same ChatGPT conversation URL, or navigate through `chatgpt_project_name` and `chatgpt_chat_name`, and use that fresh tab to read the current conversation state.
3. If the fresh tab also cannot be inspected, try another visible duplicate `MT / MPGF 1` tab before declaring context unreadable, unless that would reload or interrupt an active response.

Use the smallest reliable read method:

- Read title, URL, visible response status, model picker text, and attachment state before attempting full-page extraction.
- Prefer targeted extraction from the active conversation container over `document.body.innerText` or full DOM snapshots.
- If full-page text extraction hangs or times out once, switch to targeted extraction, screenshot/visual reading, ChatGPT copy controls, or downloadable response/file assets.
- When a ChatGPT response is complete, use visible `Copy` controls when available, then verify the copied text is non-empty and matches the expected current phase before saving it.
- When ChatGPT exposes a downloadable response or file asset, download it instead of reconstructing it from visible page text.

Do not proceed from Prompt 2 to Prompt 3 unless the full Prompt 2 response has been read, saved as `raw/02_inherited_artifact_review.md`, and verified non-empty.

Do not resubmit Prompt 2 merely because the existing Prompt 2 response has not yet been saved. Resubmit Prompt 2 only if the user explicitly authorizes abandoning or retrying the active response.

A response is complete only when:

- there is no active `Stop answering`, `Pro thinking`, generating, or streaming state;
- the current assistant message contains the expected phase-specific content;
- the full response can be copied, downloaded, or extracted and saved non-empty.

Record the context read method in `logs/run_log.md`, such as: claimed existing tab, fresh conversation tab, duplicate tab, targeted extraction, screenshot/visual read, ChatGPT copy control, asset download, or failed browser-context read.

If ChatGPT Web context cannot be read after the supported `@Chrome` tab recovery steps, stop and log the failure. Do not use AppleScript, shell browser scripting, or unrelated browser automation as a substitute for `@Chrome`/supported browser-client context reading.

## Mandatory three-prompt execution sequence

One iteration of this skill consists of three prompts. The iteration is incomplete until all applicable phases below have completed.

Do not stop after Prompt 1.

### Phase 1 — Blind R&D pass

1. Open ChatGPT Web with `@Chrome`.
2. Navigate to the pinned project `MT`.
3. Open the chat `MPGF 1`.
4. Select the latest model’s Pro Extended mode if available.
5. Submit Prompt 1 from `references/workflow-verbatim.md`.
6. Wait for the full response.
7. Save the full raw response as:

   `raw/01_blind_frontier_pass.md`

8. Continue to Phase 2 unless a stop condition occurs.

### Phase 2 — Upload newest inherited spec and run inherited-artifact review

Before submitting Prompt 2, locate the newest inherited spec.

1. Run:

   ```bash
   .agents/skills/mpgf-chatgpt-pro-extended-rd/scripts/find_latest_mpgf.py "$spec_search_root" "$HOME/Downloads"
   ```

2. Add any user-provided `extra_spec_search_roots` to the command.
3. Parse the result.
4. If the result reports `ok: false` because a search root such as `~/Downloads` is inaccessible, stop before upload and tell the user which root could not be read. Do not use a partial repo result when a newer Downloads file may exist.
   If the result reports `ok: true` with `search_warning`, proceed with `latest_spec_path` and record `search_warning` and `probed_paths` in the run log.
5. Identify:
   - `latest_spec_path`
   - `latest_version`
   - `next_version`
   - `next_spec_filename`

6. In ChatGPT Web, while still in `MT / MPGF 1`, upload `latest_spec_path`.

7. Confirm in the run log that the uploaded file is the largest-version file matching:

   ```text
   moralpublicgoods[v].md
   ```

   Include the searched roots and whether `latest_spec_path` came from `spec_search_root`, `~/Downloads`, or another extra root.

8. If the Prompt 1 response is not visible in the active ChatGPT thread, also upload or paste:

   ```text
   raw/01_blind_frontier_pass.md
   ```

   as the blind candidate catalogue.

9. Submit Prompt 2 exactly from:

   ```text
   references/prompt_2_inherited_artifacts.md
   ```

10. Wait for the full response.
11. Save the full raw response as:

   ```text
   raw/02_inherited_artifact_review.md
   ```

12. Continue to Phase 3 unless a stop condition occurs.

### Phase 3 — Write or revise the next spec

1. Submit Prompt 3 exactly from:

   ```text
   references/prompt_3_write_or_revise_spec.md
   ```

2. Wait for the full response.
3. Save the full raw response as:

   ```text
   raw/03_next_spec_response.md
   ```

4. If ChatGPT provides a downloadable file named:

   ```text
   moralpublicgoods[next_version].md
   ```

   download it and save it as:

   ```text
   candidates/moralpublicgoods[next_version].md
   ```

5. If ChatGPT outputs the file inline instead of as a download, extract the inline markdown content and save it as:

   ```text
   candidates/moralpublicgoods[next_version].md
   ```

6. If ChatGPT says no spec change is warranted, save that conclusion in:

   ```text
   logs/no_spec_change.md
   ```

7. Do not overwrite the canonical prior `moralpublicgoods[v].md`.

### Phase 4 — Validation

After Phase 3, validate:

1. `raw/01_blind_frontier_pass.md` exists and is non-empty.
2. `raw/02_inherited_artifact_review.md` exists and is non-empty.
3. `raw/03_next_spec_response.md` exists and is non-empty.
4. If a spec was produced, the candidate filename equals:

   ```text
   moralpublicgoods[next_version].md
   ```

5. The candidate file is non-empty.
6. The prior canonical spec was not overwritten.
7. `logs/run_log.md` records:
   - latest spec path;
   - latest version;
   - next version;
   - searched spec roots, including whether `~/Downloads` was searched;
   - any search warning or exact filename probes used for an inaccessible root;
   - ChatGPT Web context read method used before submitting, waiting, saving, or stopping;
   - whether the latest spec was uploaded before Prompt 2;
   - whether Prompt 2 completed;
   - whether Prompt 3 completed;
   - whether the candidate was downloaded, copied from inline output, or absent because no spec change was recommended.

Write validation results to:

```text
logs/validation.md
```

### Completion rule

Report success only if Prompt 1, Prompt 2, and Prompt 3 were all run, unless a stop condition occurred or ChatGPT explicitly chose “no spec change” during Prompt 3.

If only Prompt 1 ran, report:

```text
INCOMPLETE: stopped after Prompt 1.
```

Then ask whether to resume from Phase 2.

## Resume behavior

If a prior run already contains:

```text
raw/01_blind_frontier_pass.md
```

but does not contain:

```text
raw/02_inherited_artifact_review.md
```

then resume from Phase 2 by default.

Do not rerun Prompt 1 unless the user explicitly asks.

If a prior run contains Prompt 1 and Prompt 2 outputs but not Prompt 3 output, resume from Phase 3 by default.

When resuming from Phase 2, still locate and upload the latest `moralpublicgoods[v].md` before submitting Prompt 2.

## Confirmation policy

Do not ask for routine confirmations during a supervised iteration.

The user's invocation authorizes:
- opening ChatGPT Web;
- navigating to the configured project and chat;
- submitting Prompt 1 from `references/workflow-verbatim.md`;
- submitting Prompt 2 from `references/prompt_2_inherited_artifacts.md`;
- submitting Prompt 3 from `references/prompt_3_write_or_revise_spec.md`;
- uploading the latest detected `moralpublicgoods[v].md` file requested by the workflow;
- downloading or copying the candidate `moralpublicgoods[v+1].md` output.

Still stop for the stop conditions below and for any higher-priority browser safety requirement that cannot be waived by this skill.

## Download / extraction rule

If ChatGPT Web provides an actual downloadable `moralpublicgoods[v+1].md` file during Phase 3, download it and save it to:

`candidates/moralpublicgoods[next_version].md`

If ChatGPT Web instead outputs the file inline, copy the relevant file content into:

`candidates/moralpublicgoods[next_version].md`

Log whether the file was:
- downloaded;
- copied from inline output;
- reconstructed from the response.

If ChatGPT says no spec change is warranted, save that conclusion in `logs/no_spec_change.md`.

Do not overwrite the canonical `moralpublicgoods[v].md` file.

## Validation

After each iteration, run the Phase 4 validation from the mandatory three-prompt execution sequence.

Write validation results to:

`logs/validation.md`

If validation fails, stop and ask the user whether to repair, retry, or abandon the candidate.

## Stop conditions

Stop and ask the user if:

- ChatGPT login is required.
- The intended account is not signed in.
- The project `MT` cannot be found.
- The chat `MPGF 1` cannot be found.
- The latest model’s Pro Extended mode is unavailable or ambiguous.
- A usage-limit, payment, security, or account warning appears.
- An upload fails.
- The latest-spec search is incomplete because `spec_search_root`, `~/Downloads`, or another configured search root is inaccessible.
- ChatGPT Web context cannot be read after the supported `@Chrome` tab recovery steps.
- A response is incomplete.
- A browser action would expose credentials, payment details, private unrelated data, or secrets.
- The UI changes in a way that makes the next action ambiguous.
- ChatGPT refuses, truncates, or materially changes the requested output format.
- The candidate spec cannot be saved.
- The user says to stop.

## Safety and account-use constraints

Do not attempt to bypass ChatGPT usage limits.

Do not share credentials.

Do not run this workflow as an unattended third-party backend.

Do not upload secrets, credentials, private payment data, or unrelated private files.

Treat ChatGPT Web output as a candidate artifact requiring human review.

## Reporting

At the end of each iteration, report:

- input version;
- proposed output version;
- path to run directory;
- path to raw response files;
- path to candidate spec file, if created;
- validation status;
- stop condition, if any;
- whether another iteration is available under `max_iterations`.

## Immutable workflow execution

After reading this wrapper, execute Prompt 1 from `references/workflow-verbatim.md` exactly as written, then execute the required Phase 2 and Phase 3 prompts exactly as written in their reference files.
