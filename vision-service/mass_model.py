import json
import os

# density g/cm3, shape factor 0-1
DEFAULT_PROFILE = {
    "rice":      {"density": 0.78, "shape": 0.55, "label": "Nasi / rice",        "colour": "#F59E0B", "edible": True},
    "curry":     {"density": 1.02, "shape": 0.85, "label": "Kari / gravy",       "colour": "#DC2626", "edible": True},
    "meat":      {"density": 0.95, "shape": 0.60, "label": "Daging / protein",   "colour": "#B45309", "edible": True},
    "vegetable": {"density": 0.62, "shape": 0.50, "label": "Sayur / vegetable",  "colour": "#16A34A", "edible": True},
    "noodle":    {"density": 0.70, "shape": 0.55, "label": "Mee / noodle",       "colour": "#CA8A04", "edible": True},
    "sambal":    {"density": 1.05, "shape": 0.80, "label": "Sambal",             "colour": "#B91C1C", "edible": True},
    "egg":       {"density": 0.90, "shape": 0.65, "label": "Telur / egg",        "colour": "#EAB308", "edible": True},
    "bone":      {"density": 1.30, "shape": 0.70, "label": "Tulang (non-edible)","colour": "#78716C", "edible": False},
}

CALIBRATION_PATH = os.environ.get("CALIBRATION_PATH", "calibration.json")


def load_profile():
    """Merges fitted coefficients over the defaults when calibration exists."""
    profile = {k: dict(v) for k, v in DEFAULT_PROFILE.items()}
    if os.path.exists(CALIBRATION_PATH):
        with open(CALIBRATION_PATH) as fh:
            fitted = json.load(fh)
        for cls, coeffs in fitted.items():
            if cls in profile:
                profile[cls].update(coeffs)
    return profile


def estimate_grams(cls, area_cm2, mean_depth_cm, profile):
    """Volume x density, with the shape factor correcting the prism assumption."""
    p = profile.get(cls)
    if p is None:
        return 0.0
    volume_cm3 = area_cm2 * mean_depth_cm * p["shape"]
    return volume_cm3 * p["density"]
