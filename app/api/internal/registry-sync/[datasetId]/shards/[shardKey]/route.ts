import { ApiError, failure, readLimited, requireRegistrySync, response, runtime } from '@/lib/server';

const DATASET=/^[a-f0-9]{16,64}$/;
const SHARD=/^[1-9][0-9A-HJ-NP-Z_]$/;
const hex=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer))).map(x=>x.toString(16).padStart(2,'0')).join('');
export async function PUT(request:Request,{params}:{params:Promise<{datasetId:string;shardKey:string}>}){try{
  requireRegistrySync(request);
  const {datasetId,shardKey}=await params;
  if(!DATASET.test(datasetId)||!SHARD.test(shardKey))throw new ApiError('The registry shard path is invalid.');
  if(request.headers.get('content-type')!=='application/gzip')throw new ApiError('Registry shards must be gzip files.');
  const bytes=await readLimited(request,3*1024*1024);
  const expected=request.headers.get('x-content-sha256')||'';
  if(!/^[a-f0-9]{64}$/.test(expected)||!equal(expected,await hex(bytes)))throw new ApiError('The registry shard checksum does not match.');
  await runtime().FILES.put(`registry/datasets/${datasetId}/shards/${shardKey}.json.gz`,bytes,{httpMetadata:{contentType:'application/gzip'},customMetadata:{sha256:expected}});
  return response({ok:true});
}catch(error){return failure(error);}}
function equal(a:string,b:string){if(a.length!==b.length)return false;let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);return difference===0;}
