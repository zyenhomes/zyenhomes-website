#!/usr/bin/env python3
"""Sync public Guesty reviews for explicitly mapped Zyen Homes listings."""
import json, os, pathlib, urllib.parse, urllib.request

BASE = "https://open-api.guesty.com"
LISTINGS = {"37-snowbridge": "691403d937f0ea0013f72152"}
OUTPUT = pathlib.Path("data/guesty-reviews.json")

def request(url, *, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=35) as response:
        return json.load(response)

def token():
    values = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": os.environ["GUESTY_CLIENT_ID"],
        "client_secret": os.environ["GUESTY_CLIENT_SECRET"],
        "scope": "open-api",
    }).encode()
    result = request(BASE + "/oauth2/token", data=values,
                     headers={"Content-Type": "application/x-www-form-urlencoded"})
    return result["access_token"]

def review_list(payload):
    data = payload.get("data", payload) if isinstance(payload, dict) else payload
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("reviews", "results", "items"):
            if isinstance(data.get(key), list):
                return data[key]
    raise ValueError("Unrecognized Guesty reviews response; refusing to publish")

def score(review):
    contents = review.get("contents") or {}
    raw = contents.get("rating")
    if raw is None:
        return None
    try:
        n = float(raw)
    except (ValueError, TypeError):
        return None
    # Guesty API's public review rating is commonly on a five-point scale.
    # Do not infer that a 10-point dashboard score uses the same API scale.
    if 4 <= n <= 5:
        return n
    return None

def main():
    access = token()
    old = {}
    if OUTPUT.exists():
        old = json.loads(OUTPUT.read_text(encoding="utf-8"))
    result = dict(old)
    for slug, listing_id in LISTINGS.items():
        collected = []
        skip = 0
        while True:
            params = urllib.parse.urlencode({"listingId": listing_id, "limit": 100, "skip": skip})
            payload = request(BASE + "/v1/reviews?" + params,
                              headers={"Authorization": "Bearer " + access,
                                       "Accept": "application/json"})
            batch = review_list(payload)
            for item in batch:
                if not isinstance(item, dict):
                    continue
                # Verify property and avoid publishing cross-property reviews.
                linked = item.get("listingId")
                if isinstance(linked, dict):
                    linked = linked.get("_id") or linked.get("id")
                if str(linked) != listing_id:
                    continue
                contents = item.get("contents") or {}
                rating = score(item)
                body = contents.get("body")
                if rating is None or not isinstance(body, str) or not body.strip():
                    continue
                identifier = item.get("externalReviewId") or item.get("_id")
                if not isinstance(identifier, (str, int)):
                    continue
                collected.append({
                    "id": str(identifier),
                    "rating": rating,
                    "name": str(contents.get("reviewerName") or "Guest")[:100],
                    "date": str(item.get("createdAt") or "")[:10],
                    "body": body.strip()[:2500],
                    "source": "Guesty",
                })
            if len(batch) < 100:
                break
            skip += len(batch)
            if skip >= 2000:
                raise RuntimeError("Review pagination exceeded safe limit")
        unique = {item["id"]: item for item in collected}
        # Empty results should not wipe already verified reviews.
        if unique:
            result[slug] = sorted(unique.values(), key=lambda x: x["date"], reverse=True)
        else:
            print("No eligible reviews for", slug, "— retaining previous data")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Guesty review sync finished; property counts:",
          {key: len(result.get(key, [])) for key in LISTINGS})

if __name__ == "__main__":
    main()
