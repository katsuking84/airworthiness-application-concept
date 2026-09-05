export type Answers = {
  goal: string; family: string; category: string; purposes: string[]; background: string;
  role: string; registrationStatus: string; unmanned: boolean; lsaManufacturer: boolean;
  unchangedTypeDesign: boolean; previousExperimental: boolean; multipleOther: string;
};
export type ApplicationData = { answers: Answers; fields: Record<string,string>; attest: boolean; consent: boolean };
export type AppRecord = { id:string; data:ApplicationData; step:number; status:string; updatedAt:string; submittedAt?:string; receipt?:string };
export type DocumentRecord = { id:string; requirementId:string; name:string; size:number; uploadedAt:string };
export type Field = { id:string; label:string; required?:boolean; hint?:string; type?:'text'|'textarea'|'date'|'number'|'select'; options?:string[] };
export type Section = { id:string; title:string; source:string; hint?:string; fields:Field[] };
export type Requirement = { id:string; title:string; detail:string; source:string; page:number; doc:'order'|'ac'; required:boolean; kind:'Application document'|'Prepare for review' };
export const initialData: ApplicationData = { answers:{goal:'',family:'',category:'',purposes:[],background:'',role:'',registrationStatus:'',unmanned:false,lsaManufacturer:false,unchangedTypeDesign:false,previousExperimental:false,multipleOther:'Standard'},fields:{},attest:false,consent:false };
export const goals = [
 ['original','A new airworthiness certificate','Apply for an original certificate.'],
 ['recurrent','A recurrent airworthiness certificate','Reissue or renew an existing certification, where applicable.'],
 ['amend','Change an existing certificate','Amend the certificate or its operating purposes.'],
 ['permit','A temporary special flight permit','A specific flight or production flight testing.'],
 ['replacement','Replace a lost or damaged certificate','Use the replacement process instead of a new application.'],
];
export const families = [
 ['standard','Standard','Type-certificated aircraft in normal, utility, acrobatic, transport, commuter, balloon, or other categories.'],
 ['experimental','Experimental','Amateur-built aircraft, testing, exhibition, and other experimental purposes.'],
 ['light-sport','Light-sport','A special certificate in the light-sport category.'],
 ['primary','Primary','A type-certificated aircraft eligible for the primary category.'],
 ['restricted','Restricted','Special-purpose operations such as agriculture or aerial surveying.'],
 ['limited','Limited','An aircraft eligible for the limited category.'],
 ['provisional','Provisional','An aircraft with a provisional type certificate.'],
 ['multiple','Multiple certificates','Restricted category together with standard or limited certification.'],
];
export const standardCategories=['Normal','Utility','Acrobatic','Transport','Commuter','Balloon','Other'];
export const lightSportClasses=['Airplane','Powered parachute','Weight-shift-control','Glider','Rotorcraft','Powered-lift','Lighter-than-air','Other'];
export const experimentalPurposes=['Research and development','Showing compliance with regulations','Crew training','Exhibition','Air racing','Market survey','Amateur-built','Primary category kit-built','Former military aircraft','Light-sport category kit-built','Former light-sport category'];
export const uasPurposes=['Research and development','Market survey','Crew training','Exhibition','Showing compliance with regulations'];
export const restrictedPurposes=['Agriculture','Forest and wildlife conservation','Aerial surveying','Patrolling','Weather control','Aerial advertising','Other'];
export const flightPurposes=['Ferry for repairs, alterations, maintenance, or storage','Evacuate from impending danger','Excess of maximum certificated takeoff weight','Delivering or exporting','Production flight testing','Customer demonstration flights'];
export const backgrounds=['New — produced under a production certificate','New — produced under a type certificate only','New — imported type-certificated aircraft','Used aircraft','Used — imported type-certificated aircraft','One aircraft under § 21.6(b)','Other / not type-certificated'];
export function isFlight(a:Answers){return a.family==='flight' || a.goal==='permit';}
export function isProduction(a:Answers){return isFlight(a)&&a.category==='Production flight testing';}
export function isTyped(a:Answers){return ['standard','primary','limited','restricted','provisional','multiple'].includes(a.family);}
export function isImport(a:Answers){return isTyped(a)&&a.background.toLowerCase().includes('imported');}
export function needsInspection(a:Answers){return ['standard','multiple'].includes(a.family)&&a.goal!=='amend'&&(a.background.startsWith('Used')||a.background==='One aircraft under § 21.6(b)');}
export function familyLabel(a:Answers){return isFlight(a)?'Special flight permit':families.find(x=>x[0]===a.family)?.[1]||'Not selected';}
export function routeDetail(a:Answers){return ['experimental','restricted','multiple'].includes(a.family)?a.purposes.join(' · '):a.category||familyLabel(a);}
export function sourceWarnings(a:Answers):string[]{
 const warnings:string[]=[];
 if(a.unmanned) warnings.push('Unmanned-aircraft requirements need FAA Order 8130.34, which is outside the three supplied sources. You can prepare a draft; the checklist is not complete for this path.');
 if(isProduction(a)&&a.lsaManufacturer) warnings.push('AC 21-12D Table 1 lists Sections I and II for light-sport manufacturers, while Chapter 10 directs completion of VI.A and VI.C. This concept retains I, II, and VI.A/C as a draft and requires FAA confirmation before submission.');
 if(a.background==='One aircraft under § 21.6(b)') warnings.push('The one-aircraft § 21.183(h) route needs confirmation of the pre-August 5, 2004 construction evidence and the applicable inspection requirements. The supplied AC contains inconsistent wording for this case.');
 if(a.registrationStatus!=='Current U.S. registration' && a.registrationStatus) warnings.push('Confirm acceptable registration evidence with the FAA before completing the application. A pending registration is not automatically ineligible; exceptions depend on the facts.');
 return warnings;
}
const field=(id:string,label:string,required=true,type:Field['type']='text',hint?:string,options?:string[]):Field=>({id,label,required,type,hint,options});
export function sections(a:Answers):Section[]{
 const out:Section[]=[];const flight=isFlight(a),production=isProduction(a);
 if(!flight||(production&&a.lsaManufacturer))out.push({id:'I',title:'Aircraft description',source:'AC 21-12D, Chapter 3',hint:'Use the aircraft identification plate and registration. Enter N/A for engine or propeller details that do not apply.',fields:[field('registration','1. Registration mark',true,'text','Include the N prefix. You can compare technical details with the mirrored FAA registry below.'),field('builder','2. Manufacturer or builder'),field('model','3. Model designation'),field('year','4. Year of manufacture',true,'number','Four digits.'),field('serial','5. Aircraft serial number'),field('engineBuilder','6. Engine manufacturer or builder'),field('engineModel','7. Engine model'),field('engineCount','8. Number of engines',true,'number','Enter 0 for an unpowered aircraft.'),field('propBuilder','9. Propeller manufacturer or builder'),field('propModel','10. Propeller model')]});
 out.push({id:'II',title:'Certification requested',source:'AC 21-12D, Chapter 4',hint:'Your questionnaire answers populate the certificate and purpose selections. Use “Change answers” to revise them.',fields:[...(a.category==='Other'||a.purposes.includes('Other')?[field('otherCategory','Specify the other category or purpose')]:[]),...(['restricted','multiple'].includes(a.family)?[field('specialOperations','Special-purpose operation(s)',true,'textarea','Describe the actual operation, such as agriculture — crop spraying.')]:[]),field('retainCertificate','Current airworthiness certificate to retain',false,'text','If retaining a certificate in addition to the requested certificate, give its type/category.'),field('retainDate','Date of issuance of retained certificate',false,'date')]});
 if(!flight)out.push({id:'III',title:'Owner’s certification',source:'AC 21-12D, Chapters 5–8',fields:[field('ownerName','A. Registered owner’s name',true,'text','Exactly as shown on the registration.'),field('ownerAddress','Registered owner’s address',true,'textarea','Exactly as shown on the registration.'),field('dealer','Registered under a dealer’s certificate?',true,'select',undefined,['No','Yes']),field('tcds','B. Aircraft specification or TCDS',true,'text',isTyped(a)?'Enter the number and revision.':'Enter N/A if no applicable type certificate.'),field('adCompliance','All applicable airworthiness directives complied with?',true,'select','An unanswered or “No” response prevents concept submission. FAA determines actual compliance.',['Yes','No','Not yet determined']),field('adSupplement','Latest AD biweekly supplement',true,'text',['light-sport'].includes(a.family)||a.purposes.some(p=>p.includes('light-sport')||p.includes('Light-sport'))?'AC 21-12D § 6.2.2 says to enter None for these light-sport paths. This does not remove applicable AD obligations (Order 8130.2M § 9-3.b(5)).':'Use YYYY-NN as of the application date.'),field('stcs','Supplemental type certificates',true,'textarea',isTyped(a)?'List each installed STC number, or N/A.':'Enter N/A for light-sport or experimental certification.'),field('maintenance','C. Maintenance records comply with applicable requirements?',true,'select',undefined,['Yes','No','Not yet determined']),field('hours','Total airframe hours',true,'number'),...(a.family==='experimental'||a.previousExperimental?[field('experimentalHours','Hours flown since the last experimental certificate',true,'number','Enter 0 for an original experimental aircraft with no hours flown.')]:[]),field('applicationDate','D. Date of application',true,'date'),field('signerName','Name of person certifying'),field('signerTitle','Title',true,'text','For example: owner or authorized agent.')]});
 if(needsInspection(a))out.push({id:'IV',title:'Inspection agency verification',source:'AC 21-12D, Chapter 9; Table 1',hint:'Enter the inspection information from the aircraft logbook. There is no applicant-entered inspection-agency signature on this edition.',fields:[field('inspectorType','Aircraft inspected and found airworthy by',true,'select',undefined,['14 CFR part 121 certificate holder','Certificated mechanic','Certificated repair station','Aircraft manufacturer','Certificated foreign repair station']),field('inspectorCertificate','Certificate number or manufacturer name'),field('inspectionDate','Date as entered in the logbook',true,'date'),field('inspectorName','Inspector’s name and title as entered in the logbook')]});
 if(production)out.push({id:'VI',title:'Production flight testing',source:'AC 21-12D, Chapter 10; Order 8130.2M §§ 19-5, 19-6',hint:a.lsaManufacturer?'Light-sport manufacturer draft: only A and C are editable here; B remains blank. Confirm the section conflict with the FAA.':undefined,fields:[field('manufacturer','A. Manufacturer’s legal name'),field('manufacturerAddress','Manufacturer’s physical address',true,'textarea'),...(!a.lsaManufacturer?[field('productionBasis','B. Production basis',true,'select',undefined,['Production certificate','Type certificate','May not meet airworthiness requirements, but capable of safe flight']),field('productionNumber','Production certificate number (if applicable)',false)]:[]),field('quantity','C. Quantity of certificates needed',true,'number'),field('applicationDate','Date of application',true,'date'),field('signerName','Name'),field('signerTitle','Title')]});
 if(flight&&!production)out.push({id:'VII',title:'Special flight permit',source:'AC 21-12D, Chapter 11',fields:[field('ownerName','A. Registered owner'),field('ownerAddress','Registered owner’s address',true,'textarea'),field('builder','Builder / make'),field('model','Model'),field('serial','Serial number'),field('registration','Registration mark'),field('from','B. From'),field('to','To'),field('via','Via',false,'text','Leave blank if there are no intermediate points.'),field('departureDate','Departure date',true,'date'),field('duration','Permit duration',true,'text','Whole days or weeks, including reasonable delays. This is not the flight time.'),field('crew','C. Required crew',true,'textarea','List pilot, co-pilot, flight engineer, and any other required role.'),field('noncompliance','D. Airworthiness requirements not met',true,'textarea','Describe each specific condition that makes the permit necessary.'),field('restrictions','E. Restrictions considered necessary for safe operation',true,'textarea','For example: weight, speed, weather, and crew limitations.'),field('applicationDate','F. Date of application',true,'date'),field('signerName','Name'),field('signerTitle','Title')]});
 return out;
}
export function requirements(a:Answers):Requirement[]{
 const list:Requirement[]=[];
 const add=(id:string,title:string,detail:string,source:string,page:number,required=false,doc:Requirement['doc']='order')=>list.push({id,title,detail,source,page,required,doc,kind:required?'Application document':'Prepare for review'});
 if(a.role==='Authorized agent')add('authority','Notarized letter of authorization','A copy of the owner’s notarized letter authorizing you to act on their behalf.','AC 21-12D § 2.3; Order 8130.2M § 2-3.b(2)',6,true,'ac');
 if(!isProduction(a))add('registration','Aircraft registration evidence','Prepare an accepted registration document. The FAA verifies registration and consistency with the application. Upload a copy if requested.','Order 8130.2M § 2-3.e(1)',20);
 if(['recurrent','amend'].includes(a.goal))add('prior','Existing certificate and operating limitations','Prepare the current or prior certificate and associated limitations for review.','Order 8130.2M §§ 2-3, 2-4',24);
 if(isTyped(a))add('tcds','Type design and configuration records','Applicable TCDS/specification, STCs, equipment list, and configuration records. Provide the material requested by the reviewing office.','Order 8130.2M § 2-3.b(3)',18);
 if(isImport(a))add('foreign','Foreign airworthiness certification','For new standard, primary, or restricted imports, include an export certificate of airworthiness or equivalent. Used imports require case-specific review.','AC 21-12D § 3.11; Order 8130.2M Chapters 3, 5, 6',12,a.background.startsWith('New')&&['standard','primary','restricted','multiple'].includes(a.family),'ac');
 if(a.family==='experimental'){
  add('program','Program letter','Dated letter describing the purpose(s), aircraft identification, operation/equipment/tests, flight area, safeguards, and estimated time or flights for § 21.191(a)–(f).','Order 8130.2M § 4-6.a(1), Appendix C',158,true);
  if(!a.unchangedTypeDesign)add('views','Three-view drawings or dimensioned photographs','Include three views with dimensions. These may be in the program letter; attach the same combined file here if needed. Exemption applies to conversion from a type-certificated model without appreciable external change.','Order 8130.2M § 4-6.a(1)(f)',35,true);
  if(a.purposes.includes('Amateur-built')){
   if(a.goal==='original')add('eligibility','FAA Form 8130-12 — amateur-built eligibility','Copy of the notarized eligibility statement, including all commercial assistance. Required for original certification only.','Order 8130.2M § 15-4.a(1)(a)',69,true);
   add('builder-log','Builder’s log and fabrication evidence','Evidence of what was fabricated/assembled, who did it, dates, location, methods, and commercial or educational assistance; include relevant inspection records.','Order 8130.2M § 15-4.b',70);
   add('condition','Owner’s condition inspection statement','Prepare the recorded statement that the aircraft was inspected to Part 43 Appendix D or another approved program and found in a condition for safe operation.','Order 8130.2M § 15-4.b(3)',70);
  }
  if(a.purposes.includes('Primary category kit-built'))add('primary-kit','Primary kit eligibility records','Evidence of the model’s primary TC and manufacture of the kit by its PC holder; assembly was outside that holder’s quality system.','Order 8130.2M § 16-2',75);
  if(a.purposes.includes('Former military aircraft'))add('military','Military history and operating-purpose evidence','Records establishing former military status. Describe the qualifying maintenance, storage, or public-aircraft repositioning purpose in the program letter.','Order 8130.2M § 18-2',82);
  if(a.purposes.includes('Former light-sport category')){
   add('former-lsa','Prior light-sport certificate and aircraft instructions','Prepare evidence of prior § 21.190 certification and the applicable original or revised AOI/POH. Discuss the existing statement of compliance with the FAA (AC § 6.1.4).','Order 8130.2M § 17-3.b(2), c(4)',78);
  }
 }
 if(a.family==='light-sport'||a.purposes.includes('Light-sport category kit-built')){
  add('soc','FAA Form 8130-15 — statement of compliance','Manufacturer’s completed statement matching the aircraft/kit make, model, and serial number.','Order 8130.2M § 9-3.a(2) or § 17-3.a(2)',a.family==='light-sport'?56:77,true);
  add('poh','Pilot’s operating handbook and training supplement','Applicable operating instructions/limitations, flight training supplement, and maintenance/inspection procedures. Kit documentation exceptions depend on SOC date.','Order 8130.2M § 9-3.a(3–4), § 17-3.c',a.family==='light-sport'?57:78);
  if(a.family==='light-sport')add('acceptance','Production acceptance and continued-safety records','Prepare applicable ground/flight test acceptance records and continued operational safety documentation for FAA review.','Order 8130.2M § 9-3.b(5–8)',58);
 }
 if(!isFlight(a)){
  add('maintenance','Maintenance and inspection records','Applicable maintenance history, AD status, inspections, and life-limit records. Upload only documents requested and suitable for disclosure.','Order 8130.2M § 2-3.e(3)',20);
  add('weight','Weight and balance / applicable manuals','Prepare current weight-and-balance information and applicable flight/maintenance manuals and equipment list. These must be available for review; not every record is a mandatory initial upload.','Order 8130.2M § 2-3.e(4–5)',20);
 }
 if(isProduction(a))add('test-procedure','Production flight test procedures and eligibility evidence','Prepare the applicable test procedures/checklists, production basis, flight-test area, and evidence supporting eligibility for the specific production-test path.','Order 8130.2M §§ 19-5, 19-6',a.lsaManufacturer?89:88);
 if(isFlight(a)&&!isProduction(a))add('safe-flight','Safe-flight substantiation and supporting records','Provide any inspection statement, technical assessment, and additional information requested by the FAA to establish safe flight under the proposed limitations.','Order 8130.2M § 19-4',84);
 add('additional','Additional requested documents','Attach other applicable documents requested by the reviewing office, including exemptions or configuration/repair substantiation when applicable.','AC 21-12D § 12.1',33,false,'ac');
 return list;
}
export function questionnaireErrors(a:Answers):string[]{
 const errors:string[]=[];if(!goals.some(x=>x[0]===a.goal))errors.push('Choose the application request.');
 if(a.goal==='replacement')return ['Replacement certificates use a separate FAA process; Form 8130-6 is not required.'];
 if(!isFlight(a)&&!families.some(x=>x[0]===a.family))errors.push('Choose a certificate family.');
 const cats=isFlight(a)?flightPurposes:a.family==='standard'||(a.family==='multiple'&&a.multipleOther==='Standard')?standardCategories:a.family==='light-sport'?lightSportClasses:a.family==='provisional'?['Class I','Class II']:null;
 if(cats&&!cats.includes(a.category))errors.push('Choose the category, class, or flight purpose.');
 if(['experimental','restricted','multiple'].includes(a.family)){
  const choices=a.family==='experimental'?(a.unmanned?uasPurposes:experimentalPurposes):restrictedPurposes;
  if(!a.purposes.length||a.purposes.some(p=>!choices.includes(p)))errors.push('Choose valid operating purpose(s).');
 }
 if(a.family==='multiple'&&!['Standard','Limited'].includes(a.multipleOther))errors.push('Choose the second certificate family.');
 if(!['Registered owner','Authorized agent'].includes(a.role))errors.push('Choose your role.');
 if(!['Current U.S. registration','Registration pending','Not sure / not yet registered'].includes(a.registrationStatus))errors.push('Choose the registration status.');
 if(!backgrounds.includes(a.background))errors.push('Choose the aircraft background.');
 return errors;
}
export function validationErrors(data:ApplicationData,documents:DocumentRecord[]):string[]{
 const a=data.answers,f=data.fields;const errs=questionnaireErrors(a);
 for(const s of sections(a))for(const x of s.fields)if(x.required&&!f[x.id]?.trim())errs.push(`${s.id}: ${x.label} is incomplete.`);
 for(const s of sections(a))for(const x of s.fields){const v=f[x.id];if(v&&x.options&&!x.options.includes(v))errs.push(`${x.label}: select a valid response.`);if(v&&x.type==='number'&&(!Number.isFinite(Number(v))||Number(v)<0))errs.push(`${x.label}: enter a non-negative number.`);if(v&&x.type==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(v))errs.push(`${x.label}: enter a valid date.`);}
 if(f.registration&&!/^N[1-9][0-9]{0,4}[A-HJ-NP-Z]{0,2}$/i.test(f.registration.trim()))errs.push('Check the U.S. registration mark.');
 if(f.registration&&f.registration.trim().length>6)errs.push('The N-number has too many characters.');
 if(f.year&&!/^\d{4}$/.test(f.year))errs.push('Use four digits for the manufacture year.');
 if(f.engineCount&&!Number.isInteger(Number(f.engineCount)))errs.push('Number of engines must be a whole number.');
 if(isProduction(a)&&(!Number.isInteger(Number(f.quantity))||Number(f.quantity)<1))errs.push('Request at least one whole certificate.');
 if(f.productionBasis==='Production certificate'&&!f.productionNumber?.trim())errs.push('Enter the production certificate number.');
 if(f.retainCertificate&&!f.retainDate)errs.push('Enter the retained certificate’s issue date.');
 if(!isFlight(a)&&f.adCompliance!=='Yes')errs.push('Resolve applicable AD compliance with the FAA before continuing.');
 if(!isFlight(a)&&f.maintenance!=='Yes')errs.push('Resolve the maintenance-records declaration before continuing.');
 for(const req of requirements(a))if(req.required&&!documents.some(d=>d.requirementId===req.id))errs.push(`Attach ${req.title}.`);
 errs.push(...sourceWarnings(a));
 if(!f.faaOffice?.trim())errs.push('Identify the intended FAA office.');
 if(!data.attest)errs.push('Review and confirm the certification statement.');
 if(!data.consent)errs.push('Consent to the concept electronic acknowledgment.');
 return [...new Set(errs)];
}
export const sourcePaths={form:'/sources/FAA_Form_8130-6.pdf',order:'/sources/8130.2M.pdf',ac:'/sources/AC-21-12D.pdf'};
