import { useMemo, useState } from "react";
import { useFetcher } from "react-router";

export type ProjectRow = { id:string; code:string; name:string; status:string; phase:string; owner:string; startDate:string|null; dueDate:string|null; completionDate:string|null };

const statuses=["planning","bidding","pricing","active","on hold","complete"];
const editableTextFields=["code","name","phase","owner"] as const;
const dateFields=["startDate","dueDate","completionDate"] as const;

export function ProjectsPage({projects}:{projects:ProjectRow[]}) {
  const fetcher=useFetcher(); const [query,setQuery]=useState(""); const [status,setStatus]=useState("all"); const [selected,setSelected]=useState<Set<string>>(new Set()); const [bulkStatus,setBulkStatus]=useState("active");
  const filtered=useMemo(()=>projects.filter(project=>(status==="all"||project.status===status)&&`${project.code} ${project.name} ${project.owner} ${project.phase}`.toLowerCase().includes(query.toLowerCase())),[projects,query,status]);
  const allSelected=filtered.length>0&&filtered.every(project=>selected.has(project.id));
  const submit=(data:Record<string,string>)=>fetcher.submit(data,{method:"post"});
  function toggle(id:string){setSelected(current=>{const next=new Set(current); next.has(id)?next.delete(id):next.add(id); return next;});}
  function toggleAll(){setSelected(current=>{const next=new Set(current); if(allSelected) filtered.forEach(project=>next.delete(project.id)); else filtered.forEach(project=>next.add(project.id)); return next;});}
  function bulk(intent:"bulk-update"|"delete"){const ids=JSON.stringify([...selected]); if(intent==="delete"&&!window.confirm(`Delete ${selected.size} selected project${selected.size===1?"":"s"}?`)) return; submit({intent,ids,status:bulkStatus}); setSelected(new Set());}
  return <section className="projects-view">
    <div className="filter-bar"><input className="search-input" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search projects, codes, owners or phases…" aria-label="Search projects"/><select value={status} onChange={event=>setStatus(event.target.value)} aria-label="Filter project status"><option value="all">All statuses</option>{statuses.map(item=><option key={item}>{item}</option>)}</select><span className="result-count">{filtered.length} PROJECTS</span></div>
    <div className="bulk-bar"><span>{selected.size} SELECTED</span><select value={bulkStatus} onChange={event=>setBulkStatus(event.target.value)} aria-label="Bulk status">{statuses.map(item=><option key={item}>{item}</option>)}</select><button className="secondary" disabled={!selected.size} onClick={()=>bulk("bulk-update")}>APPLY STATUS</button><button className="danger-button" disabled={!selected.size} onClick={()=>bulk("delete")}>DELETE</button><button className="primary" onClick={()=>submit({intent:"create"})}>+ NEW PROJECT</button></div>
    <div className="table-wrap"><table className="projects-table"><thead><tr><th><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all filtered projects"/></th><th>Code</th><th>Project</th><th>Status</th><th>Phase</th><th>Owner</th><th>Start</th><th>Bid / Due</th><th>Completion</th></tr></thead><tbody>{filtered.map(project=><ProjectTableRow key={project.id} project={project} checked={selected.has(project.id)} onToggle={()=>toggle(project.id)} submit={submit}/>)}</tbody></table>{!filtered.length&&<div className="table-empty">No projects match the current filters.</div>}</div>
    {fetcher.state!=="idle"&&<div className="saving-indicator">SAVING…</div>}
  </section>;
}

function ProjectTableRow({project,checked,onToggle,submit}:{project:ProjectRow;checked:boolean;onToggle:()=>void;submit:(data:Record<string,string>)=>void}) {
  const update=(field:string,value:string)=>submit({intent:"update",id:project.id,field,value});
  return <tr className={checked?"selected":""}><td><input type="checkbox" checked={checked} onChange={onToggle} aria-label={`Select ${project.name}`}/></td>{editableTextFields.slice(0,2).map(field=><td key={field}><input className={`cell-input ${field}`} defaultValue={project[field]} onBlur={event=>{if(event.target.value!==project[field]) update(field,event.target.value);}} aria-label={`${project.name} ${field}`}/></td>)}<td><select className="cell-select" value={project.status} onChange={event=>update("status",event.target.value)} aria-label={`${project.name} status`}>{statuses.map(item=><option key={item}>{item}</option>)}</select></td>{editableTextFields.slice(2).map(field=><td key={field}><input className="cell-input" defaultValue={project[field]} onBlur={event=>{if(event.target.value!==project[field]) update(field,event.target.value);}} aria-label={`${project.name} ${field}`}/></td>)}{dateFields.map(field=><td key={field}><input className="date-input" type="date" value={project[field]??""} onChange={event=>update(field,event.target.value)} aria-label={`${project.name} ${field}`}/></td>)}</tr>;
}
