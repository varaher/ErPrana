"""
Comprehensive Health Reporting System
Generates daily, weekly, monthly, quarterly, and yearly health reports
Integrates wearable data analysis with medical history memory
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone, timedelta
import json
from dataclasses import dataclass, asdict
from enum import Enum
import statistics

from .medical_analyzer import WearableMedicalAnalyzer, HealthPattern, TriageLevel, HealthTrendType

class ReportType(Enum):
    DAILY = "daily"
    WEEKLY = "weekly" 
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"

@dataclass
class HealthTrend:
    metric: str
    current_value: float
    previous_value: float
    change_percentage: float
    trend_direction: str  # improving, stable, declining
    medical_significance: str
    recommendations: List[str]

@dataclass
class HealthInsight:
    insight_id: str
    category: str  # sleep, cardiac, activity, etc.
    severity: str  # info, warning, critical
    title: str
    description: str
    data_points: Dict[str, Any]
    recommendations: List[str]
    medical_context: str
    related_history: Optional[str] = None

@dataclass
class ComprehensiveHealthReport:
    report_id: str
    user_id: str
    report_type: ReportType
    period_start: datetime
    period_end: datetime
    generated_at: datetime
    
    # Executive Summary
    overall_health_score: float  # 0-100
    key_findings: List[str]
    priority_recommendations: List[str]
    triage_alerts: List[Dict[str, Any]]
    
    # Detailed Analysis
    sleep_analysis: Dict[str, Any]
    cardiac_analysis: Dict[str, Any]
    activity_analysis: Dict[str, Any]
    respiratory_analysis: Dict[str, Any]
    stress_analysis: Dict[str, Any]
    
    # Trends and Patterns
    health_trends: List[HealthTrend]
    emerging_patterns: List[str]
    risk_factors: List[str]
    
    # Health Memory Integration
    condition_correlations: List[Dict[str, Any]]
    medication_impacts: List[Dict[str, Any]]
    historical_comparisons: Dict[str, Any]
    
    # Insights and Actions
    health_insights: List[HealthInsight]
    preventive_recommendations: List[str]
    follow_up_needed: List[Dict[str, Any]]

class ComprehensiveHealthReporter:
    """Generates comprehensive health reports with medical intelligence"""
    
    def __init__(self):
        self.medical_analyzer = WearableMedicalAnalyzer()
        
    async def generate_report(self, user_id: str, report_type: ReportType, 
                            wearable_data: Dict[str, Any], 
                            health_history: Dict[str, Any],
                            medical_records: Dict[str, Any]) -> ComprehensiveHealthReport:
        """Generate comprehensive health report"""
        
        # Calculate report period
        end_date = datetime.now(timezone.utc)
        period_days = self._get_period_days(report_type)
        start_date = end_date - timedelta(days=period_days)
        
        # Analyze all health domains
        sleep_analysis = await self._analyze_sleep_domain(wearable_data, health_history)
        cardiac_analysis = await self._analyze_cardiac_domain(wearable_data, health_history)
        activity_analysis = await self._analyze_activity_domain(wearable_data, health_history)
        respiratory_analysis = await self._analyze_respiratory_domain(wearable_data, health_history)
        stress_analysis = await self._analyze_stress_domain(wearable_data, health_history)
        
        # Generate health trends
        health_trends = await self._calculate_health_trends(
            user_id, report_type, wearable_data, health_history
        )
        
        # Create health insights
        health_insights = await self._generate_health_insights(
            user_id, [sleep_analysis, cardiac_analysis, activity_analysis, 
                     respiratory_analysis, stress_analysis], health_history
        )
        
        # Calculate overall health score
        health_score = self._calculate_overall_health_score([
            sleep_analysis, cardiac_analysis, activity_analysis,
            respiratory_analysis, stress_analysis
        ])
        
        # Generate executive summary
        key_findings, priority_recommendations, triage_alerts = self._create_executive_summary([
            sleep_analysis, cardiac_analysis, activity_analysis,
            respiratory_analysis, stress_analysis
        ])
        
        # Integrate health memory
        condition_correlations = await self._analyze_condition_correlations(
            health_insights, medical_records
        )
        
        medication_impacts = await self._analyze_medication_impacts(
            wearable_data, medical_records
        )
        
        historical_comparisons = await self._create_historical_comparisons(
            user_id, report_type, wearable_data
        )
        
        # Generate follow-up recommendations
        follow_up_needed = self._determine_follow_up_needs(health_insights, triage_alerts)
        
        report = ComprehensiveHealthReport(
            report_id=f"{user_id}_{report_type.value}_{int(end_date.timestamp())}",
            user_id=user_id,
            report_type=report_type,
            period_start=start_date,
            period_end=end_date,
            generated_at=end_date,
            
            overall_health_score=health_score,
            key_findings=key_findings,
            priority_recommendations=priority_recommendations,
            triage_alerts=triage_alerts,
            
            sleep_analysis=sleep_analysis,
            cardiac_analysis=cardiac_analysis,
            activity_analysis=activity_analysis,
            respiratory_analysis=respiratory_analysis,
            stress_analysis=stress_analysis,
            
            health_trends=health_trends,
            emerging_patterns=self._detect_emerging_patterns(health_trends),
            risk_factors=self._identify_risk_factors(health_insights),
            
            condition_correlations=condition_correlations,
            medication_impacts=medication_impacts,
            historical_comparisons=historical_comparisons,
            
            health_insights=health_insights,
            preventive_recommendations=self._generate_preventive_recommendations(health_insights),
            follow_up_needed=follow_up_needed
        )
        
        return report
    
    async def _analyze_sleep_domain(self, wearable_data: Dict[str, Any], 
                                  health_history: Dict[str, Any]) -> Dict[str, Any]:
        """Comprehensive sleep domain analysis"""
        sleep_data = wearable_data.get('sleep', {})
        
        # Get recent sleep metrics
        total_sleep_avg = statistics.mean([night.get('total_sleep_time', 0) 
                                         for night in sleep_data.get('nightly_data', [])])
        efficiency_avg = statistics.mean([night.get('sleep_efficiency', 0)
                                        for night in sleep_data.get('nightly_data', [])])
        
        # Use medical analyzer
        medical_analysis = self.medical_analyzer.analyze_sleep_architecture(
            {
                'total_sleep_time': total_sleep_avg,
                'sleep_efficiency': efficiency_avg,
                'sleep_onset_latency': sleep_data.get('avg_sleep_onset_latency', 0),
                'rem_percentage': sleep_data.get('avg_rem_percentage', 0)
            },
            health_history
        )
        
        # Add sleep-specific insights
        sleep_quality_score = self._calculate_sleep_quality_score(sleep_data)
        sleep_consistency = self._analyze_sleep_consistency(sleep_data)
        
        return {
            **medical_analysis,
            'sleep_quality_score': sleep_quality_score,
            'sleep_consistency': sleep_consistency,
            'average_metrics': {
                'total_sleep_time': total_sleep_avg / 60,  # hours
                'sleep_efficiency': efficiency_avg,
                'rem_percentage': sleep_data.get('avg_rem_percentage', 0),
                'deep_sleep_percentage': sleep_data.get('avg_deep_sleep_percentage', 0)
            },
            'sleep_debt': self._calculate_sleep_debt(sleep_data),
            'circadian_analysis': self._analyze_circadian_patterns(sleep_data)
        }
    
    async def _analyze_cardiac_domain(self, wearable_data: Dict[str, Any],
                                    health_history: Dict[str, Any]) -> Dict[str, Any]:
        """Comprehensive cardiac domain analysis"""
        cardiac_data = wearable_data.get('heart_rate', {})
        
        # Use medical analyzer
        medical_analysis = self.medical_analyzer.analyze_heart_rate_patterns(
            cardiac_data, health_history
        )
        
        # Add cardiac-specific insights
        cardiac_fitness_trend = self._analyze_cardiac_fitness_trend(cardiac_data, health_history)
        autonomic_balance = self._assess_autonomic_balance(cardiac_data)
        
        return {
            **medical_analysis,
            'cardiac_fitness_trend': cardiac_fitness_trend,
            'autonomic_balance': autonomic_balance,
            'resting_hr_trend': self._calculate_rhr_trend(cardiac_data),
            'hrv_insights': self._generate_hrv_insights(cardiac_data, health_history),
            'cardiac_risk_factors': self._identify_cardiac_risk_factors(cardiac_data, health_history)
        }
    
    async def _analyze_activity_domain(self, wearable_data: Dict[str, Any],
                                     health_history: Dict[str, Any]) -> Dict[str, Any]:
        """Comprehensive activity domain analysis"""
        activity_data = wearable_data.get('activity', {})
        
        # Use medical analyzer
        medical_analysis = self.medical_analyzer.analyze_activity_patterns(
            activity_data, health_history
        )
        
        # Add activity-specific insights
        fitness_progression = self._analyze_fitness_progression(activity_data, health_history)
        movement_patterns = self._analyze_movement_patterns(activity_data)
        
        return {
            **medical_analysis,
            'fitness_progression': fitness_progression,
            'movement_patterns': movement_patterns,
            'sedentary_analysis': self._analyze_sedentary_behavior(activity_data),
            'exercise_consistency': self._assess_exercise_consistency(activity_data),
            'functional_capacity': self._assess_functional_capacity(activity_data)
        }
    
    async def _analyze_respiratory_domain(self, wearable_data: Dict[str, Any],
                                        health_history: Dict[str, Any]) -> Dict[str, Any]:
        """Comprehensive respiratory domain analysis"""
        respiratory_data = wearable_data.get('respiratory', {})
        
        # Use medical analyzer
        medical_analysis = self.medical_analyzer.analyze_respiratory_patterns(
            respiratory_data, health_history
        )
        
        # Add respiratory-specific insights
        sleep_breathing_analysis = self._analyze_sleep_breathing(respiratory_data)
        
        return {
            **medical_analysis,
            'sleep_breathing_analysis': sleep_breathing_analysis,
            'oxygenation_patterns': self._analyze_oxygenation_patterns(respiratory_data),
            'breathing_stability': self._assess_breathing_stability(respiratory_data)
        }
    
    async def _analyze_stress_domain(self, wearable_data: Dict[str, Any],
                                   health_history: Dict[str, Any]) -> Dict[str, Any]:
        """Comprehensive stress and autonomic analysis"""
        stress_data = wearable_data.get('stress', {})
        
        # Use medical analyzer  
        medical_analysis = self.medical_analyzer.analyze_stress_autonomic(
            stress_data, health_history
        )
        
        # Add stress-specific insights
        stress_patterns = self._analyze_stress_patterns(stress_data)
        recovery_analysis = self._analyze_recovery_patterns(wearable_data)
        
        return {
            **medical_analysis,
            'stress_patterns': stress_patterns,
            'recovery_analysis': recovery_analysis,
            'resilience_metrics': self._calculate_resilience_metrics(wearable_data),
            'stress_triggers': self._identify_stress_triggers(stress_data, wearable_data)
        }
    
    def _calculate_overall_health_score(self, domain_analyses: List[Dict[str, Any]]) -> float:
        """Calculate overall health score from domain analyses"""
        domain_scores = []
        
        for analysis in domain_analyses:
            triage_level = analysis.get('triage_level', 'GREEN')
            
            # Convert triage level to numeric score
            if triage_level == 'GREEN':
                score = 85 + (len(analysis.get('findings', [])) * -5)  # Minor deductions for findings
            elif triage_level == 'YELLOW':
                score = 65 + (10 if len(analysis.get('findings', [])) <= 2 else 0)
            elif triage_level == 'ORANGE':
                score = 45
            elif triage_level == 'RED':
                score = 25
            else:
                score = 75  # Default
            
            domain_scores.append(max(0, min(100, score)))
        
        return statistics.mean(domain_scores) if domain_scores else 75
    
    def _create_executive_summary(self, domain_analyses: List[Dict[str, Any]]) -> tuple:
        """Create executive summary from domain analyses"""
        key_findings = []
        priority_recommendations = []
        triage_alerts = []
        
        for analysis in domain_analyses:
            # Collect key findings
            findings = analysis.get('findings', [])
            if findings:
                key_findings.extend(findings[:2])  # Top 2 findings per domain
            
            # Collect priority recommendations
            recommendations = analysis.get('recommendations', [])
            if recommendations and analysis.get('triage_level') in ['ORANGE', 'RED']:
                priority_recommendations.extend(recommendations[:1])  # Top recommendation for urgent issues
            
            # Collect triage alerts
            if analysis.get('triage_level') in ['ORANGE', 'RED']:
                triage_alerts.append({
                    'domain': analysis.get('metric', 'unknown'),
                    'level': analysis.get('triage_level'),
                    'alert': findings[0] if findings else 'Urgent attention needed',
                    'recommendations': recommendations[:2]
                })
        
        return key_findings[:5], priority_recommendations[:3], triage_alerts
    
    async def _generate_health_insights(self, user_id: str, domain_analyses: List[Dict[str, Any]], 
                                      health_history: Dict[str, Any]) -> List[HealthInsight]:
        """Generate actionable health insights"""
        insights = []
        
        for analysis in domain_analyses:
            domain = analysis.get('metric', 'unknown')
            findings = analysis.get('findings', [])
            recommendations = analysis.get('recommendations', [])
            triage_level = analysis.get('triage_level', TriageLevel.GREEN)
            
            if findings:
                severity = 'critical' if triage_level == 'RED' else \
                          'warning' if triage_level in ['ORANGE', 'YELLOW'] else 'info'
                
                insight = HealthInsight(
                    insight_id=f"{user_id}_{domain}_{int(datetime.now().timestamp())}",
                    category=domain,
                    severity=severity,
                    title=f"{domain.replace('_', ' ').title()} Analysis",
                    description=findings[0],
                    data_points=analysis.get('data_points', {}),
                    recommendations=recommendations,
                    medical_context=analysis.get('medical_significance', ''),
                    related_history=self._find_related_history(domain, health_history)
                )
                insights.append(insight)
        
        return insights
    
    def _find_related_history(self, domain: str, health_history: Dict[str, Any]) -> Optional[str]:
        """Find related medical history for current domain"""
        domain_keywords = {
            'sleep': ['sleep apnea', 'insomnia', 'sleep disorder'],
            'heart_rate': ['heart disease', 'arrhythmia', 'hypertension'],
            'activity': ['diabetes', 'obesity', 'fitness'],
            'respiratory': ['asthma', 'COPD', 'lung disease'],
            'stress': ['anxiety', 'depression', 'stress']
        }
        
        keywords = domain_keywords.get(domain, [])
        past_conditions = health_history.get('past_conditions', []) + \
                         health_history.get('chronic_conditions', [])
        
        for condition in past_conditions:
            if any(keyword.lower() in condition.lower() for keyword in keywords):
                return f"Related to previous {condition}"
        
        return None
    
    def _get_period_days(self, report_type: ReportType) -> int:
        """Get number of days for report period"""
        period_map = {
            ReportType.DAILY: 1,
            ReportType.WEEKLY: 7,
            ReportType.MONTHLY: 30,
            ReportType.QUARTERLY: 90,
            ReportType.YEARLY: 365
        }
        return period_map.get(report_type, 7)
    
    # Additional helper methods for specific analyses
    def _calculate_sleep_quality_score(self, sleep_data: Dict[str, Any]) -> float:
        """Calculate comprehensive sleep quality score"""
        # Implementation for sleep quality scoring
        efficiency = sleep_data.get('avg_sleep_efficiency', 80)
        consistency = len([night for night in sleep_data.get('nightly_data', []) 
                          if abs(night.get('total_sleep_time', 0) - sleep_data.get('avg_total_sleep_time', 0)) < 3600])
        
        score = (efficiency * 0.6) + (consistency * 0.4)
        return min(100, max(0, score))
    
    def _analyze_sleep_consistency(self, sleep_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze sleep consistency patterns"""
        nightly_data = sleep_data.get('nightly_data', [])
        if len(nightly_data) < 3:
            return {"status": "insufficient_data"}
        
        bedtimes = [night.get('bedtime', 0) for night in nightly_data]
        wake_times = [night.get('wake_time', 0) for night in nightly_data]
        
        bedtime_variability = statistics.stdev(bedtimes) if len(bedtimes) > 1 else 0
        wake_time_variability = statistics.stdev(wake_times) if len(wake_times) > 1 else 0
        
        consistency_score = 100 - min(100, (bedtime_variability + wake_time_variability) / 2 * 10)
        
        return {
            "consistency_score": consistency_score,
            "bedtime_variability": bedtime_variability,
            "wake_time_variability": wake_time_variability,
            "status": "consistent" if consistency_score > 70 else "irregular"
        }
    
    async def _calculate_health_trends(self, user_id: str, report_type: ReportType,
                                     current_data: Dict[str, Any], 
                                     history: Dict[str, Any]) -> List[HealthTrend]:
        """Calculate health trends comparing current period to previous"""
        trends = []
        
        # Define metrics to track
        trend_metrics = {
            'sleep_efficiency': ('sleep', 'avg_sleep_efficiency'),
            'resting_heart_rate': ('heart_rate', 'resting_heart_rate'), 
            'daily_steps': ('activity', 'average_daily_steps'),
            'hrv_score': ('heart_rate', 'heart_rate_variability')
        }
        
        for metric_name, (domain, data_key) in trend_metrics.items():
            current_value = current_data.get(domain, {}).get(data_key, 0)
            previous_value = history.get(f'previous_{metric_name}', current_value)
            
            if previous_value > 0:  # Avoid division by zero
                change_percentage = ((current_value - previous_value) / previous_value) * 100
                
                if abs(change_percentage) > 5:  # Only include significant changes
                    trend_direction = "improving" if change_percentage > 0 else "declining"
                    if metric_name == 'resting_heart_rate':  # Lower is better for RHR
                        trend_direction = "improving" if change_percentage < 0 else "declining"
                    
                    trends.append(HealthTrend(
                        metric=metric_name,
                        current_value=current_value,
                        previous_value=previous_value,
                        change_percentage=change_percentage,
                        trend_direction=trend_direction,
                        medical_significance=self._get_trend_significance(metric_name, change_percentage),
                        recommendations=self._get_trend_recommendations(metric_name, trend_direction)
                    ))
        
        return trends
    
    def _get_trend_significance(self, metric: str, change_percentage: float) -> str:
        """Get medical significance of trend"""
        significance_map = {
            'sleep_efficiency': f"Sleep efficiency change of {change_percentage:.1f}% may impact daytime function and health",
            'resting_heart_rate': f"RHR change of {change_percentage:.1f}% could indicate fitness or health status changes", 
            'daily_steps': f"Activity level change of {change_percentage:.1f}% affects cardiovascular and metabolic health",
            'hrv_score': f"HRV change of {change_percentage:.1f}% reflects autonomic nervous system adaptation"
        }
        return significance_map.get(metric, f"Trend change of {change_percentage:.1f}% noted")
    
    def _get_trend_recommendations(self, metric: str, trend_direction: str) -> List[str]:
        """Get recommendations based on trend"""
        if trend_direction == "improving":
            return [f"Continue current lifestyle practices supporting {metric} improvement"]
        else:
            recommendation_map = {
                'sleep_efficiency': ["Focus on sleep hygiene", "Evaluate sleep environment and habits"],
                'resting_heart_rate': ["Assess fitness routine", "Monitor for illness or overtraining"],
                'daily_steps': ["Increase daily physical activity", "Set progressive step goals"],
                'hrv_score': ["Focus on recovery and stress management", "Evaluate training load"]
            }
            return recommendation_map.get(metric, ["Monitor trend and consider lifestyle modifications"])
    
    # Additional analysis methods would continue here...
    # (Sleep debt calculation, circadian analysis, etc.)
    
    def _calculate_sleep_debt(self, sleep_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate sleep debt based on sleep need vs actual sleep"""
        target_sleep = 8 * 3600  # 8 hours in seconds
        nightly_data = sleep_data.get('nightly_data', [])
        
        total_debt = 0
        for night in nightly_data[-7:]:  # Last 7 nights
            actual_sleep = night.get('total_sleep_time', target_sleep)
            nightly_debt = max(0, target_sleep - actual_sleep)
            total_debt += nightly_debt
        
        return {
            'total_sleep_debt_hours': total_debt / 3600,
            'average_nightly_deficit': (total_debt / len(nightly_data[-7:])) / 3600 if nightly_data else 0,
            'status': 'significant' if total_debt > 7200 else 'moderate' if total_debt > 3600 else 'minimal'
        }
    
    def _detect_emerging_patterns(self, health_trends: List[HealthTrend]) -> List[str]:
        """Detect emerging health patterns from trends"""
        patterns = []
        
        declining_trends = [trend for trend in health_trends if trend.trend_direction == "declining"]
        if len(declining_trends) >= 2:
            patterns.append("Multiple health metrics showing declining trends - comprehensive evaluation recommended")
        
        return patterns
    
    def _identify_risk_factors(self, health_insights: List[HealthInsight]) -> List[str]:
        """Identify health risk factors from insights"""
        risk_factors = []
        
        for insight in health_insights:
            if insight.severity in ['warning', 'critical']:
                if 'sleep' in insight.category:
                    risk_factors.append("Sleep disorders increase cardiovascular and metabolic risk")
                elif 'cardiac' in insight.category:
                    risk_factors.append("Cardiac pattern changes may indicate cardiovascular risk")
                elif 'activity' in insight.category:
                    risk_factors.append("Sedentary lifestyle increases chronic disease risk")
        
        return list(set(risk_factors))  # Remove duplicates
    
    async def _analyze_condition_correlations(self, insights: List[HealthInsight], 
                                           medical_records: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze correlations between current insights and past conditions"""
        correlations = []
        
        past_conditions = medical_records.get('conditions', [])
        for insight in insights:
            for condition in past_conditions:
                if self._has_correlation(insight.category, condition.get('name', '')):
                    correlations.append({
                        'current_finding': insight.title,
                        'past_condition': condition.get('name'),
                        'correlation_type': 'recurrence_risk',
                        'medical_note': f"Current {insight.category} patterns may relate to previous {condition.get('name')}"
                    })
        
        return correlations
    
    def _has_correlation(self, current_category: str, past_condition: str) -> bool:
        """Check if current category correlates with past condition"""
        correlation_map = {
            'sleep': ['sleep apnea', 'insomnia', 'sleep disorder'],
            'cardiac': ['heart disease', 'arrhythmia', 'hypertension'],
            'activity': ['diabetes', 'obesity', 'metabolic syndrome'],
            'respiratory': ['asthma', 'COPD', 'lung disease']
        }
        
        keywords = correlation_map.get(current_category, [])
        return any(keyword.lower() in past_condition.lower() for keyword in keywords)
    
    async def _analyze_medication_impacts(self, wearable_data: Dict[str, Any], 
                                        medical_records: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze how medications might impact wearable metrics"""
        impacts = []
        
        current_medications = medical_records.get('medications', [])
        for medication in current_medications:
            med_name = medication.get('name', '').lower()
            
            # Check for known medication impacts
            if any(beta_blocker in med_name for beta_blocker in ['metoprolol', 'propranolol', 'atenolol']):
                impacts.append({
                    'medication': medication.get('name'),
                    'impact_category': 'heart_rate',
                    'expected_effect': 'Lower heart rate and blunted exercise response',
                    'monitoring_note': 'Heart rate zones may need adjustment'
                })
        
        return impacts
    
    async def _create_historical_comparisons(self, user_id: str, report_type: ReportType, 
                                           current_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create comparisons with historical data"""
        # This would query historical data from database
        # For now, returning a placeholder structure
        return {
            'comparison_period': f'Previous {report_type.value}',
            'metrics_compared': len(current_data.keys()),
            'significant_changes': 0,  # Would be calculated from actual historical data
            'overall_trend': 'stable'  # Would be determined from trend analysis
        }
    
    def _determine_follow_up_needs(self, insights: List[HealthInsight], 
                                 triage_alerts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Determine what follow-up care is needed"""
        follow_ups = []
        
        # Critical issues need immediate follow-up
        for alert in triage_alerts:
            if alert['level'] == 'RED':
                follow_ups.append({
                    'urgency': 'immediate',
                    'type': 'emergency_care',
                    'reason': alert['alert'],
                    'timeframe': 'Now - seek emergency care'
                })
            elif alert['level'] == 'ORANGE':
                follow_ups.append({
                    'urgency': 'urgent',
                    'type': 'physician_consultation',
                    'reason': alert['alert'],
                    'timeframe': '24-48 hours'
                })
        
        # Warning insights need routine follow-up
        warning_insights = [i for i in insights if i.severity == 'warning']
        if warning_insights:
            follow_ups.append({
                'urgency': 'routine',
                'type': 'primary_care',
                'reason': f"{len(warning_insights)} health patterns need evaluation",
                'timeframe': '1-2 weeks'
            })
        
        return follow_ups
    
    def _generate_preventive_recommendations(self, insights: List[HealthInsight]) -> List[str]:
        """Generate preventive care recommendations"""
        recommendations = [
            "Maintain consistent sleep schedule (7-9 hours nightly)",
            "Engage in regular physical activity (150 minutes moderate/week)",
            "Practice stress management techniques",
            "Stay hydrated and maintain balanced nutrition"
        ]
        
        # Add specific recommendations based on insights
        categories = [insight.category for insight in insights]
        if 'sleep' in categories:
            recommendations.append("Consider sleep hygiene evaluation")
        if 'cardiac' in categories:
            recommendations.append("Monitor blood pressure regularly")
        if 'activity' in categories:
            recommendations.append("Gradually increase daily movement")
        
        return recommendations
    
    # Placeholder methods for additional analyses
    def _analyze_circadian_patterns(self, sleep_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze circadian rhythm patterns"""
        return {"status": "analysis_pending"}
    
    def _analyze_cardiac_fitness_trend(self, cardiac_data: Dict[str, Any], history: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze cardiac fitness trends"""
        return {"status": "analysis_pending"}
    
    def _assess_autonomic_balance(self, cardiac_data: Dict[str, Any]) -> Dict[str, Any]:
        """Assess autonomic nervous system balance"""
        return {"status": "analysis_pending"}
    
    def _calculate_rhr_trend(self, cardiac_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate resting heart rate trend"""
        return {"status": "analysis_pending"}
    
    def _generate_hrv_insights(self, cardiac_data: Dict[str, Any], history: Dict[str, Any]) -> Dict[str, Any]:
        """Generate heart rate variability insights"""
        return {"status": "analysis_pending"}
    
    def _identify_cardiac_risk_factors(self, cardiac_data: Dict[str, Any], history: Dict[str, Any]) -> List[str]:
        """Identify cardiac risk factors"""
        return []
    
    def _analyze_fitness_progression(self, activity_data: Dict[str, Any], history: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze fitness progression"""
        return {"status": "analysis_pending"}
    
    def _analyze_movement_patterns(self, activity_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze movement and activity patterns"""
        return {"status": "analysis_pending"}
    
    def _analyze_sedentary_behavior(self, activity_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze sedentary behavior patterns"""
        return {"status": "analysis_pending"}
    
    def _assess_exercise_consistency(self, activity_data: Dict[str, Any]) -> Dict[str, Any]:
        """Assess exercise consistency"""
        return {"status": "analysis_pending"}
    
    def _assess_functional_capacity(self, activity_data: Dict[str, Any]) -> Dict[str, Any]:
        """Assess functional capacity"""
        return {"status": "analysis_pending"}
    
    def _analyze_sleep_breathing(self, respiratory_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze sleep breathing patterns"""
        return {"status": "analysis_pending"}
    
    def _analyze_oxygenation_patterns(self, respiratory_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze oxygenation patterns"""
        return {"status": "analysis_pending"}
    
    def _assess_breathing_stability(self, respiratory_data: Dict[str, Any]) -> Dict[str, Any]:
        """Assess breathing stability"""
        return {"status": "analysis_pending"}
    
    def _analyze_stress_patterns(self, stress_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze stress patterns"""
        return {"status": "analysis_pending"}
    
    def _analyze_recovery_patterns(self, wearable_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze recovery patterns"""
        return {"status": "analysis_pending"}
    
    def _calculate_resilience_metrics(self, wearable_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate resilience metrics"""
        return {"status": "analysis_pending"}
    
    def _identify_stress_triggers(self, stress_data: Dict[str, Any], wearable_data: Dict[str, Any]) -> List[str]:
        """Identify stress triggers"""
        return []