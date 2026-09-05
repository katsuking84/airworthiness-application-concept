import { ApiError, failure, jsonBody, requireRegistrySync, response, runtime } from '@/lib/server';

const DATASET=/^[a-f0-9]{16,64}$/;
export async function POST(request:Request){try{
  requireRegistrySync(request);
  const body=await jsonBody(request);
  if(typeof body.datasetId!=='string'||!DATASET.test(body.datasetId))throw new ApiError('The dataset identifier is invalid.');
  const current=await runtime().FILES.get('registry/current.json');
  if(current){const pointer=JSON.parse(await current.text()) as {datasetId?:string};if(pointer.datasetId===body.datasetId)return response({datasetId:body.datasetId,unchanged:true});}
  await runtime().FILES.put(`registry/datasets/${body.datasetId}/started.json`,JSON.stringify({datasetId:body.datasetId,startedAt:new Date().toISOString()}),{httpMetadata:{contentType:'application/json'}});
  return response({datasetId:body.datasetId,unchanged:false},201);
}catch(error){return failure(error);}}
