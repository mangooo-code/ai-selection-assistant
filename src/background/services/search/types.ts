import type { Source } from "../../../shared/models";

export interface SearchProvider {
  search(query: string): Promise<Source[]>;
}
