import dns.resolver
import concurrent.futures
import logging
from typing import List, Dict, Union

logger = logging.getLogger(__name__)

def lookup_txt_records(domain: str) -> Dict[str, Union[str, bool, List[str]]]:
    """
    Look up TXT records for a single domain
    """
    try:
        resolver = dns.resolver.Resolver()
        resolver.timeout = 5  # 5 second timeout
        resolver.lifetime = 5  # 5 second lifetime

        answers = resolver.resolve(domain, 'TXT')
        txt_records = [record.strings[0].decode('utf-8') for record in answers]

        return {
            'domain': domain,
            'success': True,
            'txt_records': txt_records
        }
    except dns.resolver.NXDOMAIN:
        return {
            'domain': domain,
            'success': False,
            'error': 'Domain does not exist'
        }
    except dns.resolver.NoAnswer:
        return {
            'domain': domain,
            'success': False,
            'error': 'No TXT records found'
        }
    except dns.resolver.Timeout:
        return {
            'domain': domain,
            'success': False,
            'error': 'Lookup timed out'
        }
    except Exception as e:
        logger.error(f"Error looking up {domain}: {str(e)}")
        return {
            'domain': domain,
            'success': False,
            'error': 'DNS lookup failed'
        }

def bulk_lookup(domains: List[str]) -> List[Dict[str, Union[str, bool, List[str]]]]:
    """
    Perform bulk DNS lookups using a thread pool while preserving order
    """
    results = []

    # Use list to preserve order
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(lookup_txt_records, domain) for domain in domains]

        for future in concurrent.futures.as_completed(futures):
            try:
                result = future.result()
                results.append(result)
            except Exception as e:
                logger.error(f"Error during bulk lookup: {str(e)}")
                results.append({
                    'domain': 'Unknown',
                    'success': False,
                    'error': 'Lookup failed'
                })

    # Sort results to match input order
    domain_to_index = {domain: i for i, domain in enumerate(domains)}
    results.sort(key=lambda x: domain_to_index.get(x['domain'], len(domains)))

    return results