import argparse
import os
import cv2
import numpy as np
import yaml
from datasets import load_dataset

# Target classes, in the order mass_model.py expects.
TARGET_CLASSES = ["rice", "curry", "meat", "vegetable", "noodle", "sambal", "egg", "bone"]
IDX = {name: i for i, name in enumerate(TARGET_CLASSES)}

# FoodSeg103 id -> target class.
# Ids not listed are dropped: desserts, drinks, nuts and fruit are not
# plate leftovers in this context and mass_model.py has no density for
# them. Mislabelling them into an existing class would corrupt the mass
# estimate, which matters more than the extra training images.
ID_MAP = {
    # --- starch base (density 0.78) ---
    3: "rice",    # french fries
    58: "rice",   # bread
    59: "rice",   # corn
    60: "rice",   # hamburg
    61: "rice",   # pizza
    62: "rice",   # hanamaki baozi
    63: "rice",   # wonton dumplings
    66: "rice",   # rice
    67: "rice",   # pie
    70: "rice",   # potato

    # --- noodle ---
    64: "noodle",  # pasta
    65: "noodle",  # noodles

    # --- gravy / sauce ---
    52: "curry",  # sauce
    57: "curry",  # soup

    # --- protein ---
    46: "meat",   # steak
    47: "meat",   # pork
    48: "meat",   # chicken duck
    49: "meat",   # sausage
    50: "meat",   # fried meat
    51: "meat",   # lamb
    53: "meat",   # crab
    54: "meat",   # fish
    55: "meat",   # shellfish
    56: "meat",   # shrimp
    68: "meat",   # tofu

    # --- egg ---
    2: "egg",     # egg tart
    24: "egg",    # egg

    # --- vegetable ---
    35: "vegetable",  # olives
    69: "vegetable",  # eggplant
    71: "vegetable",  # garlic
    72: "vegetable",  # cauliflower
    73: "vegetable",  # tomato
    74: "vegetable",  # kelp
    75: "vegetable",  # seaweed
    76: "vegetable",  # spring onion
    77: "vegetable",  # rape
    78: "vegetable",  # ginger
    79: "vegetable",  # okra
    80: "vegetable",  # lettuce
    81: "vegetable",  # pumpkin
    82: "vegetable",  # cucumber
    83: "vegetable",  # white radish
    84: "vegetable",  # carrot
    85: "vegetable",  # asparagus
    86: "vegetable",  # bamboo shoots
    87: "vegetable",  # broccoli
    88: "vegetable",  # celery stick
    89: "vegetable",  # cilantro mint
    90: "vegetable",  # snow peas
    91: "vegetable",  # cabbage
    92: "vegetable",  # bean sprouts
    93: "vegetable",  # onion
    94: "vegetable",  # pepper
    95: "vegetable",  # green beans
    96: "vegetable",  # French beans
    97: "vegetable",  # king oyster mushroom
    98: "vegetable",  # shiitake
    99: "vegetable",  # enoki mushroom
    100: "vegetable", # oyster mushroom
    101: "vegetable", # white button mushroom
    102: "vegetable", # salad
}

# `sambal` and `bone` have NO equivalent in FoodSeg103 — it is a
# Recipe1M sample and skews Western. They stay in the class list so the
# indices match mass_model.py, and stage 2 on your own Malaysian plates
# is what teaches them. Expect zero instances here; that is not a bug.

MIN_AREA_PX = 400
POLY_EPSILON_RATIO = 0.004


def mask_to_polygons(binary):
    """Contours -> normalised YOLO polygons."""
    height, width = binary.shape
    contours, _ = cv2.findContours(
        binary.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    polygons = []
    for contour in contours:
        if cv2.contourArea(contour) < MIN_AREA_PX:
            continue
        epsilon = POLY_EPSILON_RATIO * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True).reshape(-1, 2)
        if len(approx) < 3:
            continue
        flat = []
        for x, y in approx:
            flat.extend([float(np.clip(x / width, 0, 1)), float(np.clip(y / height, 0, 1))])
        polygons.append(flat)
    return polygons


def convert_split(dataset, split, out_root):
    img_dir = os.path.join(out_root, "images", split)
    lbl_dir = os.path.join(out_root, "labels", split)
    os.makedirs(img_dir, exist_ok=True)
    os.makedirs(lbl_dir, exist_ok=True)

    kept, skipped = 0, 0
    counts = {name: 0 for name in TARGET_CLASSES}

    for i, sample in enumerate(dataset):
        image = np.array(sample["image"].convert("RGB"))
        mask = np.array(sample["label"].convert("L"))

        lines = []
        for source_id in np.unique(mask):
            target_name = ID_MAP.get(int(source_id))
            if target_name is None:
                continue  # background or a class we deliberately drop
            target = IDX[target_name]
            for polygon in mask_to_polygons(mask == source_id):
                lines.append(str(target) + " " + " ".join(f"{v:.6f}" for v in polygon))
                counts[target_name] += 1

        if not lines:
            skipped += 1
            continue

        stem = f"{split}_{i:05d}"
        cv2.imwrite(
            os.path.join(img_dir, stem + ".jpg"),
            cv2.cvtColor(image, cv2.COLOR_RGB2BGR),
            [cv2.IMWRITE_JPEG_QUALITY, 92],
        )
        with open(os.path.join(lbl_dir, stem + ".txt"), "w") as fh:
            fh.write("\n".join(lines))
        kept += 1

        if (i + 1) % 500 == 0:
            print(f"  {split}: {i + 1} processed, {kept} kept")

    print(f"\n{split}: kept {kept}, skipped {skipped} (nothing mappable)")
    print("  polygon instances per class:")
    for name in TARGET_CLASSES:
        flag = "   <- expected 0, see note in script" if counts[name] == 0 else ""
        print(f"    {name:10s} {counts[name]}{flag}")
    return kept


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="data/foodseg103")
    parser.add_argument("--repo", default="EduardoPacheco/FoodSeg103")
    args = parser.parse_args()

    print(f"Loading {args.repo} (cached after the first run)...")
    dataset = load_dataset(args.repo)

    os.makedirs(args.out, exist_ok=True)

    total = 0
    for split, name in (("train", "train"), ("validation", "val")):
        if split in dataset:
            total += convert_split(dataset[split], name, args.out)

    if total == 0:
        raise SystemExit(
            "\nNo images written. The mask ids did not match ID_MAP — inspect "
            "np.unique(np.array(dataset['train'][0]['label'])) and compare "
            "against the FoodSeg103 category table."
        )

    yaml_path = os.path.join(args.out, "dataset.yaml")
    with open(yaml_path, "w") as fh:
        yaml.safe_dump(
            {
                "path": os.path.abspath(args.out),
                "train": "images/train",
                "val": "images/val",
                "names": {i: n for i, n in enumerate(TARGET_CLASSES)},
            },
            fh,
            sort_keys=False,
        )

    print(f"\nWrote {yaml_path} ({total} images)")
    print("Next:")
    print(f"  python train_segmentation.py --stage 1 --data {yaml_path}")


if __name__ == "__main__":
    main()
