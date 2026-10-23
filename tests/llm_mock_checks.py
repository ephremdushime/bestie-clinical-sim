"""Offline integration test for configured-model case drafting and publishing."""
import json, os, tempfile, sys, importlib
from pathlib import Path
from unittest.mock import patch

fd, dbpath = tempfile.mkstemp(prefix='bcs-llm-test-', suffix='.db')
os.close(fd)
os.environ['CLINICAL_SIM_DB'] = dbpath
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import main
from fastapi.testclient import TestClient

case_json = {
    'title': 'Fever case — mock generated', 'specialty': 'Internal medicine',
    'learner_level': 'Clinical-year student', 'learning_objectives': ['Build a differential'],
    'fictional_patient_profile': {'age': 24, 'sex_or_pregnancy_status': 'adult woman', 'appearance': 'Fictional adult patient'},
    'opening_statement': 'I have had a fever since yesterday.',
    'hidden_diagnosis': 'Fictional malaria teaching scenario',
    'fixed_facts': {'onset': 'Fever began yesterday', 'symptoms': 'Fever and headache', 'history': 'No known allergies', 'risk': 'Lives in an endemic area', 'exam': 'Alert and febrile'},
    'vitals': {'Temperature': '38.5 C'},
    'differentials': ['malaria', 'viral illness'],
    'investigations': [{'id': 'malaria-rdt', 'name': 'Malaria RDT', 'indication': 'Fever in endemic setting', 'result': 'Positive in this fictional case', 'interpretation': 'Supports malaria in context', 'appropriate': True}, {'id': 'fbc', 'name': 'Full blood count', 'indication': 'Assess blood counts if indicated', 'result': 'Hb 11.2 g/dL and platelets 128 x10^9/L in this fictional case', 'interpretation': 'Interpret in clinical context; not diagnostic alone', 'appropriate': True}],
    'expected_actions': ['Assess severity', 'Interpret the test'],
    'critical_safety_errors': ['Ignore danger signs'],
    'marking_rubric': [{'domain': 'Reasoning', 'criteria': 'Prioritized differential', 'points': 100}],
    'source_references': ['https://example.org/educator-reviewed-reference'],
    'uncertainties_for_review': ['Verify against current national guidance']
}
class FakeResponse:
    def raise_for_status(self): pass
    def json(self): return {'choices': [{'message': {'content': json.dumps(case_json)}}]}
class FakeAsyncClient:
    def __init__(self, *args, **kwargs): pass
    async def __aenter__(self): return self
    async def __aexit__(self, *args): return False
    async def post(self, *args, **kwargs): return FakeResponse()

main.LLM_BASE='https://mock-provider.invalid/v1'
main.LLM_KEY='test-only-key'
main.LLM_MODEL='mock-model'
client=TestClient(main.app)
with patch.object(main.httpx, 'AsyncClient', FakeAsyncClient):
    r=client.post('/api/educator/case-draft', json={
        'topic':'Fever case', 'specialty':'Internal medicine', 'learner_level':'Clinical-year student',
        'learning_objectives':['Build a differential'], 'source_references':['https://example.org/educator-reviewed-reference'],
        'auto_retrieve':False
    })
assert r.status_code == 200, r.text
draft=r.json()
assert draft['generation_mode'] == 'llm_with_evidence_retrieval', draft['generation_mode']
assert draft['status'] == 'draft_requires_clinical_review'
assert draft['case']['investigations']['malaria-rdt']['result'] == 'Positive in this fictional case'
assert client.get('/api/cases').status_code == 200
publish=client.post(f"/api/educator/case-drafts/{draft['draft_id']}/approve-and-publish", json={
    'reviewer':'Test educator', 'review_notes':'Mock integration test only; not a clinical approval.'
})
assert publish.status_code == 200, publish.text
case_id=publish.json()['case_id']
assert any(c['id'] == case_id for c in client.get('/api/cases').json()['cases'])
# Simulate backend restart and verify approved case is loaded from SQLite.
main=importlib.reload(main)
assert case_id in main.CASES, 'Published case was not restored after restart'
print('PASS: mocked LLM generation -> draft persistence -> educator attestation -> case registry -> restart reload.')
try: os.unlink(dbpath)
except OSError: pass
