import re

with open('src/pages/BotDashboardLayout.tsx', 'r') as f:
    content = f.read()

old_tabs = """    { name: 'Groups', href: `/bots/${botId}/groups`, icon: Users },
    { name: 'Referrals', href: `/bots/${botId}/referrals`, icon: Users },
    { name: 'Withdrawals', href: `/bots/${botId}/withdrawals`, icon: CreditCard },
  ];"""

new_tabs = """    { name: 'Groups', href: `/bots/${botId}/groups`, icon: Users },
    { name: 'Referrals', href: `/bots/${botId}/referrals`, icon: Users },
    { name: 'Withdrawals', href: `/bots/${botId}/withdrawals`, icon: CreditCard },
    { name: 'Settings', href: `/bots/${botId}/settings`, icon: Settings },
  ];"""

content = content.replace(old_tabs, new_tabs)

with open('src/pages/BotDashboardLayout.tsx', 'w') as f:
    f.write(content)

print("Layout patched")
