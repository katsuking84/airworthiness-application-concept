import { requirements, type ApplicationData } from './application';
import { ApiError, ownedApplication, runtime } from './server';

export const MAX_DOCUMENT_SIZE=10*1024*1024;
export const DOCUMENT_CHUNK_SIZE=512*1024;
export const MAX_DOCUMENTS=40;

export type UploadRow={id:string;application_id:string;requirement_id:string;name:string;expected_size:number;part_count:number};

export async function ownedUpload(id:string,owner:string){
 const row=await runtime().DB.prepare('SELECT u.* FROM document_uploads u JOIN applications a ON a.id = u.application_id WHERE u.id = ? AND a.owner = ? AND a.status = \'draft\'').bind(id,owner).first<UploadRow>();
 if(!row)throw new ApiError('Upload not found.',404);
 return row;
}

export async function validateUploadTarget(applicationId:string,requirementId:string,owner:string){
 const application=await ownedApplication(applicationId,owner,true);
 const data=JSON.parse(application.data) as ApplicationData;
 if(!requirements(data.answers).some(item=>item.id===requirementId))throw new ApiError('This document does not match the current application path. Save your answers and try again.');
 const count=await runtime().DB.prepare('SELECT COUNT(*) AS n FROM documents WHERE application_id = ?').bind(applicationId).first<{n:number}>();
 if((count?.n||0)>=MAX_DOCUMENTS)throw new ApiError(`This concept allows up to ${MAX_DOCUMENTS} documents per application.`);
}

export function safeDocumentName(value:string){return Array.from(value,char=>char.charCodeAt(0)<32||char==='/'||char==='\\'?'_':char).join('').slice(0,180)||'document';}
export function documentMime(body:Uint8Array){
 if(new TextDecoder().decode(body.slice(0,5))==='%PDF-')return 'application/pdf';
 if(body[0]===0x89&&body[1]===0x50&&body[2]===0x4e&&body[3]===0x47)return 'image/png';
 if(body[0]===0xff&&body[1]===0xd8&&body[2]===0xff)return 'image/jpeg';
 throw new ApiError('Upload a PDF, PNG, or JPG file.');
}

export async function discardUpload(upload:UploadRow){
 await Promise.all(Array.from({length:upload.part_count},(_,part)=>runtime().FILES.delete(`uploads/${upload.id}/${part}`)));
 await runtime().DB.prepare('DELETE FROM document_uploads WHERE id = ?').bind(upload.id).run();
}
