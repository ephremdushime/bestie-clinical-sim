import React, {useEffect, useRef, useState} from 'react';

const API='/api';

export default function CollaborationRoom({user}) {
  const [status,setStatus]=useState('disconnected');
  const [room,setRoom]=useState(user?.institution_id||'');
  const [messages,setMessages]=useState([]);
  const [draft,setDraft]=useState('');
  const [error,setError]=useState('');
  const socketRef=useRef(null);
  const endRef=useRef(null);
  const connected= status==='connected';

  useEffect(()=>{
    if(user?.institution_id && !room) setRoom(user.institution_id);
  },[user?.institution_id]);

  useEffect(()=>()=>{if(socketRef.current){socketRef.current.close();socketRef.current=null}},[]);

  useEffect(()=>{endRef.current?.scrollIntoView?.({behavior:'smooth',block:'end'})},[messages]);

  const disconnect=()=>{
    if(socketRef.current){socketRef.current.close();socketRef.current=null}
    setStatus('disconnected');
  };

  const connect=async()=>{
    setError('');
    if(!user){setError('Sign in with a provisioned account before joining a team room.');return}
    const selected=room.trim();
    if(!selected){setError('Enter your institution room identifier.');return}
    disconnect();
    setStatus('connecting');
    try {
      const token=sessionStorage.getItem('bcsAuthToken')||'';
      const response=await fetch(API+'/auth/ws-ticket',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'});
      if(!response.ok) throw new Error(response.status===401?'Your sign-in has expired. Sign in again.':(await response.json()).detail||'Could not create a secure room ticket.');
      const data=await response.json();
      const protocol=window.location.protocol==='https:'?'wss:':'ws:';
      const socket=new WebSocket(protocol+'//'+window.location.host+'/ws/rooms/'+encodeURIComponent(selected)+'?ticket='+encodeURIComponent(data.ticket));
      socketRef.current=socket;
      socket.onopen=()=>{setStatus('connected');setError('')};
      socket.onmessage=(event)=>{try{const data=JSON.parse(event.data);if(data.type==='history'){setMessages(Array.isArray(data.messages)?data.messages:[]);return}setMessages(prev=>[...prev,data])}catch{setError('Received an unreadable room message.')}};
      socket.onerror=()=>setError('Room connection failed. Confirm the room belongs to your institution and try again.');
      socket.onclose=()=>{setStatus('disconnected');if(socketRef.current===socket)socketRef.current=null};
    } catch(e) {setStatus('disconnected');setError(e.message||'Unable to connect to the room.')}
  };

  const send=()=>{
    const text=draft.trim(), socket=socketRef.current;
    if(!text||!socket||socket.readyState!==WebSocket.OPEN)return;
    socket.send(JSON.stringify({text}));
    setDraft('');
  };

  return <div className="collab-page">
    <div className="page-title"><div className="eyebrow">INSTITUTION COLLABORATION</div><h1>Team room</h1><p>Short-lived, single-use WebSocket tickets authenticate this room connection. Messages are for coordination around fictional teaching scenarios only.</p></div>
    {!user&&<div className="notice"><b>Sign-in required.</b> Use a provisioned learner, educator or administrator account in the left panel to join a room.</div>}
    <section className="panel collab-panel">
      <div className="panel-heading"><div><small>SECURE ROOM</small><h2>Colleague discussion</h2></div><span className={'room-status '+(connected?'room-online':'')}>{status==='connected'?'CONNECTED':status==='connecting'?'CONNECTING…':'DISCONNECTED'}</span></div>
      <label className="field-label">Institution room identifier</label>
      <input value={room} onChange={e=>setRoom(e.target.value)} disabled={connected||status==='connecting'} placeholder="Your institution identifier" maxLength={120}/>
      <p className="helper">Institution accounts should use their assigned institution identifier. The server rejects cross-institution rooms; platform administrators may have wider access. Do not share real patient information, passwords or access tokens here.</p>
      <div className="collab-actions">{connected?<button className="secondary" onClick={disconnect}>Leave room</button>:<button className="primary" disabled={!user||status==='connecting'} onClick={connect}>{status==='connecting'?'Connecting…':'Join room →'}</button>}</div>
      {error&&<div className="alert" role="alert">{error}</div>}
      <div className="collab-messages" aria-live="polite">
        {messages.length?messages.map((m,i)=><article className="collab-message" key={m.id||i}><div><b>{m.name||m.display_name||'Room participant'}</b><small>{m.role||'member'}</small></div><p>{m.text||m.content||''}</p></article>):<div className="empty-state">No messages yet. Join the room to start a discussion.</div>}
        <div ref={endRef}/>
      </div>
      <div className="composer collab-composer"><textarea rows={2} value={draft} onChange={e=>setDraft(e.target.value)} maxLength={1200} disabled={!connected} placeholder="Write a brief team message…"/><button className="primary" disabled={!connected||!draft.trim()} onClick={send}>Send ↗</button></div>
    </section>
    <div className="notice"><b>Current scope:</b> text collaboration only. This room does not share live clinical-case state, patient simulation progress, examination answers or educator dashboards.</div>
  </div>;
}
