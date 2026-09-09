# Plate Waste Data Collection Protocol

Ground truth for calibrating and evaluating the mass estimator. Without
this you cannot report an accuracy figure, and an uncalibrated pipeline
is not a result.

## Equipment

- Phone camera
- Kitchen scale reading to 1g (a ~RM30 digital scale is fine)
- An empty bowl of known weight, or a scale with tare
- A plate of known diameter — **measure it and record it**, the default
  assumes 26cm and every mass figure scales linearly with this

## Per plate, in order

1. **Photograph the leftovers.** Whole plate rim inside the frame,
   shot from roughly 45-60 degrees, plate against a contrasting
   surface. Do not crop afterwards.
2. **Scrape the leftovers** into the tared bowl.
3. **Weigh** and record to the nearest gram.
4. **Log the row** in `ground_truth.csv`.

Photograph before scraping. Reversing the order is the most common way
to lose a sample.

## Filename convention

    plate_0001.jpg, plate_0002.jpg, ...

Sequential, zero-padded. Do not encode the weight in the filename — the
CSV is the record, and duplicated data drifts apart.

## Target: 300+ plates

Class balance matters more than volume. 400 images that are 90% rice
produce a model that only sees rice. Aim for roughly even coverage of
whatever classes you decide to keep.

Track your counts as you go — the shortfall is always in the classes you
eat least.

## Deciding your classes FIRST

Do this before labelling anything. Changing your mind afterwards means
redoing the annotations.

Fewer, coarser classes segment substantially better than many fine ones:
a fine-tuned SegFormer-B1 reaches only 0.32 mIoU across FoodSeg103's 104
classes. A four-class scheme is easier to annotate, easier to learn, and
easier to defend:

| Class | Covers |
|---|---|
| `rice` | nasi, bihun, mee, kuey teow — starch base |
| `curry` | kari, sambal, kuah, gravies |
| `meat` | ayam, daging, ikan, telur — protein |
| `vegetable` | sayur, ulam, salad |

Plus `bone` as non-edible, excluded from the total.

If you keep the eight classes in `mass_model.py`, you need proportionally
more samples per class.

## Conditions to vary deliberately

A model trained on one lighting condition fails everywhere else. Spread
your samples across:

- Indoor fluorescent, warm restaurant light, daylight
- Ceramic white, patterned, and melamine plates
- Full leftovers through nearly-clean plates (you need the low end too —
  a model that never saw a 15g plate will not predict one)

## What to do with it

```bash
python calibrate.py --images ./data-collection/plates --truth ./data-collection/ground_truth.csv
```

Prints MAPE and MAE before calibration, writes `calibration.json`.
Restart the service and re-run to measure the improvement.

**Record both numbers.** The before/after delta is a genuine experimental
result and is worth more in your report than the model architecture.

## Splitting for evaluation

Hold out ~20% of plates and never calibrate on them. Reporting accuracy
on data you fitted to is meaningless, and a marker may well ask.

    plates/          calibration set
    plates_holdout/  evaluation only
