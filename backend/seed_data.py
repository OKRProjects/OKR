"""
Seed script for OKR platform: MongoDB collections + realistic mock data.
Build plan: 3-4 Strategic, 3-4 Divisional per Strategic, 2-3 Tactical per Divisional;
2-4 KRs per objective; users in all 4 roles; 8 weeks score history; mix of workflow states.
"""
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

from app.db.mongodb import init_db, get_db


def seed_data():
    print("Initializing database connection...")
    init_db()
    db = get_db()

    # Clear all OKR-related collections
    print("Clearing existing OKR data...")
    db.departments.delete_many({})
    db.users.delete_many({})
    db.objectives.delete_many({})
    db.key_results.delete_many({})
    db.score_history.delete_many({})
    db.workflow_events.delete_many({})
    db.comments.delete_many({})
    db.attachments.delete_many({})

    # --- Departments (divisions)
    dept_names = ["AI", "Data", "Ops", "Security"]
    dept_ids = {}
    for name in dept_names:
        r = db.departments.insert_one({"name": name})
        dept_ids[name] = r.inserted_id
    print(f"Created {len(dept_ids)} departments: {list(dept_ids.keys())}")

    # --- Users (all 4 roles; use string _id for Auth0 compatibility)
    now = datetime.now(timezone.utc)
    users = [
        {"_id": "auth0|admin_1", "name": "Alex Admin", "email": "alex.admin@company.com", "role": "admin", "departmentId": None},
        {"_id": "auth0|leader_ai", "name": "Jordan Lead AI", "email": "jordan.ai@company.com", "role": "leader", "departmentId": dept_ids["AI"]},
        {"_id": "auth0|leader_data", "name": "Sam Lead Data", "email": "sam.data@company.com", "role": "leader", "departmentId": dept_ids["Data"]},
        {"_id": "auth0|leader_ops", "name": "Casey Lead Ops", "email": "casey.ops@company.com", "role": "leader", "departmentId": dept_ids["Ops"]},
        {"_id": "auth0|leader_sec", "name": "Riley Lead Security", "email": "riley.sec@company.com", "role": "leader", "departmentId": dept_ids["Security"]},
        {"_id": "auth0|standard_1", "name": "Morgan Manager", "email": "morgan@company.com", "role": "standard", "departmentId": dept_ids["Data"]},
        {"_id": "auth0|standard_2", "name": "Taylor Manager", "email": "taylor@company.com", "role": "standard", "departmentId": dept_ids["AI"]},
        {"_id": "auth0|viewer_1", "name": "Pat Viewer", "email": "pat.viewer@company.com", "role": "view_only", "departmentId": dept_ids["Ops"]},
    ]
    db.users.insert_many(users)
    print(f"Created {len(users)} users (admin, leaders, standard, view_only)")

    default_owner = "auth0|admin_1"
    fiscal_year = 2025

    # --- Strategic objectives (3-4, no parent)
    strategic = [
        {"title": "Digital Transformation & Innovation", "description": "Drive company-wide digital transformation", "division": "IT Leadership", "status": "approved"},
        {"title": "Enterprise Data & AI Excellence", "description": "Unify data and scale AI across the organisation", "division": "IT Leadership", "status": "in_review"},
        {"title": "Operational Resilience & Security", "description": "Ensure secure, resilient infrastructure", "division": "IT Leadership", "status": "approved"},
        {"title": "User Experience & Productivity", "description": "Improve tools and satisfaction", "division": "IT Leadership", "status": "draft"},
    ]
    strategic_ids = []
    for i, s in enumerate(strategic):
        doc = {
            "title": s["title"],
            "description": s.get("description", ""),
            "ownerId": default_owner,
            "level": "strategic",
            "timeline": "annual",
            "fiscalYear": fiscal_year,
            "parentObjectiveId": None,
            "division": s["division"],
            "departmentId": None,
            "quarter": None,
            "status": s["status"],
            "createdAt": now,
            "updatedAt": now,
        }
        r = db.objectives.insert_one(doc)
        strategic_ids.append((r.inserted_id, s))
    print(f"Created {len(strategic_ids)} strategic objectives")

    # --- Divisional (functional) objectives: 3-4 per Strategic
    divisional_by_strategic = [
        [  # under first strategic
            {"title": "Scale AI Infrastructure", "division": "AI", "status": "approved"},
            {"title": "AI Governance & Ethics", "division": "AI", "status": "approved"},
            {"title": "Data Maturity & Platform", "division": "Data", "status": "in_review"},
            {"title": "Cloud & Infrastructure Modernization", "division": "Ops", "status": "approved"},
        ],
        [
            {"title": "Unified Data Platform", "division": "Data", "status": "in_review"},
            {"title": "ML Operations & Lifecycle", "division": "AI", "status": "draft"},
            {"title": "Analytics Self-Service", "division": "Data", "status": "approved"},
        ],
        [
            {"title": "Zero Trust Security", "division": "Security", "status": "approved"},
            {"title": "Incident Response & DR", "division": "Ops", "status": "approved"},
            {"title": "Compliance & Audit Readiness", "division": "Security", "status": "draft"},
        ],
        [
            {"title": "Employee Experience Tools", "division": "Ops", "status": "draft"},
        ],
    ]
    divisional_ids = []  # list of (object_id, division_name for dept lookup)
    for strat_idx, (strat_oid, _) in enumerate(strategic_ids):
        div_list = divisional_by_strategic[strat_idx] if strat_idx < len(divisional_by_strategic) else []
        for d in div_list:
            dept_id = dept_ids.get(d["division"])
            doc = {
                "title": d["title"],
                "description": "",
                "ownerId": f"auth0|leader_{d['division'].lower().replace(' ', '_')}" if d["division"] in ("AI", "Data", "Ops", "Security") else default_owner,
                "level": "functional",
                "timeline": "annual",
                "fiscalYear": fiscal_year,
                "parentObjectiveId": strat_oid,
                "division": d["division"],
                "departmentId": dept_id,
                "quarter": None,
                "status": d["status"],
                "createdAt": now,
                "updatedAt": now,
            }
            r = db.objectives.insert_one(doc)
            divisional_ids.append((r.inserted_id, d["division"]))
    print(f"Created {len(divisional_ids)} divisional objectives")

    # --- Tactical (quarterly): 2-3 per Divisional
    tactical_templates = [
        [{"title": "Q3 AI Model Deployment", "quarter": "Q3", "status": "approved"}, {"title": "Q3 AI Training Pipeline", "quarter": "Q3", "status": "in_review"}],
        [{"title": "Q3 Ethics Review Process", "quarter": "Q3", "status": "draft"}],
        [{"title": "Q3 Data Warehouse Launch", "quarter": "Q3", "status": "in_review"}, {"title": "Q3 Data Quality Sprint", "quarter": "Q3", "status": "approved"}],
        [{"title": "Q3 Cloud Migration Phase 2", "quarter": "Q3", "status": "approved"}],
        [{"title": "Q3 Unified Catalog", "quarter": "Q3", "status": "in_review"}],
        [{"title": "Q3 MLOps Pilot", "quarter": "Q3", "status": "draft"}],
        [{"title": "Q3 Dashboards Rollout", "quarter": "Q3", "status": "approved"}],
        [{"title": "Q3 Zero Trust Pilot", "quarter": "Q3", "status": "approved"}],
        [{"title": "Q3 DR Drill", "quarter": "Q3", "status": "approved"}],
        [{"title": "Q3 Compliance Automation", "quarter": "Q3", "status": "draft"}],
        [{"title": "Q3 Intranet Refresh", "quarter": "Q3", "status": "draft"}],
    ]
    tactical_ids = []
    for i, (div_oid, div_name) in enumerate(divisional_ids):
        templates = tactical_templates[i % len(tactical_templates)]
        for t in templates:
            doc = {
                "title": t["title"],
                "description": "",
                "ownerId": default_owner,
                "level": "tactical",
                "timeline": "quarterly",
                "fiscalYear": fiscal_year,
                "parentObjectiveId": div_oid,
                "division": div_name,
                "departmentId": dept_ids.get(div_name),
                "quarter": t["quarter"],
                "status": t["status"],
                "createdAt": now,
                "updatedAt": now,
            }
            r = db.objectives.insert_one(doc)
            tactical_ids.append(r.inserted_id)
    print(f"Created {len(tactical_ids)} tactical objectives")

    # --- Key Results: 2-4 per objective; score 0.0-1.0
    all_objective_ids = [s[0] for s in strategic_ids] + [d[0] for d in divisional_ids] + tactical_ids
    kr_examples = [
        ("Migrate 100% of legacy systems to cloud", 0.75),
        ("Implement AI-driven analytics across 5 departments", 0.6),
        ("Achieve 95% user satisfaction score", 0.65),
        ("Complete cloud migration for 20 applications", 0.75),
        ("Reduce infrastructure costs by 30%", 0.73),
        ("Migrate CRM system to AWS", 1.0),
        ("Complete security audit for 5 migrated apps", 0.8),
        ("Deploy unified data warehouse", 0.6),
        ("Train 100 users on analytics tools", 0.54),
        ("Set up data warehouse architecture", 0.8),
        ("Onboard 3 departments to platform", 0.67),
        ("Launch 3 new models to production", 0.5),
        ("Document ethics guidelines", 0.3),
        ("Reduce P95 latency by 20%", 0.7),
        ("Run 2 DR exercises", 0.9),
    ]
    key_result_ids = []  # [(kr_id, objective_id), ...]
    for obj_oid in all_objective_ids:
        n_krs = 2 + (hash(str(obj_oid)) % 3)  # 2-4
        for j in range(n_krs):
            title, score = kr_examples[(hash((str(obj_oid), j)) % len(kr_examples))]
            score = round(min(1.0, max(0.0, score + (j * 0.05))), 1)
            doc = {
                "objectiveId": obj_oid,
                "title": f"{title}",
                "target": "1.0",
                "currentValue": str(score),
                "unit": "score",
                "score": score,
                "targetScore": 1.0,
                "ownerId": default_owner,
                "notes": [{"text": "Progress update", "createdAt": now.isoformat() + "Z"}],
                "createdAt": now,
                "lastUpdatedAt": now,
            }
            r = db.key_results.insert_one(doc)
            key_result_ids.append((r.inserted_id, obj_oid))
    print(f"Created {len(key_result_ids)} key results")

    # --- Score history: ~8 weeks of entries per KR (e.g. one per week)
    weeks_back = 8
    for kr_oid, _ in key_result_ids:
        kr_doc = db.key_results.find_one({"_id": kr_oid})
        current_score = kr_doc.get("score", 0.5)
        base_score = max(0.0, min(1.0, current_score - 0.15))
        for w in range(weeks_back):
            t = now - timedelta(weeks=w)
            # Slight progression over time
            s = round(base_score + (current_score - base_score) * (1 - w / max(weeks_back, 1)), 1)
            s = max(0.0, min(1.0, s))
            db.score_history.insert_one({
                "keyResultId": kr_oid,
                "score": s,
                "notes": f"Week -{w}",
                "recordedBy": default_owner,
                "recordedAt": t,
            })
    count_sh = db.score_history.count_documents({})
    print(f"Created {count_sh} score history entries (~8 weeks per KR)")

    # --- Workflow events for objectives that are not draft
    for obj_oid in all_objective_ids:
        obj = db.objectives.find_one({"_id": obj_oid})
        status = obj.get("status", "draft")
        if status == "draft":
            continue
        # Simulate: draft -> in_review -> approved | rejected
        db.workflow_events.insert_one({
            "objectiveId": obj_oid,
            "fromStatus": "draft",
            "toStatus": "in_review",
            "actorId": obj.get("ownerId", default_owner),
            "reason": "Submitted for review",
            "timestamp": now - timedelta(days=14),
        })
        if status in ("approved", "in_review"):
            db.workflow_events.insert_one({
                "objectiveId": obj_oid,
                "fromStatus": "in_review",
                "toStatus": status,
                "actorId": default_owner,
                "reason": "Approved" if status == "approved" else "In review",
                "timestamp": now - timedelta(days=7),
            })
        elif status == "rejected":
            db.workflow_events.insert_one({
                "objectiveId": obj_oid,
                "fromStatus": "in_review",
                "toStatus": "rejected",
                "actorId": default_owner,
                "reason": "Needs revision",
                "timestamp": now - timedelta(days=7),
            })
    count_we = db.workflow_events.count_documents({})
    print(f"Created {count_we} workflow events")

    # --- A few comments on first strategic and first divisional
    first_strat = strategic_ids[0][0]
    first_div = divisional_ids[0][0]
    for obj_oid, body in [(first_strat, "Strategic alignment looks good."), (first_div, "Division on track for Q3.")]:
        db.comments.insert_one({
            "objectiveId": obj_oid,
            "authorId": default_owner,
            "body": body,
            "createdAt": now - timedelta(days=3),
        })
    print("Created sample comments")

    print("\nSeed data loaded successfully.")
    print(f"  departments: {db.departments.count_documents({})}")
    print(f"  users: {db.users.count_documents({})}")
    print(f"  objectives: {db.objectives.count_documents({})}")
    print(f"  key_results: {db.key_results.count_documents({})}")
    print(f"  score_history: {db.score_history.count_documents({})}")
    print(f"  workflow_events: {db.workflow_events.count_documents({})}")
    print(f"  comments: {db.comments.count_documents({})}")


if __name__ == "__main__":
    try:
        seed_data()
    except Exception as e:
        print(f"\nError seeding data: {e}")
        import traceback
        traceback.print_exc()
