"""Deterministic patient-state engine (stdlib only).

Clinical content lives in backend/scenarios/*.json; this module holds rules only.
State is *replayed* from the session's event log, so it is auditable, reproducible
and cannot drift between clients. Simulated time advances by fixed minutes per
student action (no wall-clock), so outcomes are explainable and testable.
Generative AI never touches vitals, findings or consequences.
"""
from __future__ import annotations
import json
from pathlib import Path

SCENARIO_DIR = Path(__file__).resolve().parent / "scenarios"
SIM_EVENT_TYPES = ("sim_examine", "sim_intervene")


def load_scenarios(directory: Path = SCENARIO_DIR) -> dict:
    out = {}
    for p in sorted(directory.glob("*.json")):
        s = json.loads(p.read_text(encoding="utf-8"))
        if s.get("case_id"):
            out[s["case_id"]] = s
    return out


def _minutes(scn: dict, event: dict) -> float:
    m = scn["action_minutes"]
    t = event.get("type")
    if t == "chat": return m["chat"]
    if t == "investigation": return m["investigation"]
    if t == "sim_examine": return m["examine"]
    if t == "sim_intervene": return m["intervene"]
    return 0.0


def replay(scn: dict, events: list) -> dict:
    """Walk the event log and return the clock plus when each intervention happened."""
    clock = 0.0; done = {}; stage_at = {}
    for e in events or []:
        if e.get("type") == "sim_intervene" and e.get("key") in scn["interventions"] and e["key"] not in done:
            done[e["key"]] = clock
            stage_at[e["key"]] = _stage(scn, clock, done.get("oxygen") if e["key"] != "oxygen" else None)
        clock += _minutes(scn, e)
    return {"clock": round(clock, 2), "done": done, "stage_at": stage_at}


def _stage(scn: dict, t: float, oxygen_at: float | None) -> int:
    limit = t if oxygen_at is None else min(t, oxygen_at)
    stage = 0
    for d in scn["deterioration"]:
        if limit >= d["at_minute"]: stage = d["stage"]
    return stage


def current_state(scn: dict, st: dict) -> dict:
    """Vitals and status at the current simulated clock."""
    vitals = dict(scn["baseline"]); label = "unstable"
    oxy = st["done"].get("oxygen")
    stage = _stage(scn, st["clock"], oxy)
    for d in scn["deterioration"]:
        if d["stage"] <= stage:
            vitals.update(d["vitals"]); label = d["label"]
    if oxy is not None:
        resp = scn["interventions"]["oxygen"]["response_by_stage"][str(st["stage_at"]["oxygen"])]
        vitals.update(resp["vitals"]); label = resp["label"]
    return {"vitals": vitals, "status": label, "clock": st["clock"], "stage": stage}


def format_measure(key: str, vitals: dict) -> str:
    return {
        "spo2": f"SpO₂ {vitals['spo2']}%",
        "rr": f"Respiratory rate {vitals['rr']}/min",
        "hr": f"Pulse {vitals['hr']}/min",
        "bp": f"Blood pressure {vitals['sbp']}/{vitals['dbp']} mmHg",
        "temp": f"Temperature {vitals['temp']} °C",
    }[key]


class Unsupported(ValueError):
    pass


def examine(scn: dict, st: dict, key: str) -> dict:
    """Return the configured finding for a supported action; never invent one."""
    kind, _, name = key.partition(":")
    if kind == "measure" and name in scn["measures"]:
        cur = current_state(scn, st)
        return {"key": key, "finding": format_measure(name, cur["vitals"]), "measured": True, "status": cur["status"]}
    if key in scn["findings"]:
        return {"key": key, "finding": scn["findings"][key], "measured": False}
    raise Unsupported(f"'{key}' is not a supported examination action in this scenario.")


def intervene(scn: dict, st: dict, key: str) -> dict:
    if key not in scn["interventions"]:
        raise Unsupported(f"'{key}' is not a supported intervention in this scenario.")
    return {"key": key, "label": scn["interventions"][key]["label"], "already": key in st["done"]}


def evidence(scn: dict, events: list) -> dict:
    """Process evidence for the debrief: timeline, timings and educator-defined rule flags."""
    clock = 0.0; timeline = []
    for e in events or []:
        t = e.get("type")
        if t in ("chat", "investigation", "sim_examine", "sim_intervene"):
            label = {"chat": "Asked: " + str(e.get("student_message", ""))[:80], "investigation": "Requested " + str(e.get("test_name", "")),
                     "sim_examine": "Examined: " + str(e.get("key", "")), "sim_intervene": "Intervened: " + str(e.get("key", ""))}[t]
            timeline.append({"sim_minute": round(clock, 2), "type": t, "detail": label})
        clock += _minutes(scn, e)
    st = replay(scn, events)
    flags = []
    for r in scn["rules"]:
        at = st["done"].get(r["action"])
        if r["type"] == "action_missing" and at is None: flags.append({"id": r["id"], "text": r["text"]})
        if r["type"] == "action_after_minutes" and at is not None and at > r["minutes"]: flags.append({"id": r["id"], "text": r["text"], "at_minute": at})
    return {"review_status": scn["review_status"], "timeline": timeline, "final_status": current_state(scn, st)["status"],
            "minutes_to": {k: v for k, v in st["done"].items()}, "scenario_flags": flags, "scored": False}

