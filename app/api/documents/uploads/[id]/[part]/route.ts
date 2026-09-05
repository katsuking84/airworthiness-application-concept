import { DOCUMENT_CHUNK_SIZE, ownedUpload } from '@/lib/document-upload';
import { ApiError, failure, identity, readLimited, response, runtime } from '@/lib/server';

export async function PUT(request:Request,{params}:{params:Promise<{id:string;part:string}>}){try{
 const user=await identity(request);const {id,part}=await params;const upload=await ownedUpload(id,user.userId);const index=Number(part);
 if(!Number.isInteger(index)||index<0||index>=upload.part_count)throw new ApiError('The upload part is invalid.');
 const expected=index===upload.part_count-1?upload.expected_size-(index*DOCUMENT_CHUNK_SIZE):DOCUMENT_CHUNK_SIZE;
 const bytes=await readLimited(request,DOCUMENT_CHUNK_SIZE);
 if(bytes.length!==expected)throw new ApiError('The upload part has an unexpected size.');
 await runtime().FILES.put(`uploads/${upload.id}/${index}`,bytes,{httpMetadata:{contentType:'application/octet-stream'}});
 return response({ok:true});
}catch(error){return failure(error);}}
