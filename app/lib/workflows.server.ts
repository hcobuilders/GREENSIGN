import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "./db.server";
import { companies, toolConfigurations, workflowRecords } from "./schema.server";

async function company(){const db=getDatabase();const [row]=await db.select().from(companies).where(eq(companies.slug,"hco-builders")).limit(1);if(!row)throw new Response("Company not found",{status:404});return row;}
export async function listWorkflowRecords(){const db=getDatabase(),tenant=await company();return db.select().from(workflowRecords).where(eq(workflowRecords.companyId,tenant.id)).orderBy(asc(workflowRecords.createdAt));}
export async function createWorkflowRecord(toolKey:string,type:string,projectId:string|null,payload:Record<string,unknown>={},state="draft"){const db=getDatabase(),tenant=await company();await db.insert(workflowRecords).values({companyId:tenant.id,projectId:projectId||null,toolKey,type,state,payload});}
export async function updateWorkflowRecord(id:string,state:string,payload:Record<string,unknown>){const db=getDatabase(),tenant=await company();const [current]=await db.select().from(workflowRecords).where(and(eq(workflowRecords.id,id),eq(workflowRecords.companyId,tenant.id))).limit(1);if(!current)throw new Response("Record not found",{status:404});await db.update(workflowRecords).set({state,payload,revision:current.revision+1}).where(eq(workflowRecords.id,id));}
export async function deleteWorkflowRecord(id:string){const db=getDatabase(),tenant=await company();await db.delete(workflowRecords).where(and(eq(workflowRecords.id,id),eq(workflowRecords.companyId,tenant.id)));}
export async function listToolConfigurations(){const db=getDatabase(),tenant=await company();return db.select().from(toolConfigurations).where(eq(toolConfigurations.companyId,tenant.id));}
export async function setToolEnabled(toolKey:string,enabled:boolean){const db=getDatabase(),tenant=await company();const [existing]=await db.select().from(toolConfigurations).where(and(eq(toolConfigurations.companyId,tenant.id),eq(toolConfigurations.toolKey,toolKey))).limit(1);if(existing)await db.update(toolConfigurations).set({enabled}).where(eq(toolConfigurations.id,existing.id));else await db.insert(toolConfigurations).values({companyId:tenant.id,toolKey,enabled});}
export async function updateCompanySettings(key:string,value:unknown){const db=getDatabase(),tenant=await company();const settings=(tenant.settings??{}) as Record<string,unknown>;await db.update(companies).set({settings:{...settings,[key]:value}}).where(eq(companies.id,tenant.id));}
export async function getCompany(){return company();}
