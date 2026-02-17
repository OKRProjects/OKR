"""
Seed script to load mock data into MongoDB.
Run this script to populate the database with sample objectives and key results.
"""
import os
from datetime import datetime
from dotenv import load_dotenv
from bson import ObjectId

# Load environment variables
load_dotenv()

from app.db.mongodb import init_db, get_db

def seed_data():
    """Load mock data into MongoDB"""
    print("Initializing database connection...")
    init_db()
    db = get_db()
    
    # Clear existing data (optional - comment out if you want to keep existing data)
    print("Clearing existing objectives and key results...")
    db.objectives.delete_many({})
    db.key_results.delete_many({})
    
    # Get a default user ID (you may need to adjust this based on your auth setup)
    # For seeding, we'll use a placeholder user ID
    default_user_id = "auth0|seed_user_12345"
    
    print("Creating objectives and key results...")
    
    # Create Strategic Objective: Digital Transformation & Innovation
    strategic_obj = {
        'title': 'Digital Transformation & Innovation',
        'description': 'Drive company-wide digital transformation through modern technology adoption',
        'ownerId': default_user_id,
        'level': 'strategic',
        'timeline': 'annual',
        'fiscalYear': 2026,
        'parentObjectiveId': None,
        'division': None,
        'quarter': None,
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow(),
    }
    strategic_id = db.objectives.insert_one(strategic_obj).inserted_id
    print(f"Created strategic objective: {strategic_obj['title']}")
    
    # Key Results for Strategic Objective
    strategic_krs = [
        {
            'objectiveId': strategic_id,
            'title': 'Migrate 100% of legacy systems to cloud',
            'target': '100',
            'currentValue': '75',
            'unit': '%',
            'score': 75.0,
            'notes': [{'text': 'On track, 3 systems remaining', 'createdAt': datetime.utcnow().isoformat()}],
            'createdAt': datetime.utcnow(),
            'lastUpdatedAt': datetime.utcnow(),
        },
        {
            'objectiveId': strategic_id,
            'title': 'Implement AI-driven analytics across 5 departments',
            'target': '5',
            'currentValue': '3',
            'unit': 'depts',
            'score': 60.0,
            'notes': [{'text': 'Sales, Marketing, and Finance complete', 'createdAt': datetime.utcnow().isoformat()}],
            'createdAt': datetime.utcnow(),
            'lastUpdatedAt': datetime.utcnow(),
        },
        {
            'objectiveId': strategic_id,
            'title': 'Achieve 95% user satisfaction score',
            'target': '95',
            'currentValue': '62',
            'unit': '%',
            'score': 65.0,
            'notes': [{'text': 'Quarterly surveys showing improvement', 'createdAt': datetime.utcnow().isoformat()}],
            'createdAt': datetime.utcnow(),
            'lastUpdatedAt': datetime.utcnow(),
        },
    ]
    db.key_results.insert_many(strategic_krs)
    print(f"Created {len(strategic_krs)} key results for strategic objective")
    
    # Create Functional Objective: Infrastructure Modernization
    functional_obj1 = {
        'title': 'Infrastructure Modernization',
        'description': 'Update and modernize IT infrastructure to support digital initiatives',
        'ownerId': default_user_id,
        'level': 'functional',
        'timeline': 'annual',
        'fiscalYear': 2026,
        'parentObjectiveId': strategic_id,
        'division': 'Infrastructure',
        'quarter': None,
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow(),
    }
    functional_id1 = db.objectives.insert_one(functional_obj1).inserted_id
    print(f"Created functional objective: {functional_obj1['title']}")
    
    # Key Results for Infrastructure Modernization
    functional_krs1 = [
        {
            'objectiveId': functional_id1,
            'title': 'Complete cloud migration for 20 applications',
            'target': '20',
            'currentValue': '15',
            'unit': 'apps',
            'score': 75.0,
            'notes': [{'text': '5 apps in final testing phase', 'createdAt': datetime.utcnow().isoformat()}],
            'createdAt': datetime.utcnow(),
            'lastUpdatedAt': datetime.utcnow(),
        },
        {
            'objectiveId': functional_id1,
            'title': 'Reduce infrastructure costs by 30%',
            'target': '30',
            'currentValue': '22',
            'unit': '%',
            'score': 73.0,
            'notes': [{'text': 'Savings tracking ahead of schedule', 'createdAt': datetime.utcnow().isoformat()}],
            'createdAt': datetime.utcnow(),
            'lastUpdatedAt': datetime.utcnow(),
        },
    ]
    db.key_results.insert_many(functional_krs1)
    print(f"Created {len(functional_krs1)} key results for Infrastructure Modernization")
    
    # Create Tactical Objective: Q1 Cloud Migration Sprint
    tactical_obj1 = {
        'title': 'Q1 Cloud Migration Sprint',
        'description': 'Focus on migrating critical business applications',
        'ownerId': default_user_id,
        'level': 'tactical',
        'timeline': 'quarterly',
        'fiscalYear': 2026,
        'parentObjectiveId': functional_id1,
        'division': 'Infrastructure',
        'quarter': 'Q1',
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow(),
    }
    tactical_id1 = db.objectives.insert_one(tactical_obj1).inserted_id
    print(f"Created tactical objective: {tactical_obj1['title']}")
    
    # Key Results for Q1 Cloud Migration Sprint
    tactical_krs1 = [
        {
            'objectiveId': tactical_id1,
            'title': 'Migrate CRM system to AWS',
            'target': '1',
            'currentValue': '1',
            'unit': 'system',
            'score': 100.0,
            'notes': [{'text': 'Completed ahead of schedule', 'createdAt': datetime.utcnow().isoformat()}],
            'createdAt': datetime.utcnow(),
            'lastUpdatedAt': datetime.utcnow(),
        },
        {
            'objectiveId': tactical_id1,
            'title': 'Complete security audit for 5 migrated apps',
            'target': '5',
            'currentValue': '4',
            'unit': 'apps',
            'score': 80.0,
            'notes': [{'text': 'Final app in review', 'createdAt': datetime.utcnow().isoformat()}],
            'createdAt': datetime.utcnow(),
            'lastUpdatedAt': datetime.utcnow(),
        },
    ]
    db.key_results.insert_many(tactical_krs1)
    print(f"Created {len(tactical_krs1)} key results for Q1 Cloud Migration Sprint")
    
    # Create Functional Objective: Data & Analytics Platform
    functional_obj2 = {
        'title': 'Data & Analytics Platform',
        'description': 'Build enterprise-wide analytics capabilities',
        'ownerId': default_user_id,
        'level': 'functional',
        'timeline': 'annual',
        'fiscalYear': 2026,
        'parentObjectiveId': strategic_id,
        'division': 'Data & Analytics',
        'quarter': None,
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow(),
    }
    functional_id2 = db.objectives.insert_one(functional_obj2).inserted_id
    print(f"Created functional objective: {functional_obj2['title']}")
    
    # Key Results for Data & Analytics Platform
    functional_krs2 = [
        {
            'objectiveId': functional_id2,
            'title': 'Deploy unified data warehouse',
            'target': '1',
            'currentValue': '0.6',
            'unit': 'platform',
            'score': 60.0,
            'notes': [{'text': 'Infrastructure ready, ETL in progress', 'createdAt': datetime.utcnow().isoformat()}],
            'createdAt': datetime.utcnow(),
            'lastUpdatedAt': datetime.utcnow(),
        },
        {
            'objectiveId': functional_id2,
            'title': 'Train 100 users on analytics tools',
            'target': '100',
            'currentValue': '54',
            'unit': 'users',
            'score': 54.0,
            'notes': [{'text': '3 training sessions completed', 'createdAt': datetime.utcnow().isoformat()}],
            'createdAt': datetime.utcnow(),
            'lastUpdatedAt': datetime.utcnow(),
        },
    ]
    db.key_results.insert_many(functional_krs2)
    print(f"Created {len(functional_krs2)} key results for Data & Analytics Platform")
    
    # Create Tactical Objective: Q1 Analytics Foundation
    tactical_obj2 = {
        'title': 'Q1 Analytics Foundation',
        'description': 'Establish core analytics infrastructure',
        'ownerId': default_user_id,
        'level': 'tactical',
        'timeline': 'quarterly',
        'fiscalYear': 2026,
        'parentObjectiveId': functional_id2,
        'division': 'Data & Analytics',
        'quarter': 'Q1',
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow(),
    }
    tactical_id2 = db.objectives.insert_one(tactical_obj2).inserted_id
    print(f"Created tactical objective: {tactical_obj2['title']}")
    
    # Key Results for Q1 Analytics Foundation
    tactical_krs2 = [
        {
            'objectiveId': tactical_id2,
            'title': 'Set up data warehouse architecture',
            'target': '1',
            'currentValue': '0.8',
            'unit': 'system',
            'score': 80.0,
            'notes': [{'text': 'Core tables configured', 'createdAt': datetime.utcnow().isoformat()}],
            'createdAt': datetime.utcnow(),
            'lastUpdatedAt': datetime.utcnow(),
        },
        {
            'objectiveId': tactical_id2,
            'title': 'Onboard 3 departments to platform',
            'target': '3',
            'currentValue': '2',
            'unit': 'depts',
            'score': 67.0,
            'notes': [{'text': 'Sales and Marketing live', 'createdAt': datetime.utcnow().isoformat()}],
            'createdAt': datetime.utcnow(),
            'lastUpdatedAt': datetime.utcnow(),
        },
    ]
    db.key_results.insert_many(tactical_krs2)
    print(f"Created {len(tactical_krs2)} key results for Q1 Analytics Foundation")
    
    print("\nSeed data loaded successfully!")
    print(f"Total objectives created: {db.objectives.count_documents({})}")
    print(f"Total key results created: {db.key_results.count_documents({})}")

if __name__ == '__main__':
    try:
        seed_data()
    except Exception as e:
        print(f"\nError seeding data: {e}")
        import traceback
        traceback.print_exc()
