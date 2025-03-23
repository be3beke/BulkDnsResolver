import os
import logging
from flask import Flask, render_template, request, jsonify, send_file
import dns_lookup
import io
import csv

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/lookup', methods=['POST'])
def lookup():
    try:
        domains = request.form.get('domains', '').split('\n')
        domains = [domain.strip() for domain in domains if domain.strip()]

        if not domains:
            return jsonify({'error': 'No domains provided'}), 400

        results = dns_lookup.bulk_lookup(domains)
        return jsonify({'results': results})
    except Exception as e:
        logger.error(f"Error during lookup: {str(e)}")
        return jsonify({'error': 'An error occurred during DNS lookup'}), 500

@app.route('/export', methods=['POST'])
def export():
    try:
        data = request.json
        if not data or 'results' not in data:
            return jsonify({'error': 'No data to export'}), 400

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Domain', 'TXT Records', 'Status'])

        for result in data['results']:
            writer.writerow([
                result['domain'],
                '; '.join(result.get('txt_records', [])) if result.get('success') else '',
                'Success' if result.get('success') else result.get('error', 'Failed')
            ])

        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name='dns_lookup_results.csv'
        )
    except Exception as e:
        logger.error(f"Error during export: {str(e)}")
        return jsonify({'error': 'An error occurred during export'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)