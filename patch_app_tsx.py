import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

import_statement = "import WithdrawalsList from './pages/WithdrawalsList';"
new_import = "import WithdrawalsList from './pages/WithdrawalsList';\nimport BotSettings from './pages/BotSettings';"

route_statement = '<Route path="withdrawals" element={<WithdrawalsList />} />'
new_route = '<Route path="withdrawals" element={<WithdrawalsList />} />\n                <Route path="settings" element={<BotSettings />} />'

content = content.replace(import_statement, new_import)
content = content.replace(route_statement, new_route)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("App.tsx patched")
