import { DOCUMENT_CHUNK_SIZE, MAX_DOCUMENT_SIZE, safeDocumentName, validateUploadTarget } from '@/lib/document-upload';
import { ApiError, failure, identity, jsonBody, response, runtime } from '@/lib/server';

export async function POST(request:Request){try{
 const user=await identity(request);const body=await jsonBody(request) as Record<string,unknown>;
 const applicationId=typeof body.applicationId==='string'?body.applicationId:'';
 const requirementId=typeof body.requirementId==='string'?body.requirementId:'';
 const name=safeDocumentName(typeof body.name==='string'?body.name:'');
 const size=Number(body.size);
 if(!Number.isInteger(size)||size<=0)throw new ApiError('Select a non-empty file.');
 if(size>MAX_DOCUMENT_SIZE)throw new ApiError('Each file must be 10 MB or smaller.',413);
 await validateUploadTarget(applicationId,requirementId,user.userId);
 const id=crypto.randomUUID(),partCount=Math.ceil(size/DOCUMENT_CHUNK_SIZE),createdAt=new Date().toISOString();
 await runtime().DB.prepare('INSERT INTO document_uploads (id, application_id, requirement_id, name, expected_size, part_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id,applicationId,requirementId,name,size,partCount,createdAt).run();
 return response({uploadId:id,chunkSize:DOCUMENT_CHUNK_SIZE,partCount},201);
}catch(error){return failure(error);}}
