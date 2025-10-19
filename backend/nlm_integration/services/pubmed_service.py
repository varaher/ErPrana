import asyncio
from typing import List, Optional
import httpx
from datetime import datetime, timedelta
import xml.etree.ElementTree as ET
from ..config import nlm_settings
from ..schemas import PubMedArticle, PubMedSearchResult

class PubMedService:
    """Service for accessing PubMed medical literature"""
    
    def __init__(self):
        self.base_url = nlm_settings.pubmed_base_url
        self.api_key = nlm_settings.ncbi_api_key
        self.email = nlm_settings.ncbi_email
        self.tool = nlm_settings.ncbi_tool
        self.cache = {}
        
    async def search_articles(self, query: str, max_results: int = 10) -> PubMedSearchResult:
        """Search PubMed for articles matching the query"""
        
        # Check cache first
        cache_key = f"pubmed_search_{query}_{max_results}"
        if cache_key in self.cache:
            cached_result, timestamp = self.cache[cache_key]
            if datetime.now() - timestamp < timedelta(hours=nlm_settings.cache_duration_hours):
                return cached_result
        
        try:
            # Step 1: Search for article IDs
            search_params = {
                "db": "pubmed",
                "term": query,
                "retmax": max_results,
                "email": self.email,
                "tool": self.tool
            }
            
            if self.api_key:
                search_params["api_key"] = self.api_key
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                search_response = await client.get(
                    f"{self.base_url}/esearch.fcgi",
                    params=search_params
                )
                search_response.raise_for_status()
                
                # Parse search results to get PMIDs
                pmids = self._parse_search_results(search_response.text)
                
                if not pmids:
                    return PubMedSearchResult(query=query, total_results=0, articles=[])
                
                # Step 2: Fetch article details
                articles = await self._fetch_article_details(pmids)
                
                result = PubMedSearchResult(
                    query=query,
                    total_results=len(pmids),
                    articles=articles
                )
                
                # Cache the result
                self.cache[cache_key] = (result, datetime.now())
                
                return result
                
        except Exception as e:
            print(f"❌ PubMed search error: {e}")
            return PubMedSearchResult(query=query, total_results=0, articles=[])
    
    async def _fetch_article_details(self, pmids: List[str]) -> List[PubMedArticle]:
        """Fetch detailed information for a list of PMIDs"""
        if not pmids:
            return []
        
        try:
            fetch_params = {
                "db": "pubmed",
                "id": ",".join(pmids),
                "rettype": "abstract",
                "retmode": "xml",
                "email": self.email,
                "tool": self.tool
            }
            
            if self.api_key:
                fetch_params["api_key"] = self.api_key
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                fetch_response = await client.get(
                    f"{self.base_url}/efetch.fcgi",
                    params=fetch_params
                )
                fetch_response.raise_for_status()
                
                return self._parse_article_details(fetch_response.text)
                
        except Exception as e:
            print(f"❌ Error fetching article details: {e}")
            return []
    
    def _parse_search_results(self, xml_text: str) -> List[str]:
        """Parse search results XML to extract PMIDs"""
        try:
            root = ET.fromstring(xml_text)
            pmids = []
            
            for id_elem in root.findall(".//Id"):
                if id_elem.text:
                    pmids.append(id_elem.text)
            
            return pmids
        except Exception as e:
            print(f"❌ Error parsing search results: {e}")
            return []
    
    def _parse_article_details(self, xml_text: str) -> List[PubMedArticle]:
        """Parse article details XML to extract article information"""
        try:
            root = ET.fromstring(xml_text)
            articles = []
            
            for article_elem in root.findall(".//PubmedArticle"):
                try:
                    # Extract PMID
                    pmid_elem = article_elem.find(".//PMID")
                    pmid = pmid_elem.text if pmid_elem is not None else ""
                    
                    # Extract title
                    title_elem = article_elem.find(".//ArticleTitle")
                    title = title_elem.text if title_elem is not None else "No title"
                    
                    # Extract abstract
                    abstract_elem = article_elem.find(".//AbstractText")
                    abstract = abstract_elem.text if abstract_elem is not None else None
                    
                    # Extract authors
                    authors = []
                    for author_elem in article_elem.findall(".//Author"):
                        last_name_elem = author_elem.find("LastName")
                        first_name_elem = author_elem.find("ForeName")
                        
                        if last_name_elem is not None:
                            author_name = last_name_elem.text
                            if first_name_elem is not None:
                                author_name += f", {first_name_elem.text}"
                            authors.append(author_name)
                    
                    # Extract journal
                    journal_elem = article_elem.find(".//Journal/Title")
                    journal = journal_elem.text if journal_elem is not None else None
                    
                    # Extract publication date
                    pub_date_elem = article_elem.find(".//PubDate")
                    pub_date = None
                    if pub_date_elem is not None:
                        year_elem = pub_date_elem.find("Year")
                        month_elem = pub_date_elem.find("Month")
                        if year_elem is not None:
                            pub_date = year_elem.text
                            if month_elem is not None:
                                pub_date += f"-{month_elem.text}"
                    
                    # Extract DOI
                    doi = None
                    for id_elem in article_elem.findall(".//ArticleId"):
                        if id_elem.get("IdType") == "doi":
                            doi = id_elem.text
                            break
                    
                    # Create article object
                    article = PubMedArticle(
                        pmid=pmid,
                        title=title,
                        abstract=abstract,
                        authors=authors,
                        journal=journal,
                        publication_date=pub_date,
                        doi=doi,
                        url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else None
                    )
                    
                    articles.append(article)
                    
                except Exception as e:
                    print(f"❌ Error parsing individual article: {e}")
                    continue
            
            return articles
            
        except Exception as e:
            print(f"❌ Error parsing article details XML: {e}")
            return []
    
    async def get_article_by_pmid(self, pmid: str) -> Optional[PubMedArticle]:
        """Get a specific article by PMID"""
        articles = await self._fetch_article_details([pmid])
        return articles[0] if articles else None
    
    async def search_by_condition(self, condition: str, max_results: int = 5) -> PubMedSearchResult:
        """Search for articles related to a medical condition"""
        # Enhance query with medical terms
        enhanced_query = f'"{condition}"[Title/Abstract] OR "{condition}"[MeSH Terms]'
        return await self.search_articles(enhanced_query, max_results)
    
    async def search_treatment_options(self, condition: str, max_results: int = 5) -> PubMedSearchResult:
        """Search for treatment-related articles"""
        treatment_query = f'"{condition}" AND (treatment OR therapy OR management OR intervention)'
        return await self.search_articles(treatment_query, max_results)