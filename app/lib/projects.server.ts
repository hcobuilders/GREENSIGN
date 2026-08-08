import { and, asc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "./db.server";
import { companies, projects } from "./schema.server";

const foundationProjects = [
  { code:"26-055", name:"Oakfield Trails — Harvest Club", status:"bidding", phase:"preconstruction", owner:"R. Green", startDate:"2026-07-15", dueDate:"2026-08-12", completionDate:"2027-11-30" },
  { code:"26-068", name:"JHACH Specialty Pharmacy", status:"pricing", phase:"final pricing", owner:"M. Carter", startDate:"2026-07-28", dueDate:"2026-08-11", completionDate:"2027-04-16" },
  { code:"26-052", name:"PHSC East Campus Repairs", status:"active", phase:"scope review", owner:"R. Green", startDate:"2026-06-02", dueDate:"2026-08-21", completionDate:"2027-01-29" },
  { code:"CMAR", name:"K-Bar Ranch Park", status:"planning", phase:"ROM development", owner:"A. Foster", startDate:"2026-09-01", dueDate:"2026-09-18", completionDate:"2028-03-10" },
];

async function ensureFoundationCompany() {
  const db=getDatabase();
  const existing=await db.select().from(companies).where(eq(companies.slug,"hco-builders")).limit(1);
  if(existing[0]) return existing[0];
  const inserted=await db.insert(companies).values({name:"HCO Builders",slug:"hco-builders"}).returning();
  return inserted[0];
}

export async function listProjects() {
  const db=getDatabase(); const company=await ensureFoundationCompany();
  const current=await db.select().from(projects).where(eq(projects.companyId,company.id)).orderBy(asc(projects.code));
  if(current.length) return current;
  await db.insert(projects).values(foundationProjects.map(project=>({...project,companyId:company.id})));
  return db.select().from(projects).where(eq(projects.companyId,company.id)).orderBy(asc(projects.code));
}

const allowedFields = new Set(["code","name","status","phase","owner","startDate","dueDate","completionDate"]);
export async function updateProject(id:string,field:string,value:string|null) {
  if(!allowedFields.has(field)) throw new Response("Unsupported project field",{status:400});
  const db=getDatabase(); const company=await ensureFoundationCompany();
  const normalized=field.endsWith("Date")&&!value?null:value;
  await db.update(projects).set({[field]:normalized,updatedAt:new Date()}).where(and(eq(projects.id,id),eq(projects.companyId,company.id)));
}

export async function bulkUpdateProjects(ids:string[],status:string) {
  if(!ids.length) return;
  const db=getDatabase(); const company=await ensureFoundationCompany();
  await db.update(projects).set({status,updatedAt:new Date()}).where(and(eq(projects.companyId,company.id),inArray(projects.id,ids)));
}

export async function deleteProjects(ids:string[]) {
  if(!ids.length) return;
  const db=getDatabase(); const company=await ensureFoundationCompany();
  await db.delete(projects).where(and(eq(projects.companyId,company.id),inArray(projects.id,ids)));
}

export async function createProject() {
  const db=getDatabase(); const company=await ensureFoundationCompany();
  const code=`NEW-${String(Date.now()).slice(-4)}`;
  await db.insert(projects).values({companyId:company.id,code,name:"Untitled project",status:"planning",phase:"preconstruction",owner:"Unassigned"});
}

export async function createProjectsFromUpload(file:File) {
  const text=await file.text();let rows:Record<string,unknown>[]=[];
  if(file.name.toLowerCase().endsWith(".json")) {const parsed=JSON.parse(text);rows=Array.isArray(parsed)?parsed:[parsed];}
  else {const [header,...lines]=text.split(/\r?\n/).filter(Boolean);if(!header)throw new Response("The uploaded file is empty",{status:400});const keys=header.split(",").map(value=>value.trim());rows=lines.map(line=>Object.fromEntries(keys.map((key,index)=>[key,line.split(",")[index]?.trim()??""])));}
  const company=await ensureFoundationCompany(),db=getDatabase();const values=rows.filter(row=>row.code||row.name).map((row,index)=>({companyId:company.id,code:String(row.code||`IMPORT-${Date.now()}-${index+1}`),name:String(row.name||"Untitled project"),status:String(row.status||"planning"),phase:String(row.phase||"preconstruction"),owner:String(row.owner||"Unassigned"),startDate:row.startDate?String(row.startDate):null,dueDate:row.dueDate?String(row.dueDate):null,completionDate:row.completionDate?String(row.completionDate):null}));
  if(!values.length)throw new Response("No project rows were found",{status:400});await db.insert(projects).values(values);return values.length;
}
