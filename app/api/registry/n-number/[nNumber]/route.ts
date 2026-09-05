import { findRegistryAircraft, normalizeNNumber, registryShardKey, type RegistryAircraft, type RegistryLookupResponse, type RegistryManifest } from '@/lib/registry';
import { ApiError, failure, identity, response, runtime } from '@/lib/server';

async function readJson<T>(key:string):Promise<T>{
  const object=await runtime().FILES.get(key);
  if(!object)throw new ApiError('The FAA registry mirror is not ready yet.',503);
  return JSON.parse(await object.text()) as T;
}

async function readGzipJson<T>(key:string):Promise<T>{
  const object=await runtime().FILES.get(key);
  if(!object)throw new ApiError('The FAA registry mirror is temporarily incomplete.',503);
  const decompressed=object.body.pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(decompressed).text()) as T;
}

export async function GET(request:Request,{params}:{params:Promise<{nNumber:string}>}){
  try{
    await identity(request);
    const {nNumber:raw}=await params;
    const nNumber=normalizeNNumber(raw);
    if(!nNumber)throw new ApiError('Enter a valid U.S. N-number.');
    const shard=registryShardKey(nNumber);
    if(!shard)throw new ApiError('Enter a valid U.S. N-number.');
    const pointer=await readJson<{manifestKey:string}>('registry/current.json');
    if(typeof pointer.manifestKey!=='string'||!pointer.manifestKey.startsWith('registry/datasets/'))throw new ApiError('The FAA registry mirror is unavailable.',503);
    const manifest=await readJson<RegistryManifest>(pointer.manifestKey);
    const records=await readGzipJson<RegistryAircraft[]>(`registry/datasets/${manifest.datasetId}/shards/${shard}.json.gz`);
    const aircraft=findRegistryAircraft(records,nNumber);
    if(!aircraft)throw new ApiError(`No current FAA registration record was found for ${nNumber}.`,404);
    const result:RegistryLookupResponse={aircraft,source:{publisher:'Federal Aviation Administration',sourceUrl:manifest.sourceUrl,inquiryUrl:'https://registry.faa.gov/aircraftinquiry/search/nnumberinquiry',generatedAt:manifest.generatedAt,upstreamLastModified:manifest.upstreamLastModified}};
    return response(result);
  }catch(error){return failure(error);}
}
