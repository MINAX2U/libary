import os
import json
import re
import time
from glob import glob
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

def strip_numeric_prefix(raw):
    return re.sub(r'^\[\d+\]', '', raw).strip()

def generate_variants(raw):
    """
    1. 原始
    2. 去樓層 (…樓)
    3. 去「之X號」
    4. 去「X號」
    5. 截到「段」
    6. 截到「路/街」
    7. 只留「區＋路/街」
    8. 只留「區」
    """
    s = raw.strip()
    yield s

    no_floor = re.sub(r'樓.*$', '', s)
    if no_floor != s: yield no_floor

    no_sub = re.sub(r'之\d+號', '號', no_floor)
    if no_sub != no_floor: yield no_sub

    no_num = re.sub(r'\d+號.*$', '', no_sub)
    if no_num != no_sub: yield no_num

    m_seg = re.match(r'^(.*?段)', s)
    if m_seg: yield m_seg.group(1)

    m_road = re.match(r'^(.*?[路街])', s)
    if m_road: yield m_road.group(1)

    m_zone = re.match(r'.*?([^縣市]+?區).*?[路街]', s)
    if m_zone: yield m_zone.group(1)

    m_only_zone = re.match(r'.*?([^縣市]+?區)', s)
    if m_only_zone: yield m_only_zone.group(1)

def geocode_with_fallback(addr, geocode_fn):
    for variant in generate_variants(addr):
        try:
            loc = geocode_fn(variant)
        except Exception:
            loc = None
        print(f"Trying:「{variant}」 → {'OK' if loc else '×'}")
        if loc:
            return loc, variant
        time.sleep(1)
    return None, None

def process_file(src_path, dst_path, geocode_fn):
    print(f"\nProcessing:{os.path.basename(src_path)}")
    with open(src_path, 'r', encoding='utf-8') as f:
        records = json.load(f)

    for item in records:
        raw = item.get('地址', '').strip()
        if not raw:
            continue

        clean0 = strip_numeric_prefix(raw)
        print(f"  原址「{raw}」去前綴 →「{clean0}」")
        loc, used = geocode_with_fallback(clean0, geocode_fn)

        if loc:
            item['latitude']  = loc.latitude
            item['longitude'] = loc.longitude
            print(f"Success:「{used}」→ {loc.latitude:.6f}, {loc.longitude:.6f}")
        else:
            item['latitude'] = item['longitude'] = None
            print(f"No Result:{raw}")

    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    with open(dst_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"Written To {dst_path}")

if __name__ == '__main__':
    src_folder = './json_source'
    dst_folder = './json_output'

    geolocator = Nominatim(user_agent="batch_fallback_geocoder")
    geocode_fn = RateLimiter(
        lambda q: geolocator.geocode(q, timeout=15),
        min_delay_seconds=2,
        max_retries=3,
        error_wait_seconds=5
    )

    for src in glob(os.path.join(src_folder, '*.json')):
        dst = os.path.join(dst_folder, os.path.basename(src))
        process_file(src, dst, geocode_fn)

    print(f"\n Finished Written To '{dst_folder}'")
