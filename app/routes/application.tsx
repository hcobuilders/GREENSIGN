import { useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import type { Route } from "./+types/application";

const modules = [
  ["proposal-designer", "V1", "Proposal Designer", "Build proposals from reusable template blocks and publish editable or PDF outputs."],
  ["projects", "V2", "Project Intelligence", "Initiate projects, track milestones, surface risk, budget and forecast signals."],
  ["subcontractors", "V3", "Trade Partners", "Manage contacts, qualifications, licensing, performance and bid history."],
  ["solicitations", "V3.1", "Solicitations", "Package scopes, select bidders, manage plan rooms, addenda and communications."],
  ["rfis", "V3.2", "Preconstruction RFIs", "Collect, answer, publish and export plan-room questions by scope."],
  ["contracts", "V4", "Commitments", "Generate commitments from approved scope and contract template blocks."],
  ["risk", "V4.1", "Scope + Contract Risk", "Compare commitments with project requirements and expose coverage gaps."],
  ["submittals", "V5", "Submittals", "Build dynamic logs, collect packages, standardize markups and export transmittals."],
  ["procurement", "V6", "Procurement", "Track critical items, confirmations, communications and schedule deadlines."],
  ["schedule", "V7", "Schedule Assist", "Generate activities from scope, rates and units and export schedule files."],
  ["closeout", "V8", "Closeout", "Track requirements and file bins by scope, partner and deliverable type."],
  ["change-risk", "V9", "Change Risk", "Capture events and suggest guarded actions using combined project risk."],
] as const;

const globalLinks = [["dashboard","Dashboard"],["projects","Projects"],["data","Data"],["network","Network"]] as const;
const settingsLinks = [["account","Account info"],["company","Company info"],["contacts","Contacts & trades"],["features","Manage features"],["connections","Connections"],["subscription","Subscription"]] as const;
const sampleProjects = [
  ["26-055", "Oakfield Trails — Harvest Club", "BID · HIGH", "Aug 12 · 2:00 PM", "Scope lock · Aug 10"],
  ["26-068", "JHACH Specialty Pharmacy", "FINAL PRICING", "Aug 11", "4 open scopes"],
  ["26-052", "PHSC East Campus Repairs", "ACTIVE", "Scope review", "Updated today"],
  ["CMAR", "K-Bar Ranch Park", "PLANNING", "ROM development", "Estimate review"],
];

export function meta(): Route.MetaDescriptors { return [{ title: "GREENSIGN — Construction Intelligence" }]; }

function ConfirmDialog({title,onClose}:{title:string;onClose:()=>void}) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}><div className="dialog" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}>
    <h2>{title}</h2><p>This endpoint is present for workflow validation. GREENSIGN foundation mode does not create or modify records yet.</p>
    <div className="page-actions"><button className="primary" onClick={onClose}>OK</button></div>
  </div></div>;
}

function Dashboard({confirm}:{confirm:(value:string)=>void}) {
  return <><div className="metrics">{[["Active projects","12","3 priority"],["Open solicitations","38","14 due this week"],["Proposals due","6","2 critical"],["Pending actions","17","5 assigned to you"]].map(x=><div className="metric" key={x[0]}><label>{x[0]}</label><strong>{x[1]}</strong><small>{x[2]}</small></div>)}</div>
    <div className="content-grid"><section><div className="panel-head"><h2>Priority projects</h2><Link to="/app/projects" className="muted">VIEW ALL →</Link></div><div className="cards">{sampleProjects.map(p=><article className="card" key={p[0]}><div className="card-top"><span className="code">{p[0]}</span><span className="tag">{p[2]}</span></div><h3>{p[1]}</h3><div className="card-meta"><div><label>Current</label><b>{p[3]}</b></div><div><label>Next</label><b>{p[4]}</b></div></div><div className="card-actions"><button onClick={()=>confirm(`Open ${p[1]}`)}>OPEN</button><button onClick={()=>confirm("Review project files")}>FILES</button></div></article>)}</div></section>
    <section className="panel"><div className="panel-head"><h2>Activity + actions</h2></div>{[["3 bids received","Oakfield Trails · Division 09"],["Scope confirmation ready","JHACH · Electrical"],["Insurance expires soon","2 trade partners need review"],["Proposal review assigned","PHSC East Campus Repairs"]].map(a=><div className="activity-row" key={a[0]}><b>{a[0]}</b><span>{a[1]}</span></div>)}</section></div></>;
}

function ModuleIndex() { return <div className="module-grid">{modules.map(m=><article className="module-card" key={m[0]}><span className="number">{m[1]}</span><h3>{m[2]}</h3><p>{m[3]}</p><div className="tool-actions"><Link to={`/app/tools/${m[0]}`}>OPEN TOOL →</Link><Link to={`/app/settings/tools/${m[0]}`}>SETUP</Link></div></article>)}</div>; }

function ToolPage({slug,confirm}:{slug:string;confirm:(value:string)=>void}) {
  const tool=modules.find(m=>m[0]===slug) ?? modules[0];
  return <><div className="metrics"><div className="metric"><label>Status</label><strong>Ready</strong><small>Foundation endpoint</small></div><div className="metric"><label>Items</label><strong>0</strong><small>No records created</small></div><div className="metric"><label>Templates</label><strong>0</strong><small>Setup available</small></div><div className="metric"><label>Connections</label><strong>0</strong><small>Not configured</small></div></div><div className="panel"><div className="panel-head"><h2>{tool[2]} workspace</h2><Link to={`/app/settings/tools/${tool[0]}`} className="muted">TOOL SETTINGS →</Link></div><div className="empty"><b>No {tool[2].toLowerCase()} data yet.</b><br/>{tool[3]}<div className="page-actions" style={{justifyContent:"center",marginTop:16}}><button className="primary" onClick={()=>confirm(`Start ${tool[2]} workflow`)}>START WORKFLOW</button></div></div></div></>;
}

function Settings({section,toolSlug}:{section?:string;toolSlug?:string}) {
  const tool=modules.find(m=>m[0]===toolSlug); const title=tool?`${tool[2]} setup`:settingsLinks.find(x=>x[0]===section)?.[1]??"Account info";
  const rows=tool?[["Enable tool","Make this module available in the current company environment"],["Tool setup","Define defaults, stages, ownership and workflow rules"],["Templates","Create and manage approved reusable templates"],["Field maps","Map standardized inputs and outputs between modules"],["Connectors","Configure external workflow and storage connections"],["Confirmation guardrails","Require user approval before parsed data is committed"]]:[["Environment access","Control access for this company environment"],["Notifications","Choose workflow and deadline alerts"],["Data confirmation","Require approval for imported or parsed values"],["Module visibility","Show only enabled tools in the workspace"]];
  return <div className="settings-grid"><nav className="settings-nav">{settingsLinks.map(s=><NavLink key={s[0]} to={`/app/settings/${s[0]}`}>{s[1]}</NavLink>)}<div className="side-label">Tool setup</div>{modules.map(m=><NavLink key={m[0]} to={`/app/settings/tools/${m[0]}`}>{m[2]}</NavLink>)}</nav><section className="settings-card"><div className="panel-head" style={{padding:"0 0 12px"}}><h2>{title}</h2></div>{rows.map((r,i)=><div className="setting-row" key={r[0]}><div><b>{r[0]}</b><span>{r[1]}</span></div><button className={`toggle ${i<2?"on":""}`} aria-label={`Toggle ${r[0]}`}/></div>)}</section></div>;
}

export default function Application() {
  const location=useLocation(),navigate=useNavigate(); const base=location.pathname.startsWith("/mockup")?"/mockup":"/app"; const path=location.pathname.replace(/^\/(?:app|mockup)\/?/,"").split("/").filter(Boolean); const [menuOpen,setMenuOpen]=useState(true); const [popover,setPopover]=useState(false); const [dialog,setDialog]=useState<string>(); const [command,setCommand]=useState(""); const [godMode,setGodMode]=useState(false);
  const current=path[0]||"dashboard"; const toolSlug=current==="tools"?path[1]:undefined; const settingsSection=current==="settings"?path[1]:undefined; const settingsTool=settingsSection==="tools"?path[2]:undefined;
  const title=useMemo(()=> godMode?"Environment Control": toolSlug?modules.find(m=>m[0]===toolSlug)?.[2] : current==="settings"?(settingsTool?modules.find(m=>m[0]===settingsTool)?.[2]+" setup":"Settings"):globalLinks.find(x=>x[0]===current)?.[1]??"Tools",[current,toolSlug,settingsTool,godMode]);
  function runCommand(e:React.FormEvent){e.preventDefault(); const value=command.trim(); if(value==="/gm_RH"){setGodMode(true);setCommand("");return;} if(value.startsWith("/open ")){navigate(`${base}/${value.slice(6).trim()}`);setCommand("");return;} setDialog(`Command: ${value||"empty"}`);setCommand("");}
  return <div className="app-shell"><header className="topbar"><div className="top-left"><button className="menu-button" onClick={()=>setPopover(v=>!v)} aria-label="Open all tools">☰</button><Link className="brand" to="/app/dashboard"><i className="mark"/><span>GREENSIGN</span></Link><nav className="global-nav">{globalLinks.map(l=><NavLink key={l[0]} to={`/app/${l[0]}`}>{l[1]}</NavLink>)}</nav>{popover&&<div className="popover"><div className="side-label">All tools</div><div className="popover-grid">{modules.map(m=><Link key={m[0]} onClick={()=>setPopover(false)} to={`/app/tools/${m[0]}`}>{m[2]}</Link>)}</div></div>}</div><div className="top-actions"><button className="ghost" onClick={()=>setDialog("Quick add")}>＋ QUICK ADD</button><Link className="avatar" to="/app/settings/account">RG</Link></div></header>
  <div className={`workspace ${menuOpen?"":"menu-closed"}`}><aside className="sidebar"><div className="side-label">Workspace</div>{globalLinks.map(l=><NavLink key={l[0]} to={`/app/${l[0]}`}>{l[1]}</NavLink>)}<div className="side-label">Construction tools</div>{modules.map(m=><NavLink key={m[0]} to={`/app/tools/${m[0]}`}>{m[2]}</NavLink>)}<div className="side-label">Administration</div><NavLink to="/app/settings/account">Settings</NavLink></aside><main className={`main ${godMode?"god":""}`}><div className="crumb">GREENSIGN / <b>{title}</b></div><div className="page-head"><div><div className="eyebrow">{godMode?"PRIVATE SUPERUSER SESSION":toolSlug?"CONSTRUCTION TOOL":"OPERATING WORKSPACE"}</div><h1>{title}</h1><div className="subtitle">{godMode?"Manage environments, accounts, modules and tenant availability.":"Connected construction intelligence with confirmation-first workflows."}</div></div><div className="page-actions"><button className="secondary" onClick={()=>setMenuOpen(v=>!v)}>☰ MENU</button>{toolSlug&&<Link className="tool-settings" to={`/app/settings/tools/${toolSlug}`}>⚙ TOOL SETUP</Link>}<button className="primary" onClick={()=>setDialog(`New ${title}`)}>+ NEW</button></div></div>
  {godMode?<div className="module-grid">{["Company environments","Admin accounts","Module assignments","Instance domains","Feature flags","Audit controls"].map(x=><article className="module-card" key={x}><span className="number">GODMODE</span><h3>{x}</h3><p>Private environment-level control surface. No changes are enabled in foundation mode.</p><div className="tool-actions"><button className="secondary" onClick={()=>setDialog(x)}>MANAGE</button></div></article>)}</div>:current==="dashboard"?<Dashboard confirm={setDialog}/>:current==="settings"?<Settings section={settingsSection} toolSlug={settingsTool}/>:toolSlug?<ToolPage slug={toolSlug} confirm={setDialog}/>:current==="projects"?<><Dashboard confirm={setDialog}/></>:current==="data"||current==="network"?<div className="empty">The {current} endpoint is ready. No connected data has been created.</div>:<ModuleIndex/>}</main></div>
  <form className="commandbar" onSubmit={runCommand}><span>/</span><input value={command} onChange={e=>setCommand(e.target.value)} placeholder="Type a command or press / anywhere…" aria-label="Global command"/><button type="submit" className="command-run">RUN</button><small>GLOBAL COMMAND</small></form>{dialog&&<ConfirmDialog title={dialog} onClose={()=>setDialog(undefined)}/>}</div>;
}
