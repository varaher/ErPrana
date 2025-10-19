import asyncio
from typing import List, Optional
import httpx
from datetime import datetime, timedelta
import json
from ..config import nlm_settings
from ..schemas import MedlinePlusHealthTopic, MedlinePlusSearchResult

class MedlinePlusService:
    """Service for accessing MedlinePlus consumer health information"""
    
    def __init__(self):
        self.base_url = nlm_settings.medlineplus_base_url
        self.cache = {}
        self.last_request_time = None
        
    async def search_health_topics(self, query: str, language: str = "en") -> MedlinePlusSearchResult:
        """Search MedlinePlus for health topics"""
        
        # Check cache first
        cache_key = f"medlineplus_{query}_{language}"
        if cache_key in self.cache:
            cached_result, timestamp = self.cache[cache_key]
            if datetime.now() - timestamp < timedelta(hours=nlm_settings.cache_duration_hours):
                return cached_result
        
        try:
            # Rate limiting - max 100 requests per minute
            await self._respect_rate_limit()
            
            # Determine database based on language
            database = "healthTopics" if language == "en" else "healthTopicsSpanish"
            
            params = {
                "db": database,
                "term": query,
                "knowledgeResponseType": "application/json"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(self.base_url, params=params)
                response.raise_for_status()
                
                topics = self._parse_health_topics(response.json(), language)
                
                result = MedlinePlusSearchResult(
                    query=query,
                    topics=topics
                )
                
                # Cache the result
                self.cache[cache_key] = (result, datetime.now())
                
                return result
                
        except Exception as e:
            print(f"❌ MedlinePlus search error: {e}")
            return MedlinePlusSearchResult(query=query, topics=[])
    
    async def _respect_rate_limit(self):
        """Ensure we don't exceed 100 requests per minute"""
        if self.last_request_time:
            elapsed = datetime.now() - self.last_request_time
            min_interval = timedelta(seconds=0.6)  # 100 req/min = 1 req per 0.6 seconds
            
            if elapsed < min_interval:
                await asyncio.sleep((min_interval - elapsed).total_seconds())
        
        self.last_request_time = datetime.now()
    
    def _parse_health_topics(self, json_data: dict, language: str) -> List[MedlinePlusHealthTopic]:
        """Parse JSON response to extract health topics"""
        topics = []
        
        try:
            # MedlinePlus JSON structure varies, handle different formats
            if "feed" in json_data:
                entries = json_data.get("feed", {}).get("entry", [])
                if not isinstance(entries, list):
                    entries = [entries]
                
                for entry in entries:
                    topic = self._parse_topic_entry(entry, language)
                    if topic:
                        topics.append(topic)
            
            elif "document" in json_data:
                # Alternative JSON structure
                documents = json_data.get("document", [])
                if not isinstance(documents, list):
                    documents = [documents]
                
                for doc in documents:
                    topic = self._parse_document_entry(doc, language)
                    if topic:
                        topics.append(topic)
                        
        except Exception as e:
            print(f"❌ Error parsing MedlinePlus topics: {e}")
        
        return topics
    
    def _parse_topic_entry(self, entry: dict, language: str) -> Optional[MedlinePlusHealthTopic]:
        """Parse individual topic entry from feed format"""
        try:
            title = entry.get("title", {}).get("_value", "Unknown Topic")
            
            # Extract URL from links
            url = None
            links = entry.get("link", [])
            if not isinstance(links, list):
                links = [links]
            
            for link in links:
                if link.get("_rel") == "alternate":
                    url = link.get("_href")
                    break
            
            # Extract summary
            summary = None
            if "summary" in entry:
                summary = entry["summary"].get("_value")
            elif "content" in entry:
                summary = entry["content"].get("_value")
            
            return MedlinePlusHealthTopic(
                title=title,
                url=url or f"https://medlineplus.gov/",
                summary=summary,
                language=language
            )
            
        except Exception as e:
            print(f"❌ Error parsing topic entry: {e}")
            return None
    
    def _parse_document_entry(self, doc: dict, language: str) -> Optional[MedlinePlusHealthTopic]:
        """Parse individual document entry from document format"""
        try:
            title = doc.get("title", "Unknown Topic")
            url = doc.get("FullSummaryURL") or doc.get("url")
            summary = doc.get("snippet") or doc.get("content")
            
            return MedlinePlusHealthTopic(
                title=title,
                url=url or "https://medlineplus.gov/",
                summary=summary,
                language=language
            )
            
        except Exception as e:
            print(f"❌ Error parsing document entry: {e}")
            return None
    
    async def search_by_condition(self, condition: str) -> MedlinePlusSearchResult:
        """Search for health topics related to a medical condition"""
        return await self.search_health_topics(condition)
    
    async def get_patient_education(self, condition: str) -> List[MedlinePlusHealthTopic]:
        """Get patient education materials for a condition"""
        result = await self.search_health_topics(f"{condition} patient education")
        return result.topics
    
    async def get_treatment_information(self, condition: str) -> List[MedlinePlusHealthTopic]:
        """Get treatment information for a condition"""
        result = await self.search_health_topics(f"{condition} treatment")
        return result.topics