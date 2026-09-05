import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { expect, test, type APIRequestContext } from '@playwright/test';

const registryToken='local-e2e-registry-token';
const aircraft={nNumber:'N100',serialNumber:'TEST-100',yearManufactured:2024,manufacturer:'CESSNA',model:'172S',aircraftType:'Fixed-wing single-engine',engineManufacturer:'LYCOMING',engineModel:'IO-360',engineType:'Reciprocating',engineCount:1,tcds:'3A12',registrationStatus:{code:'V',label:'Valid registration'},certificateIssueDate:'2024-01-01',airworthinessDate:'2024-01-02',expirationDate:'2031-01-01',airworthiness:{classificationCode:'1',classification:'Standard',operationCodes:['N']},modeSCodeHex:'A00001'};

async function seedRegistry(request:APIRequestContext){
 const datasetId='0123456789abcdef01234567',payload=gzipSync(Buffer.from(JSON.stringify([aircraft]))),sha256=createHash('sha256').update(payload).digest('hex');
 const headers={Authorization:`Bearer ${registryToken}`};
 expect((await request.post('/api/internal/registry-sync/start',{headers,data:{datasetId}})).ok()).toBeTruthy();
 expect((await request.put(`/api/internal/registry-sync/${datasetId}/shards/10`,{headers:{...headers,'Content-Type':'application/gzip','X-Content-Sha256':sha256},data:payload})).ok()).toBeTruthy();
 const manifest={schemaVersion:1,datasetId,sourceUrl:'https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/releasable_aircraft_download/index.cfm',sourceSha256:'a'.repeat(64),upstreamLastModified:null,generatedAt:'2026-09-05T00:00:00Z',recordCount:1,shardCount:1,canaryNNumber:'N100',shards:{'10':{sha256,recordCount:1,bytes:payload.length}}};
 expect((await request.post(`/api/internal/registry-sync/${datasetId}/complete`,{headers,data:manifest})).ok()).toBeTruthy();
}

test('account, registry, large upload, submission, and new-application flow',async({page,request})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Sign in to your workspace'})).toBeVisible();
 await page.getByRole('button',{name:/Use dark mode/i}).click();
 await expect(page.locator('html')).toHaveClass(/dark/);
 await page.getByRole('tab',{name:'Create account'}).click();
 const unique=`e2e-${Date.now()}@example.test`;
 await page.getByLabel('Name').fill('E2E Applicant');
 await page.getByLabel('Email').fill(unique);
 await page.getByLabel('Password').fill('Airworthy test password 2026!');
 await page.getByRole('button',{name:'Create account'}).click();
 await expect(page.getByRole('heading',{name:'Tell us what you’re applying for.'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'What would you like to do?'})).toBeVisible();

 await seedRegistry(request);
 const current=await page.evaluate(async()=>await (await fetch('/api/application')).json()) as {application:{id:string}};
 const data={answers:{goal:'original',family:'standard',category:'Normal',purposes:[],background:'New — produced under a production certificate',role:'Registered owner',registrationStatus:'Current U.S. registration',unmanned:false,lsaManufacturer:false,unchangedTypeDesign:false,previousExperimental:false,multipleOther:'Standard'},fields:{registration:'N100',builder:'CESSNA',model:'172S',year:'2024',serial:'TEST-100',engineBuilder:'LYCOMING',engineModel:'IO-360',engineCount:'1',propBuilder:'HARTZELL',propModel:'HC-C2YR',dealer:'No',tcds:'3A12',adCompliance:'Yes',adSupplement:'2026-18',stcs:'N/A',maintenance:'Yes',hours:'10',applicationDate:'2026-09-05',signerName:'E2E Applicant',signerTitle:'Owner',ownerName:'E2E Applicant',ownerAddress:'123 Test Way',faaOffice:'Test FAA Office'},attest:true,consent:true};
 const saved=await page.evaluate(async payload=>{const response=await fetch('/api/application',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});return response.ok;},{id:current.application.id,data,step:1});expect(saved).toBeTruthy();
 await page.reload();
 await expect(page.getByRole('heading',{name:'Complete your Form 8130-6 draft.'})).toBeVisible();
 await page.getByRole('button',{name:'Look up aircraft'}).click();
 await expect(page.getByText('Valid registration')).toBeVisible();
 await expect(page.getByText('FAA release mirrored')).toBeVisible();

 await page.getByRole('button',{name:'03 Add documents'}).click();
 await expect(page.getByRole('heading',{name:'Assemble your application documents.'})).toBeVisible();
 const chooser=page.waitForEvent('filechooser');
 await page.getByRole('button',{name:'Upload',exact:true}).first().click();
 const pdf=Buffer.alloc(1536*1024,0x20);pdf.write('%PDF-1.4\n');
 await (await chooser).setFiles({name:'large-test.pdf',mimeType:'application/pdf',buffer:pdf});
 await expect(page.getByRole('link',{name:'large-test.pdf'}).first()).toBeVisible({timeout:30_000});
 await page.getByRole('button',{name:/Review application/i}).click();
 await expect(page.getByText('Concept checks complete')).toBeVisible();
 await page.getByRole('button',{name:/Record concept submission/i}).click();
 await expect(page.getByRole('heading',{name:'Your application package is saved.'})).toBeVisible();
 await page.getByRole('button',{name:/Start another application/i}).click();
 await expect(page.getByRole('heading',{name:'Tell us what you’re applying for.'})).toBeVisible();
});

test('milestones remain usable in a mobile viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(page.getByRole('navigation',{name:'Your application milestones'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Sign in to your workspace'})).toBeVisible();
});
