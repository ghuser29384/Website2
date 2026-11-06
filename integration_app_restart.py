"""Synthetic AppState restart test; only dedicated loopback PostgreSQL."""
import os,sys,json,subprocess
from pathlib import Path
from urllib.parse import urlsplit
url=os.environ.get('SYNTHETIC_DATABASE_URL','')
u=urlsplit(url)
assert u.scheme=='postgresql' and u.hostname=='127.0.0.1' and u.path=='/render_reconnect_synthetic' and not u.query
sys.path.insert(0,str(Path(__file__).parent/'source/apps/api'))
from app.settings import Settings
from app.services.store import AppState
settings=Settings(database_url=url,persistence_provider='postgres',x_provider='fixture',search_provider='fixture',llm_provider='fixture')
state=AppState(settings)
meta=Path(__file__).with_name('synthetic-restart.json')
if len(sys.argv)==1:
    state.seed_history()
    candidate=next(x for x in state.sync_eligible_posts() if 'Norway' in x.text)
    state.analyze_candidate(candidate.id)
    state.retrieve_evidence(candidate.id)
    draft=state.generate_drafts(candidate.id)[0]
    state.critique_draft(draft.id)
    state.evaluate_x(draft.id)
    state.approve_draft(draft.id)
    validation=state.approval_records.validate(candidate,draft,state.evidence_cards[candidate.id],True)
    assert validation['status']=='PASS'
    meta.write_text(json.dumps({'id':draft.id,'draft':draft.to_dict(),'candidate':candidate.to_dict(),'validation':validation}))
    state.record_store._connection.close()
    subprocess.run([sys.executable,'-B',__file__,'recover'],check=True)
else:
    expected=json.loads(meta.read_text())
    draft=state.drafts[expected['id']]
    candidate=state.candidates[draft.candidate_id]
    assert draft.to_dict()==expected['draft']
    assert candidate.to_dict()==expected['candidate']
    validation=state.approval_records.validate(candidate,draft,state.evidence_cards[candidate.id],True)
    assert validation['status']=='PASS'
    assert validation==expected['validation']
    state.record_store._connection.close()
    print('PASS: application restart preserves exact draft, candidate and valid approval with synthetic providers')
