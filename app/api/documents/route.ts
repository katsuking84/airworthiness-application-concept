import { requirements, type ApplicationData } from '@/lib/application';
import { documentMime, safeDocumentName } from '@/lib/document-upload';
import { runtime, identity, response, failure, readLimited, ownedApplication, ApiError } from '@/lib/server';
export async function POST(request:Request){try{
 const user=await identity(request);const bytes=await readLimited(request,11*1024*1024);const form=await new Request(request.url,{method:'POST',headers:{'content-type':request.headers.get('content-type')||''},body:bytes}).formData();
 const applicationValue=form.get('applicationId'),requirementValue=form.get('requirementId');const appId=typeof applicationValue==='string'?applicationValue:'',requirementId=typeof requirementValue==='string'?requirementValue:'';const row=await ownedApplication(appId,user.userId,true);const data=JSON.parse(row.data) as ApplicationData;
 if(!requirements(data.answers).some(r=>r.id===requirementId))throw new ApiError('This document does not match the current application path. Save your answers and try again.');
 const file=form.get('file');if(!(file instanceof File)||file.size===0)throw new ApiError('Select a non-empty file.');if(file.size>10*1024*1024)throw new ApiError('Each file must be 10 MB or smaller.',413);
 const count=await runtime().DB.prepare('SELECT COUNT(*) AS n FROM documents WHERE application_id = ?').bind(appId).first<{n:number}>();if((count?.n||0)>=40)throw new ApiError('This concept allows up to 40 documents per application.');
 const body=new Uint8Array(await file.arrayBuffer()),mime=documentMime(body);
 const id=crypto.randomUUID(),key=`applications/${appId}/${id}`,now=new Date().toISOString(),name=safeDocumentName(file.name);
 await runtime().FILES.put(key,body,{httpMetadata:{contentType:mime}});
 try{const result=await runtime().DB.prepare("INSERT INTO documents (id, application_id, requirement_id, name, size, mime, object_key, uploaded_at) SELECT ?, id, ?, ?, ?, ?, ?, ? FROM applications WHERE id = ? AND owner = ? AND status = 'draft'").bind(id,requirementId,name,file.size,mime,key,now,appId,user.userId).run();if(!result.meta.changes)throw new ApiError('This application is no longer editable.',409);}catch(e){await runtime().FILES.delete(key);throw e;}
 return response({document:{id,requirementId,name,size:file.size,uploadedAt:now}},201);
 }catch(e){return failure(e);}}
