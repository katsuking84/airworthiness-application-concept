'use client';
import { ArrowLeft, ArrowRight, FileText, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Choices, SelectField, CheckField, MultiChoices } from './application-fields';
import { goals, families, standardCategories, lightSportClasses, experimentalPurposes, restrictedPurposes, flightPurposes, uasPurposes, backgrounds, isFlight, isProduction, sourceWarnings, questionnaireErrors, type Answers } from '@/lib/application';

export default function Questionnaire({answers:a,onChange,question,onQuestion,onContinue,busy}:{answers:Answers;onChange:(a:Answers)=>void;question:number;onQuestion:(n:number)=>void;onContinue:()=>void;busy:boolean}){
 const set=(key:keyof Answers,value:unknown)=>onChange({...a,[key]:value});
 const title=question===0?'What would you like to do?':question===1?(isFlight(a)?'What is the flight for?':'Which path fits your aircraft?'):'A few details about your aircraft';
 const valid=question===0?Boolean(a.goal):question===1?Boolean((isFlight(a)?a.category:a.family)&&(!['standard','light-sport','provisional','flight'].includes(a.family)||a.category)&&(!['experimental','restricted','multiple'].includes(a.family)||a.purposes.length)):questionnaireErrors(a).length===0;
 return <section className="work-card"><div className="card-heading"><span className="mini-icon"><FileText size={21}/></span><div><h2>{title}</h2><p>{question===0?'Select the option that best describes your request.':question===1?'This selects a path; it does not establish eligibility.':'These answers tailor the form and document checklist.'}</p></div></div>
 {question===0&&<Choices label={title} value={a.goal} options={goals} onChange={v=>onChange({...a,goal:v,family:v==='permit'?'flight':a.family==='flight'?'':a.family,category:v==='permit'||a.family==='flight'?'':a.category})}/>}
 {question===1&&<>{isFlight(a)?<Choices label="Flight purpose" value={a.category} onChange={v=>set('category',v)} options={flightPurposes.map(x=>[x,x])}/>:<Choices label="Certificate family" value={a.family} onChange={v=>onChange({...a,family:v,category:'',purposes:[]})} options={families}/>}
 <div className="form-body subquestions">
 {(a.family==='standard'||(a.family==='multiple'&&a.multipleOther==='Standard'))&&<SelectField id="category" label="Standard category" required value={a.category} onChange={v=>set('category',v)} options={standardCategories}/>}
 {a.family==='light-sport'&&<SelectField id="category" label="Light-sport class" required value={a.category} onChange={v=>set('category',v)} options={lightSportClasses}/>}
 {a.family==='provisional'&&<SelectField id="category" label="Provisional class" required value={a.category} onChange={v=>set('category',v)} options={['Class I','Class II']}/>}
 {a.family==='multiple'&&<SelectField id="multipleOther" label="In addition to restricted, request" required value={a.multipleOther} onChange={v=>onChange({...a,multipleOther:v,category:''})} options={['Standard','Limited']}/>}
 {['experimental','restricted','multiple'].includes(a.family)&&<MultiChoices label={a.family==='experimental'?'Experimental purpose(s)':'Restricted special-purpose use(s)'} values={a.purposes} onChange={v=>set('purposes',v)} options={a.family==='experimental'?(a.unmanned?uasPurposes:experimentalPurposes):restrictedPurposes}/>}
 </div></>}
 {question===2&&<div className="form-body"><div className="field-grid"><SelectField id="role" label="Are you the owner or an agent?" required value={a.role} onChange={v=>set('role',v)} options={['Registered owner','Authorized agent']}/><SelectField id="registrationStatus" label="Aircraft registration" required value={a.registrationStatus} onChange={v=>set('registrationStatus',v)} options={['Current U.S. registration','Registration pending','Not sure / not yet registered']}/><div className="wide-field"><SelectField id="background" label="Which best describes the aircraft?" required value={a.background} onChange={v=>set('background',v)} options={backgrounds}/></div></div>
 <div className="question-checks"><CheckField id="unmanned" checked={a.unmanned} onChange={v=>onChange({...a,unmanned:v,purposes:v?a.purposes.filter(p=>uasPurposes.includes(p)):a.purposes})}>This is an unmanned aircraft.</CheckField>
 {a.family==='experimental'&&<CheckField id="unchanged" checked={a.unchangedTypeDesign} onChange={v=>set('unchangedTypeDesign',v)}>Converted from a previously type-certificated model with no appreciable external configuration change.</CheckField>}
 {!isFlight(a)&&a.family!=='experimental'&&<CheckField id="previousExperimental" checked={a.previousExperimental} onChange={v=>set('previousExperimental',v)}>Returning from an experimental certificate to a previously held certificate.</CheckField>}
 {isProduction(a)&&<CheckField id="lsaManufacturer" checked={a.lsaManufacturer} onChange={v=>set('lsaManufacturer',v)}>The applicant manufactures fully assembled light-sport category aircraft.</CheckField>}</div>
 {sourceWarnings(a).map(w=><div className="notice" key={w}><Info size={18}/><p>{w}</p></div>)}
 <p className="fine-text">The form sections follow AC 21-12D Table 1. The document checklist uses the attached FAA Order 8130.2M and AC guidance.</p></div>}
 <div className="card-actions"><div>{question>0?<Button variant="ghost" onClick={()=>onQuestion(question-1)}><ArrowLeft/> Back</Button>:<span className="muted">Question 1 of 3</span>}</div><Button className="primary-button" disabled={!valid||busy} onClick={()=>question===2||a.goal==='replacement'?onContinue():onQuestion(question+1)}>{question===2?'Prepare my application':a.goal==='replacement'?'View replacement guidance':'Continue'}<ArrowRight/></Button></div></section>;
}
