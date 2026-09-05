import { assertAuthAllowed, clearAuthAttempts, recordAuthFailure, sessionCookie, signInAccount, validateAccountInput } from '@/lib/auth';
import { ApiError, failure, jsonBody, verifyMutationOrigin } from '@/lib/server';

export async function POST(request:Request){
  try{
    verifyMutationOrigin(request);
    let input;
    try{input=validateAccountInput(await jsonBody(request),false);}catch(error){throw new ApiError(error instanceof Error?error.message:'Check the account details.');}
    let key;try{key=await assertAuthAllowed(request,input.email);}catch(error){throw new ApiError(error instanceof Error?error.message:'Too many account attempts.',429);}
    let result;
    try{result=await signInAccount(input);}catch{await recordAuthFailure(key);throw new ApiError('Email or password is incorrect.',401);}
    await clearAuthAttempts(key);
    return Response.json({user:result.user},{headers:{'Cache-Control':'no-store','Set-Cookie':sessionCookie(result.token,request)}});
  }catch(error){return failure(error);}
}
