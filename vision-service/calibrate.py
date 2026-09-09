import argparse
import csv
import json
import os
from collections import defaultdict
import numpy as np
import requests

SERVICE = os.environ.get("SERVICE_URL", "http://localhost:8000")


def predict(path):
    with open(path, "rb") as fh:
        res = requests.post(f"{SERVICE}/infer", files={"image": fh}, timeout=60)
    res.raise_for_status()
    return res.json()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--images", required=True)
    parser.add_argument("--truth", required=True)
    parser.add_argument("--out", default="calibration.json")
    args = parser.parse_args()

    with open(args.truth) as fh:
        truth = {r["filename"]: float(r["grams"]) for r in csv.DictReader(fh)}

    # Per class, collect (predicted volume proxy, share of actual grams).
    samples = defaultdict(list)
    predicted_totals, actual_totals = [], []

    for filename, actual in truth.items():
        path = os.path.join(args.images, filename)
        if not os.path.exists(path):
            print(f"missing: {filename}")
            continue
        try:
            result = predict(path)
        except Exception as exc:
            print(f"failed {filename}: {exc}")
            continue

        edible = [d for d in result["detections"] if d["edible"]]
        if not edible:
            continue

        predicted = sum(d["grams"] for d in edible)
        predicted_totals.append(predicted)
        actual_totals.append(actual)

        # Attribute the weighed total across classes by predicted share.
        for d in edible:
            volume = d["areaCm2"] * d["depthCm"]
            if volume <= 0 or predicted <= 0:
                continue
            share = d["grams"] / predicted
            samples[d["cls"]].append((volume, actual * share))

    if not predicted_totals:
        print("No usable samples.")
        return

    # Least-squares through the origin: grams = k x volume.
    # k absorbs density and shape together, which is what we can actually
    # observe — separating them would be fitting unobservable parameters.
    calibration = {}
    for cls, pairs in samples.items():
        volumes = np.array([p[0] for p in pairs])
        grams = np.array([p[1] for p in pairs])
        k = float((volumes @ grams) / (volumes @ volumes))
        calibration[cls] = {"density": round(k, 4), "shape": 1.0, "n": len(pairs)}
        print(f"{cls:12s} n={len(pairs):4d}  k={k:.4f} g/cm3")

    predicted_totals = np.array(predicted_totals, dtype=float)
    actual_totals = np.array(actual_totals, dtype=float)
    mape = float(np.mean(np.abs(predicted_totals - actual_totals) / np.maximum(actual_totals, 1)))
    mae = float(np.mean(np.abs(predicted_totals - actual_totals)))

    print(f"\nBEFORE calibration: MAPE {mape*100:.1f}%  MAE {mae:.1f}g  over {len(actual_totals)} plates")
    print("Re-run after applying calibration.json to measure the improvement.")

    with open(args.out, "w") as fh:
        json.dump(calibration, fh, indent=2)
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
