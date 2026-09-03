import { createAccount, sessionCookie, validateAccountInput } from '@/lib/auth';
import { ApiError, failure, jsonBody, response, verifyMutationOrigin } from '@/lib/server';

export async function POST(request:Request){
  try{
    verifyMutationOrigin(request);
    let input;
    try{input=validateAccountInput(await jsonBody(request),true);}catch(error){throw new ApiError(error instanceof Error?error.message:'Check the account details.');}
    let result;
    try{result=await createAccount(input);}catch(error){throw new ApiError(error instanceof Error?error.message:'The account could not be created.',409);}
    return Response.json({user:result.user},{status:201,headers:{'Cache-Control':'no-store','Set-Cookie':sessionCookie(result.token,request)}});
  }catch(error){return failure(error);}
}
