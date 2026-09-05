import { discardUpload, ownedUpload } from '@/lib/document-upload';
import { failure, identity, response } from '@/lib/server';

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){try{
 const user=await identity(request);const {id}=await params;const upload=await ownedUpload(id,user.userId);await discardUpload(upload);return response({ok:true});
}catch(error){return failure(error);}}
