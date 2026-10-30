"""VR voice endpoint: server-side STT, validation and failure behaviour (no real network)."""
import sys
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
import main  # noqa: E402


def client(tmp_path, monkeypatch, configured=True):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "v.db")
    monkeypatch.setattr(main, "APP_ENV", "development")
    monkeypatch.setattr(main, "STT_BASE", "https://stt.example/v1" if configured else "")
    monkeypatch.setattr(main, "STT_KEY", "k" * 20 if configured else "")
    monkeypatch.setattr(main, "STT_MODEL", "whisper-x" if configured else "")
    main.init_db()
    return TestClient(main.app)


class FakeResp:
    def __init__(self, data, status=200): self._d, self.status = data, status
    def raise_for_status(self):
        if self.status >= 400: raise RuntimeError("upstream")
    def json(self): return self._d


def fake_client(resp=None, exc=None, seen=None):
    class C:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def post(self, url, headers=None, data=None, files=None):
            if seen is not None: seen.update(url=url, headers=headers, data=data, files=files)
            if exc: raise exc
            return resp
    return C


def test_transcribe_returns_text_and_keeps_key_server_side(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch); seen = {}
    monkeypatch.setattr(main.httpx, "AsyncClient", fake_client(FakeResp({"text": " Any chest pain? "}), seen=seen))
    r = c.post("/api/voice/transcribe", content=b"audio-bytes", headers={"Content-Type": "audio/webm;codecs=opus"})
    assert r.status_code == 200 and r.json() == {"text": "Any chest pain?"}
    assert seen["url"] == "https://stt.example/v1/audio/transcriptions"
    assert "k" * 20 not in r.text


def test_transcribe_unconfigured_is_503_with_text_fallback_hint(tmp_path, monkeypatch):
    r = client(tmp_path, monkeypatch, configured=False).post("/api/voice/transcribe", content=b"x", headers={"Content-Type": "audio/webm"})
    assert r.status_code == 503 and "text fallback" in r.json()["detail"].lower()


def test_transcribe_rejects_bad_input(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    assert c.post("/api/voice/transcribe", content=b"x", headers={"Content-Type": "text/plain"}).status_code == 415
    assert c.post("/api/voice/transcribe", content=b"", headers={"Content-Type": "audio/webm"}).status_code == 400
    big = b"0" * (main.MAX_AUDIO_BYTES + 1)
    assert c.post("/api/voice/transcribe", content=big, headers={"Content-Type": "audio/webm"}).status_code == 413


def test_transcribe_upstream_failure_is_502_not_a_crash(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    monkeypatch.setattr(main.httpx, "AsyncClient", fake_client(exc=RuntimeError("down")))
    r = c.post("/api/voice/transcribe", content=b"x", headers={"Content-Type": "audio/webm"})
    assert r.status_code == 502 and "retry" in r.json()["detail"].lower()


def test_vr_chat_grounded_in_case_and_unsupported_test_not_invented(tmp_path, monkeypatch):
    """Same session drives chat + investigation + finish exactly as the VR adapter does."""
    c = client(tmp_path, monkeypatch)
    monkeypatch.setattr(main, "LLM_BASE", "")
    s = c.post("/api/sessions", json={"learner": "VR", "case_id": "respiratory-severe-001", "mode": "practice"}).json()
    sid = s["session_id"]
    assert "88%" in s["patient"]["vitals"]["SpO₂"]
    chat = c.post(f"/api/sessions/{sid}/chat", json={"message": "When did the cough start?"}).json()
    assert "four days ago" in chat["reply"]
    ok = c.post(f"/api/sessions/{sid}/investigations", json={"test_id": "chest-xray", "indication": "Suspected pneumonia"}).json()
    assert "air-space opacity" in ok["result"]
    bad = c.post(f"/api/sessions/{sid}/investigations", json={"test_id": "ct-head", "indication": "Headache"}).json()
    assert bad["configured"] is False and "not been performed" in bad["result"]
    rep = c.post(f"/api/sessions/{sid}/finish", json={"differential": ["pneumonia", "sepsis"], "final_diagnosis": "Severe pneumonia", "management": ["Urgent senior help / escalation", "Oxygenation and monitoring per local protocol"], "reflection": "Result of chest x-ray: opacity."}).json()
    assert rep["status"] == "formative_unvalidated" and rep["investigations_ordered"] == 2

