'use client';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Field } from '@/lib/application';

export function Choices({value,onChange,options,label}:{value:string;onChange:(v:string)=>void;options:string[][];label:string}){
 return <RadioGroup aria-label={label} value={value} onValueChange={v=>onChange(String(v))} className="choice-list">{options.map(([key,title,description])=><label className={`choice ${value===key?'selected':''}`} key={key}><RadioGroupItem value={key}/><span><strong>{title}</strong>{description&&<small>{description}</small>}</span></label>)}</RadioGroup>;
}
export function SelectField({id,label,value,onChange,options,hint,required=false}:{id:string;label:string;value:string;onChange:(v:string)=>void;options:string[];hint?:string;required?:boolean}){
 return <div className="form-field"><label id={`${id}-label`} htmlFor={id}>{label}{required&&<span className="required"> *</span>}</label><Select value={value||null} onValueChange={v=>onChange(v?String(v):'')}><SelectTrigger id={id} aria-labelledby={`${id}-label`} aria-describedby={hint?`${id}-hint`:undefined} className="form-input"><SelectValue placeholder="Choose an option"/></SelectTrigger><SelectContent>{options.map(o=><SelectItem value={o} key={o}>{o}</SelectItem>)}</SelectContent></Select>{hint&&<p id={`${id}-hint`}>{hint}</p>}</div>;
}
export function CheckField({checked,onChange,children,id}:{checked:boolean;onChange:(v:boolean)=>void;children:React.ReactNode;id:string}){return <label className="check-field" htmlFor={id}><Checkbox id={id} checked={checked} onCheckedChange={v=>onChange(Boolean(v))}/><span>{children}</span></label>;}
export function MultiChoices({values,onChange,options,label}:{values:string[];onChange:(v:string[])=>void;options:string[];label:string}){return <fieldset className="multi-choices"><legend>{label} <span className="required">*</span></legend>{options.map((o,i)=><CheckField key={o} id={`purpose-${i}`} checked={values.includes(o)} onChange={checked=>onChange(checked?[...values,o]:values.filter(v=>v!==o))}>{o}</CheckField>)}</fieldset>;}
export function Fields({definitions,values,onChange,disabled=false,showErrors=false}:{definitions:Field[];values:Record<string,string>;onChange:(key:string,value:string)=>void;disabled?:boolean;showErrors?:boolean}){
 return <div className="field-grid">{definitions.map(f=><div key={f.id} className={f.type==='textarea'?'wide-field':''}>{f.type==='select'?<SelectField id={f.id} label={f.label} value={values[f.id]||''} onChange={v=>onChange(f.id,v)} options={f.options||[]} required={f.required} hint={f.hint}/>:<div className="form-field"><label htmlFor={f.id}>{f.label}{f.required&&<span className="required"> *</span>}</label>{f.type==='textarea'?<Textarea id={f.id} className="form-input" rows={4} value={values[f.id]||''} onChange={e=>onChange(f.id,e.target.value)} maxLength={6000} disabled={disabled} aria-required={f.required} aria-invalid={showErrors&&f.required&&!values[f.id]} aria-describedby={f.hint?`${f.id}-hint`:undefined}/>:<Input id={f.id} className="form-input" type={f.type||'text'} min={f.type==='number'?0:undefined} step={f.type==='number'?'any':undefined} value={values[f.id]||''} onChange={e=>onChange(f.id,e.target.value)} maxLength={300} disabled={disabled} aria-required={f.required} aria-invalid={showErrors&&f.required&&!values[f.id]} aria-describedby={f.hint?`${f.id}-hint`:undefined}/>} {f.hint&&<p id={`${f.id}-hint`}>{f.hint}</p>}</div>}</div>)}</div>;
}
