import { ApiError, failure, jsonBody, requireRegistrySync, response, runtime } from '@/lib/server';
import type { RegistryManifest } from '@/lib/registry';

const DATASET=/^[a-f0-9]{16,64}$/;
const SHARD=/^[1-9][0-9A-HJ-NP-Z_]$/;
export async function POST(request:Request,{params}:{params:Promise<{datasetId:string}>}){try{
  requireRegistrySync(request);
  const {datasetId}=await params;
  const body=await jsonBody(request) as RegistryManifest;
  if(!DATASET.test(datasetId)||body.datasetId!==datasetId||body.schemaVersion!==1)throw new ApiError('The registry manifest is invalid.');
  const entries=Object.entries(body.shards||{});
  if(!Number.isInteger(body.recordCount)||body.recordCount<1||body.shardCount!==entries.length||entries.length<1||entries.length>400)throw new ApiError('The registry manifest counts are invalid.');
  if(entries.some(([key,value])=>!SHARD.test(key)||!value||!/^[a-f0-9]{64}$/.test(value.sha256)||value.recordCount<1||value.bytes<1))throw new ApiError('The registry manifest contains an invalid shard.');
  if(entries.reduce((sum,[,value])=>sum+value.recordCount,0)!==body.recordCount)throw new ApiError('The registry record count does not match its shards.');
  const canary=body.canaryNNumber;
  if(typeof canary!=='string'||!/^N[1-9]/.test(canary))throw new ApiError('The registry canary is invalid.');
  const prefix=`registry/datasets/${datasetId}/`;
  if(!await runtime().FILES.head(`${prefix}started.json`))throw new ApiError('The registry synchronization was not started.',409);
  const listed=await runtime().FILES.list({prefix:`${prefix}shards/`,limit:500});
  if(listed.truncated)throw new ApiError('The registry synchronization contains too many shards.');
  const uploaded=new Map(listed.objects.map(object=>[object.key.slice(`${prefix}shards/`.length,-8),object]));
  for(const [key,value] of entries){const object=uploaded.get(key);if(!object||object.size!==value.bytes)throw new ApiError(`Registry shard ${key} is missing or incomplete.`,409);}
  const manifestKey=`registry/datasets/${datasetId}/manifest.json`;
  const now=new Date().toISOString();
  await runtime().FILES.put(manifestKey,JSON.stringify(body),{httpMetadata:{contentType:'application/json'}});
  await runtime().FILES.put('registry/current.json',JSON.stringify({datasetId,manifestKey,publishedAt:now}),{httpMetadata:{contentType:'application/json'}});
  return response({datasetId,publishedAt:now,recordCount:body.recordCount});
}catch(error){return failure(error);}}
