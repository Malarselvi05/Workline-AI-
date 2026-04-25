import requests
r = requests.post('http://localhost:8000/auth/login', json={'email': 'malarrajamani24@gmail.com', 'password': '1234'})
token = r.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}
r = requests.get('http://localhost:8000/workflows/3/runs', headers=headers)
runs = r.json()
for run in runs:
    res = run.get('logs', {}).get('results', {})
    cls = res.get('s_classify', {})
    po_amount = res.get('s_po_extract', {}).get('total_amount')
    filename = res.get('s_ocr', {}).get('filename')
    print(f"Run {run.get('id')}: s_classify type={cls.get('type')}, po_amount={po_amount}, filename={filename}")
