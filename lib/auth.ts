import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

const COOKIE = 'airworthy_session';
const SESSION_DAYS = 30;
// Cloudflare Workers currently caps PBKDF2 at 100,000 iterations.
const ITERATIONS = 100_000;
const ATTEMPT_WINDOW_MS = 15*60*1000;
const MAX_AUTH_FAILURES = 6;

type AuthDB = { DB: D1Database };
type LocalUserRow = { id:string; email:string; name:string; password_hash:string; password_salt:string };
type SessionUserRow = { id:string; email:string; name:string };

export type SignedInUser = {
  userId:string;
  displayName:string;
  email:string;
  provider:'chatgpt'|'email';
};

const db=()=> (env as unknown as AuthDB).DB;
const encoder=new TextEncoder();
const hex=(bytes:ArrayBuffer|Uint8Array)=>Array.from(new Uint8Array(bytes instanceof Uint8Array?bytes.buffer:bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');
const randomToken=(length=32)=>{
  const bytes=crypto.getRandomValues(new Uint8Array(length));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
const sha256=async(value:string)=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
const normalizeEmail=(value:unknown)=>typeof value==='string'?value.trim().toLowerCase():'';

async function passwordHash(password:string,salt:string){
  const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:ITERATIONS},key,256));
}
function equalHash(a:string,b:string){
  if(a.length!==b.length)return false;let difference=0;
  for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);
  return difference===0;
}
function cookieValue(header:string|null){
  const match=header?.split(';').map(x=>x.trim()).find(x=>x.startsWith(`${COOKIE}=`));
  return match?decodeURIComponent(match.slice(COOKIE.length+1)):null;
}
async function requestToken(request?:Request){
  if(request)return cookieValue(request.headers.get('cookie'));
  return (await cookies()).get(COOKIE)?.value||null;
}
export function sessionCookie(token:string,request:Request,maxAge=SESSION_DAYS*86400){
  const secure=new URL(request.url).protocol==='https:'?'; Secure':'';
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
export function validateAccountInput(value:unknown,creating:boolean){
  const body=value&&typeof value==='object'?value as Record<string,unknown>:{};
  const email=normalizeEmail(body.email),password=typeof body.password==='string'?body.password:'';
  const name=typeof body.name==='string'?body.name.trim().replace(/\s+/g,' '):'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new Error('Enter a valid email address.');
  if(password.length<12||password.length>128)throw new Error('Use a password between 12 and 128 characters.');
  if(creating&&(name.length<2||name.length>80))throw new Error('Enter your name.');
  return {email,password,name};
}
async function authAttemptKey(request:Request,email:string){
 const forwarded=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
 return sha256(`${normalizeEmail(email)}\n${forwarded}`);
}
export async function assertAuthAllowed(request:Request,email:string){
 const key=await authAttemptKey(request,email),row=await db().prepare('SELECT attempts, window_started_at FROM auth_attempts WHERE key = ?').bind(key).first<{attempts:number;window_started_at:string}>();
 if(!row)return key;
 if(Date.now()-Date.parse(row.window_started_at)>=ATTEMPT_WINDOW_MS){await db().prepare('DELETE FROM auth_attempts WHERE key = ?').bind(key).run();return key;}
 if(row.attempts>=MAX_AUTH_FAILURES)throw new Error('Too many account attempts. Wait 15 minutes and try again.');
 return key;
}
export async function recordAuthFailure(key:string){
 const now=new Date().toISOString(),cutoff=new Date(Date.now()-ATTEMPT_WINDOW_MS).toISOString();
 await db().prepare('INSERT INTO auth_attempts (key, attempts, window_started_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN window_started_at < ? THEN 1 ELSE attempts + 1 END, window_started_at = CASE WHEN window_started_at < ? THEN excluded.window_started_at ELSE window_started_at END').bind(key,now,cutoff,cutoff).run();
}
export async function clearAuthAttempts(key:string){await db().prepare('DELETE FROM auth_attempts WHERE key = ?').bind(key).run();}
async function createSession(userId:string){
  const token=randomToken(),tokenHash=await sha256(token),now=new Date(),expires=new Date(now.getTime()+SESSION_DAYS*86400000);
  await db().prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(),userId,tokenHash,expires.toISOString(),now.toISOString()).run();
  return token;
}
export async function createAccount(input:{email:string;password:string;name:string}){
  const existing=await db().prepare('SELECT id FROM users WHERE email = ?').bind(input.email).first();
  if(existing)throw new Error('An account already exists for this email address.');
  const id=crypto.randomUUID(),salt=randomToken(24),hash=await passwordHash(input.password,salt),now=new Date().toISOString();
  await db().prepare('INSERT INTO users (id, email, name, password_hash, password_salt, password_algorithm, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id,input.email,input.name,hash,salt,'pbkdf2-sha256-100000',now).run();
  return {token:await createSession(id),user:{userId:`local:${id}`,displayName:input.name,email:input.email,provider:'email' as const}};
}
export async function signInAccount(input:{email:string;password:string}){
  const row=await db().prepare('SELECT id, email, name, password_hash, password_salt FROM users WHERE email = ?').bind(input.email).first<LocalUserRow>();
  const candidate=await passwordHash(input.password,row?.password_salt||'invalid-account-salt');
  if(!row||!equalHash(candidate,row.password_hash))throw new Error('Email or password is incorrect.');
  return {token:await createSession(row.id),user:{userId:`local:${row.id}`,displayName:row.name,email:row.email,provider:'email' as const}};
}
export async function deleteSession(request:Request){
  const token=await requestToken(request);if(token)await db().prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
}
export async function currentUser(request?:Request):Promise<SignedInUser|null>{
  const chat=await getChatGPTUser();
  if(chat)return {userId:chat.userId,displayName:chat.displayName,email:chat.email,provider:'chatgpt'};
  const token=await requestToken(request);if(!token)return null;
  const row=await db().prepare('SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?').bind(await sha256(token),new Date().toISOString()).first<SessionUserRow>();
  return row?{userId:`local:${row.id}`,displayName:row.name,email:row.email,provider:'email'}:null;
}
