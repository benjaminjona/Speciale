export interface SolrDoc {
  wayback_date: number | string;
  url: string;
  [key: string]: any;
}

export interface DomainEntry {
  id: string;
  wayback_date: number;
  url_norm: string;
  url: string;
  links: string[];
}

export interface TreeLink {
  id: string;
  url: string;
  wayback_date: number;
  links: TreeLink[];
}
