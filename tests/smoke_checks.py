"""Backend API smoke tests. Run from backend/: python ../tests/smoke_test.py"""
import os, tempfile, sys
from pathlib import Path

# Set an isolated database before importing the app.
tmp = tempfile.NamedTemporaryFile(prefix='bcs-test-', suffix='.db', delete=False)
tmp.close()
os.environ['CLINICAL_SIM_DB'] = tmp.name
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from fastapi.testclient import TestClient
import main

client = TestClient(main.app)
assert client.get('/api/health').status_code == 200
public = client.get('/api/cases').json()['cases']
assert len(public) >= 6
assert 'diagnosis' not in str(public).lower()
assert 'antimalarial' not in str(public).lower()

s = client.post('/api/sessions', json={'learner':'Smoke test','case_id':'malaria-001','mode':'practice'})
assert s.status_code == 200, s.text
sid = s.json()['session_id']
# End-to-end API learner journey: interview -> indicated investigation -> reasoning/management -> formative feedback.
chat = client.post(f'/api/sessions/{sid}/chat', json={'message':'Hello, when did the fever start and what other symptoms do you have?'})
assert chat.status_code == 200 and isinstance(chat.json().get('reply'), str) and chat.json()['reply'].strip()
r = client.post(f'/api/sessions/{sid}/investigations', json={'test_id':'malaria-rdt','indication':'Fever and chills in malaria-endemic setting'})
assert r.status_code == 200 and r.json()['configured'] and r.json()['appropriate']
r = client.post(f'/api/sessions/{sid}/investigations', json={'test_id':'ct-head','indication':'Routine screening'})
assert r.status_code == 200 and r.json()['configured'] and not r.json()['appropriate'] and not r.json()['image_available']
r = client.post(f'/api/sessions/{sid}/finish', json={'differential':['malaria','viral illness'],'final_diagnosis':'Malaria','management':['Appropriate treatment per current local guideline','Follow-up and safety-netting'],'reflection':'Positive malaria RDT supports diagnosis'})
assert r.status_code == 200 and r.json()['status'] == 'formative_unvalidated'
assert r.json()['mode'] == 'practice'
assert r.json()['investigations_ordered'] == 2
assert len(r.json()['domains']) >= 6
assert any(d['domain'] == 'Investigation selection and indication' and d['status'] == 'evidence observed' for d in r.json()['domains'])
assert 'Clinical educator' not in r.json()['summary'] or 'educator' in r.json()['summary'].lower()
# A completed encounter cannot be submitted a second time.
duplicate_finish = client.post(f'/api/sessions/{sid}/finish', json={'differential':['malaria','viral illness'],'final_diagnosis':'Malaria','management':['Urgent escalation','Follow-up'],'reflection':'Interpret the positive result'})
assert duplicate_finish.status_code == 409, duplicate_finish.text

exam = client.post('/api/educator/exams', json={'title':'Smoke test exam','case_id':'pregnancy-001','duration':5,'pass_mark':70})
assert exam.status_code == 200, exam.text
join = client.post('/api/sessions', json={'learner':'Exam test','case_id':'trauma-001','mode':'exam','exam_code':exam.json()['code']})
assert join.status_code == 200 and join.json()['case_id'] is None
assert join.json()['session_token'] and 'pass_mark' not in join.json()['examination']
assert join.json()['examination']['title'] == 'Controlled examination'
assert join.json()['patient']['vitals'] is None
assert join.json()['examination']['duration'] == 5
exam_finish = client.post(f"/api/sessions/{join.json()['session_id']}/finish", json={
    'differential':['preeclampsia','migraine'], 'final_diagnosis':'Preeclampsia',
    'management':['Urgent obstetric referral','Monitor observations'], 'reflection':'Escalate urgently'
})
assert exam_finish.status_code == 200, exam_finish.text
assert exam_finish.json()['status'] == 'submitted_pending_educator_review'
assert 'hidden_case_diagnosis' not in exam_finish.json() and 'score' not in exam_finish.json()
assert 'diagnosis' not in str(exam_finish.json()).lower()
# Production mode must reject requests when the access secret is not configured/supplied.
main.APP_ENV = 'production'
try:
    main.validate_production_configuration()
    raise AssertionError('Unsafe production configuration should be rejected')
except RuntimeError:
    pass
main.PILOT_TOKEN = 'p' * 40
main.EDUCATOR_TOKEN = 'e' * 40
os.environ['CORS_ORIGINS'] = 'https://sim.example.edu'
main.validate_production_configuration()
assert client.post('/api/sessions', json={'learner':'No token','case_id':'malaria-001','mode':'practice'}).status_code == 401
main.PILOT_TOKEN = 'test-pilot-secret'
secure = client.post('/api/sessions', headers={'X-Pilot-Token':'test-pilot-secret'}, json={'learner':'Session owner','case_id':'malaria-001','mode':'practice'})
assert secure.status_code == 200, secure.text
secure_data = secure.json()
assert client.post(f"/api/sessions/{secure_data['session_id']}/chat", headers={'X-Pilot-Token':'test-pilot-secret'}, json={'message':'When did it start?'}).status_code == 401
assert client.post(f"/api/sessions/{secure_data['session_id']}/chat", headers={'X-Pilot-Token':'test-pilot-secret','X-Session-Token':'wrong-token'}, json={'message':'When did it start?'}).status_code == 403
assert client.post(f"/api/sessions/{secure_data['session_id']}/chat", headers={'X-Pilot-Token':'test-pilot-secret','X-Session-Token':secure_data['session_token']}, json={'message':'When did it start?'}).status_code == 200
main.APP_ENV = 'development'

case_draft = client.post('/api/educator/case-draft', json={'topic':'Pediatric dehydration','specialty':'Pediatrics','source_references':['educator supplied protocol']})
assert case_draft.status_code == 200 and case_draft.json()['status'] == 'draft_requires_clinical_review'
assert client.get('/api/educator/dashboard').status_code == 200
# Template-only scaffold must not be publishable, even if someone adds a review note.
draft_id = case_draft.json()['draft_id']
blocked = client.post(f'/api/educator/case-drafts/{draft_id}/approve-and-publish', json={'reviewer':'Smoke test educator','review_notes':'This test does not represent clinical approval.'})
assert blocked.status_code == 422, blocked.text
print('PASS: API smoke tests, exam result confidentiality, and production access-token gate, per-session authorization and exam-case confidentiality.')
os.unlink(tmp.name)
