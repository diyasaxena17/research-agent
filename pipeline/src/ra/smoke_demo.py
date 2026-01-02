from ra.portfolio import summarize_performance

prices = [100, 105, 103, 110, 108, 120]
summary = summarize_performance(prices)

print("Cumulative return:", round(summary.cumulative_return, 4))
print("Max drawdown:", round(summary.max_drawdown, 4))
print("Annualized vol:", round(summary.annualized_volatility, 4))
