// §25.5 — UUID-based IDs for all aggregates and value objects
import { v4 as uuidv4 } from "uuid";

export function generateId(): string {
  return uuidv4();
}
