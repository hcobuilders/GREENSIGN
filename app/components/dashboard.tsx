import { Link } from "react-router";

const priorityProjects = [
  ["26-055","Oakfield Trails — Harvest Club","BID · HIGH","Aug 12 · 2:00 PM","Scope lock · Aug 10"],
  ["26-068","JHACH Specialty Pharmacy","FINAL PRICING","Aug 11","4 open scopes"],
  ["26-052","PHSC East Campus Repairs","ACTIVE","Scope review","Updated today"],
  ["CMAR","K-Bar Ranch Park","PLANNING","ROM development","Estimate review"],
];

export function Dashboard({confirm}:{confirm:(value:string)=>void}) {
  return <>
    <div className="metrics">{[["Active projects","12","3 priority"],["Open solicitations","38","14 due this week"],["Proposals due","6","2 critical"],["Pending actions","17","5 assigned to you"]].map(item=><div className="metric" key={item[0]}><label>{item[0]}</label><strong>{item[1]}</strong><small>{item[2]}</small></div>)}</div>
    <div className="content-grid">
      <section><div className="panel-head standalone"><h2>Priority projects</h2><Link to="/app/projects" className="text-link">VIEW ALL →</Link></div><div className="cards">{priorityProjects.map(project=><article className="card" key={project[0]}><div className="card-top"><span className="code">{project[0]}</span><span className="tag">{project[2]}</span></div><h3>{project[1]}</h3><div className="card-meta"><div><label>Current</label><b>{project[3]}</b></div><div><label>Next</label><b>{project[4]}</b></div></div><div className="card-actions"><button onClick={()=>confirm(`Open ${project[1]}`)}>OPEN</button><button onClick={()=>confirm("Review project files")}>FILES</button></div></article>)}</div></section>
      <section className="panel"><div className="panel-head"><h2>Activity + actions</h2><button className="text-button">FILTER</button></div>{[["3 bids received","Oakfield Trails · Division 09"],["Scope confirmation ready","JHACH · Electrical"],["Insurance expires soon","2 trade partners need review"],["Proposal review assigned","PHSC East Campus Repairs"]].map(item=><div className="activity-row" key={item[0]}><i/><div><b>{item[0]}</b><span>{item[1]}</span></div></div>)}</section>
    </div>
  </>;
}
