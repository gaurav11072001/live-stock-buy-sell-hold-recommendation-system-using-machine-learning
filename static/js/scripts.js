document.addEventListener('DOMContentLoaded', function () {
    const stocks = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS'];

    // Function to fetch stock data
    function fetchStockData(symbol) {
        fetch(`/stock-data/${symbol}`)
            .then(response => response.json())
            .then(data => {
                if (!data.error) {
                    createChart(symbol, data);
                } else {
                    console.error(data.error);
                }
            });
    }

    // Function to fetch prediction data
    function fetchPrediction(symbol) {
        fetch(`/predict/${symbol}`)
            .then(response => response.json())
            .then(data => {
                if (!data.error) {
                    document.getElementById(`prediction-${symbol}`).innerText = `Prediction: ${data.buy ? 'Buy' : 'Hold'}`;
                } else {
                    console.error(data.error);
                }
            });
    }

    // Function to create a chart
    function createChart(symbol, data) {
        const ctx = document.getElementById(`chart-${symbol}`).getContext('2d');
        const chartData = {
            labels: data.map(item => item.Datetime),
            datasets: [{
                label: 'Close Price',
                data: data.map(item => item.Close),
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                fill: false
            }]
        };

        new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute'
                        }
                    },
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }

    // Load charts and predictions for all stocks
    function loadCharts() {
        stocks.forEach(stock => {
            fetchStockData(stock);
            fetchPrediction(stock);
        });
    }

    loadCharts();
    setInterval(loadCharts, 30000); // Refresh every 30 seconds
});
