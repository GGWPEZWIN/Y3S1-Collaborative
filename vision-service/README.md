# GreenTrip Vision Service

Food waste mass estimation from a single plate photo.

## Honest accuracy expectations

Monocular food volume estimation is an open research problem. The best
result at the MetaFood 2025 workshop was 0.21 MAPE (~21% error) using
full 3D reconstruction. This pipeline is simpler, so expect worse until
calibrated — and state that plainly in any writeup.

Three things dominate the error:

1. **Depth is relative, not metric.** Depth Anything V2 returns a
   unitless map. `MAX_FOOD_DEPTH_CM` maps it onto centimetres and is the
   single largest error source. Fit it with real data.
2. **Density and shape factors are literature values**, not measured.
   `calibrate.py` replaces them.
3. **Segmentation quality.** A fine-tuned SegFormer-B1 reaches only
   0.32 mIoU across FoodSeg103's 104 classes. Fewer, coarser classes
   perform substantially better.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Install torch for YOUR CUDA version. RTX 50-series (sm_120) needs cu128:
pip install --force-reinstall torch torchvision --index-url https://download.pytorch.org/whl/cu128

python -c "import torch; print(torch.cuda.get_device_name(0))"
```

Run it:

```bash
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
curl http://localhost:8000/health
```

Point the frontend at it — in `client/.env`:

```
VITE_VISION_API_URL=http://localhost:8000
```

Without that variable the app uses the mock and says so in the UI.

## Pipeline

| Step | What | Why |
|---|---|---|
| 1 | YOLO11-seg | pixel mask + class per food region |
| 2 | Depth Anything V2 Small | relative height of food above the plate |
| 3 | Plate ellipse fit | the only source of absolute scale |
| 4 | area x depth x density | grams |

Step 3 is not optional. A monocular photo has no inherent scale; the
plate rim at a known 26cm is what converts pixels to centimetres. The
ellipse's axis ratio also recovers camera tilt, which corrects the
foreshortened area.

## Getting real numbers

Order matters — calibration is worth more than a bigger model.

**1. Collect weighed plates.** Photograph the leftovers with the whole
rim in frame, scrape into a bowl on a kitchen scale, record grams.
Target 300+ across your dish types.

```csv
filename,grams
plate_001.jpg,124
plate_002.jpg,58
```

**2. Fit the coefficients.**

```bash
python calibrate.py --images ./plates --truth ground_truth.csv
```

Prints MAPE and MAE before calibration, writes `calibration.json`.
Restart the service and re-run to measure the improvement — that delta
is a genuine result to report.

**3. Fine-tune segmentation** if classes are being missed.

```bash
python train_segmentation.py --stage 1 --data foodseg103.yaml
python train_segmentation.py --stage 2 --data malaysian.yaml \
    --weights runs/stage1/weights/best.pt
```

FoodSeg103 is Recipe1M-derived and skews Western — nasi lemak, char kway
teow and nasi kandar are barely represented. Annotating even 300 local
plates is a legitimate contribution worth writing about.

## Licence

Ultralytics YOLO is **AGPL-3.0**. If you publish this repository, that
licence applies to your project. SegFormer (Hugging Face) and Depth
Anything V2 are permissively licensed alternatives.
