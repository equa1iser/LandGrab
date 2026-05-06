#!/usr/bin/env python3
"""
train_avm.py — generate synthetic training data and train the LandGrab AVM v1 model.

Usage:
    # Inside Docker backend container (recommended):
    docker compose exec backend python scripts/train_avm.py

    # From host (needs sklearn/numpy installed locally):
    python backend/scripts/train_avm.py

Output: backend/models/avm_v1.pkl  →  /app/models/avm_v1.pkl inside Docker
"""
import os
import sys

import numpy as np
import joblib
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_percentage_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

FEATURE_COLUMNS = [
    "sqft", "lot_size_acres", "beds", "baths", "year_built",
    "zip_median_price", "crime_index", "school_rating_avg",
    "walk_score", "months_supply", "yoy_price_change_pct",
]

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "avm_v1.pkl")


def age_factor(year_built: np.ndarray) -> np.ndarray:
    age = 2024 - year_built
    # Newer homes command a premium; older homes depreciate then stabilize
    return np.where(age < 10, 1.08,
           np.where(age < 20, 1.04,
           np.where(age < 35, 1.00,
           np.where(age < 60, 0.93, 0.87))))


def generate_data(n: int = 5000, seed: int = 42) -> tuple:
    rng = np.random.default_rng(seed)

    # --- Market anchor ---
    zip_median_price = np.exp(rng.normal(np.log(350_000), 0.55, n)).clip(80_000, 2_500_000)

    # --- Structural features ---
    sqft = rng.normal(1800, 600, n).clip(600, 5000).astype(int)

    # Beds and baths derived from sqft bands with some noise
    beds = np.where(sqft < 1000, rng.integers(1, 3, n),
           np.where(sqft < 1800, rng.integers(2, 4, n),
           np.where(sqft < 3000, rng.integers(3, 5, n),
                                  rng.integers(4, 7, n)))).clip(1, 8).astype(float)
    baths = (beds * 0.7 + rng.normal(0, 0.4, n)).clip(1, 6).round(1)

    year_built = rng.integers(1940, 2024, n).astype(float)
    lot_size_acres = np.exp(rng.normal(-1.4, 0.5, n)).clip(0.05, 5.0)

    # --- Location quality ---
    crime_index = (rng.beta(2.5, 4, n) * 100).clip(0, 100)  # biased toward 20-60
    # Schools slightly inversely correlated with crime
    school_base = 10 - (crime_index / 100) * 4
    school_rating_avg = (school_base + rng.normal(0, 1.2, n)).clip(1, 10).round(1)
    walk_score = rng.normal(45, 20, n).clip(0, 100).round(0)

    # --- Market conditions ---
    months_supply = rng.gamma(2.5, 1.6, n).clip(0.5, 18)
    yoy_price_change_pct = rng.normal(3.5, 6.0, n).clip(-20, 30)

    # --- Target price (formula-driven so GBR learns real signal) ---
    price = (
        zip_median_price
        * (sqft / 1800) ** 0.55
        * (1 + beds * 0.04)
        * (1 + baths * 0.03)
        * age_factor(year_built)
        * (1 - crime_index / 500)
        * (1 + (school_rating_avg - 5) * 0.02)
        * (1 + yoy_price_change_pct / 100) ** 3
    )
    # Add realistic log-noise (~12% std) to simulate true market variance
    price = price * np.exp(rng.normal(0, 0.12, n))
    price = price.clip(50_000, 5_000_000).astype(int)

    X = np.column_stack([
        sqft, lot_size_acres, beds, baths, year_built,
        zip_median_price, crime_index, school_rating_avg,
        walk_score, months_supply, yoy_price_change_pct,
    ])
    return X, price


def train(X: np.ndarray, y: np.ndarray) -> Pipeline:
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42
    )
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", GradientBoostingRegressor(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=5,
            subsample=0.8,
            min_samples_leaf=10,
            random_state=42,
        )),
    ])
    print(f"Training on {len(X_train)} samples…")
    pipeline.fit(X_train, y_train)

    preds = pipeline.predict(X_test)
    mape = mean_absolute_percentage_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    print(f"Test MAPE: {mape:.3f}  |  R²: {r2:.3f}")
    return pipeline


if __name__ == "__main__":
    print("Generating synthetic training data…")
    X, y = generate_data(n=5000)
    print(f"  {len(X)} samples, {X.shape[1]} features")

    model = train(X, y)

    out = os.path.abspath(OUTPUT_PATH)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    joblib.dump(model, out)
    print(f"Model saved → {out}")
    print("Done.")
