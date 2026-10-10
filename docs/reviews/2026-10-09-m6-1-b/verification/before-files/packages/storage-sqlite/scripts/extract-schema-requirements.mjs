export function parseFts5Ddl(sql) {
  const match = sql.trim().match(/^CREATE\s+VIRTUAL\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+USING\s+(\w+)\s*\(([\s\S]*)\)$/i);
  if (!match || !match[1] || !match[2] || !match[3]) {
    return { valid: false, reason: "post_fts 必须为使用 fts5 的虚拟表", module: '', columns: [], configs: {} };
  }
  const module = match[2].toLowerCase();
  if (module !== 'fts5') {
    return { valid: false, reason: `post_fts 必须为使用 fts5 的虚拟表，实际模块为 ${module}`, module, columns: [], configs: {} };
  }
  const inner = match[3].trim();
  const parts = [];
  let cur = '';
  let inQuote = null;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (inQuote) {
      cur += ch;
      if (ch === inQuote) inQuote = null;
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
      cur += ch;
    } else if (ch === ',') {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());

  const columns = [];
  const configs = {};
  for (const part of parts) {
    const configMatch = part.match(/^([a-zA-Z0-9_]+)\s*=\s*(.*)$/);
    if (configMatch && configMatch[1] && configMatch[2]) {
      const key = configMatch[1].toLowerCase();
      let val = configMatch[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      configs[key] = val;
    } else {
      const tokens = part.split(/\s+/);
      const colName = tokens[0];
      if (!colName) continue;
      const isUnindexed = tokens.slice(1).some((t) => t.toUpperCase() === 'UNINDEXED');
      columns.push({ name: colName, unindexed: isUnindexed });
    }
  }
  return { valid: true, module, columns, configs };
}

export function extractDatabaseRequirements(db) {
  const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'post_fts_%' ORDER BY name").all();
  const result = {};

  for (const t of tables) {
    const tableName = t.name;
    const sql = t.sql || '';

    // Check if it's a virtual table using FTS5
    if (sql.toLowerCase().includes('using fts5') || tableName === 'post_fts') {
      const ftsParsed = parseFts5Ddl(sql);
      if (!ftsParsed.valid) {
        throw new Error(`Invalid FTS DDL for ${tableName}: ${ftsParsed.reason}`);
      }
      result[tableName] = {
        name: tableName,
        virtual: true,
        columns: ftsParsed.columns.map(c => ({
          name: c.name,
          type: c.unindexed ? 'UNINDEXED' : 'TEXT',
          notnull: false,
          pk: 0
        })),
        foreignKeys: [],
        uniqueConstraints: [],
        fts: {
          module: ftsParsed.module,
          columns: ftsParsed.columns,
          configs: ftsParsed.configs
        }
      };
      continue;
    }

    // Normal table
    const cols = db.prepare(`PRAGMA table_info("${tableName}")`).all();
    const columns = cols.map(c => ({
      name: c.name,
      type: c.type,
      notnull: Boolean(c.notnull),
      pk: c.pk
    }));

    const fks = db.prepare(`PRAGMA foreign_key_list("${tableName}")`).all();
    const foreignKeys = fks.map(f => ({
      from: f.from,
      table: f.table,
      to: f.to,
      on_update: f.on_update,
      on_delete: f.on_delete
    }));

    const indices = db.prepare(`PRAGMA index_list("${tableName}")`).all();
    const uniqueConstraints = [];
    const indexes = [];

    for (const idx of indices) {
      const xinfo = db.prepare(`PRAGMA index_xinfo("${idx.name}")`).all();
      const keyRows = xinfo.filter(x => x.key === 1).sort((a, b) => a.seqno - b.seqno);

      const hasExpression = keyRows.some(x => x.cid < 0 || x.name === null);
      if (hasExpression) {
        throw new Error(`Unsupported expression key in index ${idx.name} on table ${tableName}`);
      }

      const keyTerms = keyRows.map(x => ({
        name: x.name,
        coll: ((x.coll || 'BINARY')).toUpperCase(),
        desc: x.desc
      }));
      const keyCols = keyTerms.map(x => x.name);

      if (idx.origin === "pk") {
        if (idx.partial === 1 || idx.unique !== 1) {
          throw new Error(`表 ${tableName} 主键索引 ${idx.name} 属性损坏（必须为非 Partial 唯一索引）`);
        }
        for (const term of keyTerms) {
          if (term.coll !== 'BINARY') {
            throw new Error(`表 ${tableName} 主键索引 ${idx.name} 列 ${term.name} 包含不受支持的排序规则: ${term.coll}（当前架构策略仅支持 BINARY）`);
          }
          if (term.desc !== 0) {
            throw new Error(`表 ${tableName} 主键索引 ${idx.name} 列 ${term.name} 包含不受支持的排序方向: DESC（当前架构策略仅支持 ASC）`);
          }
        }
      } else if (idx.origin === "u") {
        uniqueConstraints.push({
          columns: keyCols,
          keyTerms
        });
      } else if (idx.origin === "c") {
        indexes.push({
          name: idx.name,
          unique: idx.unique === 1,
          columns: keyCols,
          keyTerms,
          partial: idx.partial === 1
        });
      }
    }

    result[tableName] = {
      name: tableName,
      columns,
      foreignKeys,
      uniqueConstraints,
      ...(indexes.length > 0 ? { indexes } : {})
    };
  }

  return result;
}
