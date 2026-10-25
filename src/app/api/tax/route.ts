import { withTaxStore } from '../../../lib/tax/connection';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
function failure(error:unknown) {
 const migration=error instanceof Error && error.message==='Migration required';
 return Response.json({error:migration?'Tax migration required. Ask the operator to review the explicit migration.':'Invalid tax entry or conflicting evidence.'},{status:migration?503:400,headers});
}
export async function GET(request:Request) {
 try {
  const params=new URL(request?.url??'http://localhost/api/tax').searchParams;
  if(params.size) {
   if(params.get('view')!=='candidates' || [...params.keys()].some(k=>!['view','from','to','page','pageSize'].includes(k)) || [...params.keys()].some(k=>params.getAll(k).length!==1) || ['from','to','page','pageSize'].some(k=>!params.has(k)) || !/^\d+$/.test(params.get('page')!) || !/^\d+$/.test(params.get('pageSize')!)) throw new Error('Invalid query');
   return Response.json(withTaxStore(store=>store.candidates({from:params.get('from')!,to:params.get('to')!,page:Number(params.get('page')),pageSize:Number(params.get('pageSize'))})),{headers});
  }
  return Response.json(withTaxStore(store=>store.snapshot()),{headers});
 } catch(error) { return failure(error); }
}
export async function POST(request:Request) {
 try {
  const length=request.headers.get('content-length'); if(length && Number(length)>8192) throw new Error('Too large');
  const text=await request.text(); if(text.length>8192) throw new Error('Too large');
  const body=JSON.parse(text);
  if(!body || typeof body!=='object' || Array.isArray(body) || Object.keys(body).some(k=>!['kind','data'].includes(k)) || typeof body.kind!=='string') throw new Error('Invalid envelope');
  const result=withTaxStore(store=>body.kind==='identity'?store.reviewIdentity(body.data):store.create(body.kind,body.data));
  return Response.json({id:result.id},{status:201,headers});
 } catch(error) { return failure(error); }
}
