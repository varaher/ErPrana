"""
Intelligent Wearable Medical Analytics System
Analyzes wearable data using comprehensive medical knowledge and maintains health memory
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timezone, timedelta
import statistics
import json
from dataclasses import dataclass
from enum import Enum

class HealthTrendType(Enum):
    IMPROVING = "improving"
    STABLE = "stable" 
    CONCERNING = "concerning"
    CRITICAL = "critical"

class TriageLevel(Enum):
    RED = "RED"      # Immediate attention
    ORANGE = "ORANGE" # Very urgent
    YELLOW = "YELLOW" # Urgent
    GREEN = "GREEN"   # Standard

@dataclass
class HealthPattern:
    pattern_id: str
    user_id: str
    pattern_type: str  # sleep, heart_rate, activity, etc.
    baseline_values: Dict[str, float]
    current_values: Dict[str, float]
    trend: HealthTrendType
    confidence_score: float
    medical_significance: str
    recommendations: List[str]
    triage_level: TriageLevel
    first_detected: datetime
    last_updated: datetime

class WearableMedicalAnalyzer:
    """Core analyzer for wearable medical data using ED handbook knowledge"""
    
    def __init__(self):
        self.medical_thresholds = self._initialize_medical_thresholds()
        self.pattern_memory = {}  # Store user health patterns
        
    def _initialize_medical_thresholds(self) -> Dict[str, Dict[str, Any]]:
        """Initialize medical knowledge thresholds for wearable analysis"""
        return {
            "sleep": {
                "total_sleep_time": {
                    "normal_min": 360,  # 6 hours minimum
                    "optimal_min": 420,  # 7 hours
                    "optimal_max": 540,  # 9 hours
                    "red_flags": ["<360 chronic", "efficiency <80%", "frequent awakenings >5/hr"]
                },
                "sleep_efficiency": {
                    "normal_threshold": 80,  # ≥80% normal
                    "concerning_threshold": 75,
                    "critical_threshold": 70,
                    "red_flags": ["<70% sustained", ">95% may indicate sleep deprivation"]
                },
                "sleep_onset_latency": {
                    "normal_max": 30,  # <30 min normal
                    "concerning_max": 45,
                    "critical_max": 60,
                    "red_flags": ["insomnia pattern", "narcolepsy if <5min"]
                },
                "waso": {  # Wake After Sleep Onset
                    "normal_max": 30,
                    "concerning_max": 45,
                    "critical_max": 60,
                    "red_flags": ["sleep fragmentation", "OSA symptoms", "pain/nocturia"]
                },
                "rem_percentage": {
                    "normal_min": 15,
                    "normal_max": 30,
                    "optimal": 22.5,
                    "red_flags": ["<10% REM deficiency", ">35% REM rebound"]
                }
            },
            
            "heart_rate": {
                "resting_hr": {
                    "normal_min": 60,
                    "normal_max": 100,
                    "athlete_min": 40,
                    "tachycardia_threshold": 100,
                    "bradycardia_threshold": 60,
                    "red_flags": [">100 sustained tachycardia", "<50 with symptoms", "sudden changes >20bpm"]
                },
                "nocturnal_dipping": {
                    "normal_dip_percentage": 10,  # 10% dip is normal
                    "concerning_threshold": 5,     # <5% non-dipping
                    "red_flags": ["non-dipping + snoring = OSA risk", "reversed dipping"]
                },
                "heart_rate_variability": {
                    "baseline_importance": True,  # Highly individual
                    "concerning_drop": 20,        # >20% drop from baseline
                    "red_flags": ["sudden HRV drop + illness symptoms", "chronic low HRV"]
                },
                "heart_rate_recovery": {
                    "normal_1min_drop": 12,  # >12bpm drop at 1min is normal
                    "concerning_threshold": 8,
                    "critical_threshold": 6,
                    "red_flags": ["poor fitness", "autonomic dysfunction", "CV risk"]
                }
            },
            
            "activity": {
                "daily_steps": {
                    "sedentary_threshold": 5000,
                    "low_active": 7500,
                    "active_threshold": 10000,
                    "highly_active": 12500,
                    "red_flags": ["<5000 sedentary risk", ">30% drop from baseline"]
                },
                "step_intensity": {
                    "moderate_intensity": 100,  # ≥100 steps/min
                    "vigorous_intensity": 130,  # ≥130 steps/min
                    "red_flags": ["unable to reach 100 steps/min", "chronotropic incompetence"]
                },
                "vo2max_estimate": {
                    "decline_threshold": 10,  # >10% decline concerning
                    "critical_decline": 20,   # >20% decline critical
                    "red_flags": ["sudden fitness drop", "exertional symptoms"]
                }
            },
            
            "respiratory": {
                "oxygen_saturation": {
                    "normal_min": 96,
                    "concerning_threshold": 94,
                    "critical_threshold": 90,
                    "red_flags": ["<90% hypoxemia", "nocturnal desats", "exertional drops"]
                },
                "respiratory_rate": {
                    "normal_min": 12,
                    "normal_max": 20,
                    "tachypnea_threshold": 20,
                    "critical_threshold": 25,
                    "red_flags": ["sustained >20/min", "sleep apnea patterns"]
                }
            },
            
            "blood_pressure": {
                "systolic": {
                    "normal_max": 120,
                    "elevated_max": 129,
                    "stage1_max": 139,
                    "stage2_threshold": 140,
                    "emergency_threshold": 180,
                    "red_flags": ["≥180 with symptoms", "non-dipping pattern"]
                },
                "diastolic": {
                    "normal_max": 80,
                    "stage1_max": 89,
                    "stage2_threshold": 90,
                    "emergency_threshold": 120,
                    "red_flags": ["≥120 emergency", "orthostatic drops"]
                }
            },
            
            "stress_autonomic": {
                "stress_indicators": {
                    "hrv_drop_threshold": 20,  # >20% HRV drop
                    "rhr_rise_threshold": 10,  # >10bpm RHR rise
                    "sleep_efficiency_drop": 15,  # >15% efficiency drop
                    "red_flags": ["combined autonomic strain", "chronic stress pattern"]
                }
            }
        }
    
    def analyze_sleep_architecture(self, sleep_data: Dict[str, Any], user_history: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze sleep data using medical knowledge"""
        analysis = {
            "metric": "sleep_architecture",
            "findings": [],
            "triage_level": "GREEN",  # Use string instead of enum
            "recommendations": [],
            "medical_significance": "",
            "trend_analysis": {},
            "red_flags": []
        }
        
        # Total Sleep Time Analysis
        tst = sleep_data.get('total_sleep_time', 0) / 60  # Convert to hours
        sleep_thresholds = self.medical_thresholds["sleep"]
        
        if tst < sleep_thresholds["total_sleep_time"]["normal_min"] / 60:  # <6 hours
            analysis["findings"].append(f"Short sleep duration: {tst:.1f}h (recommend ≥7h)")
            analysis["triage_level"] = "YELLOW" if analysis["triage_level"] == "GREEN" else analysis["triage_level"]
            analysis["recommendations"].append("Investigate causes of short sleep: pain, OSA, insomnia, depression")
            analysis["medical_significance"] = "Chronic short sleep increases cardiometabolic risk"
        
        # Sleep Efficiency Analysis
        efficiency = sleep_data.get('sleep_efficiency', 0)
        if efficiency < sleep_thresholds["sleep_efficiency"]["critical_threshold"]:
            analysis["findings"].append(f"Poor sleep efficiency: {efficiency}% (normal ≥80%)")
            analysis["triage_level"] = "ORANGE"
            analysis["red_flags"].append("Sleep fragmentation/insomnia pattern")
            analysis["recommendations"].extend([
                "Screen for OSA, pain, anxiety, nocturia",
                "Consider sleep study if snoring/witnessed apneas"
            ])
        elif efficiency < sleep_thresholds["sleep_efficiency"]["normal_threshold"]:
            analysis["findings"].append(f"Reduced sleep efficiency: {efficiency}% (target ≥80%)")
            analysis["triage_level"] = "YELLOW" if analysis["triage_level"] == "GREEN" else analysis["triage_level"]
            analysis["recommendations"].append("Sleep hygiene counseling, investigate fragmenting factors")
        
        # Sleep Onset Latency
        sol = sleep_data.get('sleep_onset_latency', 0)
        if sol > sleep_thresholds["sleep_onset_latency"]["critical_max"]:
            analysis["findings"].append(f"Prolonged sleep onset: {sol}min (normal <30min)")
            analysis["triage_level"] = "YELLOW" if analysis["triage_level"] == "GREEN" else analysis["triage_level"]
            analysis["recommendations"].append("Evaluate for insomnia disorder, anxiety, stimulants")
        
        # REM Sleep Analysis
        rem_percent = sleep_data.get('rem_percentage', 0)
        if rem_percent < sleep_thresholds["sleep"]["rem_percentage"]["normal_min"]:
            analysis["findings"].append(f"Low REM sleep: {rem_percent}% (normal 15-30%)")
            analysis["recommendations"].append("Check for sleep fragmentation, alcohol use, medications")
        
        # Pattern Analysis with History
        if user_history.get("sleep_patterns"):
            baseline_efficiency = user_history["sleep_patterns"].get("average_efficiency", efficiency)
            if efficiency < baseline_efficiency - 15:  # 15% drop from baseline
                analysis["findings"].append(f"Sleep efficiency decline from personal baseline")
                analysis["trend_analysis"]["efficiency_trend"] = "declining"
                analysis["triage_level"] = max(analysis["triage_level"], TriageLevel.YELLOW)
        
        return analysis
    
    def analyze_heart_rate_patterns(self, hr_data: Dict[str, Any], user_history: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze heart rate data using cardiac medical knowledge"""
        analysis = {
            "metric": "heart_rate_patterns",
            "findings": [],
            "triage_level": TriageLevel.GREEN,
            "recommendations": [],
            "medical_significance": "",
            "red_flags": []
        }
        
        hr_thresholds = self.medical_thresholds["heart_rate"]
        
        # Resting Heart Rate Analysis
        rhr = hr_data.get('resting_heart_rate', 70)
        if rhr > hr_thresholds["resting_hr"]["tachycardia_threshold"]:
            analysis["findings"].append(f"Resting tachycardia: {rhr}bpm (normal 60-100)")
            analysis["triage_level"] = TriageLevel.ORANGE
            analysis["red_flags"].append("Sustained tachycardia")
            analysis["recommendations"].extend([
                "Check for fever, dehydration, anemia, thyrotoxicosis",
                "Consider 12-lead ECG, CBC, CMP, TSH",
                "Evaluate for anxiety, stimulants, arrhythmias"
            ])
            analysis["medical_significance"] = "May indicate underlying pathology"
        
        elif rhr < hr_thresholds["resting_hr"]["bradycardia_threshold"]:
            # Context matters for bradycardia
            is_athlete = user_history.get("fitness_level") == "athlete"
            has_symptoms = hr_data.get("bradycardia_symptoms", False)
            
            if has_symptoms or (rhr < 50 and not is_athlete):
                analysis["findings"].append(f"Symptomatic bradycardia: {rhr}bpm")
                analysis["triage_level"] = TriageLevel.YELLOW
                analysis["recommendations"].extend([
                    "Check medications (β-blockers, CCB)",
                    "Consider ECG, electrolytes, TSH",
                    "Evaluate for conduction disease if symptomatic"
                ])
        
        # Nocturnal Heart Rate Dipping
        night_hr = hr_data.get('nocturnal_heart_rate')
        day_hr = hr_data.get('daytime_heart_rate', rhr)
        if night_hr and day_hr:
            dip_percentage = ((day_hr - night_hr) / day_hr) * 100
            if dip_percentage < hr_thresholds["nocturnal_dipping"]["concerning_threshold"]:
                analysis["findings"].append(f"Non-dipping HR pattern: {dip_percentage:.1f}% dip (normal ≥10%)")
                analysis["triage_level"] = max(analysis["triage_level"], TriageLevel.YELLOW)
                analysis["recommendations"].extend([
                    "Screen for OSA if snoring/witnessed apneas",
                    "Evaluate for dysautonomia, CHF",
                    "Consider sleep study"
                ])
                analysis["medical_significance"] = "Associated with higher CV risk"
        
        # Heart Rate Variability Analysis
        hrv = hr_data.get('heart_rate_variability')
        if hrv and user_history.get("hrv_baseline"):
            baseline_hrv = user_history["hrv_baseline"]
            hrv_change = ((hrv - baseline_hrv) / baseline_hrv) * 100
            
            if hrv_change < -hr_thresholds["heart_rate_variability"]["concerning_drop"]:
                analysis["findings"].append(f"HRV decline: {hrv_change:.1f}% from baseline")
                analysis["triage_level"] = max(analysis["triage_level"], TriageLevel.YELLOW)
                analysis["recommendations"].extend([
                    "Assess for illness, overtraining, stress",
                    "Monitor for infection symptoms",
                    "Consider recovery/deload period"
                ])
        
        # Heart Rate Recovery (if exercise data available)
        hr_recovery = hr_data.get('heart_rate_recovery_1min')
        if hr_recovery is not None:
            if hr_recovery <= hr_thresholds["heart_rate_recovery"]["critical_threshold"]:
                analysis["findings"].append(f"Poor HR recovery: {hr_recovery}bpm drop (normal >12bpm)")
                analysis["triage_level"] = max(analysis["triage_level"], TriageLevel.ORANGE)
                analysis["recommendations"].extend([
                    "Risk stratify with global CV assessment",
                    "Consider cardiology evaluation",
                    "Integrate with lipids, BP, symptoms"
                ])
                analysis["medical_significance"] = "Associated with higher mortality risk"
        
        return analysis
    
    def analyze_activity_patterns(self, activity_data: Dict[str, Any], user_history: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze activity and fitness data"""
        analysis = {
            "metric": "activity_patterns", 
            "findings": [],
            "triage_level": TriageLevel.GREEN,
            "recommendations": [],
            "medical_significance": ""
        }
        
        activity_thresholds = self.medical_thresholds["activity"]
        
        # Daily Steps Analysis
        daily_steps = activity_data.get('average_daily_steps', 0)
        if daily_steps < activity_thresholds["daily_steps"]["sedentary_threshold"]:
            analysis["findings"].append(f"Sedentary activity: {daily_steps} steps/day (recommend ≥7,000)")
            analysis["triage_level"] = TriageLevel.YELLOW
            analysis["recommendations"].extend([
                "Screen for barriers: pain, dyspnea, depression, anemia",
                "Gradual increase to 7,000-10,000 steps/day",
                "Consider medical evaluation if exertional symptoms"
            ])
            analysis["medical_significance"] = "Increased cardiometabolic and mortality risk"
        
        # Step Intensity Analysis
        max_cadence = activity_data.get('peak_step_cadence', 0)
        if max_cadence < activity_thresholds["step_intensity"]["moderate_intensity"]:
            analysis["findings"].append(f"Limited step intensity: {max_cadence} steps/min (target ≥100)")
            analysis["triage_level"] = max(analysis["triage_level"], TriageLevel.YELLOW)
            analysis["recommendations"].extend([
                "Evaluate cardiopulmonary fitness",
                "Consider exercise ECG if symptoms",
                "Check for chronotropic incompetence"
            ])
        
        # VO2max Trend Analysis
        current_vo2max = activity_data.get('vo2max_estimate')
        if current_vo2max and user_history.get("vo2max_baseline"):
            baseline_vo2max = user_history["vo2max_baseline"]
            vo2_change = ((current_vo2max - baseline_vo2max) / baseline_vo2max) * 100
            
            if vo2_change < -activity_thresholds["vo2max_estimate"]["decline_threshold"]:
                analysis["findings"].append(f"Fitness decline: {vo2_change:.1f}% VO2max drop")
                if vo2_change < -activity_thresholds["vo2max_estimate"]["critical_decline"]:
                    analysis["triage_level"] = TriageLevel.ORANGE
                    analysis["recommendations"].extend([
                        "Comprehensive medical evaluation",
                        "Screen for illness, anemia, cardiac issues",
                        "Consider CPET if exertional symptoms"
                    ])
                else:
                    analysis["triage_level"] = TriageLevel.YELLOW
                    analysis["recommendations"].append("Monitor trend, ensure adequate recovery")
        
        return analysis
    
    def analyze_respiratory_patterns(self, respiratory_data: Dict[str, Any], user_history: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze respiratory and oxygenation data"""
        analysis = {
            "metric": "respiratory_patterns",
            "findings": [],
            "triage_level": TriageLevel.GREEN,
            "recommendations": [],
            "red_flags": []
        }
        
        resp_thresholds = self.medical_thresholds["respiratory"]
        
        # Oxygen Saturation Analysis
        spo2_nadir = respiratory_data.get('nocturnal_spo2_nadir')
        if spo2_nadir and spo2_nadir <= resp_thresholds["oxygen_saturation"]["critical_threshold"]:
            analysis["findings"].append(f"Nocturnal hypoxemia: SpO2 nadir {spo2_nadir}% (normal ≥96%)")
            analysis["triage_level"] = TriageLevel.ORANGE
            analysis["red_flags"].append("Significant nocturnal desaturation")
            analysis["recommendations"].extend([
                "Sleep apnea evaluation (HSAT/PSG)",
                "Consider COPD/overlap syndrome",
                "Pulmonary function testing if indicated"
            ])
        
        # Oxygen Desaturation Index
        odi = respiratory_data.get('oxygen_desaturation_index', 0)
        if odi >= 5:  # ODI ≥5/hr clinically significant
            severity = "mild" if odi < 15 else "moderate" if odi < 30 else "severe"
            analysis["findings"].append(f"Sleep-disordered breathing: ODI {odi:.1f}/hr ({severity})")
            
            if odi >= 15:
                analysis["triage_level"] = TriageLevel.ORANGE
            else:
                analysis["triage_level"] = TriageLevel.YELLOW
                
            analysis["recommendations"].extend([
                "Sleep study evaluation",
                "Screen for cardiovascular complications",
                "Weight management if BMI elevated"
            ])
        
        # Respiratory Rate Patterns
        rr_avg = respiratory_data.get('average_respiratory_rate')
        if rr_avg and rr_avg > resp_thresholds["respiratory_rate"]["tachypnea_threshold"]:
            analysis["findings"].append(f"Tachypnea pattern: {rr_avg:.1f}/min (normal 12-20)")
            analysis["triage_level"] = max(analysis["triage_level"], TriageLevel.YELLOW)
            analysis["recommendations"].extend([
                "Evaluate for underlying cause",
                "Consider pulmonary, cardiac, metabolic causes",
                "Sleep study if nocturnal pattern"
            ])
        
        return analysis
    
    def analyze_stress_autonomic(self, stress_data: Dict[str, Any], user_history: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze stress and autonomic function indicators"""
        analysis = {
            "metric": "stress_autonomic",
            "findings": [],
            "triage_level": TriageLevel.GREEN,
            "recommendations": [],
            "pattern_detected": None
        }
        
        stress_thresholds = self.medical_thresholds["stress_autonomic"]["stress_indicators"]
        
        # Autonomic Strain Pattern Detection
        strain_indicators = 0
        current_hrv = stress_data.get('current_hrv')
        baseline_hrv = user_history.get('baseline_hrv')
        current_rhr = stress_data.get('current_rhr')
        baseline_rhr = user_history.get('baseline_rhr')
        
        if current_hrv and baseline_hrv:
            hrv_change = ((current_hrv - baseline_hrv) / baseline_hrv) * 100
            if hrv_change < -stress_thresholds["hrv_drop_threshold"]:
                strain_indicators += 1
                analysis["findings"].append(f"HRV decline: {hrv_change:.1f}% from baseline")
        
        if current_rhr and baseline_rhr:
            rhr_change = current_rhr - baseline_rhr
            if rhr_change > stress_thresholds["rhr_rise_threshold"]:
                strain_indicators += 1
                analysis["findings"].append(f"Elevated RHR: +{rhr_change}bpm from baseline")
        
        sleep_efficiency = stress_data.get('recent_sleep_efficiency')
        baseline_sleep = user_history.get('baseline_sleep_efficiency', 85)
        if sleep_efficiency and sleep_efficiency < baseline_sleep - stress_thresholds["sleep_efficiency_drop"]:
            strain_indicators += 1
            analysis["findings"].append(f"Sleep disruption: {sleep_efficiency}% efficiency")
        
        # Interpret combined pattern
        if strain_indicators >= 2:
            analysis["pattern_detected"] = "autonomic_strain"
            analysis["triage_level"] = TriageLevel.YELLOW
            analysis["recommendations"].extend([
                "Assess for illness, overtraining, life stressors",
                "Consider rest/recovery period",
                "Monitor for infection symptoms",
                "Stress management techniques"
            ])
            
        return analysis
    
    def integrate_health_memory(self, user_id: str, current_analysis: Dict[str, Any], 
                              health_history: Dict[str, Any]) -> Dict[str, Any]:
        """Integrate current analysis with user's health memory"""
        
        enhanced_analysis = current_analysis.copy()
        enhanced_analysis["health_memory_integration"] = {}
        
        # Check for recurring patterns
        past_conditions = health_history.get("past_conditions", [])
        past_medications = health_history.get("past_medications", [])
        chronic_conditions = health_history.get("chronic_conditions", [])
        
        # Link current findings to past conditions
        for finding in enhanced_analysis.get("findings", []):
            if "sleep" in finding.lower() and any("sleep apnea" in condition.lower() or "insomnia" in condition.lower() 
                                                 for condition in past_conditions + chronic_conditions):
                enhanced_analysis["health_memory_integration"]["sleep_pattern_link"] = {
                    "past_condition": "sleep_disorder_history",
                    "current_relevance": "Current sleep patterns may relate to previously diagnosed sleep disorders",
                    "recommendation": "Consider sleep study follow-up or sleep medicine consultation"
                }
            
            if "heart rate" in finding.lower() and any("heart" in condition.lower() or "cardiac" in condition.lower() 
                                                     for condition in past_conditions + chronic_conditions):
                enhanced_analysis["health_memory_integration"]["cardiac_pattern_link"] = {
                    "past_condition": "cardiac_history",
                    "current_relevance": "Heart rate patterns should be interpreted in context of cardiac history",
                    "recommendation": "Cardiology follow-up may be indicated"
                }
        
        return enhanced_analysis

def create_comprehensive_health_analyzer() -> WearableMedicalAnalyzer:
    """Factory function to create the medical analyzer"""
    return WearableMedicalAnalyzer()