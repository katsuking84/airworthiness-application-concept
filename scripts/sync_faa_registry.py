#!/usr/bin/env python3
"""Build and publish a PII-free technical mirror of the FAA aircraft registry."""
from __future__ import annotations

import argparse
import concurrent.futures
import csv
import gzip
import hashlib
import io
import json
import os
import tempfile
import urllib.error
import urllib.request
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

DOWNLOAD_URL = "https://registry.faa.gov/database/ReleasableAircraft.zip"
SOURCE_URL = "https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/releasable_aircraft_download/index.cfm"
USER_AGENT = "Airworthiness-Application-Concept registry mirror/1.0"

AIRCRAFT_TYPES = {"1":"Glider","2":"Balloon","3":"Blimp or dirigible","4":"Fixed-wing single-engine","5":"Fixed-wing multi-engine","6":"Rotorcraft","7":"Weight-shift-control","8":"Powered parachute","9":"Gyroplane","H":"Hybrid lift","O":"Other"}
ENGINE_TYPES = {"0":"None","1":"Reciprocating","2":"Turboprop","3":"Turboshaft","4":"Turbojet","5":"Turbofan","6":"Ramjet","7":"Two-cycle","8":"Four-cycle","9":"Unknown","10":"Electric","11":"Rotary"}
STATUS = {"A":"Triennial form mailed","D":"Expired dealer","E":"Registration revoked","M":"Valid manufacturer dealer assignment","N":"Non-citizen corporation report outstanding","R":"Registration pending","S":"Second triennial notice mailed","T":"Valid trainee registration","V":"Valid registration","W":"Registration ineffective or invalid","X":"Enforcement letter","Z":"Permanently reserved","1":"Mail returned","2":"N-number assigned, not registered","3":"N-number assigned to non-type-certificated aircraft","4":"N-number assigned to import","5":"Reserved N-number","6":"Administratively canceled","7":"Sale reported","9":"Registration revoked","13":"Registration expired","16":"Registration expired, pending cancellation","18":"Sale reported, canceled","20":"Registration pending, canceled","22":"Revoked, canceled","27":"Registration expired","29":"Registration expired, pending cancellation"}
CLASSIFICATIONS = {"1":"Standard","2":"Limited","3":"Restricted","4":"Experimental","5":"Provisional","6":"Multiple","7":"Primary","8":"Special flight permit","9":"Light sport"}

def clean(value: str | None) -> str | None:
    result = (value or "").strip()
    return result or None

def number(value: str | None) -> int | None:
    value = clean(value)
    try:
        return int(value) if value is not None else None
    except ValueError:
        return None

def date(value: str | None) -> str | None:
    value = clean(value)
    if not value:
        return None
    compact = value.replace("/", "").replace("-", "")
    if len(compact) == 8 and compact.isdigit():
        return f"{compact[:4]}-{compact[4:6]}-{compact[6:]}"
    return None

def rows(archive: zipfile.ZipFile, name: str):
    stream = io.TextIOWrapper(archive.open(name), encoding="utf-8-sig", errors="replace", newline="")
    yield from csv.DictReader(stream, skipinitialspace=True)

def ref_map(archive: zipfile.ZipFile, name: str) -> dict[str, dict[str, str]]:
    return {(clean(row.get("CODE")) or ""): row for row in rows(archive, name) if clean(row.get("CODE"))}

def certification(value: str | None):
    value = clean(value)
    if not value:
        return None
    code = value[0]
    return {"classificationCode": code, "classification": CLASSIFICATIONS.get(code, "Unknown"), "operationCodes": [part for part in value[1:] if part.strip()]}

def build_records(zip_path: Path):
    with zipfile.ZipFile(zip_path) as archive:
        aircraft = ref_map(archive, "ACFTREF.txt")
        engines = ref_map(archive, "ENGINE.txt")
        shards: dict[str, list[dict]] = defaultdict(list)
        for row in rows(archive, "MASTER.txt"):
            body = clean(row.get("N-NUMBER"))
            if not body or body[0] not in "123456789":
                continue
            n_number = f"N{body.upper()}"
            aircraft_ref = aircraft.get(clean(row.get("MFR MDL CODE")) or "", {})
            engine_ref = engines.get(clean(row.get("ENG MFR MDL")) or "", {})
            status_code = clean(row.get("STATUS CODE"))
            record = {
                "nNumber": n_number,
                "serialNumber": clean(row.get("SERIAL NUMBER")),
                "yearManufactured": number(row.get("YEAR MFR")),
                "manufacturer": clean(aircraft_ref.get("MFR")),
                "model": clean(aircraft_ref.get("MODEL")),
                "aircraftType": AIRCRAFT_TYPES.get(clean(row.get("TYPE AIRCRAFT")) or ""),
                "engineManufacturer": clean(engine_ref.get("MFR")),
                "engineModel": clean(engine_ref.get("MODEL")),
                "engineType": ENGINE_TYPES.get(clean(row.get("TYPE ENGINE")) or ""),
                "engineCount": number(aircraft_ref.get("NO-ENG")),
                "tcds": clean(aircraft_ref.get("TC-DATA-SHEET")),
                "registrationStatus": {"code": status_code, "label": STATUS.get(status_code, "FAA status code " + status_code)} if status_code else None,
                "certificateIssueDate": date(row.get("CERT ISSUE DATE")),
                "airworthinessDate": date(row.get("AIR WORTH DATE")),
                "expirationDate": date(row.get("EXPIRATION DATE")),
                "airworthiness": certification(row.get("CERTIFICATION")),
                "modeSCodeHex": clean(row.get("MODE S CODE HEX")),
            }
            shards[body[:2].upper().ljust(2, "_")].append(record)
    for records in shards.values():
        records.sort(key=lambda item: item["nNumber"])
    return shards

def request(url: str, token: str, method="GET", body: bytes | None=None, headers: dict[str,str] | None=None):
    all_headers={"User-Agent":USER_AGENT,"Authorization":f"Bearer {token}",**(headers or {})}
    req=urllib.request.Request(url,data=body,headers=all_headers,method=method)
    with urllib.request.urlopen(req,timeout=90) as response:
        return response.status, response.read(), dict(response.headers)

def publish(base_url: str, token: str, dataset_id: str, manifest: dict, payloads: dict[str,bytes]):
    status, data, _ = request(f"{base_url}/api/internal/registry-sync/start",token,"POST",json.dumps({"datasetId":dataset_id}).encode(),{"Content-Type":"application/json"})
    if status not in (200,201):
        raise RuntimeError(data.decode())
    if json.loads(data).get("unchanged"):
        print(f"FAA dataset {dataset_id} is already active")
        return
    def upload(item):
        key,payload=item
        digest=hashlib.sha256(payload).hexdigest()
        url=f"{base_url}/api/internal/registry-sync/{dataset_id}/shards/{key}"
        response_status, response_body, _=request(url,token,"PUT",payload,{"Content-Type":"application/gzip","X-Content-Sha256":digest})
        if response_status != 200:
            raise RuntimeError(f"{key}: {response_body.decode()}")
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(upload,payloads.items()))
    status,data,_=request(f"{base_url}/api/internal/registry-sync/{dataset_id}/complete",token,"POST",json.dumps(manifest,separators=(",",":")).encode(),{"Content-Type":"application/json"})
    if status != 200:
        raise RuntimeError(data.decode())
    print(f"Published {manifest['recordCount']:,} FAA aircraft records in {manifest['shardCount']} shards")

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--zip",type=Path)
    parser.add_argument("--output",type=Path)
    parser.add_argument("--base-url",default=os.environ.get("SITE_BASE_URL"))
    parser.add_argument("--token",default=os.environ.get("REGISTRY_SYNC_TOKEN"))
    args=parser.parse_args()
    zip_path=args.zip
    upstream_last_modified=None
    if zip_path is None:
        zip_path=Path(tempfile.gettempdir())/"ReleasableAircraft.zip"
        req=urllib.request.Request(DOWNLOAD_URL,headers={"User-Agent":USER_AGENT})
        with urllib.request.urlopen(req,timeout=120) as response:
            upstream_last_modified=response.headers.get("Last-Modified")
            zip_path.write_bytes(response.read())
    raw_hash=hashlib.sha256(zip_path.read_bytes()).hexdigest()
    dataset_id=raw_hash[:24]
    shards=build_records(zip_path)
    payloads={key:gzip.compress(json.dumps(value,separators=(",",":"),ensure_ascii=True).encode(),compresslevel=9,mtime=0) for key,value in shards.items()}
    manifest={"schemaVersion":1,"datasetId":dataset_id,"sourceUrl":SOURCE_URL,"sourceSha256":raw_hash,"upstreamLastModified":upstream_last_modified,"generatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"recordCount":sum(map(len,shards.values())),"shardCount":len(shards),"canaryNNumber":min(item["nNumber"] for values in shards.values() for item in values),"shards":{key:{"sha256":hashlib.sha256(payload).hexdigest(),"recordCount":len(shards[key]),"bytes":len(payload)} for key,payload in sorted(payloads.items())}}
    if args.output:
        args.output.mkdir(parents=True,exist_ok=True)
        (args.output/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
        for key,payload in payloads.items():(args.output/f"{key}.json.gz").write_bytes(payload)
        print(f"Wrote {manifest['recordCount']:,} records to {args.output}")
    if args.base_url:
        if not args.token:raise SystemExit("REGISTRY_SYNC_TOKEN is required when publishing")
        publish(args.base_url.rstrip("/"),args.token,dataset_id,manifest,payloads)
    elif not args.output:
        print(json.dumps(manifest,indent=2))

if __name__ == "__main__":
    main()
