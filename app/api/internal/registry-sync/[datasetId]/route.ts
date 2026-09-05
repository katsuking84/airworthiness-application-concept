import { ApiError, failure, requireRegistrySync, response, runtime } from '@/lib/server';

export async function DELETE(request:Request,{params}:{params:Promise<{datasetId:string}>}){try{
  requireRegistrySync(request);
  const {datasetId}=await params;
  if(!/^[a-f0-9]{16,64}$/.test(datasetId))throw new ApiError('The dataset identifier is invalid.');
  const current=await runtime().FILES.get('registry/current.json');
  if(current){const pointer=JSON.parse(await current.text()) as {datasetId?:string};if(pointer.datasetId===datasetId)throw new ApiError('The active registry dataset cannot be removed.',409);}
  let cursor:string|undefined;
  do{const listed=await runtime().FILES.list({prefix:`registry/datasets/${datasetId}/`,cursor,limit:500});await Promise.all(listed.objects.map(object=>runtime().FILES.delete(object.key)));cursor=listed.truncated?listed.cursor:undefined;}while(cursor);
  return response({ok:true});
}catch(error){return failure(error);}}
