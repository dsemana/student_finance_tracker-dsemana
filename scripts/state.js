import { load } from "./storage.js";

export const state = {
  records: Array.isArray(load()) ? load() : [],
  sortField: null,
  sortDir: 1
};