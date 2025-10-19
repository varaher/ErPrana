from pydantic_settings import BaseSettings
from typing import Optional

class NLMSettings(BaseSettings):
    """Configuration settings for US National Library of Medicine APIs"""
    
    # NCBI/PubMed Configuration
    ncbi_api_key: Optional[str] = None
    ncbi_email: str = "arya@emergent.com"  # Required for NCBI E-utilities
    ncbi_tool: str = "ARYA_Medical_AI"
    
    # UMLS Configuration
    umls_api_key: Optional[str] = None
    
    # Rate Limiting Configuration
    ncbi_requests_per_second: float = 3.0  # 10 with API key, 3 without
    medlineplus_requests_per_minute: int = 100
    
    # Caching Configuration
    cache_duration_hours: int = 24
    
    # API Base URLs
    pubmed_base_url: str = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
    medlineplus_base_url: str = "https://wsearch.nlm.nih.gov/ws/query"
    rxnorm_base_url: str = "https://rxnav.nlm.nih.gov/REST"
    umls_base_url: str = "https://uts-ws.nlm.nih.gov/rest"
    clinicaltrials_base_url: str = "https://clinicaltrials.gov/api/v2"
    icd10_base_url: str = "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3"
    
    class Config:
        env_file = ".env"
        env_prefix = "NLM_"

# Global settings instance
nlm_settings = NLMSettings()