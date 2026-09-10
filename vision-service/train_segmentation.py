"""
Two-stage fine-tune for food segmentation.

    Stage 1  FoodSeg103 (7,118 annotated images, Apache 2.0)
    Stage 2  your own Malaysian plates

Stage 2 needs far fewer images because stage 1 already taught the model
what food looks like. 300-500 well-annotated local plates beat 2,000
sloppy ones, and class balance matters more than raw count.

Annotation: load your photos into CVAT or Label Studio with the SAM
integration. One click inside a food region generates the polygon; you
only assign the class. That turns ~2 minutes per image into ~15 seconds.

LICENCE NOTE: Ultralytics YOLO is AGPL-3.0. If this code is published,
that licence applies to your project too. SegFormer via Hugging Face is
permissively licensed if that matters for your submission.

Usage:
    python train_segmentation.py --stage 1 --data foodseg103.yaml
    python train_segmentation.py --stage 2 --data malaysian.yaml --weights runs/stage1/weights/best.pt
"""

import argparse

from ultralytics import YOLO
from ultralytics.engine.trainer import BaseTrainer

# check_resume() reloads args from the checkpoint and only lets a resume
# override imgsz/batch/device/close_mosaic (see ultralytics/engine/trainer.py).
# workers isn't in that whitelist, so forcing it (e.g. to dodge a flaky
# Windows multiprocessing spawn) needs this patch.
_original_check_resume = BaseTrainer.check_resume


def _check_resume_with_workers(self, overrides):
    _original_check_resume(self, overrides)
    if self.resume and "workers" in overrides:
        self.args.workers = overrides["workers"]


BaseTrainer.check_resume = _check_resume_with_workers


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", type=int, choices=[1, 2], required=True)
    parser.add_argument("--data", required=False, help="dataset yaml (not needed with --resume)")
    parser.add_argument("--weights", default="yolo11s-seg.pt")
    parser.add_argument("--epochs", type=int, default=None)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument(
        "--resume", action="store_true",
        help="continue runs/stage{N}/weights/last.pt after an interruption (sleep, crash)",
    )
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()

    if args.resume:
        model = YOLO(f"runs/stage{args.stage}/weights/last.pt")
        model.train(resume=True, workers=args.workers)
        metrics = model.val()
        print(f"mAP50: {metrics.seg.map50:.4f}  mAP50-95: {metrics.seg.map:.4f}")
        return

    epochs = args.epochs or (100 if args.stage == 1 else 60)

    model = YOLO(args.weights)
    model.train(
        data=args.data,
        epochs=epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=0,
        project="runs",
        name=f"stage{args.stage}",
        # Stage 2 is a small dataset: a lower LR avoids destroying what
        # stage 1 learned, and stronger augmentation fights overfitting.
        lr0=0.01 if args.stage == 1 else 0.002,
        hsv_h=0.015, hsv_s=0.7, hsv_v=0.4,
        degrees=15 if args.stage == 2 else 0,
        fliplr=0.5,
        patience=20,
    )

    metrics = model.val()
    print(f"mAP50: {metrics.seg.map50:.4f}  mAP50-95: {metrics.seg.map:.4f}")


if __name__ == "__main__":
    main()
