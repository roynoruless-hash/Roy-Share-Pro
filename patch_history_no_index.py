import re

with open('src/server/bot/menus/main.ts', 'r') as f:
    content = f.read()

old_query = """     const txSnap = await db.collection('transactions')
       .where('botId', '==', ctx.botId)
       .where('telegramId', '==', telegramId)
       .orderBy('createdAt', 'desc')
       .limit(15)
       .get();
       
     if (txSnap.empty) {"""

new_query = """     // Fetching all for this user/bot and sorting in memory to avoid needing a custom composite index
     const txSnap = await db.collection('transactions')
       .where('botId', '==', ctx.botId)
       .where('telegramId', '==', telegramId)
       .get();
       
     if (txSnap.empty) {"""

content = content.replace(old_query, new_query)

old_docs = """     txSnap.docs.forEach((doc, index) => {"""
new_docs = """     const sortedDocs = txSnap.docs.sort((a, b) => {
        const dateA = a.data().createdAt ? (a.data().createdAt._seconds || a.data().createdAt.seconds || 0) : 0;
        const dateB = b.data().createdAt ? (b.data().createdAt._seconds || b.data().createdAt.seconds || 0) : 0;
        return dateB - dateA;
     }).slice(0, 15);
     
     sortedDocs.forEach((doc, index) => {"""

content = content.replace(old_docs, new_docs)

with open('src/server/bot/menus/main.ts', 'w') as f:
    f.write(content)

print("History menu patched for no index")
