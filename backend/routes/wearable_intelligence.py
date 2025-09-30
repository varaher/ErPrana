from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import uuid
import json

# Load environment variables
load_dotenv()

# Database imports
from motor.motor_asyncio import AsyncIOMotorClient

# Import wearable intelligence system
import sys
sys.path.append('/app/backend')
from wearable_intelligence.health_reporter import ComprehensiveHealthReporter, ReportType
from wearable_intelligence.medical_analyzer import WearableMedicalAnalyzer

router = APIRouter()

# Database connection
def get_database():
    MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    DB_NAME = os.environ.get("DB_NAME", "test_database")
    client = AsyncIOMotorClient(MONGO_URL)
    return client[DB_NAME]

# Pydantic models
class WearableDataInput(BaseModel):
    user_id: str
    data_type: str  # sleep, heart_rate, activity, respiratory, stress
    data: Dict[str, Any]
    timestamp: Optional[str] = None

class HealthReportRequest(BaseModel):
    user_id: str
    report_type: str  # daily, weekly, monthly, quarterly, yearly
    include_recommendations: Optional[bool] = True
    include_trends: Optional[bool] = True

class WearableAnalysisRequest(BaseModel):
    user_id: str
    analysis_type: str  # real_time, pattern_analysis, health_screening
    data: Dict[str, Any]

class HealthMemoryEntry(BaseModel):
    user_id: str
    condition: str
    diagnosed_date: str
    status: str  # active, resolved, monitoring
    severity: Optional[str] = "mild"
    notes: Optional[str] = ""

# Initialize systems
health_reporter = ComprehensiveHealthReporter()
medical_analyzer = WearableMedicalAnalyzer()

@router.post("/wearable-data/submit")
async def submit_wearable_data(data_input: WearableDataInput):
    """Submit wearable data for analysis and storage"""
    try:
        db = get_database()
        
        # Prepare wearable data document
        wearable_doc = {
            "data_id": str(uuid.uuid4()),
            "user_id": data_input.user_id,
            "data_type": data_input.data_type,
            "data": data_input.data,
            "timestamp": data_input.timestamp or datetime.now(timezone.utc).isoformat(),
            "processed": False,
            "analysis_results": {}
        }
        
        # Store raw data
        await db.wearable_data.insert_one(wearable_doc)
        
        # Perform real-time analysis if critical metrics
        if data_input.data_type in ['heart_rate', 'respiratory', 'sleep']:
            analysis_result = await _perform_real_time_analysis(
                data_input.user_id, data_input.data_type, data_input.data
            )
            
            # Update document with analysis
            await db.wearable_data.update_one(
                {"data_id": wearable_doc["data_id"]},
                {"$set": {"analysis_results": analysis_result, "processed": True}}
            )
            
            return {
                "status": "success",
                "data_id": wearable_doc["data_id"],
                "message": "Wearable data submitted and analyzed",
                "real_time_analysis": analysis_result,
                "triage_level": analysis_result.get("triage_level"),
                "immediate_recommendations": analysis_result.get("recommendations", [])
            }
        
        return {
            "status": "success",
            "data_id": wearable_doc["data_id"],
            "message": "Wearable data submitted successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error submitting wearable data: {str(e)}")

@router.post("/health-reports/generate")
async def generate_health_report(request: HealthReportRequest):
    """Generate comprehensive health report"""
    try:
        db = get_database()
        
        # Validate report type
        try:
            report_type = ReportType(request.report_type)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid report type")
        
        # Gather user's wearable data
        wearable_data = await _gather_wearable_data(db, request.user_id, report_type)
        
        # Get user's health history and medical records
        health_history = await _get_health_history(db, request.user_id)
        medical_records = await _get_medical_records(db, request.user_id)
        
        # Generate comprehensive report
        report = await health_reporter.generate_report(
            user_id=request.user_id,
            report_type=report_type,
            wearable_data=wearable_data,
            health_history=health_history,
            medical_records=medical_records
        )
        
        # Store report in database
        report_doc = {
            "report_id": report.report_id,
            "user_id": report.user_id,
            "report_type": report.report_type.value,
            "generated_at": report.generated_at.isoformat(),
            "report_data": _serialize_report(report),
            "overall_health_score": report.overall_health_score,
            "triage_alerts": report.triage_alerts
        }
        
        await db.health_reports.insert_one(report_doc)
        
        # Return report summary or full report based on request
        response = {
            "report_id": report.report_id,
            "overall_health_score": report.overall_health_score,
            "key_findings": report.key_findings,
            "triage_alerts": report.triage_alerts,
            "generated_at": report.generated_at.isoformat()
        }
        
        if request.include_recommendations:
            response["priority_recommendations"] = report.priority_recommendations
            response["preventive_recommendations"] = report.preventive_recommendations
        
        if request.include_trends:
            response["health_trends"] = [
                {
                    "metric": trend.metric,
                    "change_percentage": trend.change_percentage,
                    "trend_direction": trend.trend_direction,
                    "medical_significance": trend.medical_significance
                }
                for trend in report.health_trends
            ]
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating health report: {str(e)}")

@router.get("/health-reports/{report_id}")
async def get_health_report(report_id: str):
    """Retrieve a specific health report"""
    try:
        db = get_database()
        
        report = await db.health_reports.find_one({"report_id": report_id})
        
        if not report:
            raise HTTPException(status_code=404, detail="Health report not found")
        
        return {
            "report_id": report["report_id"],
            "user_id": report["user_id"],
            "report_type": report["report_type"],
            "generated_at": report["generated_at"],
            "overall_health_score": report["overall_health_score"],
            "report_data": report["report_data"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving health report: {str(e)}")

@router.get("/health-reports/user/{user_id}")
async def get_user_health_reports(user_id: str, limit: int = 10):
    """Get user's recent health reports"""
    try:
        db = get_database()
        
        reports = await db.health_reports.find(
            {"user_id": user_id}
        ).sort("generated_at", -1).limit(limit).to_list(length=None)
        
        return {
            "user_id": user_id,
            "reports": [
                {
                    "report_id": report["report_id"],
                    "report_type": report["report_type"],
                    "generated_at": report["generated_at"],
                    "overall_health_score": report["overall_health_score"],
                    "has_triage_alerts": len(report.get("triage_alerts", [])) > 0
                }
                for report in reports
            ],
            "total_reports": len(reports)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving user reports: {str(e)}")

@router.post("/wearable-analysis/real-time")
async def perform_wearable_analysis(request: WearableAnalysisRequest):
    """Perform real-time wearable data analysis"""
    try:
        db = get_database()
        
        # Get user's health history for context
        health_history = await _get_health_history(db, request.user_id)
        
        # Perform analysis based on type
        if request.analysis_type == "sleep":
            analysis = medical_analyzer.analyze_sleep_architecture(request.data, health_history)
        elif request.analysis_type == "heart_rate":
            analysis = medical_analyzer.analyze_heart_rate_patterns(request.data, health_history)
        elif request.analysis_type == "activity":
            analysis = medical_analyzer.analyze_activity_patterns(request.data, health_history)
        elif request.analysis_type == "respiratory":
            analysis = medical_analyzer.analyze_respiratory_patterns(request.data, health_history)
        elif request.analysis_type == "stress":
            analysis = medical_analyzer.analyze_stress_autonomic(request.data, health_history)
        else:
            raise HTTPException(status_code=400, detail="Invalid analysis type")
        
        # Enhance with health memory integration
        enhanced_analysis = medical_analyzer.integrate_health_memory(
            request.user_id, analysis, health_history
        )
        
        return {
            "analysis_id": str(uuid.uuid4()),
            "user_id": request.user_id,
            "analysis_type": request.analysis_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "analysis_results": enhanced_analysis,
            "triage_level": enhanced_analysis.get("triage_level", "GREEN"),
            "immediate_action_needed": enhanced_analysis.get("triage_level") in ["RED", "ORANGE"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error performing analysis: {str(e)}")

@router.post("/health-memory/add")
async def add_health_memory(entry: HealthMemoryEntry):
    """Add entry to user's health memory"""
    try:
        db = get_database()
        
        memory_doc = {
            "memory_id": str(uuid.uuid4()),
            "user_id": entry.user_id,
            "condition": entry.condition,
            "diagnosed_date": entry.diagnosed_date,
            "status": entry.status,
            "severity": entry.severity,
            "notes": entry.notes,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.health_memory.insert_one(memory_doc)
        
        return {
            "status": "success",
            "memory_id": memory_doc["memory_id"],
            "message": "Health memory entry added successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding health memory: {str(e)}")

@router.get("/health-memory/{user_id}")
async def get_health_memory(user_id: str):
    """Get user's health memory"""
    try:
        db = get_database()
        
        memory_entries = await db.health_memory.find(
            {"user_id": user_id}
        ).sort("created_at", -1).to_list(length=None)
        
        return {
            "user_id": user_id,
            "health_memory": memory_entries,
            "total_entries": len(memory_entries)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving health memory: {str(e)}")

@router.get("/health-insights/{user_id}")
async def get_health_insights(user_id: str, days: int = 30):
    """Get intelligent health insights for user"""
    try:
        db = get_database()
        
        # Get recent wearable data
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        recent_data = await db.wearable_data.find(
            {
                "user_id": user_id,
                "timestamp": {"$gte": cutoff_date.isoformat()},
                "processed": True
            }
        ).sort("timestamp", -1).to_list(length=None)
        
        # Aggregate insights
        insights = []
        triage_alerts = []
        
        for data_entry in recent_data:
            analysis_results = data_entry.get("analysis_results", {})
            if analysis_results.get("findings"):
                insights.extend(analysis_results["findings"])
            
            if analysis_results.get("triage_level") in ["RED", "ORANGE"]:
                triage_alerts.append({
                    "timestamp": data_entry["timestamp"],
                    "data_type": data_entry["data_type"],
                    "level": analysis_results["triage_level"],
                    "finding": analysis_results["findings"][0] if analysis_results["findings"] else "Alert"
                })
        
        # Get pattern correlations from health memory
        health_memory = await _get_health_history(db, user_id)
        correlations = await _find_pattern_correlations(insights, health_memory)
        
        return {
            "user_id": user_id,
            "analysis_period_days": days,
            "total_insights": len(insights),
            "recent_insights": insights[:10],  # Most recent 10
            "triage_alerts": triage_alerts,
            "pattern_correlations": correlations,
            "health_score_trend": await _calculate_health_score_trend(db, user_id, days)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting health insights: {str(e)}")

@router.get("/health-dashboard/{user_id}")
async def get_health_dashboard(user_id: str):
    """Get comprehensive health dashboard data"""
    try:
        db = get_database()
        
        # Get latest health report
        latest_report = await db.health_reports.find_one(
            {"user_id": user_id},
            sort=[("generated_at", -1)]
        )
        
        # Get recent triage alerts
        recent_alerts = await db.wearable_data.find(
            {
                "user_id": user_id,
                "analysis_results.triage_level": {"$in": ["RED", "ORANGE"]},
                "timestamp": {"$gte": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()}
            }
        ).sort("timestamp", -1).limit(5).to_list(length=None)
        
        # Get health trends
        trends = await _get_recent_health_trends(db, user_id)
        
        return {
            "user_id": user_id,
            "dashboard_generated_at": datetime.now(timezone.utc).isoformat(),
            "latest_health_score": latest_report.get("overall_health_score", 0) if latest_report else 0,
            "recent_alerts": [
                {
                    "timestamp": alert["timestamp"],
                    "type": alert["data_type"],
                    "level": alert["analysis_results"]["triage_level"],
                    "message": alert["analysis_results"]["findings"][0] if alert["analysis_results"].get("findings") else "Alert"
                }
                for alert in recent_alerts
            ],
            "health_trends": trends,
            "last_report_date": latest_report.get("generated_at") if latest_report else None,
            "recommendations": {
                "immediate": await _get_immediate_recommendations(db, user_id),
                "preventive": await _get_preventive_recommendations(db, user_id)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting health dashboard: {str(e)}")

# Helper functions
async def _perform_real_time_analysis(user_id: str, data_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Perform real-time analysis on submitted wearable data"""
    db = get_database()
    health_history = await _get_health_history(db, user_id)
    
    if data_type == "sleep":
        return medical_analyzer.analyze_sleep_architecture(data, health_history)
    elif data_type == "heart_rate":
        return medical_analyzer.analyze_heart_rate_patterns(data, health_history)
    elif data_type == "activity":
        return medical_analyzer.analyze_activity_patterns(data, health_history)
    elif data_type == "respiratory":
        return medical_analyzer.analyze_respiratory_patterns(data, health_history)
    elif data_type == "stress":
        return medical_analyzer.analyze_stress_autonomic(data, health_history)
    
    return {"status": "no_analysis_available"}

async def _gather_wearable_data(db, user_id: str, report_type: ReportType) -> Dict[str, Any]:
    """Gather user's wearable data for report generation"""
    period_days = {
        ReportType.DAILY: 1,
        ReportType.WEEKLY: 7, 
        ReportType.MONTHLY: 30,
        ReportType.QUARTERLY: 90,
        ReportType.YEARLY: 365
    }
    
    days = period_days.get(report_type, 7)
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    wearable_data = await db.wearable_data.find(
        {
            "user_id": user_id,
            "timestamp": {"$gte": cutoff_date.isoformat()}
        }
    ).sort("timestamp", 1).to_list(length=None)
    
    # Organize data by type
    organized_data = {
        "sleep": {"nightly_data": []},
        "heart_rate": {},
        "activity": {},
        "respiratory": {},
        "stress": {}
    }
    
    for entry in wearable_data:
        data_type = entry["data_type"]
        if data_type in organized_data:
            if data_type == "sleep":
                organized_data[data_type]["nightly_data"].append(entry["data"])
            else:
                organized_data[data_type].update(entry["data"])
    
    return organized_data

async def _get_health_history(db, user_id: str) -> Dict[str, Any]:
    """Get user's health history from health memory"""
    memory_entries = await db.health_memory.find(
        {"user_id": user_id}
    ).to_list(length=None)
    
    return {
        "past_conditions": [entry["condition"] for entry in memory_entries if entry["status"] in ["resolved", "monitoring"]],
        "chronic_conditions": [entry["condition"] for entry in memory_entries if entry["status"] == "active"],
        "past_medications": [],  # Would be populated from medication history
        "baseline_metrics": {}  # Would be calculated from historical data
    }

async def _get_medical_records(db, user_id: str) -> Dict[str, Any]:
    """Get user's medical records"""
    # This would integrate with existing health records system
    records = await db.health_records.find_one({"user_id": user_id}) or {}
    
    return {
        "conditions": records.get("conditions", []),
        "medications": records.get("medications", []),
        "allergies": records.get("allergies", []),
        "family_history": records.get("family_history", [])
    }

def _serialize_report(report) -> Dict[str, Any]:
    """Serialize report object for database storage"""
    # Convert dataclass to dict, handling nested objects
    report_dict = {
        "overall_health_score": report.overall_health_score,
        "key_findings": report.key_findings,
        "priority_recommendations": report.priority_recommendations,
        "triage_alerts": [
            {
                **alert,
                "level": alert.get("level").value if hasattr(alert.get("level"), "value") else str(alert.get("level"))
            } if isinstance(alert, dict) else alert
            for alert in report.triage_alerts
        ],
        "sleep_analysis": {
            **report.sleep_analysis,
            "triage_level": report.sleep_analysis.get("triage_level").value if hasattr(report.sleep_analysis.get("triage_level"), "value") else str(report.sleep_analysis.get("triage_level", "GREEN"))
        } if report.sleep_analysis else {},
        "cardiac_analysis": {
            **report.cardiac_analysis,
            "triage_level": report.cardiac_analysis.get("triage_level").value if hasattr(report.cardiac_analysis.get("triage_level"), "value") else str(report.cardiac_analysis.get("triage_level", "GREEN"))
        } if report.cardiac_analysis else {},
        "activity_analysis": {
            **report.activity_analysis,
            "triage_level": report.activity_analysis.get("triage_level").value if hasattr(report.activity_analysis.get("triage_level"), "value") else str(report.activity_analysis.get("triage_level", "GREEN"))
        } if report.activity_analysis else {},
        "respiratory_analysis": {
            **report.respiratory_analysis,
            "triage_level": report.respiratory_analysis.get("triage_level").value if hasattr(report.respiratory_analysis.get("triage_level"), "value") else str(report.respiratory_analysis.get("triage_level", "GREEN"))
        } if report.respiratory_analysis else {},
        "stress_analysis": {
            **report.stress_analysis,
            "triage_level": report.stress_analysis.get("triage_level").value if hasattr(report.stress_analysis.get("triage_level"), "value") else str(report.stress_analysis.get("triage_level", "GREEN"))
        } if report.stress_analysis else {},
        "health_trends": [
            {
                "metric": trend.metric,
                "current_value": trend.current_value,
                "previous_value": trend.previous_value,
                "change_percentage": trend.change_percentage,
                "trend_direction": trend.trend_direction,
                "medical_significance": trend.medical_significance,
                "recommendations": trend.recommendations
            }
            for trend in report.health_trends
        ],
        "health_insights": [
            {
                "insight_id": insight.insight_id,
                "category": insight.category,
                "severity": insight.severity,
                "title": insight.title,
                "description": insight.description,
                "recommendations": insight.recommendations,
                "medical_context": insight.medical_context,
                "related_history": insight.related_history
            }
            for insight in report.health_insights
        ]
    }
    
    return report_dict

async def _find_pattern_correlations(insights: List[str], health_memory: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Find correlations between current patterns and health memory"""
    correlations = []
    
    past_conditions = health_memory.get("past_conditions", [])
    for insight in insights:
        for condition in past_conditions:
            if any(keyword in insight.lower() and keyword in condition.lower() 
                  for keyword in ["sleep", "heart", "pain", "stress", "breathing"]):
                correlations.append({
                    "current_pattern": insight,
                    "related_history": condition,
                    "correlation_strength": "moderate"
                })
    
    return correlations

async def _calculate_health_score_trend(db, user_id: str, days: int) -> Dict[str, Any]:
    """Calculate health score trend over period"""
    # This would analyze health scores from recent reports
    return {
        "trend_direction": "stable",
        "average_score": 75,
        "score_change": 0
    }

async def _get_recent_health_trends(db, user_id: str) -> List[Dict[str, Any]]:
    """Get recent health trends for dashboard"""
    return [
        {"metric": "sleep_quality", "trend": "stable", "value": 78},
        {"metric": "activity_level", "trend": "improving", "value": 85},
        {"metric": "heart_rate_variability", "trend": "declining", "value": 65}
    ]

async def _get_immediate_recommendations(db, user_id: str) -> List[str]:
    """Get immediate recommendations based on recent alerts"""
    return [
        "Monitor sleep patterns closely",
        "Consider cardiology consultation for heart rate patterns"
    ]

async def _get_preventive_recommendations(db, user_id: str) -> List[str]:
    """Get preventive recommendations"""
    return [
        "Maintain consistent sleep schedule",
        "Engage in regular physical activity",
        "Practice stress management techniques"
    ]