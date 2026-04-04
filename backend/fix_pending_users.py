"""
Fix existing users stuck in 'pending' status.
Run once: python fix_pending_users.py
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv('MONGO_URI', 'mongodb://localhost:27017/annadaan'))
db = client.annadaan

result = db.users.update_many(
    {'status': 'pending'},
    {'$set': {'status': 'verified'}}
)

print(f"✅ Updated {result.modified_count} users from 'pending' → 'verified'")

# Show all users after fix
users = list(db.users.find({}, {'name': 1, 'email': 1, 'role': 1, 'status': 1}))
print(f"\n📋 All users ({len(users)} total):")
for u in users:
    print(f"  [{u['role']:8}] {u['name']:25} | {u['email']:35} | status: {u.get('status', 'N/A')}")

# Show all donations
donations = list(db.donations.find({}, {'food_name': 1, 'donor_name': 1, 'status': 1, 'submitted_at': 1}))
print(f"\n🍱 All donations ({len(donations)} total):")
for d in donations:
    print(f"  [{d.get('status', '?'):12}] {d.get('food_name', 'N/A'):25} by {d.get('donor_name', 'N/A')} @ {d.get('submitted_at', '')}")

client.close()
