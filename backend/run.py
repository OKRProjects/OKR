from app import create_app
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend directory so it works regardless of cwd
load_dotenv(Path(__file__).resolve().parent / '.env')

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
