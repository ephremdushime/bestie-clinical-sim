"""Backend API smoke tests. Run from the repository root: python tests/smoke_checks.py"""
import os, tempfile, sys
from pathlib import Path

# Set an isolated database before importing the app.
tmp = tempfile.NamedTemporaryFile(prefix='bcs-test-', suffix='.db', delete=False)
tmp.close()
os.environ['CLINICAL_SIM_DB'] = tmp.name
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
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
r = client.post(f'/api/sessions/{sid}/investigations', json={'test_id':'malaria-rdt','indication':'Fever and chills in malaria-endemic setting'})
assert r.status_code == 200 and r.json()['configured'] and r.json()['appropriate']
r = client.post(f'/api/sessions/{sid}/investigations', json={'test_id':'ct-head','indication':'Routine screening'})
assert r.status_code == 200 and r.json()['configured'] and not r.json()['appropriate'] and not r.json()['image_available']
r = client.post(f'/api/sessions/{sid}/finish', json={'differential':['malaria','viral illness'],'final_diagnosis':'Malaria','management':['Appropriate treatment per current local guideline','Follow-up and safety-netting'],'reflection':'Positive malaria RDT supports diagnosis'})
assert r.status_code == 200 and r.json()['status'] == 'formative_unvalidated'

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
assert 'case_id' not in exam_finish.json(), exam_finish.json()
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
# Production collaboration stays disabled until room membership and individual
# identity checks exist; a shared token in a URL is not sufficient authorization.
try:
    with client.websocket_connect('/ws/rooms/security-test?token=' + ('p' * 40)):
        raise AssertionError('Production collaboration WebSocket should reject connections')
except WebSocketDisconnect as exc:
    assert exc.code == 1008, exc.code
assert client.post('/api/sessions', json={'learner':'No token','case_id':'malaria-001','mode':'practice'}).status_code == 401
main.PILOT_TOKEN = 'test-pilot-secret'
secure = client.post('/api/sessions', headers={'X-Pilot-Token':'test-pilot-secret'}, json={'learner':'Session owner','case_id':'malaria-001','mode':'practice'})
assert secure.status_code == 200, secure.text
secure_data = secure.json()
assert client.post(f"/api/sessions/{secure_data['session_id']}/chat", headers={'X-Pilot-Token':'test-pilot-secret'}, json={'message':'When did it start?'}).status_code == 401
assert client.post(f"/api/sessions/{secure_data['session_id']}/chat", headers={'X-Pilot-Token':'test-pilot-secret','X-Session-Token':'wrong-token'}, json={'message':'When did it start?'}).status_code == 403
assert client.post(f"/api/sessions/{secure_data['session_id']}/chat", headers={'X-Pilot-Token':'test-pilot-secret','X-Session-Token':secure_data['session_token']}, json={'message':'When did it start?'}).status_code == 200
# Every session-scoped mutation must enforce the same session ownership check.
wrong_owner = {'X-Pilot-Token':'test-pilot-secret','X-Session-Token':'wrong-token'}
assert client.post(f"/api/sessions/{secure_data['session_id']}/investigations", headers=wrong_owner, json={'test_id':'malaria-rdt','indication':'Fever in an endemic setting'}).status_code == 403
assert client.post(f"/api/sessions/{secure_data['session_id']}/finish", headers=wrong_owner, json={'differential':['malaria']}).status_code == 403
# A failed ownership check must not have completed or otherwise altered the session.
assert client.post(f"/api/sessions/{secure_data['session_id']}/finish", headers={'X-Pilot-Token':'test-pilot-secret','X-Session-Token':secure_data['session_token']}, json={'differential':['malaria'],'final_diagnosis':'Malaria','management':['Escalate if danger signs'],'reflection':'Ownership test'}).status_code == 200
# Exam expiry is enforced on active interactions, while the submission path records expiry.
expiry_exam = client.post('/api/educator/exams', headers={'X-Educator-Token':'e' * 40}, json={'title':'Expiry lifecycle test','case_id':'trauma-001','duration':5,'pass_mark':70})
assert expiry_exam.status_code == 200, expiry_exam.text
expired_join = client.post('/api/sessions', headers={'X-Pilot-Token':'test-pilot-secret'}, json={'learner':'Expired exam test','mode':'exam','exam_code':expiry_exam.json()['code']})
assert expired_join.status_code == 200, expired_join.text
expired_id = expired_join.json()['session_id']
db = main.conn()
db.execute("UPDATE sessions SET created_at=? WHERE id=?", ('2000-01-01T00:00:00+00:00', expired_id))
db.commit()
db.close()
expired_headers = {'X-Pilot-Token':'test-pilot-secret','X-Session-Token':expired_join.json()['session_token']}
assert client.post(f"/api/sessions/{expired_id}/chat", headers=expired_headers, json={'message':'When did it start?'}).status_code == 409
expired_submission = client.post(f"/api/sessions/{expired_id}/finish", headers=expired_headers, json={'differential':['trauma'],'final_diagnosis':'Trauma','management':['Urgent escalation'],'reflection':'Expiry test'})
assert expired_submission.status_code == 200, expired_submission.text
assert expired_submission.json()['time_expired'] is True
# Production educator boundary: pilot credentials must never authorize educator APIs.
main.APP_ENV = 'production'
pilot_headers = {'X-Pilot-Token': 'test-pilot-secret'}
educator_headers = {'X-Educator-Token': 'e' * 40}
assert client.get('/api/educator/dashboard', headers=pilot_headers).status_code == 401
assert client.post('/api/educator/exams', headers=pilot_headers, json={
    'title':'Unauthorized exam creation', 'case_id':'malaria-001'
}).status_code == 401
assert client.get('/api/educator/dashboard', headers=educator_headers).status_code == 200
assert client.post('/api/educator/exams', headers=educator_headers, json={
    'title':'Authorized educator exam', 'case_id':'malaria-001'
}).status_code == 200
# Every educator content-management route must reject pilot credentials in production.
# These are distinct routes and must not rely on frontend-only hiding.
for path, payload in [
    ('/api/educator/case-draft', {'topic':'Security boundary test','specialty':'Internal medicine'}),
    ('/api/educator/case-drafts/security-test/review', {'reviewer':'Forged reviewer','review_notes':'Should be rejected'}),
    ('/api/educator/case-drafts/security-test/approve-and-publish', {'reviewer':'Forged reviewer','review_notes':'Should be rejected'}),
]:
    response = client.post(path, headers=pilot_headers, json=payload)
    assert response.status_code == 401, (path, response.status_code, response.text)

# Exam submissions must not reveal diagnosis, scoring, rubric feedback or pass-threshold state.
assert exam_finish.json()['status'] == 'submitted_pending_educator_review'
for forbidden in ('hidden_case_diagnosis', 'score', 'domains', 'critical_flags', 'threshold_status', 'demo_threshold'):
    assert forbidden not in exam_finish.json(), (forbidden, exam_finish.json())
assert 'diagnosis' not in str(exam_finish.json()).lower()
# Session secrets are mandatory for both chat and investigation access in production.
assert client.post(f"/api/sessions/{secure_data['session_id']}/investigations",
                   headers={'X-Pilot-Token':'test-pilot-secret'},
                   json={'test_id':'malaria-rdt','indication':'Fever in an endemic setting'}).status_code == 401
main.APP_ENV = 'development'
main.APP_ENV = 'development'

case_draft = client.post('/api/educator/case-draft', json={'topic':'Pediatric dehydration','specialty':'Pediatrics','source_references':['educator supplied protocol']})
assert case_draft.status_code == 200 and case_draft.json()['status'] == 'draft_requires_clinical_review'
assert client.get('/api/educator/dashboard').status_code == 200
# Template-only scaffold must not be publishable, even if someone adds a review note.
draft_id = case_draft.json()['draft_id']
blocked = client.post(f'/api/educator/case-drafts/{draft_id}/approve-and-publish', json={'reviewer':'Smoke test educator','review_notes':'This test does not represent clinical approval.'})
assert blocked.status_code == 422, blocked.text
print('PASS: API smoke tests, exam confidentiality and expiry, production access-token gate, and per-session authorization for chat, investigations and submission.')
os.unlink(tmp.name)
