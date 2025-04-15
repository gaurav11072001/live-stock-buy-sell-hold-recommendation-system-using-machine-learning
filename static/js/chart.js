const charts = {};

async function fetchStockData(symbol) {
    try {
        const response = await fetch(`/stock-data/${symbol}`);
        const data = await response.json();
        if (data.error) {
            console.error(`Error fetching data for ${symbol}: ${data.error}`);
            return [];
        }
        // Format data for candlestick
        return data.map(entry => ({
            x: new Date(entry['Datetime']),
            o: entry['Open'],
            h: entry['High'],
            l: entry['Low'],
            c: entry['Close']
        }));
    } catch (error) {
        console.error(`Fetch error for ${symbol}:`, error);
        return [];
    }
}

function createCandlestickChart(ctx, data, stockName) {
    if (charts[stockName]) {
        charts[stockName].data.datasets[0].data = data;
        charts[stockName].update();
    } else {
        charts[stockName] = new Chart(ctx, {
            type: 'candlestick',
            data: {
                datasets: [{
                    label: `${stockName} Stock`,
                    data: data,
                    borderColor: 'rgba(255, 159, 64, 1)',
                    backgroundColor: 'rgba(255, 159, 64, 0.5)'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#333',
                            font: {
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                const ohlc = tooltipItem.raw;
                                return `O: ₹${ohlc.o}, H: ₹${ohlc.h}, L: ₹${ohlc.l}, C: ₹${ohlc.c}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute'
                        },
                        title: {
                            display: true,
                            text: 'Time',
                            color: '#333',
                            font: {
                                size: 14
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Price (INR)',
                            color: '#333',
                            font: {
                                size: 14
                            }
                        }
                    }
                }
            }
        });
    }
}

async function loadCharts() {
    const stocks = ['RELIANCE.NS', 'TATAMOTORS.NS', 'HDFCBANK.NS', 'CAP.PA', 'M&M.NS'];

    for (const stock of stocks) {
        const data = await fetchStockData(stock);
        if (data.length) {
            const ctx = document.getElementById(`chart-${stock}`).getContext('2d');
            createCandlestickChart(ctx, data, stock);
        }
    }
}

function init() {
    loadCharts();
    setInterval(loadCharts, 6000); // Refresh every 6 seconds
}

document.addEventListener('DOMContentLoaded', init);
