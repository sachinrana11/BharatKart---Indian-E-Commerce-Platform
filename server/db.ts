import fs from 'fs';
import path from 'path';

export interface Document {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export type QueryFilter<T = any> = {
  [K in keyof T]?: any;
} & {
  $or?: QueryFilter<T>[];
  $and?: QueryFilter<T>[];
  [key: string]: any;
};

export class MongoCollection<T extends Document = Document> {
  private name: string;
  private db: MongoDatabase;

  constructor(name: string, db: MongoDatabase) {
    this.name = name;
    this.db = db;
  }

  private getDocs(): T[] {
    return this.db.getCollectionData<T>(this.name);
  }

  private matches(doc: T, filter: QueryFilter<T>): boolean {
    if (!filter || Object.keys(filter).length === 0) return true;

    if (filter.$or && Array.isArray(filter.$or)) {
      const orMatch = filter.$or.some(f => this.matches(doc, f));
      if (!orMatch) return false;
    }

    if (filter.$and && Array.isArray(filter.$and)) {
      const andMatch = filter.$and.every(f => this.matches(doc, f));
      if (!andMatch) return false;
    }

    for (const key of Object.keys(filter)) {
      if (key === '$or' || key === '$and') continue;

      const condition = filter[key];
      const val = this.getNestedValue(doc, key);

      if (condition !== null && typeof condition === 'object' && !Array.isArray(condition)) {
        if ('$eq' in condition && val !== condition.$eq) return false;
        if ('$ne' in condition && val === condition.$ne) return false;
        if ('$gt' in condition && !(val > condition.$gt)) return false;
        if ('$gte' in condition && !(val >= condition.$gte)) return false;
        if ('$lt' in condition && !(val < condition.$lt)) return false;
        if ('$lte' in condition && !(val <= condition.$lte)) return false;
        if ('$in' in condition && Array.isArray(condition.$in) && !condition.$in.includes(val)) return false;
        if ('$nin' in condition && Array.isArray(condition.$nin) && condition.$nin.includes(val)) return false;
        if ('$regex' in condition) {
          const regex = new RegExp(condition.$regex, condition.$options || 'i');
          if (!regex.test(String(val || ''))) return false;
        }
      } else if (Array.isArray(condition)) {
        if (!Array.isArray(val) || condition.length !== val.length || !condition.every((c, i) => c === val[i])) {
          return false;
        }
      } else {
        if (val !== condition) return false;
      }
    }
    return true;
  }

  private getNestedValue(obj: any, pathStr: string): any {
    if (!obj) return undefined;
    if (pathStr in obj) return obj[pathStr];
    const parts = pathStr.split('.');
    let curr = obj;
    for (const part of parts) {
      if (curr === null || curr === undefined) return undefined;
      curr = curr[part];
    }
    return curr;
  }

  async find(
    filter: QueryFilter<T> = {},
    options: {
      sort?: Record<string, 1 | -1>;
      skip?: number;
      limit?: number;
      projection?: Record<string, 0 | 1>;
    } = {}
  ): Promise<T[]> {
    let docs = this.getDocs().filter(doc => this.matches(doc, filter));

    // Sorting
    if (options.sort) {
      const sortKeys = Object.entries(options.sort);
      docs.sort((a, b) => {
        for (const [key, dir] of sortKeys) {
          const aVal = this.getNestedValue(a, key);
          const bVal = this.getNestedValue(b, key);
          if (aVal < bVal) return dir === 1 ? -1 : 1;
          if (aVal > bVal) return dir === 1 ? 1 : -1;
        }
        return 0;
      });
    }

    if (options.skip) {
      docs = docs.slice(options.skip);
    }

    if (options.limit !== undefined) {
      docs = docs.slice(0, options.limit);
    }

    // Clone deep
    return JSON.parse(JSON.stringify(docs));
  }

  async findOne(filter: QueryFilter<T> = {}): Promise<T | null> {
    const docs = this.getDocs();
    const found = docs.find(doc => this.matches(doc, filter));
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async findById(id: string): Promise<T | null> {
    return this.findOne({ _id: id } as any);
  }

  async insertOne(doc: Omit<T, '_id' | 'createdAt' | 'updatedAt'> & Partial<Document>): Promise<T> {
    const now = new Date().toISOString();
    const newDoc = {
      ...doc,
      _id: (doc as any)._id || `${this.name.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    } as unknown as T;

    this.getDocs().push(newDoc);
    this.db.save();
    return JSON.parse(JSON.stringify(newDoc));
  }

  async insertMany(docs: (Omit<T, '_id' | 'createdAt' | 'updatedAt'> & Partial<Document>)[]): Promise<T[]> {
    const now = new Date().toISOString();
    const created = docs.map(d => ({
      ...d,
      _id: (d as any)._id || `${this.name.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    })) as unknown as T[];

    this.getDocs().push(...created);
    this.db.save();
    return JSON.parse(JSON.stringify(created));
  }

  async updateOne(filter: QueryFilter<T>, update: any): Promise<{ matchedCount: number; modifiedCount: number }> {
    const docs = this.getDocs();
    const idx = docs.findIndex(doc => this.matches(doc, filter));
    if (idx === -1) return { matchedCount: 0, modifiedCount: 0 };

    const doc = docs[idx];
    const now = new Date().toISOString();

    if (update.$set) {
      for (const [key, val] of Object.entries(update.$set)) {
        if (key.includes('.')) {
          const parts = key.split('.');
          let curr = doc as any;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!curr[parts[i]]) curr[parts[i]] = {};
            curr = curr[parts[i]];
          }
          curr[parts[parts.length - 1]] = val;
        } else {
          (doc as any)[key] = val;
        }
      }
    }

    if (update.$inc) {
      for (const [key, val] of Object.entries(update.$inc)) {
        const numVal = Number(val) || 0;
        (doc as any)[key] = ((doc as any)[key] || 0) + numVal;
      }
    }

    if (update.$push) {
      for (const [key, val] of Object.entries(update.$push)) {
        if (!Array.isArray((doc as any)[key])) {
          (doc as any)[key] = [];
        }
        (doc as any)[key].push(val);
      }
    }

    if (update.$pull) {
      for (const [key, val] of Object.entries(update.$pull)) {
        if (Array.isArray((doc as any)[key])) {
          (doc as any)[key] = (doc as any)[key].filter((item: any) => {
            if (typeof val === 'object') {
              return !Object.entries(val).every(([k, v]) => item[k] === v);
            }
            return item !== val;
          });
        }
      }
    }

    doc.updatedAt = now;
    this.db.save();
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async updateMany(filter: QueryFilter<T>, update: any): Promise<{ matchedCount: number; modifiedCount: number }> {
    const docs = this.getDocs();
    let count = 0;
    for (let i = 0; i < docs.length; i++) {
      if (this.matches(docs[i], filter)) {
        await this.updateOne({ _id: docs[i]._id } as any, update);
        count++;
      }
    }
    return { matchedCount: count, modifiedCount: count };
  }

  async deleteOne(filter: QueryFilter<T>): Promise<{ deletedCount: number }> {
    const docs = this.getDocs();
    const idx = docs.findIndex(doc => this.matches(doc, filter));
    if (idx === -1) return { deletedCount: 0 };
    docs.splice(idx, 1);
    this.db.save();
    return { deletedCount: 1 };
  }

  async deleteMany(filter: QueryFilter<T>): Promise<{ deletedCount: number }> {
    const docs = this.getDocs();
    const initialLen = docs.length;
    const remaining = docs.filter(doc => !this.matches(doc, filter));
    this.db.setCollectionData(this.name, remaining);
    const deletedCount = initialLen - remaining.length;
    if (deletedCount > 0) this.db.save();
    return { deletedCount };
  }

  async countDocuments(filter: QueryFilter<T> = {}): Promise<number> {
    return this.getDocs().filter(doc => this.matches(doc, filter)).length;
  }
}

export class MongoDatabase {
  private dataFilePath: string;
  private data: Record<string, any[]> = {};
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(filePath?: string) {
    this.dataFilePath = filePath || path.join(process.cwd(), 'data', 'db.json');
    this.init();
  }

  private init() {
    try {
      const dir = path.dirname(this.dataFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.data = {};
      }
    } catch (e) {
      console.error('Error loading database file, starting empty:', e);
      this.data = {};
    }
  }

  getCollectionData<T>(name: string): T[] {
    if (!this.data[name]) {
      this.data[name] = [];
    }
    return this.data[name] as T[];
  }

  setCollectionData<T>(name: string, arr: T[]) {
    this.data[name] = arr;
  }

  collection<T extends Document = Document>(name: string): MongoCollection<T> {
    return new MongoCollection<T>(name, this);
  }

  save() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        const tempPath = `${this.dataFilePath}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
        fs.renameSync(tempPath, this.dataFilePath);
      } catch (e) {
        console.error('Failed to persist database to disk:', e);
      }
    }, 50);
  }

  hasData(collectionName: string): boolean {
    return Array.isArray(this.data[collectionName]) && this.data[collectionName].length > 0;
  }
}

export const db = new MongoDatabase();
