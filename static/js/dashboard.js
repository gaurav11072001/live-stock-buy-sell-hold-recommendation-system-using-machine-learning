// Object to store chart instances for each stock
const charts = {};

// Function to show selected stock card
function showStock(stock) {
    if (!stock) return;

    // Hide all stock cards
    document.querySelectorAll('.stock-card').forEach(card => {
        card.style.display = 'none';
    });

    // Show the selected stock card
    const selectedCard = document.getElementById(`stock-${stock}`);
    if (selectedCard) {
        selectedCard.style.display = 'block';
    }
}

// Add event listener for stock select
document.getElementById('stock-select').addEventListener('change', function() {
    showStock(this.value);
});

// Function to format price with currency symbol
function formatPrice(price) {
    return `₹${parseFloat(price).toFixed(2)}`;
}

// Function to fetch stock data from the server
async function fetchStockData(symbol) {
    try {
        const response = await fetch(`/stock-data/${symbol}`);
        const data = await response.json();
        
        if (data.error) {
            console.error(`Error fetching data for ${symbol}: ${data.error}`);
            return null;
        }

        // Process the data for charting
        const chartData = data.map(entry => ({
            x: new Date(entry.Datetime).getTime(),
            o: entry.Open,
            h: entry.High,
            l: entry.Low,
            c: entry.Close
        }));

        // Update live price
        const livePriceElement = document.getElementById(`live-price-${symbol}`);
        if (livePriceElement && chartData.length > 0) {
            const currentPrice = chartData[chartData.length - 1].c;
            livePriceElement.textContent = formatPrice(currentPrice);
        }

        return chartData;
    } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        return null;
    }
}

// Function to fetch prediction data from the server
async function fetchPrediction(symbol) {
    try {
        // Make API request to get prediction
        const response = await fetch(`/predict/${symbol}`);
        // Parse JSON response
        const data = await response.json();
        // Check for errors in response
        if (data.error) {
            console.error(`Error fetching prediction for ${symbol}: ${data.error}`);
            // Return default values if error occurs
            return { signal: 'hold', confidence: 0, future_predictions: [] };
        }
        return data;  // Return prediction data if successful
    } catch (error) {
        console.error(`Fetch error for ${symbol}:`, error);
        // Return default values on fetch failure
        return { signal: 'hold', confidence: 0, future_predictions: [] };
    }
}

// Enhanced chart creation function
function createChart(ctx, data, stockName) {
    if (charts[stockName]) {
        charts[stockName].destroy();
    }

    // Calculate price change
    const firstPrice = data[0].c;
    const lastPrice = data[data.length - 1].c;
    const priceChange = ((lastPrice - firstPrice) / firstPrice * 100).toFixed(2);

    charts[stockName] = new Chart(ctx, {
        type: 'candlestick',
        data: {
            datasets: [{
                label: stockName,
                data: data,
                color: {
                    up: 'rgba(52, 211, 153, 0.8)',   // Light green
                    down: 'rgba(248, 113, 113, 0.8)', // Light red
                    unchanged: 'rgba(148, 163, 184, 0.8)' // Light gray
                },
                borderColor: {
                    up: '#34d399',    // Solid green
                    down: '#f87171',   // Solid red
                    unchanged: '#94a3b8' // Solid gray
                },
                borderWidth: 2,
                wickColor: {
                    up: '#34d399',
                    down: '#f87171',
                    unchanged: '#94a3b8'
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    left: 10,
                    right: 30,
                    top: 20,
                    bottom: 10
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#1e293b',
                    bodyColor: '#1e293b',
                    borderColor: 'rgba(96, 165, 250, 0.2)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            const d = context.raw;
                            return [
                                `Open: ₹${d.o.toFixed(2)}`,
                                `High: ₹${d.h.toFixed(2)}`,
                                `Low: ₹${d.l.toFixed(2)}`,
                                `Close: ₹${d.c.toFixed(2)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                        displayFormats: {
                            minute: 'HH:mm'
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(96, 165, 250, 0.1)',
                        drawBorder: true,
                        drawOnChartArea: true,
                        drawTicks: true
                    },
                    ticks: {
                        source: 'auto',
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 8,
                        padding: 10,
                        color: '#1e293b',
                        font: {
                            size: 11,
                            weight: '500'
                        }
                    },
                    border: {
                        color: 'rgba(96, 165, 250, 0.2)'
                    }
                },
                y: {
                    position: 'right',
                    grid: {
                        display: true,
                        color: 'rgba(96, 165, 250, 0.1)',
                        drawBorder: true,
                        drawOnChartArea: true,
                        drawTicks: true
                    },
                    border: {
                        color: 'rgba(96, 165, 250, 0.2)'
                    },
                    ticks: {
                        padding: 8,
                        color: '#1e293b',
                        font: {
                            size: 11,
                            weight: '500'
                        },
                        callback: function(value) {
                            return `₹${value.toFixed(2)}`;
                        },
                        maxTicksLimit: 8,
                        align: 'center'
                    }
                }
            }
        }
    });

    // Update price change display
    const priceChangeElement = document.getElementById(`price-change-${stockName}`);
    if (priceChangeElement) {
        priceChangeElement.textContent = `${priceChange}%`;
        priceChangeElement.className = `price-change ${priceChange >= 0 ? 'positive' : 'negative'}`;
    }
}

// Function to update all charts
async function updateCharts() {
    const stocks = ['TATASTEEL.NS', 'HDFCBANK.NS', 'WIPRO.NS', 'TCS.NS', 'INFY.NS'];
    let topGainer = { symbol: '', change: -Infinity };
    let topLoser = { symbol: '', change: Infinity };
    
    for (const stock of stocks) {
        const chartData = await fetchStockData(stock);
        if (!chartData) continue;

        const ctx = document.getElementById(`chart-${stock}`).getContext('2d');
        
        // Calculate price change
        const firstPrice = chartData[0].c;
        const lastPrice = chartData[chartData.length - 1].c;
        const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

        // Update top gainer/loser
        if (priceChange > topGainer.change) {
            topGainer = { symbol: stock, change: priceChange };
        }
        if (priceChange < topLoser.change) {
            topLoser = { symbol: stock, change: priceChange };
        }

        // Create or update chart
        createChart(ctx, chartData, stock);

        // Fetch and update predictions
        const predictionData = await fetchPrediction(stock);
        updatePredictionDisplay(stock, predictionData);
    }

    // Update market summary
    document.getElementById('top-gainer').textContent = 
        `${topGainer.symbol} (${topGainer.change.toFixed(2)}%)`;
    document.getElementById('top-loser').textContent = 
        `${topLoser.symbol} (${topLoser.change.toFixed(2)}%)`;
}

// Enhanced prediction display update
function updatePredictionDisplay(stock, predictionData) {
    const predictionElement = document.getElementById(`prediction-${stock}`);
    if (!predictionElement) return;

    const confidence = predictionData.confidence || 0;
    let signalClass, signalText, signalIcon;

    // Update signal display based on confidence thresholds
    if (confidence > 75) {
        signalClass = 'buy';
        signalText = 'Strong Buy';
        signalIcon = 'fa-arrow-trend-up';
    } else if (confidence < 30) {
        signalClass = 'sell';
        signalText = 'Strong Sell';
        signalIcon = 'fa-arrow-trend-down';
    } else {
        signalClass = 'hold';
        signalText = 'Hold';
        signalIcon = 'fa-minus';
    }

    predictionElement.innerHTML = `
        <div class="prediction-header">
            <h4>XGBoost AI Predictions</h4>
            <span class="prediction-timestamp">
                <i class="fas fa-circle"></i>
                Updated just now
            </span>
        </div>
        <div class="prediction-content">
            <div class="prediction-signal ${signalClass}">
                <div class="signal-indicator">
                    <i class="fas ${signalIcon}"></i>
                </div>
                <div class="signal-details">
                    <span class="signal-label">Trading Signal</span>
                    <span class="signal-value">${signalText}</span>
                </div>
            </div>
            <div class="prediction-metrics">
                <div class="metric confidence">
                    <span class="metric-label">Model Confidence</span>
                    <span class="metric-value">${confidence}%</span>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${confidence}%"></div>
                    </div>
                </div>
                <div class="metric next-prediction">
                    <span class="metric-label">Next Day Prediction</span>
                    <span class="metric-value">₹${predictionData.future_predictions[0]?.predicted_close.toFixed(2) || 'N/A'}</span>
                </div>
            </div>
            <div class="prediction-rules">
                <small>
                    XGBoost Signal Rules:
                    <ul>
                        <li>Strong Buy: Confidence > 75%</li>
                        <li>Strong Sell: Confidence < 30%</li>
                        <li>Hold: Confidence 30-75%</li>
                        <li>Based on: Price, Volume, % Change</li>
                    </ul>
                </small>
            </div>
        </div>
    `;
}

// Function to show loading state
function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';
}

// Function to hide loading state
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

// Initialize dashboard
async function initializeDashboard() {
    showLoading();
    try {
        await updateCharts();
        // Show first stock by default
        const firstStock = document.querySelector('#stock-select option:not([disabled])');
        if (firstStock) {
            showStock(firstStock.value);
        }
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    } finally {
        hideLoading();
    }
}

// Add refresh button functionality
document.getElementById('refresh-btn').addEventListener('click', async () => {
    showLoading();
    try {
        await updateCharts();
    } finally {
        hideLoading();
    }
});

// Start real-time updates
function startRealTimeUpdates() {
    setInterval(async () => {
        await updateCharts();
    }, 5000); // Update every 5 seconds
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    startRealTimeUpdates();
});

// FAQ Modal functionality
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('faq-modal');
    const faqBtn = document.getElementById('faq-btn');
    const closeBtn = document.querySelector('.close-btn');

    faqBtn.onclick = function() {
        modal.style.display = "flex";
        document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    }

    closeBtn.onclick = function() {
        modal.style.display = "none";
        document.body.style.overflow = 'auto'; // Restore scrolling
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
            document.body.style.overflow = 'auto';
        }
    }
});

