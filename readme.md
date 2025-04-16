
3. Ensure you have the following model files in the correct location:
   - `lstmlogreg_<symbol>_classifier.pkl`
   - `scaler_<symbol>.pkl`
   
   Where `<symbol>` represents each stock symbol (TCS.NS, ZENTEC.NS, etc.)

## Configuration

1. Update the `app.secret_key` in `app.py` with a secure secret key
2. Modify the `symbols` list to include your desired stock symbols
3. Adjust the model file paths if necessary

## Database Models

### User
- Stores user credentials and preferences
- Fields: id, username, password (hashed), preferred_stocks

### Prediction
- Stores prediction history
- Fields: id, symbol, buy signal, future_predictions, timestamp

### StockData
- Caches stock data
- Fields: id, symbol, data, timestamp

## API Endpoints

### Authentication
- `/register` - User registration
- `/login` - User login
- `/logout` - User logout

### Stock Data
- `/stock-data/<symbol>` - Get real-time stock data
- `/predict/<symbol>` - Get prediction for specific stock
- `/api/stocks` - Get data for all configured stocks

## Features in Detail

### Rate Limiting
- Implements threading-based rate limiting for API calls
- Minimum interval between requests: 1 second

### Data Fetching
- Primary: Yahoo Finance API
- Fallback: yfinance library
- Retry mechanism with exponential backoff

### Prediction System
- Uses trained machine learning models
- Features: previous close, volume, percent change
- Provides buy/sell signals with confidence levels
- Generates 5-day future predictions

### Error Handling
- Comprehensive error handling for API calls
- Fallback mechanisms for data fetching
- Detailed logging

## Running the Application

```bash
python app.py
```
The application will start on `http://localhost:8000`

## Security Features

- Password hashing using SHA-256
- Session-based authentication
- Rate limiting for API calls
- Error logging

## Monitoring

The application includes print statements for monitoring:
- User actions (login, logout, registration)
- API calls
- Data fetching status
- Prediction processes
- Error occurrences

## Future Improvements

1. Add more sophisticated prediction models
2. Implement real-time websocket updates
3. Add more technical indicators
4. Enhance error handling and logging
5. Add user notification system
6. Implement caching for frequently accessed data


# Stock Prediction Web Application

A Flask-based web application that provides real-time stock predictions and analysis for NSE (National Stock Exchange) listed stocks using machine learning models.

## Features

- Real-time stock data fetching from Yahoo Finance
- Machine learning-based stock prediction
- User authentication system
- Personalized stock watchlist
- Interactive dashboard
- Future price predictions
- Confidence-based trading signals

## Technical Stack

- **Backend**: Python Flask
- **Database**: SQLite with SQLAlchemy ORM
- **Machine Learning**: Scikit-learn (LSTM-LogReg hybrid models)
- **Data Processing**: Pandas, NumPy
- **Stock Data**: yfinance API
- **Frontend**: HTML, JavaScript 

## Prerequisites

- Python 3.7+
- pip (Python package manager)


