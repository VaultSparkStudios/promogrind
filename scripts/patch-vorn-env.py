import re, sys

env_path = '/opt/studio/projects/supabase-vorn/.env'

replacements = {
    'POSTGRES_PASSWORD': 'd3394aaabbdf3b1ee15144a4be1b4c788aa597d100676e4b86b2185136fd1e44',
    'JWT_SECRET': '3323c33931b4eea4a25488e53d8344b4324f30f52f916afebb0e084f038c7159',
    'ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc1MTYyNTY0LCJleHAiOjQ5Mjg3NjI1NjR9.aWES9a5h6U4yzG_rCwPftPZ4QPYiMG6mTqUZwH3hELM',
    'SERVICE_ROLE_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzUxNjI1NjQsImV4cCI6NDkyODc2MjU2NH0.GNWwVkf26ZZ98Rj_r12ZTR_1AY2JAYYvc6N2KJ02WoA',
    'SITE_URL': 'https://joinvorn.com',
    'API_EXTERNAL_URL': 'https://vorn.db.vaultsparkstudios.com',
    'KONG_HTTP_PORT': '8000',
    'KONG_HTTPS_PORT': '8001',
}

with open(env_path, 'r') as f:
    content = f.read()

for key, val in replacements.items():
    content = re.sub(rf'^{key}=.*', f'{key}={val}', content, flags=re.MULTILINE)

with open(env_path, 'w') as f:
    f.write(content)

print('Done. Verify:')
for key in replacements:
    for line in content.splitlines():
        if line.startswith(key + '='):
            print(' ', line[:80])
