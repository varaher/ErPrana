#!/usr/bin/env python3
"""
ML Training Pipeline - Data Collection and Preparation
Collects interaction logs for ML model training
"""

import os
import sys
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
import pandas as pd
import json
from typing import List, Dict, Any

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ==========================================================
# MongoDB Connection
# ==========================================================
def get_mongo_client():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    return MongoClient(mongo_url)

client = get_mongo_client()
db = client["erprana"]
interactions_log = db["interactions_log"]
sessions = db["symptom_sessions"]

# ==========================================================
# Data Collection Functions
# ==========================================================
class MLDataCollector:
    """Collect and prepare data for ML training"""
    
    def __init__(self):
        self.client = get_mongo_client()
        self.db = self.client["erprana"]
        self.interactions_log = self.db["interactions_log"]
        self.sessions = self.db["symptom_sessions"]
    
    def get_completed_sessions(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get all completed sessions from the last N days"""
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        completed_sessions = list(self.sessions.find({
            "completed": True,
            "created_at": {"$gte": cutoff}
        }))
        
        print(f"📊 Found {len(completed_sessions)} completed sessions in last {days} days")
        return completed_sessions
    
    def get_session_interactions(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all interaction logs for a session"""
        interactions = list(self.interactions_log.find({
            "session_id": session_id
        }).sort("timestamp", 1))
        
        return interactions
    
    def prepare_training_data(self, days: int = 30) -> pd.DataFrame:
        """
        Prepare training dataset from completed sessions
        
        Returns DataFrame with:
        - session_id
        - chief_complaint
        - collected_slots (JSON)
        - triage_level
        - interaction_count
        - completion_time (seconds)
        - user_responses (list)
        """
        sessions_list = self.get_completed_sessions(days)
        
        training_data = []
        
        for session in sessions_list:
            session_id = session["session_id"]
            interactions = self.get_session_interactions(session_id)
            
            # Calculate metrics
            if interactions:
                start_time = datetime.fromisoformat(interactions[0]["timestamp"])
                end_time = datetime.fromisoformat(interactions[-1]["timestamp"])
                completion_time = (end_time - start_time).total_seconds()
            else:
                completion_time = 0
            
            # Extract user responses
            user_responses = [
                i["data"]["value"] for i in interactions 
                if i["event_type"] == "slot_filled"
            ]
            
            training_data.append({
                "session_id": session_id,
                "chief_complaint": session.get("chief_complaint"),
                "collected_slots": json.dumps(session.get("collected_slots", {})),
                "triage_level": session.get("triage_level"),
                "interaction_count": len(interactions),
                "completion_time_seconds": completion_time,
                "user_responses": json.dumps(user_responses),
                "created_at": session.get("created_at")
            })
        
        df = pd.DataFrame(training_data)
        print(f"✅ Prepared training dataset: {len(df)} samples")
        return df
    
    def export_training_data(self, output_dir: str = "/app/backend/ml_pipeline/data", days: int = 30):
        """Export training data to CSV and JSON formats"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Get training data
        df = self.prepare_training_data(days)
        
        if len(df) == 0:
            print("⚠️  No training data available")
            return None
        
        # Export to CSV
        csv_path = os.path.join(output_dir, f"training_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
        df.to_csv(csv_path, index=False)
        print(f"💾 Exported CSV: {csv_path}")
        
        # Export to JSON
        json_path = os.path.join(output_dir, f"training_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        df.to_json(json_path, orient="records", lines=True)
        print(f"💾 Exported JSON: {json_path}")
        
        # Generate statistics
        self.generate_statistics(df, output_dir)
        
        return {
            "csv_path": csv_path,
            "json_path": json_path,
            "samples": len(df)
        }
    
    def generate_statistics(self, df: pd.DataFrame, output_dir: str):
        """Generate statistics about the training data"""
        stats = {
            "total_samples": len(df),
            "date_generated": datetime.now().isoformat(),
            "chief_complaints": df["chief_complaint"].value_counts().to_dict(),
            "triage_levels": df["triage_level"].value_counts().to_dict(),
            "avg_completion_time": df["completion_time_seconds"].mean(),
            "avg_interactions": df["interaction_count"].mean(),
            "date_range": {
                "earliest": df["created_at"].min() if len(df) > 0 else None,
                "latest": df["created_at"].max() if len(df) > 0 else None
            }
        }
        
        stats_path = os.path.join(output_dir, "training_data_stats.json")
        with open(stats_path, 'w') as f:
            json.dump(stats, f, indent=2)
        
        print(f"📈 Statistics saved: {stats_path}")
        print(f"\n📊 Dataset Statistics:")
        print(f"   Total Samples: {stats['total_samples']}")
        print(f"   Chief Complaints: {len(stats['chief_complaints'])}")
        print(f"   Avg Completion Time: {stats['avg_completion_time']:.2f}s")
        print(f"   Avg Interactions: {stats['avg_interactions']:.1f}")
        
        return stats
    
    def get_triage_accuracy_data(self) -> Dict[str, Any]:
        """
        Analyze triage accuracy by comparing with user feedback
        (for future ML model validation)
        """
        sessions_list = self.get_completed_sessions(days=90)
        
        accuracy_data = {
            "total_sessions": len(sessions_list),
            "triage_distribution": {},
            "by_complaint": {}
        }
        
        for session in sessions_list:
            triage = session.get("triage_level", "Unknown")
            complaint = session.get("chief_complaint", "Unknown")
            
            # Count triage distribution
            if triage not in accuracy_data["triage_distribution"]:
                accuracy_data["triage_distribution"][triage] = 0
            accuracy_data["triage_distribution"][triage] += 1
            
            # Count by complaint
            if complaint not in accuracy_data["by_complaint"]:
                accuracy_data["by_complaint"][complaint] = {
                    "total": 0,
                    "triage_levels": {}
                }
            accuracy_data["by_complaint"][complaint]["total"] += 1
            
            if triage not in accuracy_data["by_complaint"][complaint]["triage_levels"]:
                accuracy_data["by_complaint"][complaint]["triage_levels"][triage] = 0
            accuracy_data["by_complaint"][complaint]["triage_levels"][triage] += 1
        
        return accuracy_data

# ==========================================================
# CLI Interface
# ==========================================================
def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="ML Data Collection Pipeline")
    parser.add_argument("--days", type=int, default=30, help="Number of days to collect data from")
    parser.add_argument("--export", action="store_true", help="Export training data")
    parser.add_argument("--stats", action="store_true", help="Show statistics only")
    parser.add_argument("--accuracy", action="store_true", help="Show triage accuracy analysis")
    
    args = parser.parse_args()
    
    collector = MLDataCollector()
    
    if args.export:
        result = collector.export_training_data(days=args.days)
        if result:
            print(f"\n✅ Training data exported successfully")
            print(f"   Samples: {result['samples']}")
            print(f"   CSV: {result['csv_path']}")
            print(f"   JSON: {result['json_path']}")
    
    elif args.stats:
        df = collector.prepare_training_data(days=args.days)
        collector.generate_statistics(df, "/app/backend/ml_pipeline/data")
    
    elif args.accuracy:
        accuracy_data = collector.get_triage_accuracy_data()
        print("\n📊 Triage Accuracy Analysis:")
        print(json.dumps(accuracy_data, indent=2))
    
    else:
        print("Usage: python ml_data_collector.py --export --days 30")
        print("       python ml_data_collector.py --stats --days 7")
        print("       python ml_data_collector.py --accuracy")

if __name__ == "__main__":
    main()
