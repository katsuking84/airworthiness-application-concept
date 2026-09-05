import { assertAuthAllowed, clearAuthAttempts, createAccount, recordAuthFailure, sessionCookie, validateAccountInput } from '@/lib/auth';
import { ApiError, failure, jsonBody, verifyMutationOrigin } from '@/lib/server';

export async function POST(request:Request){
  try{
    verifyMutationOrigin(request);
    let input;
    try{input=validateAccountInput(await jsonBody(request),true);}catch(error){throw new ApiError(error instanceof Error?error.message:'Check the account details.');}
    let key;try{key=await assertAuthAllowed(request,input.email);}catch(error){throw new ApiError(error instanceof Error?error.message:'Too many account attempts.',429);}
    let result;
    try{result=await createAccount(input);}catch{await recordAuthFailure(key);throw new ApiError('The account could not be created with those details.',409);}
    await clearAuthAttempts(key);
    return Response.json({user:result.user},{status:201,headers:{'Cache-Control':'no-store','Set-Cookie':sessionCookie(result.token,request)}});
  }catch(error){return failure(error);}
}
