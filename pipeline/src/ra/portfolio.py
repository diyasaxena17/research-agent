from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd


TRADING_DAYS_PER_YEAR = 252


def _to_series(prices: pd.Series | list[float] | np.ndarray) -> pd.Series:
    """
    Convert various inputs into a clean pandas Series of floats.

    Teaching note:
    - In finance, price series must be numeric and ordered in time.
    - We also drop missing values to avoid breaking math later.
    """
    s = pd.Series(prices, dtype="float64").dropna()
    if len(s) < 2:
        raise ValueError("Need at least 2 price points to compute returns.")
    return s


def daily_returns(prices: pd.Series | list[float] | np.ndarray) -> pd.Series:
    """
    Compute simple daily returns: r_t = (P_t / P_{t-1}) - 1

    Teaching note:
    - Returns measure *change*, which is what almost all portfolio metrics use.
    - We use pct_change() because it's the standard for (P_t - P_{t-1}) / P_{t-1}.
    """
    s = _to_series(prices)
    return s.pct_change().dropna()


def cumulative_return(prices: pd.Series | list[float] | np.ndarray) -> float:
    """
    Total return over the full window: (P_last / P_first) - 1
    """
    s = _to_series(prices)
    return float(s.iloc[-1] / s.iloc[0] - 1.0)


def max_drawdown(prices: pd.Series | list[float] | np.ndarray) -> float:
    """
    Max drawdown = worst peak-to-trough decline.

    Teaching note:
    - Drawdown answers: "What was the worst % drop from the highest point so far?"
    - We track running peak and compare current price vs that peak.
    """
    s = _to_series(prices)
    running_peak = s.cummax()
    drawdowns = (s / running_peak) - 1.0
    return float(drawdowns.min())  # negative number, e.g., -0.23 means -23%


def annualized_volatility(returns: pd.Series | list[float] | np.ndarray) -> float:
    """
    Annualized volatility: std(daily_returns) * sqrt(252)

    Teaching note:
    - Volatility is "typical wiggle size".
    - Annualizing lets you compare across time windows.
    """
    r = pd.Series(returns, dtype="float64").dropna()
    if len(r) < 2:
        raise ValueError("Need at least 2 return points to compute volatility.")
    return float(r.std(ddof=1) * np.sqrt(TRADING_DAYS_PER_YEAR))


def beta(asset_returns: pd.Series, benchmark_returns: pd.Series) -> float:
    """
    Beta measures sensitivity to benchmark:
    beta = Cov(asset, benchmark) / Var(benchmark)

    Teaching note:
    - beta ~ 1 means moves like the market
    - beta > 1 means more volatile than market
    - beta < 1 means defensive vs market
    """
    a = pd.Series(asset_returns, dtype="float64").dropna()
    b = pd.Series(benchmark_returns, dtype="float64").dropna()

    # Align by index so we compare same dates
    df = pd.concat([a, b], axis=1, join="inner").dropna()
    if len(df) < 2:
        raise ValueError("Not enough overlapping returns to compute beta.")

    a_aligned = df.iloc[:, 0]
    b_aligned = df.iloc[:, 1]

    var_b = float(np.var(b_aligned, ddof=1))
    if var_b == 0.0:
        raise ValueError("Benchmark variance is zero; beta undefined.")

    cov_ab = float(np.cov(a_aligned, b_aligned, ddof=1)[0, 1])
    return cov_ab / var_b


@dataclass(frozen=True)
class PerformanceSummary:
    cumulative_return: float
    max_drawdown: float
    annualized_volatility: float
    beta_vs_benchmark: Optional[float] = None


def summarize_performance(
    prices: pd.Series | list[float] | np.ndarray,
    benchmark_prices: pd.Series | list[float] | np.ndarray | None = None,
) -> PerformanceSummary:
    """
    Convenience function that returns a few key metrics recruiters will recognize.
    """
    s = _to_series(prices)
    r = daily_returns(s)

    cr = cumulative_return(s)
    mdd = max_drawdown(s)
    vol = annualized_volatility(r)

    beta_value: Optional[float] = None
    if benchmark_prices is not None:
        b = _to_series(benchmark_prices)
        beta_value = beta(daily_returns(s), daily_returns(b))

    return PerformanceSummary(
        cumulative_return=cr,
        max_drawdown=mdd,
        annualized_volatility=vol,
        beta_vs_benchmark=beta_value,
    )
