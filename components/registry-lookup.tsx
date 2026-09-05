'use client';
import { useMemo, useState } from 'react';
import { Check, Database, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FAA_N_NUMBER_INQUIRY_URL, registryAutofillFields, type RegistryLookupResponse } from '@/lib/registry';

type Props={values:Record<string,string>;onChange:(key:string,value:string)=>void;disabled?:boolean};

export default function RegistryLookup({values,onChange,disabled=false}:Props){
 const [result,setResult]=useState<RegistryLookupResponse|null>(null);
 const [selected,setSelected]=useState<string[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const available=useMemo(()=>result?registryAutofillFields.map(item=>({...item,value:item.registryValue(result.aircraft)})).filter(item=>item.value):[],[result]);
 const lookup=async()=>{setBusy(true);setError('');setResult(null);try{
  const query=values.registration?.trim();if(!query)throw new Error('Enter an N-number in the registration mark field first.');
  const response=await fetch(`/api/registry/n-number/${encodeURIComponent(query)}`,{cache:'no-store'});
  const body=await response.json() as RegistryLookupResponse&{error?:string};
  if(!response.ok)throw new Error(body.error||'The registry lookup could not be completed.');
  setResult(body);setSelected(registryAutofillFields.filter(item=>{const incoming=item.registryValue(body.aircraft);const current=values[item.formField]?.trim();return Boolean(incoming)&&(!current||current===incoming);}).map(item=>item.formField));
 }catch(reason){setError(reason instanceof Error?reason.message:'The registry lookup could not be completed.');}finally{setBusy(false)}};
 const apply=()=>{if(!result)return;for(const item of available)if(selected.includes(item.formField))onChange(item.formField,item.value);};
 return <aside className="registry-lookup" aria-label="FAA aircraft registry lookup">
  <div className="registry-lookup-head"><div><span><Database/> FAA AIRCRAFT REGISTRY</span><h4>Look up this N-number</h4><p>Compare technical aircraft details from the latest mirrored FAA release.</p></div><Button type="button" variant="outline" disabled={disabled||busy||!values.registration?.trim()} onClick={()=>void lookup()}>{busy?<RefreshCw className="spin"/>:<Search/>}{busy?'Looking up':'Look up aircraft'}</Button></div>
  {error&&<p className="registry-error" role="alert">{error}</p>}
  {result&&<div className="registry-result">
   <div className="registry-result-title"><div><strong>{result.aircraft.nNumber}</strong><span>{[result.aircraft.manufacturer,result.aircraft.model].filter(Boolean).join(' · ')||'Technical record found'}</span></div><span>{result.aircraft.registrationStatus?.label||'Status unavailable'}</span></div>
   <div className="registry-field-list">{available.map(item=>{const current=values[item.formField]?.trim();const conflict=Boolean(current&&current!==item.value);const id=`registry-${item.formField}`;return <label key={item.formField} htmlFor={id} className="registry-field"><Checkbox id={id} checked={selected.includes(item.formField)} onCheckedChange={checked=>setSelected(list=>checked?[...new Set([...list,item.formField])]:list.filter(field=>field!==item.formField))}/><span><strong>{item.label}</strong><small>{item.value}{conflict?` · Current entry: ${current}`:''}</small></span></label>})}</div>
   <div className="registry-result-actions"><p>FAA release mirrored {new Date(result.source.generatedAt).toLocaleDateString()}. Confirm the record before relying on it.</p><div><a href={FAA_N_NUMBER_INQUIRY_URL} target="_blank" rel="noreferrer">Verify with the FAA <ExternalLink/></a><Button type="button" className="primary-button" disabled={!selected.length||disabled} onClick={apply}><Check/> Use selected details</Button></div></div>
  </div>}
 </aside>;
}
