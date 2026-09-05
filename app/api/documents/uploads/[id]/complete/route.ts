import { discardUpload, documentMime, ownedUpload, validateUploadTarget } from '@/lib/document-upload';
import { ApiError, failure, identity, response, runtime } from '@/lib/server';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{
 const user=await identity(request);const {id}=await params;const upload=await ownedUpload(id,user.userId);
 await validateUploadTarget(upload.application_id,upload.requirement_id,user.userId);
 const parts:Uint8Array[]=[];let size=0;
 for(let part=0;part<upload.part_count;part++){
  const object=await runtime().FILES.get(`uploads/${upload.id}/${part}`);if(!object)throw new ApiError('An upload part is missing. Please retry the file.',409);
  const bytes=new Uint8Array(await object.arrayBuffer());parts.push(bytes);size+=bytes.length;
 }
 if(size!==upload.expected_size)throw new ApiError('The completed upload size does not match the selected file.',409);
 const body=new Uint8Array(size);let offset=0;for(const bytes of parts){body.set(bytes,offset);offset+=bytes.length;}
 const mime=documentMime(body),documentId=crypto.randomUUID(),key=`applications/${upload.application_id}/${documentId}`,now=new Date().toISOString();
 await runtime().FILES.put(key,body,{httpMetadata:{contentType:mime}});
 try{
  const result=await runtime().DB.prepare("INSERT INTO documents (id, application_id, requirement_id, name, size, mime, object_key, uploaded_at) SELECT ?, id, ?, ?, ?, ?, ?, ? FROM applications WHERE id = ? AND owner = ? AND status = 'draft'").bind(documentId,upload.requirement_id,upload.name,size,mime,key,now,upload.application_id,user.userId).run();
  if(!result.meta.changes)throw new ApiError('This application is no longer editable.',409);
 }catch(error){await runtime().FILES.delete(key);throw error;}
 await discardUpload(upload);
 return response({document:{id:documentId,requirementId:upload.requirement_id,name:upload.name,size,uploadedAt:now}},201);
}catch(error){return failure(error);}}
