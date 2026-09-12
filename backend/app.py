from __future__ import annotations
import os, sys, json, math, heapq
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import geometry

app = FastAPI(title='Cosmo-Net Constellation Resilience API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

DATA_DIR = Path(__file__).parent.parent / 'Данные'

def find_shortest_path(edges: list, start_node: str, target_nodes: set, node_types: dict) -> tuple[list[str], float]:
    adj: dict[str, list[tuple[str, float]]] = {}
    for u, v, d in edges:
        adj.setdefault(u, []).append((v, d))
        adj.setdefault(v, []).append((u, d))

    pq = [(0, 0.0, start_node, [start_node])]
    visited = {}

    while pq:
        hops, dist, cur, path = heapq.heappop(pq)
        if cur in visited and (visited[cur][0] < hops or (visited[cur][0] == hops and visited[cur][1] <= dist)):
            continue
        visited[cur] = (hops, dist)

        if cur != start_node and cur in target_nodes:
            return path, dist

        # Ground nodes cannot relay traffic
        if cur != start_node and node_types.get(cur) in ('client', 'gateway'):
            continue

        for nxt, w in adj.get(cur, []):
            heapq.heappush(pq, (hops + 1, dist + w, nxt, path + [nxt]))

    return [], 0.0

def classify_failure_reason(s: dict, snap: dict, client_id: str, gateways: set, active_sat_ids: set) -> str:
    # 1. Check if client has visible satellites
    client_elevations = snap['elevation_deg'].get(client_id, {})
    min_el = s['environment']['min_elevation_deg']
    visible_to_client = [sid for sid, el in client_elevations.items() if el >= min_el and sid in active_sat_ids]
    if not visible_to_client:
        return 'NO_VISIBLE_SATELLITE'

    # 2. Check gateway outages
    t_s = snap['t_s']
    offline_gateways = {f['gateway_id'] for f in s.get('gateway_outages', []) if f['start_s'] <= t_s < f['end_s']}
    available_gateways = gateways - offline_gateways
    if not available_gateways:
        return 'GATEWAY_OUTAGE'

    # 3. Check if any gateway has visible satellites
    gateways_with_vis = False
    for gw in available_gateways:
        gw_elevations = snap['elevation_deg'].get(gw, {})
        vis_to_gw = [sid for sid, el in gw_elevations.items() if el >= min_el and sid in active_sat_ids]
        if vis_to_gw:
            gateways_with_vis = True
            break
    if not gateways_with_vis:
        return 'GATEWAY_NO_SATELLITE'

    # 4. If client sees sats and gateway sees sats, but no path -> ISL Mesh Partition
    return 'ISL_MESH_PARTITION'

@app.get('/api/health')
def health():
    return {'status': 'ok', 'version': '1.0.0', 'engine': 'NumPy/geometry.py'}

@app.get('/api/scenarios')
def list_scenarios():
    scenarios = []
    if DATA_DIR.exists():
        for p in sorted(DATA_DIR.glob('*.json')):
            try:
                data = json.loads(p.read_text(encoding='utf-8'))
                scenarios.append({
                    'filename': p.name,
                    'id': data.get('meta', {}).get('id', p.stem),
                    'title': data.get('meta', {}).get('title', p.stem),
                    'launch_stage': data.get('design', {}).get('launch_stage', 3),
                    'num_satellites': len(data.get('design', {}).get('satellites', [])),
                    'isl_range_km': data.get('environment', {}).get('isl_range_km', 3000),
                    'failures_count': len(data.get('failures', []))
                })
            except Exception:
                pass
    return {'scenarios': scenarios}

@app.get('/api/scenarios/{filename}')
def get_scenario(filename: str):
    p = DATA_DIR / filename
    if not p.exists():
        raise HTTPException(status_code=404, detail='Scenario not found')
    return json.loads(p.read_text(encoding='utf-8'))

@app.post('/api/validate')
def validate_scenario(payload: dict = Body(...)):
    try:
        geometry.validate(payload)
        return {'valid': True, 'errors': []}
    except Exception as e:
        return {'valid': False, 'errors': [str(e)]}

@app.post('/api/snapshot')
def calculate_snapshot(payload: dict = Body(...)):
    scenario = payload.get('scenario')
    t_s = float(payload.get('t_s', 0))
    try:
        geometry.validate(scenario)
        snap = geometry.snapshot(scenario, t_s)
        return snap
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post('/api/simulate')
def run_simulation(scenario: dict = Body(...)):
    try:
        geometry.validate(scenario)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Invalid scenario: {e}')

    env = scenario['environment']
    horizon = env['horizon_s']
    step = env['step_s']
    steps = list(range(0, horizon, step))
    total_steps = len(steps)

    gateways = {g['id'] for g in scenario['ground_sites'] if g['role'] == 'gateway'}
    clients = [g for g in scenario['ground_sites'] if g['role'] == 'client']
    node_types = {g['id']: g['role'] for g in scenario['ground_sites']}
    for sat in scenario['design']['satellites']:
        node_types[sat['id']] = 'sat'

    client_results = {c['id']: {
        'client': c,
        'path_count': 0,
        'visible_count': 0,
        'max_gap_steps': 0,
        'cur_gap_steps': 0,
        'total_hops': 0,
        'timeline': []
    } for c in clients}

    sat_usage_count = {}

    for t in steps:
        snap = geometry.snapshot(scenario, t)
        active_sat_ids = {s['id'] for s in snap['satellites'] if s['active']}

        for c in clients:
            cid = c['id']
            res = client_results[cid]
            c_elevations = snap['elevation_deg'].get(cid, {})
            visible_sats = [sid for sid, el in c_elevations.items() if el >= env['min_elevation_deg'] and sid in active_sat_ids]
            is_visible = len(visible_sats) > 0
            if is_visible:
                res['visible_count'] += 1

            path, dist = find_shortest_path(snap['edges'], cid, gateways, node_types)
            if path:
                res['path_count'] += 1
                res['max_gap_steps'] = max(res['max_gap_steps'], res['cur_gap_steps'])
                res['cur_gap_steps'] = 0
                hops = len(path) - 1
                res['total_hops'] += hops
                res['timeline'].append({
                    't_s': t,
                    'status': 'connected',
                    'path': path,
                    'hops': hops,
                    'distance_km': round(dist, 1),
                    'visible_sats_count': len(visible_sats)
                })
                # record transit satellite usage
                for node in path[1:-1]:
                    sat_usage_count[node] = sat_usage_count.get(node, 0) + 1
            else:
                res['cur_gap_steps'] += 1
                reason = classify_failure_reason(scenario, snap, cid, gateways, active_sat_ids)
                res['timeline'].append({
                    't_s': t,
                    'status': 'visible_no_route' if is_visible else 'no_satellite',
                    'reason': reason,
                    'path': [],
                    'hops': 0,
                    'distance_km': 0.0,
                    'visible_sats_count': len(visible_sats)
                })

    client_summary = []
    for c in clients:
        cid = c['id']
        res = client_results[cid]
        res['max_gap_steps'] = max(res['max_gap_steps'], res['cur_gap_steps'])
        avail_pct = (res['path_count'] / total_steps) * 100.0
        vis_pct = (res['visible_count'] / total_steps) * 100.0
        max_gap_sec = res['max_gap_steps'] * step
        avg_hops = (res['total_hops'] / res['path_count']) if res['path_count'] > 0 else 0.0

        client_summary.append({
            'client_id': cid,
            'name': c.get('name', cid),
            'lat_deg': c['lat_deg'],
            'lon_deg': c['lon_deg'],
            'path_availability_pct': round(avail_pct, 2),
            'target_met': avail_pct >= (env['target_availability'] * 100.0),
            'visibility_pct': round(vis_pct, 2),
            'max_gap_seconds': max_gap_sec,
            'max_gap_minutes': round(max_gap_sec / 60.0, 1),
            'average_hops': round(avg_hops, 2),
            'timeline': res['timeline']
        })

    # Sort critical satellites by load
    critical_sats = [{'id': k, 'routes_carried': v} for k, v in sorted(sat_usage_count.items(), key=lambda x: -x[1])[:10]]

    return {
        'total_steps': total_steps,
        'horizon_s': horizon,
        'step_s': step,
        'clients': client_summary,
        'critical_satellites': critical_sats,
        'effective_scenario': scenario
    }

@app.post('/api/export')
def export_results(scenario: dict = Body(...)):
    sim = run_simulation(scenario)
    routes = []
    for c in sim['clients']:
        cid = c['client_id']
        for item in c['timeline']:
            routes.append({
                't_s': item['t_s'],
                'client_id': cid,
                'path': item['path']
            })
    # Sort strictly by t_s then client_id
    routes.sort(key=lambda r: (r['t_s'], r['client_id']))

    result_doc = {
        'schema_version': 'cosmo-A-result-1.0',
        'effective_scenario': scenario,
        'routes': routes,
        'analytics': {
            'target_availability': scenario['environment']['target_availability'],
            'clients_summary': [
                {
                    'client_id': c['client_id'],
                    'name': c['name'],
                    'path_availability_pct': c['path_availability_pct'],
                    'target_met': c['target_met'],
                    'visibility_pct': c['visibility_pct'],
                    'max_gap_seconds': c['max_gap_seconds'],
                    'max_gap_minutes': c['max_gap_minutes'],
                    'average_hops': c['average_hops']
                }
                for c in sim['clients']
            ]
        }
    }
    return result_doc

@app.get('/api/report/pdf')
def get_pdf_report():
    pdf_path = Path(__file__).parent.parent / 'report.pdf'
    if pdf_path.exists():
        return FileResponse(str(pdf_path), media_type='application/pdf', filename='cosmo_net_detailed_report.pdf')
    raise HTTPException(status_code=404, detail='Report PDF not found')

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8000)
