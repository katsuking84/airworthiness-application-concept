import { env } from 'cloudflare:workers';
import { currentUser } from './auth';
import { initialData, type ApplicationData, type DocumentRecord } from './application';
export const runtime=()=>env as unknown as { DB:D1Database; FILES:R2Bucket };
export class ApiError extends Error { constructor(message:string,public status=400){super(message);} }
export function verifyMutationOrigin(request:Request){
 const origin=request.headers.get('origin');
 if((origin&&origin!==new URL(request.url).origin)||request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError('This request could not be verified.',403);
}
export async function identity(request?:Request){
 const user=await currentUser(request);if(!user)throw new ApiError('Please sign in to continue.',401);
 if(request&&request.method!=='GET')verifyMutationOrigin(request);
 return user;
}
export function response(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export function failure(error:unknown){if(error instanceof ApiError)return response({error:error.message},error.status);console.error('Application request failed',error instanceof Error?error.message:'unknown');return response({error:'We could not complete that request. Please try again.'},500);}
export async function readLimited(request:Request,max:number){
 if(Number(request.headers.get('content-length')||0)>max)throw new ApiError('This upload is too large.',413);
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();
 const parts:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new ApiError('This upload is too large.',413);}parts.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}return bytes;
}
export async function jsonBody(request:Request){try{return JSON.parse(new TextDecoder().decode(await readLimited(request,150000)));}catch(e){if(e instanceof ApiError)throw e;throw new ApiError('The application data could not be read.');}}
export function cleanData(value:unknown):ApplicationData{
 if(!value||typeof value!=='object')throw new ApiError('Application data is missing.');
 const v=value as Record<string,unknown>;const a=v.answers as Record<string,unknown>;const f=v.fields as Record<string,unknown>;
 if(!a||!f||typeof a!=='object'||typeof f!=='object'||Array.isArray(f))throw new ApiError('Application data is invalid.');
 const result=structuredClone(initialData);const target=result.answers as unknown as Record<string,unknown>;
 for(const key of Object.keys(result.answers)){const source=a[key];if(key==='purposes'){if(!Array.isArray(source)||source.length>20||source.some(x=>typeof x!=='string'||x.length>120))throw new ApiError('Operating purposes are invalid.');target[key]=source;}else if(typeof target[key]==='boolean')target[key]=source===true;else target[key]=typeof source==='string'?source.slice(0,200):target[key];}
 if(Object.keys(f).length>100)throw new ApiError('Too many application fields.');
 result.fields=Object.fromEntries(Object.entries(f).filter(([k,v])=>/^[a-zA-Z][a-zA-Z0-9]*$/.test(k)&&typeof v==='string').map(([k,v])=>[k,(v as string).slice(0,6000)]));
 result.attest=v.attest===true;result.consent=v.consent===true;return result;
}
export type AppRow={id:string;owner:string;data:string;step:number;status:string;updated_at:string;submitted_at:string|null;receipt:string|null};
export async function ownedApplication(id:string,owner:string,editable=false){const row=await runtime().DB.prepare('SELECT * FROM applications WHERE id = ? AND owner = ?').bind(id,owner).first<AppRow>();if(!row)throw new ApiError('Application not found.',404);if(editable&&row.status!=='draft')throw new ApiError('This concept application was submitted and is read-only.',409);return row;}
export async function documentList(id:string):Promise<DocumentRecord[]>{const {results}=await runtime().DB.prepare('SELECT id, requirement_id AS requirementId, name, size, uploaded_at AS uploadedAt FROM documents WHERE application_id = ? ORDER BY uploaded_at').bind(id).all<DocumentRecord>();return results;}
export function appRecord(row:AppRow){return {id:row.id,data:JSON.parse(row.data),step:row.step,status:row.status,updatedAt:row.updated_at,submittedAt:row.submitted_at,receipt:row.receipt};}
