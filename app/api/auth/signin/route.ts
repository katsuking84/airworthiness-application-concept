import { sessionCookie, signInAccount, validateAccountInput } from '@/lib/auth';
import { ApiError, failure, jsonBody, verifyMutationOrigin } from '@/lib/server';

export async function POST(request:Request){
  try{
    verifyMutationOrigin(request);
    let input;
    try{input=validateAccountInput(await jsonBody(request),false);}catch(error){throw new ApiError(error instanceof Error?error.message:'Check the account details.');}
    let result;
    try{result=await signInAccount(input);}catch{throw new ApiError('Email or password is incorrect.',401);}
    return Response.json({user:result.user},{headers:{'Cache-Control':'no-store','Set-Cookie':sessionCookie(result.token,request)}});
  }catch(error){return failure(error);}
}
