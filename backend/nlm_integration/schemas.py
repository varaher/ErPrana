from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class PubMedArticle(BaseModel):
    """PubMed article information"""
    pmid: str
    title: str
    abstract: Optional[str] = None
    authors: List[str] = []
    journal: Optional[str] = None
    publication_date: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    keywords: List[str] = []
    
class PubMedSearchResult(BaseModel):
    """PubMed search results"""
    query: str
    total_results: int
    articles: List[PubMedArticle]
    search_time: datetime = Field(default_factory=datetime.now)

class MedlinePlusHealthTopic(BaseModel):
    """MedlinePlus health topic information"""
    title: str
    url: str
    summary: Optional[str] = None
    content_snippet: Optional[str] = None
    language: str = "en"
    last_updated: Optional[str] = None
    related_topics: List[str] = []

class MedlinePlusSearchResult(BaseModel):
    """MedlinePlus search results"""
    query: str
    topics: List[MedlinePlusHealthTopic]
    search_time: datetime = Field(default_factory=datetime.now)

class RxNormConcept(BaseModel):
    """RxNorm drug concept"""
    rxcui: str
    name: str
    synonym: Optional[str] = None
    tty: Optional[str] = None  # Term Type
    language: str = "ENG"
    suppress: str = "N"
    
class RxNormDrug(BaseModel):
    """RxNorm drug information"""
    concept: RxNormConcept
    ingredients: List[str] = []
    brand_names: List[str] = []
    generic_names: List[str] = []
    ndc_codes: List[str] = []

class DrugInteraction(BaseModel):
    """Drug interaction information"""
    drug1: str
    drug2: str
    severity: Optional[str] = None
    description: Optional[str] = None
    clinical_effect: Optional[str] = None
    management: Optional[str] = None

class UMLSConcept(BaseModel):
    """UMLS concept information"""
    cui: str
    preferred_name: str
    definitions: List[str] = []
    semantic_types: List[str] = []
    atoms: List[Dict[str, Any]] = []

class ClinicalTrial(BaseModel):
    """Clinical trial information"""
    nct_id: str
    title: str
    brief_summary: Optional[str] = None
    detailed_description: Optional[str] = None
    conditions: List[str] = []
    interventions: List[str] = []
    eligibility_criteria: Optional[str] = None
    status: Optional[str] = None
    phase: Optional[str] = None
    location: Optional[str] = None
    contact_info: Optional[str] = None

class ICD10Code(BaseModel):
    """ICD-10-CM diagnosis code"""
    code: str
    display_name: str
    category: Optional[str] = None
    parent_code: Optional[str] = None
    description: Optional[str] = None

class MedicalKnowledgeRequest(BaseModel):
    """Request for medical knowledge from NLM APIs"""
    query: str
    search_type: str = Field(..., description="pubmed, medlineplus, rxnorm, umls, clinicaltrials, icd10")
    max_results: int = Field(default=10, ge=1, le=100)
    language: str = "en"
    additional_filters: Optional[Dict[str, Any]] = None

class MedicalKnowledgeResponse(BaseModel):
    """Response with medical knowledge from NLM APIs"""
    query: str
    search_type: str
    results: List[Dict[str, Any]]
    total_found: int
    search_time: datetime = Field(default_factory=datetime.now)
    source: str
    reliability_score: float = Field(default=0.95, description="Reliability of NLM sources")
    
class ComprehensiveMedicalReport(BaseModel):
    """Comprehensive medical information report"""
    condition: str
    pubmed_articles: List[PubMedArticle] = []
    health_topics: List[MedlinePlusHealthTopic] = []
    related_drugs: List[RxNormDrug] = []
    clinical_trials: List[ClinicalTrial] = []
    icd10_codes: List[ICD10Code] = []
    umls_concepts: List[UMLSConcept] = []
    generated_at: datetime = Field(default_factory=datetime.now)
    evidence_level: str = "high"  # Based on NLM authoritative sources