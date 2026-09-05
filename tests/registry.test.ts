import test from 'node:test';
import assert from 'node:assert/strict';
import { findRegistryAircraft, normalizeNNumber, registryAutofillFields, registryShardKey, type RegistryAircraft } from '../lib/registry.ts';

const aircraft=(nNumber:string,overrides:Partial<RegistryAircraft>={}):RegistryAircraft=>({
 nNumber,serialNumber:null,yearManufactured:null,manufacturer:null,model:null,aircraftType:null,
 engineManufacturer:null,engineModel:null,engineType:null,engineCount:null,tcds:null,
 registrationStatus:null,certificateIssueDate:null,airworthinessDate:null,expirationDate:null,
 airworthiness:null,modeSCodeHex:null,...overrides,
});

test('normalizes valid N-numbers and rejects malformed values',()=>{
 assert.equal(normalizeNNumber(' n-123ab '),'N123AB');
 assert.equal(normalizeNNumber('123'),'N123');
 assert.equal(normalizeNNumber('N0'),null);
 assert.equal(normalizeNNumber('N123IO'),null);
 assert.equal(normalizeNNumber('N123456'),null);
});

test('maps N-numbers to stable two-character registry shards',()=>{
 assert.equal(registryShardKey('N1'),'1_');
 assert.equal(registryShardKey('N123AB'),'12');
 assert.equal(registryShardKey('9Z'),'9Z');
 assert.equal(registryShardKey('invalid'),null);
});

test('finds an aircraft in a sorted shard with binary search',()=>{
 const records=[aircraft('N100'),aircraft('N101'),aircraft('N109ZZ')];
 assert.equal(findRegistryAircraft(records,'N101')?.nNumber,'N101');
 assert.equal(findRegistryAircraft(records,'N105'),null);
});

test('autofill exposes technical fields and excludes owner information',()=>{
 const keys=registryAutofillFields.map(field=>field.formField);
 assert.deepEqual(keys,['registration','builder','model','year','serial','engineBuilder','engineModel','engineCount','tcds']);
 assert.equal(keys.some(key=>/owner|address|name/i.test(key)),false);
});
