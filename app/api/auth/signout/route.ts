import { deleteSession, sessionCookie } from '@/lib/auth';
import { failure, verifyMutationOrigin } from '@/lib/server';

export async function POST(request:Request){
  try{verifyMutationOrigin(request);await deleteSession(request);return Response.json({ok:true},{headers:{'Cache-Control':'no-store','Set-Cookie':sessionCookie('',request,0)}});}catch(error){return failure(error);}
}
