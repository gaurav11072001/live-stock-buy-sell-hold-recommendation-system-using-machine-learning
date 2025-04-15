import joblib                  # For loading and saving machine learning models
import yfinance as yf         # Yahoo Finance API wrapper for stock data
from flask import Flask, render_template, request, jsonify, redirect, url_for, session  # Flask web framework components
from datetime import datetime, timedelta, timezone  # For date and time operations
import pandas as pd           # For data manipulation and analysis
import hashlib               # For password encryption
from flask_sqlalchemy import SQLAlchemy  # SQL database ORM for Flask
import time                  # For time-related operations
import requests              # For making HTTP requests
from requests.adapters import HTTPAdapter  # For configuring HTTP requests
from requests.packages.urllib3.util.retry import Retry  # For implementing retry logic
import threading  

# Create and configure Flask application
# Create and configure Flask application
app = Flask(__name__)        # Initialize Flask app
app.secret_key = 'your_secret_key'  # Set secret key for session management
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'  # Configure SQLite database location
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # Disable SQLAlchemy modification tracking

db = SQLAlchemy(app)

# Define rate limiting variables
rate_limit_lock = threading.Lock()  # Create thread lock for synchronization
last_request_time = {}        # Dictionary to store last request timestamps
MIN_REQUEST_INTERVAL = 1      # Minimum time (in seconds) between requests

# Define User database model
class User(db.Model):
    """User model for storing user data"""
    id = db.Column(db.Integer, primary_key=True)  # Primary key for user
    username = db.Column(db.String(150), unique=True, nullable=False)  # Unique username
    password = db.Column(db.String(150), nullable=False)  # Hashed password
    preferred_stocks = db.Column(db.PickleType, nullable=True)  # List of user's preferred stocks

# Define Prediction database model
# Define Prediction database model
class Prediction(db.Model):
    """Model for storing prediction data"""
    id = db.Column(db.Integer, primary_key=True)  # Primary key for prediction
    symbol = db.Column(db.String(50), nullable=False)  # Stock symbol
    buy = db.Column(db.Boolean, nullable=False)  # Buy (True) or Sell (False) signal
    future_predictions = db.Column(db.PickleType, nullable=False)  # List of future price predictions
    # Store timestamp in UTC
    timestamp = db.Column(db.DateTime, default=datetime.now(timezone.utc))  # When prediction was made

# Define StockData database model
class StockData(db.Model):
    """Model for caching stock data"""
    id = db.Column(db.Integer, primary_key=True)  # Primary key for stock data
    symbol = db.Column(db.String(50), nullable=False)  # Stock symbol
    data = db.Column(db.PickleType, nullable=False)  # Cached stock data
    # Store timestamp in UTC
    timestamp = db.Column(db.DateTime, default=datetime.now(timezone.utc))  # When data was cached

# Create all database tables
with app.app_context():
    db.create_all()

# List of stock symbols to monitor
symbols = ['TATASTEEL.NS', 'HDFCBANK.NS', 'WIPRO.NS', 'TCS.NS', 'INFY.NS']

# Dictionaries to store models and scalers
models = {}      # Store ML models for each stock
scalers = {}     # Store data scalers for each stock

# Load ML models and scalers for each stock symbol
for symbol in symbols:
    try:
        # Update the paths to use the XGBoost models saved from train.py
        models[symbol] = joblib.load(f'E:/m0161finale/m0161final/m0161final/xgb_{symbol}_classifier.pkl')
        scalers[symbol] = joblib.load(f'E:/m0161finale/m0161final/m0161final/scaler_{symbol}.pkl')
        print(f"Loaded XGBoost model and scaler for {symbol}.")
    except FileNotFoundError:
        print(f"Model or scaler for {symbol} not found. Ensure the files are in the correct location.")

# Helper functions
def hash_password(password):
    """Hash password using SHA-256 encryption"""
    return hashlib.sha256(password.encode()).hexdigest()

def fetch_live_data(symbol):
    """Fetch real-time stock data with retry mechanism"""
    global last_request_time
    
    # Handle special case for M&M stock symbol
    if symbol == 'M&M.NS':
        symbol = 'M&M.NS'
    
    # Implement rate limiting
  # Implement rate limiting
    with rate_limit_lock:  # Thread-safe operation
        current_time = time.time()  # Get current timestamp
        if symbol in last_request_time:  # Check if symbol has been requested before
            time_since_last = current_time - last_request_time[symbol]  # Calculate time since last request
            if time_since_last < MIN_REQUEST_INTERVAL:  # If too soon for new request
                sleep_time = MIN_REQUEST_INTERVAL - time_since_last  # Calculate wait time
                time.sleep(sleep_time)  # Wait before making new request
        last_request_time[symbol] = time.time()  # Update last request time
    
 # Configure session with retry strategy
    session = requests.Session()  # Create new session
    retries = Retry(
        total=3,  # Maximum number of retries
        backoff_factor=0.5,  # Time factor between retries
        status_forcelist=[429, 500, 502, 503, 504]  # HTTP status codes to retry on
    )
    
    session.mount('http://', HTTPAdapter(max_retries=retries))
    session.mount('https://', HTTPAdapter(max_retries=retries))
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Try direct Yahoo Finance API first
            url = f'https://query2.finance.yahoo.com/v8/finance/chart/{symbol}'
            params = {
                'range': '1d',
                'interval': '1m',
                'includePrePost': 'true'
            }
            
            response = session.get(url, params=params, headers=headers, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if 'chart' in data and 'result' in data['chart'] and data['chart']['result']:
                result = data['chart']['result'][0]
                timestamps = result.get('timestamp', [])
                quotes = result.get('indicators', {}).get('quote', [{}])[0]
                
                if timestamps and all(key in quotes for key in ['open', 'high', 'low', 'close', 'volume']):
                    df = pd.DataFrame()
                    # Convert timestamps to proper datetime objects in UTC
                    df['Datetime'] = [datetime.fromtimestamp(ts, tz=timezone.utc) for ts in timestamps]
                    df['Open'] = quotes['open']
                    df['High'] = quotes['high']
                    df['Low'] = quotes['low']
                    df['Close'] = quotes['close']
                    df['Volume'] = quotes['volume']
                    df = df.dropna()
                    
                    if not df.empty:
                        print(f"Successfully fetched {len(df)} records for {symbol}")
                        return df
            
            # Fallback to yfinance
            print(f"API call failed for {symbol}, trying yfinance...")
            df = yf.download(symbol, period='5d', interval='1m', progress=False)
            
            if not df.empty:
                df['Datetime'] = df.index
                df = df.reset_index(drop=True)
                print(f"Successfully fetched {len(df)} records for {symbol} using yfinance")
                return df
            
            print(f"Attempt {attempt + 1} failed for {symbol}")
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 5
                print(f"Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
            
        except Exception as e:
            print(f"Attempt {attempt + 1} failed for {symbol}: {str(e)}")
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 5
                print(f"Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
                continue
            return {"error": f"Failed to fetch live data for {symbol} after {max_retries} attempts: {str(e)}"}
    
    return {"error": f"No live data available for {symbol}"}

# Route handlers
@app.route('/')
def index():
    """Homepage route handler"""
    if 'username' not in session:
        return redirect(url_for('login'))
    user = User.query.filter_by(username=session['username']).first()
    preferred_stocks = user.preferred_stocks if user else []
    return render_template('dashboard.html', stocks=symbols, preferred_stocks=preferred_stocks)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        preferred_stocks = request.form.getlist('preferred_stocks')
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            print(f"Registration failed: Username {username} already exists.")
            return 'Username already exists'
        hashed_password = hash_password(password)
        new_user = User(username=username, password=hashed_password, preferred_stocks=preferred_stocks)
        db.session.add(new_user)
        db.session.commit()
        print(f"User {username} registered successfully.")
        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = hash_password(request.form['password'])
        user = User.query.filter_by(username=username, password=password).first()
        if user:
            session['username'] = username
            print(f"User {username} logged in successfully.")
            return redirect(url_for('index'))
        print(f"Login failed: Invalid credentials for {username}.")
        return 'Invalid credentials'
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('username', None)
    print("User logged out.")
    return redirect(url_for('login'))

@app.route('/stock-data/<symbol>')
def stock_data(symbol):
    df = fetch_live_data(symbol)
    if isinstance(df, dict) and 'error' in df:
        return jsonify(df)
    
    data = df.apply(lambda x: {
        'Datetime': x['Datetime'].isoformat(),
        'Open': float(x['Open']),
        'High': float(x['High']),
        'Low': float(x['Low']),
        'Close': float(x['Close']),
        'Volume': float(x['Volume'])
    }, axis=1).tolist()
    
    return jsonify(data)

@app.route('/predict/<symbol>')
def predict(symbol):
    if symbol not in models or symbol not in scalers:
        print(f"Model or scaler for {symbol} not loaded.")
        return jsonify({"error": f"Model or scaler for {symbol} not loaded."})

    try:
        print(f"Fetching live data for {symbol}.")
        df = fetch_live_data(symbol)
        if isinstance(df, dict) and 'error' in df:
            print(f"Error fetching live data for {symbol}: {df['error']}")
            return jsonify(df)

        # Get latest data
        latest_data = df.iloc[-1]
        prev_close = latest_data['Close']
        volume = latest_data['Volume']
        
        # Calculate percent change
        if len(df) > 1:
            prev_data = df.iloc[-2]
            percent_change = ((latest_data['Close'] - prev_data['Close']) / prev_data['Close']) * 100
        else:
            percent_change = 0

        # Prepare input features
        input_features = [[prev_close, volume, percent_change]]
        
        # Scale features using the saved scaler
        input_features_scaled = scalers[symbol].transform(input_features)
        
        # Get prediction probabilities from XGBoost model
        probabilities = models[symbol].predict_proba(input_features_scaled)[0]
        
        # Calculate confidence based on probability difference
        buy_prob = probabilities[1]
        sell_prob = probabilities[0]
        
        # Enhanced confidence calculation
        if buy_prob > sell_prob:
            confidence = round(buy_prob * 100, 2)
            signal = 'buy'
        else:
            confidence = round(sell_prob * 100, 2)
            signal = 'sell'
            
        # Calculate trend
        if len(df) > 1:
            trend = df['Close'].pct_change().mean() * 100
        else:
            trend = 0
            
        # Generate future predictions
        future_predictions = []
        future_date = datetime.now(timezone.utc)
        current_close = latest_data['Close']
        
        for _ in range(5):
            future_date += timedelta(days=1)
            predicted_change = (trend / 100) * current_close
            current_close += predicted_change
            
            future_predictions.append({
                'date': future_date.isoformat(),
                'predicted_close': round(current_close, 2)
            })

        return jsonify({
            'signal': signal,
            'confidence': confidence,
            'future_predictions': future_predictions
        })

    except Exception as e:
        print(f"Error during prediction for {symbol}: {e}")
        return jsonify({"error": str(e)})

@app.route('/api/stocks')
def api_stocks():
    stock_data = {}
    for symbol in symbols:
        print(f"Fetching data for {symbol}.")
        df = fetch_live_data(symbol)
        if isinstance(df, dict) and 'error' in df:
            print(f"Error fetching data for {symbol}: {df['error']}")
            stock_data[symbol] = {'error': df['error']}
        else:
            try:
                latest_data = df.iloc[-1]
                prev_close = latest_data['Close']
                volume = latest_data['Volume']
                percent_change = 0  # No change for the latest point

                # Prepare input features for prediction
                input_features = [[prev_close, volume, percent_change]]
                probabilities = models[symbol].predict_proba(input_features)[0]  # Get probabilities
                buy = bool(models[symbol].predict(input_features)[0])
                confidence = round(probabilities[1] * 100, 2)  # Confidence for the "buy" prediction

                # Generate future predictions
                future_predictions = []
                future_date = pd.Timestamp(latest_data['Datetime'])
                for _ in range(5):
                    future_date += timedelta(days=5)
                    future_close = prev_close + (prev_close * 0.01)  # Simulated future increase
                    future_predictions.append({
                        'date': future_date.strftime('%Y-%m-%d'),
                        'predicted_close': round(future_close, 2)
                    })
                    prev_close = future_close

                stock_data[symbol] = {
                    'buy': buy,
                    'confidence': confidence,
                    'future_predictions': future_predictions
                }
            except Exception as e:
                print(f"Error processing data for {symbol}: {e}")
                stock_data[symbol] = {'error': str(e)}

    print(f"Stock data API response: {stock_data}")
    return jsonify(stock_data)

if __name__ == '__main__':
    app.run(debug=True, port=8000)
