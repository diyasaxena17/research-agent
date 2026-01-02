import math
import pandas as pd
import pytest

from ra.portfolio import (
    annualized_volatility,
    cumulative_return,
    daily_returns,
    max_drawdown,
    summarize_performance,
)


def test_daily_returns_simple():
    prices = [100, 110, 121]
    r = daily_returns(prices)
    # 110/100 - 1 = 0.10, 121/110 - 1 = 0.10
    assert len(r) == 2
    assert r.iloc[0] == pytest.approx(0.10)
    assert r.iloc[1] == pytest.approx(0.10)


def test_cumulative_return():
    prices = [100, 125]
    assert cumulative_return(prices) == pytest.approx(0.25)


def test_max_drawdown():
    # peak 120 to trough 90 => 90/120 - 1 = -0.25
    prices = [100, 120, 110, 90, 95]
    assert max_drawdown(prices) == pytest.approx(-0.25)


def test_annualized_volatility_zero_for_constant_returns():
    # If returns are constant, std is 0 so vol is 0
    returns = [0.01, 0.01, 0.01, 0.01]
    assert annualized_volatility(returns) == pytest.approx(0.0)


def test_summarize_performance_outputs():
    prices = pd.Series([100, 110, 105, 115])
    summary = summarize_performance(prices)
    assert isinstance(summary.cumulative_return, float)
    assert isinstance(summary.max_drawdown, float)
    assert isinstance(summary.annualized_volatility, float)


def test_error_on_too_short_prices():
    with pytest.raises(ValueError):
        daily_returns([100])

    with pytest.raises(ValueError):
        cumulative_return([100])
